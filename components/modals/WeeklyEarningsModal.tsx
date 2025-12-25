import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useIncome } from '@/contexts/IncomeContext';
import BottomSheetModal from './BottomSheetModal';

interface WeeklyEarningsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface DailyEarnings {
  date: string;
  earnings: Record<string, number>; // income_source_id => earnings_amount
}

export default function WeeklyEarningsModal({ visible, onClose }: WeeklyEarningsModalProps) {
  const { user } = useAuth();
  const { incomeSources } = useIncome();
  const [weeklyData, setWeeklyData] = useState<DailyEarnings[]>([]);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });

  useEffect(() => {
    if (visible) {
      loadWeeklyData();
    }
  }, [visible]);

  const loadWeeklyData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('income_source_daily_earnings')
        .select('date, income_source_id, earnings_amount')
        .eq('user_id', user.id)
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'));

      if (error) throw error;

      // Organize data by date
      const dataByDate: Record<string, Record<string, number>> = {};
      
      // Initialize all 7 days
      for (let i = 0; i < 7; i++) {
        const date = format(addDays(weekStart, i), 'yyyy-MM-dd');
        dataByDate[date] = {};
      }

      // Fill in actual data
      data?.forEach(record => {
        if (!dataByDate[record.date]) {
          dataByDate[record.date] = {};
        }
        dataByDate[record.date][record.income_source_id] = record.earnings_amount;
      });

      // Convert to array
      const weekData: DailyEarnings[] = [];
      for (let i = 0; i < 7; i++) {
        const date = format(addDays(weekStart, i), 'yyyy-MM-dd');
        weekData.push({
          date,
          earnings: dataByDate[date] || {},
        });
      }

      setWeeklyData(weekData);
    } catch (err) {
      console.error('Error loading weekly data:', err);
    }
  };

  const handleAmountChange = (date: string, sourceId: string, value: string) => {
    const key = `${date}-${sourceId}`;
    setEditingValues(prev => ({ ...prev, [key]: value }));
  };

  const handleAmountSave = async (date: string, sourceId: string) => {
    const key = `${date}-${sourceId}`;
    const value = editingValues[key];
    if (value === undefined) return;

    const newAmount = parseFloat(value) || 0;
    try {
      const { error } = await supabase
        .from('income_source_daily_earnings')
        .upsert({
          user_id: user!.id,
          income_source_id: sourceId,
          date,
          earnings_amount: newAmount,
        }, {
          onConflict: 'user_id,income_source_id,date'
        });

      if (error) throw error;

      // Update local state
      setWeeklyData(prev => prev.map(day => {
        if (day.date === date) {
          return {
            ...day,
            earnings: { ...day.earnings, [sourceId]: newAmount },
          };
        }
        return day;
      }));

      // Clear editing value
      setEditingValues(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    } catch (err) {
      console.error('Error saving earnings:', err);
    }
  };

  // Prepare chart data
  const chartData = {
    labels: weeklyData.map(day => format(new Date(day.date), 'EEE')),
    datasets: incomeSources.map(source => ({
      data: weeklyData.map(day => day.earnings[source.id] || 0),
    })),
  };

  const totalWeeklyEarnings = weeklyData.reduce((sum, day) => {
    const dayTotal = Object.values(day.earnings).reduce((s, amt) => s + amt, 0);
    return sum + dayTotal;
  }, 0);

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title="Weekly Earnings"
    >
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Total Section */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total This Week</Text>
          <Text style={styles.totalAmount}>${totalWeeklyEarnings.toFixed(2)}</Text>
        </View>

        {/* Bar Chart */}
        {weeklyData.length > 0 && (
          <View style={styles.chartContainer}>
            <BarChart
              data={{
                labels: chartData.labels,
                datasets: [{
                  data: weeklyData.map(day => 
                    Object.values(day.earnings).reduce((s, amt) => s + amt, 0)
                  ),
                }],
              }}
              width={Dimensions.get('window').width - 40}
              height={220}
              yAxisLabel="$"
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForLabels: {
                  fontSize: 12,
                },
              }}
              style={styles.chart}
              showValuesOnTopOfBars
            />
          </View>
        )}

        {/* Daily Earnings by Income Source */}
        <View style={styles.dailySection}>
          <Text style={styles.sectionTitle}>Daily Breakdown</Text>
          {weeklyData.map(day => (
            <View key={day.date} style={styles.daySection}>
              <Text style={styles.dayLabel}>{format(new Date(day.date), 'EEEE, MMM d')}</Text>
              {incomeSources.map(source => {
                const key = `${day.date}-${source.id}`;
                const currentEarnings = day.earnings[source.id] || 0;
                
                return (
                  <View key={source.id} style={styles.sourceRow}>
                    <Text style={styles.sourceName}>{source.name}</Text>
                    <View style={styles.amountInputContainer}>
                      <Text style={styles.dollarSign}>$</Text>
                      <TextInput
                        style={styles.amountInput}
                        value={editingValues[key] !== undefined ? editingValues[key] : currentEarnings.toFixed(2)}
                        onChangeText={(value) => handleAmountChange(day.date, source.id, value)}
                        onSubmitEditing={() => handleAmountSave(day.date, source.id)}
                        onBlur={() => handleAmountSave(day.date, source.id)}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  totalSection: {
    backgroundColor: '#3498db',
    padding: 20,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  chartContainer: {
    padding: 20,
    backgroundColor: '#fff',
  },
  chart: {
    borderRadius: 16,
  },
  dailySection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  daySection: {
    marginBottom: 24,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  sourceName: {
    fontSize: 15,
    color: '#34495e',
    flex: 1,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dfe6e9',
  },
  dollarSign: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginRight: 4,
  },
  amountInput: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2ecc71',
    minWidth: 80,
    textAlign: 'right',
    paddingVertical: 4,
  },
});
