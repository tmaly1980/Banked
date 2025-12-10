import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';
import { format, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { IncomeSource } from '@/types';
import BottomSheetModal from './BottomSheetModal';
import IncomeSourceFormModal from './IncomeSourceFormModal';

interface IncomeSourceDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  incomeSource: IncomeSource | null;
  onUpdate: () => void;
}

interface DailyEarning {
  date: string;
  amount: number;
}

export default function IncomeSourceDetailsModal({
  visible,
  onClose,
  incomeSource,
  onUpdate,
}: IncomeSourceDetailsModalProps) {
  const { user } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [dailyEarnings, setDailyEarnings] = useState<DailyEarning[]>([]);
  const [weeklyAverage, setWeeklyAverage] = useState(0);

  useEffect(() => {
    if (visible && incomeSource) {
      loadWeekEarnings();
    }
  }, [visible, incomeSource, weekOffset, showEditModal]);

  const getWeekDates = () => {
    const today = new Date();
    const targetWeek = addWeeks(today, weekOffset);
    const start = startOfWeek(targetWeek, { weekStartsOn: 0 }); // Sunday
    const end = endOfWeek(targetWeek, { weekStartsOn: 0 });
    return { start, end };
  };

  const loadWeekEarnings = async () => {
    if (!user || !incomeSource) return;

    try {
      const { start, end } = getWeekDates();
      const startDate = format(start, 'yyyy-MM-dd');
      const endDate = format(end, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('income_source_daily_earnings')
        .select('date, earnings_amount')
        .eq('user_id', user.id)
        .eq('income_source_id', incomeSource.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) throw error;

      // Create array for all 7 days, fill with 0 if no data
      const weekData: DailyEarning[] = [];
      for (let i = 0; i < 7; i++) {
        const date = format(addWeeks(start, 0), 'yyyy-MM-dd');
        const dayDate = format(subDays(end, 6 - i), 'yyyy-MM-dd');
        const existing = data?.find(d => d.date === dayDate);
        weekData.push({
          date: dayDate,
          amount: existing?.earnings_amount || 0,
        });
      }

      setDailyEarnings(weekData);

      // Calculate weekly average
      const total = weekData.reduce((sum, day) => sum + day.amount, 0);
      setWeeklyAverage(total / 7);
    } catch (err) {
      console.error('Error loading week earnings:', err);
    }
  };

  const handlePreviousWeek = () => {
    setWeekOffset(weekOffset - 1);
  };

  const handleNextWeek = () => {
    setWeekOffset(weekOffset + 1);
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  if (!incomeSource) return null;

  const { start, end } = getWeekDates();
  const weekDisplay = `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;

  const chartData = {
    labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    datasets: [
      {
        data: dailyEarnings.map(d => d.amount),
      },
    ],
  };

  const screenWidth = Dimensions.get('window').width;

  return (
    <>
      <BottomSheetModal
        visible={visible}
        onClose={onClose}
        title={incomeSource.name}
        saveText=""
        cancelText="Close"
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header with Edit Link */}
          <View style={styles.headerRow}>
            <View style={styles.sourceInfoSection}>
              <Text style={styles.frequency}>{incomeSource.frequency}</Text>
              <Text style={styles.pendingAmount}>
                ${incomeSource.pending_earnings.toFixed(2)} pending
              </Text>
            </View>
            <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
              <Text style={styles.editText}>Edit</Text>
              <Ionicons name="pencil" size={16} color="#3498db" />
            </TouchableOpacity>
          </View>

          {/* Week Navigation */}
          <View style={styles.weekNav}>
            <TouchableOpacity onPress={handlePreviousWeek} style={styles.navButton}>
              <Ionicons name="chevron-back" size={24} color="#34495e" />
            </TouchableOpacity>
            <Text style={styles.weekText}>{weekDisplay}</Text>
            <TouchableOpacity
              onPress={handleNextWeek}
              style={styles.navButton}
              disabled={weekOffset >= 0}
            >
              <Ionicons
                name="chevron-forward"
                size={24}
                color={weekOffset >= 0 ? '#bdc3c7' : '#34495e'}
              />
            </TouchableOpacity>
          </View>

          {/* Chart */}
          <View style={styles.chartContainer}>
            <BarChart
              data={chartData}
              width={screenWidth - 80}
              height={220}
              yAxisLabel="$"
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForBackgroundLines: {
                  strokeDasharray: '',
                  stroke: '#ecf0f1',
                  strokeWidth: 1,
                },
              }}
              style={styles.chart}
              showValuesOnTopOfBars
              fromZero
              segments={4}
            />
            
            {/* Weekly Average Line */}
            <View style={styles.averageContainer}>
              <View style={styles.averageLine} />
              <Text style={styles.averageLabel}>
                Weekly Avg: ${weeklyAverage.toFixed(2)}
              </Text>
            </View>
          </View>
        </ScrollView>
      </BottomSheetModal>

      {/* Edit Modal */}
      {incomeSource && (
        <IncomeSourceFormModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          incomeSource={incomeSource}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sourceInfoSection: {
    flex: 1,
  },
  frequency: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  pendingAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#27ae60',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#ecf0f1',
  },
  editText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3498db',
  },
  weekNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navButton: {
    padding: 8,
  },
  weekText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
  },
  chartContainer: {
    position: 'relative',
    marginBottom: 20,
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  averageContainer: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  averageLine: {
    width: '85%',
    height: 2,
    backgroundColor: '#e74c3c',
    opacity: 0.6,
  },
  averageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e74c3c',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
});
