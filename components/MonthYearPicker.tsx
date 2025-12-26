import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { format } from 'date-fns';

interface MonthYearPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (monthYear: string) => void; // Format: "YYYY-MM"
  selectedMonthYear?: string; // Format: "YYYY-MM"
  preselectedDate?: Date; // Used to preselect based on next_due_date
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;

export default function MonthYearPicker({
  visible,
  onClose,
  onSelect,
  selectedMonthYear,
  preselectedDate,
}: MonthYearPickerProps) {
  const scrollRef = useRef<ScrollView>(null);

  // Generate list of month-year options (±12 months from now)
  const generateMonthYearOptions = () => {
    const options = [];
    const now = new Date();
    
    for (let i = -12; i <= 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const display = format(date, 'MMMM yyyy');
      options.push({ value: monthYear, display });
    }
    
    return options;
  };

  const monthYearOptions = generateMonthYearOptions();
  
  // Always preselect current month/year (index 12 in the array)
  const getInitialIndex = () => 12;

  const [selectedIndex, setSelectedIndex] = useState(getInitialIndex());

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    setSelectedIndex(index);
  };

  useEffect(() => {
    if (visible) {
      const initialIndex = getInitialIndex();
      setSelectedIndex(initialIndex);
      
      // Scroll to selected value after a short delay
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          y: initialIndex * ITEM_HEIGHT,
          animated: false,
        });
      }, 100);
    }
  }, [visible]);

  const handleSave = () => {
    const monthYear = monthYearOptions[selectedIndex].value;
    onSelect(monthYear);
    onClose();
  };

  const handleItemPress = (index: number) => {
    setSelectedIndex(index);
    scrollRef.current?.scrollTo({
      y: index * ITEM_HEIGHT,
      animated: true,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Select Applied Date</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.scrollWheelContainer}>
            <View style={styles.scrollWheel}>
              <ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={handleScroll}
                onScrollEndDrag={handleScroll}
                contentContainerStyle={{
                  paddingVertical: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
                }}
              >
                {monthYearOptions.map((option, index) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.scrollItem,
                      selectedIndex === index && styles.selectedScrollItem,
                    ]}
                    onPress={() => handleItemPress(index)}
                  >
                    <Text
                      style={[
                        styles.scrollItemText,
                        selectedIndex === index && styles.selectedScrollItemText,
                      ]}
                    >
                      {option.display}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.selectionIndicator} pointerEvents="none" />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
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
  displayValue: {
    paddingVertical: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  displayText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  scrollWheelContainer: {
    flexDirection: 'row',
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    paddingVertical: 20,
  },
  scrollWheel: {
    flex: 1,
    position: 'relative',
  },
  scrollItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollItemText: {
    fontSize: 18,
    color: '#95a5a6',
  },
  selectedScrollItem: {
    // Style handled by text color
  },
  selectedScrollItemText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  selectionIndicator: {
    position: 'absolute',
    top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#3498db',
    backgroundColor: 'transparent',
  },
});
