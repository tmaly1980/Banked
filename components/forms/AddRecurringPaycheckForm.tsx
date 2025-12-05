import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Switch,
} from 'react-native';
import DateInput from '@/components/DateInput';
import PillPicker from '@/components/PillPicker';
import { DayOfWeek, RecurrenceUnit, RecurringPaycheck } from '@/types';

interface AddRecurringPaycheckFormProps {
  editingRecurring?: RecurringPaycheck | null;
  onFormChange?: () => void;
}

export interface RecurringPaycheckFormData {
  amount: string;
  startDate: string;
  endDate: string;
  recurrenceUnit: RecurrenceUnit;
  interval: string;
  dayOfWeek: DayOfWeek | '';
  dayOfMonth: string;
  lastDayOfMonth: boolean;
  lastBusinessDayOfMonth: boolean;
}

export interface RecurringPaycheckFormRef {
  getFormData: () => RecurringPaycheckFormData;
  resetForm: () => void;
  validateForm: () => boolean;
}

const RECURRENCE_UNITS: { label: string; value: RecurrenceUnit }[] = [
  { label: 'Weekly', value: 'week' },
  { label: 'Monthly', value: 'month' },
];

const DAYS_OF_WEEK: { label: string; value: DayOfWeek }[] = [
  { label: 'Sun', value: 'sunday' },
  { label: 'Mon', value: 'monday' },
  { label: 'Tue', value: 'tuesday' },
  { label: 'Wed', value: 'wednesday' },
  { label: 'Thu', value: 'thursday' },
  { label: 'Fri', value: 'friday' },
  { label: 'Sat', value: 'saturday' },
];

