import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { format } from 'date-fns';

interface DayOrDateInputProps {
  value?: string | number; // Date string (yyyy-MM-dd) or day number (1-31)
  isRecurring: boolean;
  onPress: () => void;
  placeholder?: string;
  style?: any;
  startMonthYear?: string | null; // Format: YYYY-MM
}

export default function DayOrDateInput({
  value,
  isRecurring,
  onPress,
  placeholder = 'Select date',
  style,
  startMonthYear,
}: DayOrDateInputProps) {
  const formatStartMonth = () => {
    if (!startMonthYear || !isRecurring) return null;
    const [year, month] = startMonthYear.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return format(date, 'MMMM yyyy');
  };
  const getDaySuffix = (day: number) => {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const getDisplayValue = () => {
    if (!value) return placeholder;
    
    if (isRecurring && typeof value === 'number') {
      return `Every ${value}${getDaySuffix(value)}`;
    } else if (!isRecurring && typeof value === 'string') {
      // Parse date string and format as MM/DD
      const [year, month, day] = value.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return format(date, 'MM/dd');
    }
    return placeholder;
  };

  const isPlaceholder = !value;
  const startingMonth = formatStartMonth();

  return (
    <View>
      <TouchableOpacity
        style={[styles.input, style]}
        onPress={onPress}
      >
        <Text style={[styles.inputText, isPlaceholder && styles.placeholderText]}>
          {getDisplayValue()}
        </Text>
      </TouchableOpacity>
      {startingMonth && (
        <Text style={styles.startingMonthText}>
          Starting {startingMonth}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
  },
  inputText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  placeholderText: {
    color: '#95a5a6',
  },
  startingMonthText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
