import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomSheetModal from './BottomSheetModal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfWeek, endOfWeek } from 'date-fns';

interface WeeklyGoalsModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface WeeklyGoal {
  id?: string;
  starting_year_week: string;
  ending_year_week: string | null;
  total_income: number;
  sunday_income: number;
  monday_income: number;
  tuesday_income: number;
  wednesday_income: number;
  thursday_income: number;
  friday_income: number;
  saturday_income: number;
}

// Helper to get ISO week format "YYYY-Www"
const getYearWeek = (date: Date): string => {
  const year = date.getFullYear();
  const weekStart = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
  const oneJan = new Date(year, 0, 1);
  const numberOfDays = Math.floor((weekStart.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
};

// Helper to get previous week
const getPreviousYearWeek = (yearWeek: string): string => {
  const [year, week] = yearWeek.split('-W').map(Number);
  if (week === 1) {
    return `${year - 1}-W52`;
  }
  return `${year}-W${String(week - 1).padStart(2, '0')}`;
};

export default function WeeklyGoalsModal({ visible, onClose, onSuccess }: WeeklyGoalsModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [applyTo, setApplyTo] = useState<'this-week' | 'every-week'>('every-week');
  const [totalIncome, setTotalIncome] = useState('');
  const [sundayIncome, setSundayIncome] = useState('');
  const [mondayIncome, setMondayIncome] = useState('');
  const [tuesdayIncome, setTuesdayIncome] = useState('');
  const [wednesdayIncome, setWednesdayIncome] = useState('');
  const [thursdayIncome, setThursdayIncome] = useState('');
  const [fridayIncome, setFridayIncome] = useState('');
  const [saturdayIncome, setSaturdayIncome] = useState('');
  const [existingGoal, setExistingGoal] = useState<WeeklyGoal | null>(null);
  
  // Track which daily fields have been manually modified
  const [modifiedFields, setModifiedFields] = useState<Record<string, boolean>>({
    sunday: false,
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
  });

  const currentYearWeek = getYearWeek(new Date());

  // Load modified fields from AsyncStorage on mount
  useEffect(() => {
    const loadModifiedFields = async () => {
      try {
        const stored = await AsyncStorage.getItem('weeklyGoalsModifiedFields');
        if (stored) {
          setModifiedFields(JSON.parse(stored));
        }
      } catch (err) {
        console.error('Error loading modified fields:', err);
      }
    };
    loadModifiedFields();
  }, []);

  // Save modified fields to AsyncStorage when they change
  useEffect(() => {
    const saveModifiedFields = async () => {
      try {
        await AsyncStorage.setItem('weeklyGoalsModifiedFields', JSON.stringify(modifiedFields));
      } catch (err) {
        console.error('Error saving modified fields:', err);
      }
    };
    saveModifiedFields();
  }, [modifiedFields]);

  useEffect(() => {
    if (visible) {
      loadExistingGoal();
    }
  }, [visible]);

  const loadExistingGoal = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('weekly_income_goals')
        .select('*')
        .eq('user_id', user.id)
        .or(`ending_year_week.is.null,ending_year_week.eq.${currentYearWeek}`)
        .order('starting_year_week', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading weekly goal:', error);
        return;
      }

      if (data) {
        setExistingGoal(data);
        setTotalIncome(data.total_income.toString());
        setSundayIncome(data.sunday_income.toString());
        setMondayIncome(data.monday_income.toString());
        setTuesdayIncome(data.tuesday_income.toString());
        setWednesdayIncome(data.wednesday_income.toString());
        setThursdayIncome(data.thursday_income.toString());
        setFridayIncome(data.friday_income.toString());
        setSaturdayIncome(data.saturday_income.toString());
        setApplyTo(data.ending_year_week === null ? 'every-week' : 'this-week');
      } else {
        // No existing goal
        setExistingGoal(null);
        resetForm();
      }
    } catch (err) {
      console.error('Error loading weekly goal:', err);
    }
  };

  const resetForm = () => {
    setTotalIncome('');
    setSundayIncome('');
    setMondayIncome('');
    setTuesdayIncome('');
    setWednesdayIncome('');
    setThursdayIncome('');
    setFridayIncome('');
    setSaturdayIncome('');
    setApplyTo('every-week');
    const resetFields = {
      sunday: false,
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
    };
    setModifiedFields(resetFields);
    // Clear from AsyncStorage
    AsyncStorage.setItem('weeklyGoalsModifiedFields', JSON.stringify(resetFields)).catch(err => 
      console.error('Error clearing modified fields:', err)
    );
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const goalData = {
        user_id: user.id,
        starting_year_week: currentYearWeek,
        ending_year_week: applyTo === 'every-week' ? null : currentYearWeek,
        total_income: parseFloat(totalIncome) || 0,
        sunday_income: parseFloat(sundayIncome) || 0,
        monday_income: parseFloat(mondayIncome) || 0,
        tuesday_income: parseFloat(tuesdayIncome) || 0,
        wednesday_income: parseFloat(wednesdayIncome) || 0,
        thursday_income: parseFloat(thursdayIncome) || 0,
        friday_income: parseFloat(fridayIncome) || 0,
        saturday_income: parseFloat(saturdayIncome) || 0,
      };

      // Check if we need to close out existing goal
      if (existingGoal && existingGoal.starting_year_week < currentYearWeek) {
        // Close out the existing goal
        const previousWeek = getPreviousYearWeek(currentYearWeek);
        await supabase
          .from('weekly_income_goals')
          .update({ ending_year_week: previousWeek })
          .eq('id', existingGoal.id);

        // Create new goal
        const { error: insertError } = await supabase
          .from('weekly_income_goals')
          .insert(goalData);

        if (insertError) throw insertError;
      } else if (existingGoal && existingGoal.starting_year_week === currentYearWeek) {
        // Update existing goal for current week
        const { error: updateError } = await supabase
          .from('weekly_income_goals')
          .update(goalData)
          .eq('id', existingGoal.id);

        if (updateError) throw updateError;
      } else {
        // No existing goal, create new
        const { error: insertError } = await supabase
          .from('weekly_income_goals')
          .insert(goalData);

        if (insertError) throw insertError;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving weekly goal:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTotalIncomeChange = (value: string) => {
    setTotalIncome(value);
    
    // Reset all modified flags when total changes
    setModifiedFields({
      sunday: false,
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
    });
    
    // Auto-calculate daily averages
    const total = parseInt(value);
    if (!isNaN(total) && total > 0) {
      const dailyAvg = Math.round(total / 7).toString();
      setSundayIncome(dailyAvg);
      setMondayIncome(dailyAvg);
      setTuesdayIncome(dailyAvg);
      setWednesdayIncome(dailyAvg);
      setThursdayIncome(dailyAvg);
      setFridayIncome(dailyAvg);
      setSaturdayIncome(dailyAvg);
    }
  };

  const recalculateUnmodifiedFields = (changedDay: string, changedValue: string) => {
    const total = parseInt(totalIncome);
    if (isNaN(total) || total <= 0) return;

    // Get all daily values
    const dailyValues: Record<string, string> = {
      sunday: sundayIncome,
      monday: mondayIncome,
      tuesday: tuesdayIncome,
      wednesday: wednesdayIncome,
      thursday: thursdayIncome,
      friday: fridayIncome,
      saturday: saturdayIncome,
    };

    // Update the changed day's value
    dailyValues[changedDay] = changedValue;

    // Calculate sum of all modified fields
    let modifiedSum = 0;
    let unmodifiedCount = 0;
    
    Object.keys(dailyValues).forEach(day => {
      if (modifiedFields[day] || day === changedDay) {
        modifiedSum += parseInt(dailyValues[day]) || 0;
      } else {
        unmodifiedCount++;
      }
    });

    // Calculate amount to distribute among unmodified fields
    const remaining = total - modifiedSum;
    const avgForUnmodified = unmodifiedCount > 0 ? Math.round(remaining / unmodifiedCount).toString() : '0';

    // Update unmodified fields
    Object.keys(dailyValues).forEach(day => {
      if (!modifiedFields[day] && day !== changedDay) {
        switch(day) {
          case 'sunday': setSundayIncome(avgForUnmodified); break;
          case 'monday': setMondayIncome(avgForUnmodified); break;
          case 'tuesday': setTuesdayIncome(avgForUnmodified); break;
          case 'wednesday': setWednesdayIncome(avgForUnmodified); break;
          case 'thursday': setThursdayIncome(avgForUnmodified); break;
          case 'friday': setFridayIncome(avgForUnmodified); break;
          case 'saturday': setSaturdayIncome(avgForUnmodified); break;
        }
      }
    });
  };

  const handleDayIncomeChange = (day: string, value: string) => {
    // Mark this field as modified
    setModifiedFields(prev => ({ ...prev, [day]: true }));

    // Update the specific day's value
    switch(day) {
      case 'sunday': setSundayIncome(value); break;
      case 'monday': setMondayIncome(value); break;
      case 'tuesday': setTuesdayIncome(value); break;
      case 'wednesday': setWednesdayIncome(value); break;
      case 'thursday': setThursdayIncome(value); break;
      case 'friday': setFridayIncome(value); break;
      case 'saturday': setSaturdayIncome(value); break;
    }

    // Recalculate unmodified fields
    recalculateUnmodifiedFields(day, value);
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={handleClose}
      onSave={handleSave}
      title="Set Weekly Income Goals"
      saveDisabled={loading}
    >
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Apply To Section */}
        <View style={styles.section}>
          <Text style={styles.label}>Apply</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setApplyTo('this-week')}
            >
              <View style={styles.radio}>
                {applyTo === 'this-week' && <View style={styles.radioSelected} />}
              </View>
              <Text style={styles.radioText}>Just this week</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setApplyTo('every-week')}
            >
              <View style={styles.radio}>
                {applyTo === 'every-week' && <View style={styles.radioSelected} />}
              </View>
              <Text style={styles.radioText}>Every week</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Total Income */}
        <View style={styles.section}>
          <View style={styles.dayRow}>
            <Text style={styles.dayLabel}>Total</Text>
            <TextInput
              style={styles.dayInput}
              value={totalIncome}
              onChangeText={handleTotalIncomeChange}
              placeholder="0"
              keyboardType="number-pad"
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Daily Goals */}
        <View style={styles.section}>
          <View style={styles.dayRow}>
            <Text style={styles.dayLabel}>Sunday</Text>
            <TextInput
              style={styles.dayInput}
              value={sundayIncome}
              onChangeText={(value) => handleDayIncomeChange('sunday', value)}
              placeholder="0"
              keyboardType="number-pad"
              returnKeyType="next"
            />
          </View>

          <View style={styles.dayRow}>
            <Text style={styles.dayLabel}>Monday</Text>
            <TextInput
              style={styles.dayInput}
              value={mondayIncome}
              onChangeText={(value) => handleDayIncomeChange('monday', value)}
              placeholder="0"
              keyboardType="number-pad"
              returnKeyType="next"
            />
          </View>

          <View style={styles.dayRow}>
            <Text style={styles.dayLabel}>Tuesday</Text>
            <TextInput
              style={styles.dayInput}
              value={tuesdayIncome}
              onChangeText={(value) => handleDayIncomeChange('tuesday', value)}
              placeholder="0"
              keyboardType="number-pad"
              returnKeyType="next"
            />
          </View>

          <View style={styles.dayRow}>
            <Text style={styles.dayLabel}>Wednesday</Text>
            <TextInput
              style={styles.dayInput}
              value={wednesdayIncome}
              onChangeText={(value) => handleDayIncomeChange('wednesday', value)}
              placeholder="0"
              keyboardType="number-pad"
              returnKeyType="next"
            />
          </View>

          <View style={styles.dayRow}>
            <Text style={styles.dayLabel}>Thursday</Text>
            <TextInput
              style={styles.dayInput}
              value={thursdayIncome}
              onChangeText={(value) => handleDayIncomeChange('thursday', value)}
              placeholder="0"
              keyboardType="number-pad"
              returnKeyType="next"
            />
          </View>

          <View style={styles.dayRow}>
            <Text style={styles.dayLabel}>Friday</Text>
            <TextInput
              style={styles.dayInput}
              value={fridayIncome}
              onChangeText={(value) => handleDayIncomeChange('friday', value)}
              placeholder="0"
              keyboardType="number-pad"
              returnKeyType="next"
            />
          </View>

          <View style={styles.dayRow}>
            <Text style={styles.dayLabel}>Saturday</Text>
            <TextInput
              style={styles.dayInput}
              value={saturdayIncome}
              onChangeText={(value) => handleDayIncomeChange('saturday', value)}
              placeholder="0"
              keyboardType="number-pad"
              returnKeyType="done"
            />
          </View>
        </View>
      </ScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#34495e',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
    backgroundColor: '#ffffff',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 20,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#3498db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3498db',
  },
  radioText: {
    fontSize: 15,
    color: '#2c3e50',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#34495e',
    width: 100,
  },
  dayInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
    backgroundColor: '#ffffff',
  },
});
