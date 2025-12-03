import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';

interface DateInputProps {
  label: string;
  value: string;
  onChangeDate: (date: string) => void;
  placeholder?: string;
}

export default function DateInput({
  label,
  value,
  onChangeDate,
  placeholder = 'MM/DD/YYYY',
}: DateInputProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [displayValue, setDisplayValue] = useState('');

  // Convert YYYY-MM-DD to MM/DD/YYYY for display
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Convert MM/DD/YYYY to YYYY-MM-DD for storage
  const formatStorageDate = (dateStr: string) => {
    const cleaned = dateStr.replace(/\D/g, '');
    if (cleaned.length >= 8) {
      const month = cleaned.substring(0, 2);
      const day = cleaned.substring(2, 4);
      const year = cleaned.substring(4, 8);
      return `${year}-${month}-${day}`;
    }
    return '';
  };

  // Format input as user types MM/DD/YYYY
  const handleTextChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = '';

    if (cleaned.length > 0) {
      formatted = cleaned.substring(0, 2);
      if (cleaned.length >= 3) {
        formatted += '/' + cleaned.substring(2, 4);
      }
      if (cleaned.length >= 5) {
        formatted += '/' + cleaned.substring(4, 8);
      }
    }

    setDisplayValue(formatted);

    // Only update parent if we have a complete date
    if (cleaned.length === 8) {
      const storageDate = formatStorageDate(formatted);
      onChangeDate(storageDate);
    }
  };

  const handleCalendarSelect = (day: any) => {
    onChangeDate(day.dateString);
    setDisplayValue(formatDisplayDate(day.dateString));
    setShowCalendar(false);
  };

  // Initialize and sync display value from prop
  React.useEffect(() => {
    if (value) {
      setDisplayValue(formatDisplayDate(value));
    } else {
      setDisplayValue('');
    }
  }, [value]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={displayValue}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          keyboardType="number-pad"
          maxLength={10}
        />
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setShowCalendar(true)}
        >
          <Ionicons name="calendar-outline" size={24} color="#3498db" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={showCalendar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCalendar(false)}
        >
          <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Calendar
              onDayPress={handleCalendarSelect}
              markedDates={
                value
                  ? {
                      [value]: {
                        selected: true,
                        selectedColor: '#3498db',
                      },
                    }
                  : {}
              }
              theme={{
                todayTextColor: '#3498db',
                selectedDayBackgroundColor: '#3498db',
                selectedDayTextColor: '#ffffff',
                arrowColor: '#3498db',
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  iconButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: '90%',
    maxWidth: 400,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
});
