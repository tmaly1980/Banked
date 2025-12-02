import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';

interface DayOfMonthInputProps {
  label: string;
  value: string; // day as string (1-31)
  onChangeDay: (day: string) => void;
  placeholder?: string;
}

export default function DayOfMonthInput({
  label,
  value,
  onChangeDay,
  placeholder = 'Day (1-31)',
}: DayOfMonthInputProps) {
  const [showCalendar, setShowCalendar] = useState(false);

  const handleTextChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned === '' || (parseInt(cleaned) >= 1 && parseInt(cleaned) <= 31)) {
      onChangeDay(cleaned);
    }
  };

  const handleCalendarSelect = (day: any) => {
    // Extract day of month from selected date (format: YYYY-MM-DD)
    const dayOfMonth = day.dateString.split('-')[2].replace(/^0/, '');
    onChangeDay(dayOfMonth);
    setShowCalendar(false);
  };

  // Create a date string for calendar display (using current month/year)
  const getCalendarDate = () => {
    if (!value) return undefined;
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(value).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          keyboardType="number-pad"
          maxLength={2}
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
              <Text style={styles.calendarTitle}>Select Day of Month</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>
              Tap any date to select the day of month
            </Text>
            <Calendar
              onDayPress={handleCalendarSelect}
              markedDates={
                getCalendarDate()
                  ? {
                      [getCalendarDate()!]: {
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
    marginBottom: 8,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  helperText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 12,
    fontStyle: 'italic',
  },
});
