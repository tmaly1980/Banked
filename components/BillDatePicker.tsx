import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, getDaysInMonth, startOfMonth, getDay } from 'date-fns';

interface BillDatePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (date: string) => void;
  onSelectDay: (day: number, selectedMonth?: Date) => void;
  onClear: () => void;
  isRecurring: boolean;
  onToggleRecurring: (value: boolean) => void;
  selectedDate?: string;
  selectedDay?: number;
}

export default function BillDatePicker({
  visible,
  onClose,
  onSelectDate,
  onSelectDay,
  onClear,
  isRecurring,
  onToggleRecurring,
  selectedDate,
  selectedDay,
}: BillDatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tempDate, setTempDate] = useState<string | undefined>(selectedDate);
  const [tempDay, setTempDay] = useState<number | undefined>(selectedDay);
  const [tempRecurring, setTempRecurring] = useState(isRecurring);
  
  useEffect(() => {
    if (visible) {
      setTempDate(selectedDate);
      setTempDay(selectedDay);
      setTempRecurring(isRecurring);
      if (selectedDate && !isRecurring) {
        setCurrentMonth(new Date(selectedDate));
      }
    }
  }, [visible, selectedDate, selectedDay, isRecurring]);

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDayOfMonth = getDay(startOfMonth(currentMonth));
  const monthYear = format(currentMonth, 'MMMM yyyy');

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDayPress = (day: number) => {
    if (tempRecurring) {
      setTempDay(day);
      setTempDate(undefined);
    } else {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      setTempDate(format(date, 'yyyy-MM-dd'));
      setTempDay(undefined);
    }
  };

  const handleSave = () => {
    if (tempRecurring && tempDay) {
      onSelectDay(tempDay, currentMonth);
    } else if (!tempRecurring && tempDate) {
      onSelectDate(tempDate);
    }
    onToggleRecurring(tempRecurring);
    onClose();
  };

  const handleCancel = () => {
    setTempDate(selectedDate);
    setTempDay(selectedDay);
    setTempRecurring(isRecurring);
    onClose();
  };

  const getSelectedValue = () => {
    if (tempRecurring && tempDay) {
      return tempDay;
    } else if (!tempRecurring && tempDate) {
      // Parse date string as local date to avoid timezone issues
      const [year, month, day] = tempDate.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      if (date.getMonth() === currentMonth.getMonth() && 
          date.getFullYear() === currentMonth.getFullYear()) {
        return date.getDate();
      }
    }
    return null;
  };

  const selectedValue = getSelectedValue();

  const renderCalendar = () => {
    const days = [];
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Week day headers
    weekDays.forEach(day => {
      days.push(
        <View key={`header-${day}`} style={styles.weekDay}>
          <Text style={styles.weekDayText}>{day}</Text>
        </View>
      );
    });

    // Empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = selectedValue === day;
      days.push(
        <TouchableOpacity
          key={`day-${day}`}
          style={[styles.dayCell, isSelected && styles.selectedDay]}
          onPress={() => handleDayPress(day)}
        >
          <Text style={[styles.dayText, isSelected && styles.selectedDayText]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return days;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>
              {tempRecurring ? 'Day of Month Due' : 'Due Date'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* Recurring Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, !tempRecurring && styles.toggleButtonActive]}
              onPress={() => setTempRecurring(false)}
            >
              <Text style={[styles.toggleText, !tempRecurring && styles.toggleTextActive]}>
                One-time
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, tempRecurring && styles.toggleButtonActive]}
              onPress={() => setTempRecurring(true)}
            >
              <Text style={[styles.toggleText, tempRecurring && styles.toggleTextActive]}>
                Recurring
              </Text>
            </TouchableOpacity>
          </View>

          {/* Month Navigation - shown for both recurring and one-time */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
              <Ionicons name="chevron-back" size={24} color="#2c3e50" />
            </TouchableOpacity>
            <Text style={styles.monthYear}>{monthYear}</Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
              <Ionicons name="chevron-forward" size={24} color="#2c3e50" />
            </TouchableOpacity>
          </View>

          {/* Calendar Grid */}
          <ScrollView style={styles.calendar}>
            <View style={styles.calendarGrid}>
              {renderCalendar()}
            </View>
          </ScrollView>

          {/* Clear Button */}
          <TouchableOpacity style={styles.clearButton} onPress={() => {
            setTempDate(undefined);
            setTempDay(undefined);
            onClear();
            onClose();
          }}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  cancelButton: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  saveButton: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#ecf0f1',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#3498db',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  toggleTextActive: {
    color: 'white',
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  navButton: {
    padding: 8,
  },
  monthYear: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  recurringHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    alignItems: 'center',
  },
  recurringText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  calendar: {
    maxHeight: 400,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  weekDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  dayCell: {
    width: '12%',
    marginHorizontal: 4,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    // padding: 4,
  },
  dayText: {
    fontSize: 16,
    color: '#2c3e50',
    paddingVertical: 10,
  },
  selectedDay: {
    backgroundColor: '#3498db',
    borderRadius: 50,
    margin: 0,
  },
  selectedDayText: {
    color: 'white',
    fontWeight: 'bold',
  },
  clearButton: {
    margin: 16,
    padding: 14,
    backgroundColor: '#ecf0f1',
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e74c3c',
  },
});