const AddRecurringPaycheckForm = forwardRef<RecurringPaycheckFormRef, AddRecurringPaycheckFormProps>(
  ({ editingRecurring, onFormChange }, ref) => {
    const [amount, setAmount] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [recurrenceUnit, setRecurrenceUnit] = useState<RecurrenceUnit>('week');
    const [interval, setInterval] = useState('1');
    const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek | ''>('');
    const [dayOfMonth, setDayOfMonth] = useState('');
    const [lastDayOfMonth, setLastDayOfMonth] = useState(false);
    const [lastBusinessDayOfMonth, setLastBusinessDayOfMonth] = useState(false);

    // Pre-populate form when editing
    useEffect(() => {
      console.log('[AddRecurringPaycheckForm] editingRecurring changed:', editingRecurring);
      if (editingRecurring) {
        console.log('[AddRecurringPaycheckForm] Populating form with:', {
          amount: editingRecurring.amount,
          start_date: editingRecurring.start_date,
          end_date: editingRecurring.end_date,
          recurrence_unit: editingRecurring.recurrence_unit,
          interval: editingRecurring.interval,
          day_of_week: editingRecurring.day_of_week,
          day_of_month: editingRecurring.day_of_month,
          last_day_of_month: editingRecurring.last_day_of_month,
          last_business_day_of_month: editingRecurring.last_business_day_of_month,
        });
        setAmount(editingRecurring.amount.toString());
        setStartDate(editingRecurring.start_date);
        setEndDate(editingRecurring.end_date || '');
        setRecurrenceUnit(editingRecurring.recurrence_unit);
        setInterval(editingRecurring.interval.toString());
        setDayOfWeek(editingRecurring.day_of_week || '');
        setDayOfMonth(editingRecurring.day_of_month?.toString() || '');
        setLastDayOfMonth(editingRecurring.last_day_of_month);
        setLastBusinessDayOfMonth(editingRecurring.last_business_day_of_month);
      }
    }, [editingRecurring]);

    // Notify parent when any field changes
    useEffect(() => {
      onFormChange?.();
    }, [amount, startDate, endDate, recurrenceUnit, interval, dayOfWeek, dayOfMonth, lastDayOfMonth, lastBusinessDayOfMonth]);

    // Reset month-specific fields when switching to weekly
    useEffect(() => {
      if (recurrenceUnit === 'week') {
        setDayOfMonth('');
        setLastDayOfMonth(false);
        setLastBusinessDayOfMonth(false);
      } else {
        setDayOfWeek('');
      }
    }, [recurrenceUnit]);

    // Expose form data and reset method
    useImperativeHandle(ref, () => ({
      getFormData: (): RecurringPaycheckFormData => ({
        amount,
        startDate,
        endDate,
        recurrenceUnit,
        interval,
        dayOfWeek,
        dayOfMonth,
        lastDayOfMonth,
        lastBusinessDayOfMonth,
      }),
      resetForm: () => {
        setAmount('');
        setStartDate('');
        setEndDate('');
        setRecurrenceUnit('week');
        setInterval('1');
        setDayOfWeek('');
        setDayOfMonth('');
        setLastDayOfMonth(false);
        setLastBusinessDayOfMonth(false);
      },
      validateForm: (): boolean => {
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) return false;
        if (!startDate) return false;
        
        const intervalNum = parseInt(interval);
        if (isNaN(intervalNum) || intervalNum < 1) return false;

        if (recurrenceUnit === 'week' && !dayOfWeek) return false;
        
        if (recurrenceUnit === 'month') {
          const hasValidDayOfMonth = dayOfMonth && parseInt(dayOfMonth) >= 1 && parseInt(dayOfMonth) <= 31;
          if (!hasValidDayOfMonth && !lastDayOfMonth && !lastBusinessDayOfMonth) return false;
        }

        return true;
      },
    }));

    return (
    <View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
      </View>

      <DateInput
        label="Start Date"
        value={startDate}
        onChangeDate={setStartDate}
      />

      <DateInput
        label="End Date (Optional)"
        value={endDate}
        onChangeDate={setEndDate}
      />

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Frequency</Text>
        <PillPicker
          options={RECURRENCE_UNITS}
          selectedValue={recurrenceUnit}
          onSelect={(value) => setRecurrenceUnit(value as RecurrenceUnit)}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Repeat Every</Text>
        <View style={styles.intervalContainer}>
          <TextInput
            style={[styles.input, styles.intervalInput]}
            value={interval}
            onChangeText={setInterval}
            placeholder="1"
            keyboardType="number-pad"
          />
          <Text style={styles.intervalUnit}>
            {recurrenceUnit === 'week' ? (interval === '1' ? 'week' : 'weeks') : (interval === '1' ? 'month' : 'months')}
          </Text>
        </View>
      </View>

      {recurrenceUnit === 'week' && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Day of Week</Text>
          <PillPicker
            options={DAYS_OF_WEEK}
            selectedValue={dayOfWeek}
            onSelect={(value) => setDayOfWeek(value as DayOfWeek)}
          />
        </View>
      )}

      {recurrenceUnit === 'month' && (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Day of Month</Text>
            <TextInput
              style={styles.input}
              value={dayOfMonth}
              onChangeText={setDayOfMonth}
              placeholder="1-31"
              keyboardType="number-pad"
              editable={!lastDayOfMonth && !lastBusinessDayOfMonth}
            />
            <Text style={styles.helperText}>
              Leave blank if using last day options below
            </Text>
          </View>

          <View style={styles.switchGroup}>
            <Text style={styles.switchLabel}>Last Day of Month</Text>
            <Switch
              value={lastDayOfMonth}
              onValueChange={(value) => {
                setLastDayOfMonth(value);
                if (value) {
                  setDayOfMonth('');
                  setLastBusinessDayOfMonth(false);
                }
              }}
            />
          </View>

          <View style={styles.switchGroup}>
            <Text style={styles.switchLabel}>Last Business Day of Month</Text>
            <Switch
              value={lastBusinessDayOfMonth}
              onValueChange={(value) => {
                setLastBusinessDayOfMonth(value);
                if (value) {
                  setDayOfMonth('');
                  setLastDayOfMonth(false);
                }
              }}
            />
          </View>
        </>
      )}
    </View>
  );
});

AddRecurringPaycheckForm.displayName = 'AddRecurringPaycheckForm';

export default AddRecurringPaycheckForm;

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  intervalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  intervalInput: {
    flex: 0,
    width: 80,
  },
  intervalUnit: {
    fontSize: 16,
    color: '#666',
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
});
