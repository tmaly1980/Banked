import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { Ionicons } from '@expo/vector-icons';

interface SelectPickerProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  items: Array<{ label: string; value: string }>;
  placeholder?: string;
}

export default function SelectPicker({
  label,
  value,
  onValueChange,
  items,
  placeholder = 'Select...',
}: SelectPickerProps) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.pickerContainer}>
        <RNPickerSelect
          value={value}
          onValueChange={onValueChange}
          items={items}
          placeholder={{ label: placeholder, value: '' }}
          useNativeAndroidPickerStyle={false}
          style={pickerSelectStyles}
          pickerProps={{
              itemStyle: {
                fontSize: 20,
                color: '#2c3e50',
              }
          }}
          Icon={() => <Ionicons name="chevron-down" size={20} color="#7f8c8d" />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    marginTop: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    minHeight: 48,
    justifyContent: 'center',
  },
});

const pickerSelectStyles = {
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    paddingRight: 40,
    color: '#2c3e50',
    backgroundColor: '#fff',
  },
  inputIOSContainer: {
    zIndex: 99999,
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingRight: 40,
    color: '#2c3e50',
    backgroundColor: '#fff',
  },
  placeholder: {
    color: '#95a5a6',
  },
  iconContainer: {
    top: 12,
    right: 12,
    pointerEvents: 'none' as const,
  },
  modalViewTop: {
    flex: 1,
  },
  modalViewMiddle: {
    // flex: 1,
    // height: '50%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  dropdownItemStyle: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  }
};
