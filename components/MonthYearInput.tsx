import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MonthYearPicker from './MonthYearPicker';
import { format } from 'date-fns';

interface MonthYearInputProps {
  label: string;
  value: string;
  onChangeValue: (monthYear: string) => void;
  placeholder?: string;
  preselectedDate?: Date;
  showClearButton?: boolean;
}

export default function MonthYearInput({
  label,
  value,
  onChangeValue,
  placeholder = 'Select month',
  preselectedDate,
  showClearButton = true,
}: MonthYearInputProps) {
  const [showPicker, setShowPicker] = useState(false);

  const formatMonthYearDisplay = (monthYear: string) => {
    if (!monthYear) return placeholder;
    const [year, month] = monthYear.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return format(date, 'MMMM yyyy');
  };

  return (
    <>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity
          style={styles.monthYearButton}
          onPress={() => setShowPicker(true)}
        >
          <Text style={[styles.monthYearButtonText, !value && styles.placeholderText]}>
            {formatMonthYearDisplay(value)}
          </Text>
          {value && showClearButton && (
            <TouchableOpacity
              style={styles.clearIcon}
              onPress={(e) => {
                e.stopPropagation();
                onChangeValue('');
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.clearIconText}>⊗</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>

      <MonthYearPicker
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={(monthYear) => {
          onChangeValue(monthYear);
          setShowPicker(false);
        }}
        selectedMonthYear={value}
        preselectedDate={preselectedDate}
      />
    </>
  );
}

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#333',
  },
  monthYearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  monthYearButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  clearIcon: {
    marginLeft: 8,
    padding: 4,
  },
  clearIconText: {
    fontSize: 20,
    color: '#95a5a6',
    lineHeight: 20,
  },
});
