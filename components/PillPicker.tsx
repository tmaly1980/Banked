import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface PillOption<T = string> {
  label: string;
  value: T;
}

interface PillPickerProps<T = string> {
  options: PillOption<T>[] | readonly T[];
  selectedValue?: T;
  value?: T;
  onSelect?: (value: T) => void;
  onChange?: (value: T) => void;
}

export default function PillPicker<T = string>({
  options,
  selectedValue,
  value,
  onSelect,
  onChange,
}: PillPickerProps<T>) {
  const currentValue = selectedValue ?? value;
  const handleChange = onSelect ?? onChange;

  if (!handleChange) {
    console.error('[PillPicker] Either onSelect or onChange must be provided');
    return null;
  }

  // Check if options are objects with label/value or simple values
  const isObjectOptions = options.length > 0 && typeof options[0] === 'object' && 'label' in options[0];

  return (
    <View style={styles.container}>
      {options.map((option, index) => {
        const optionValue = isObjectOptions ? (option as PillOption<T>).value : (option as T);
        const optionLabel = isObjectOptions ? (option as PillOption<T>).label : String(option);
        const isSelected = optionValue === currentValue;
        const isFirst = index === 0;
        const isLast = index === options.length - 1;
        
        return (
          <TouchableOpacity
            key={String(optionValue)}
            style={[
              styles.pill,
              isSelected && styles.pillSelected,
              isFirst && styles.pillFirst,
              isLast && styles.pillLast,
              !isFirst && !isLast && styles.pillMiddle,
            ]}
            onPress={() => handleChange(optionValue)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
              {optionLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dfe6e9',
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#dfe6e9',
  },
  pillFirst: {
    borderTopLeftRadius: 7,
    borderBottomLeftRadius: 7,
  },
  pillLast: {
    borderTopRightRadius: 7,
    borderBottomRightRadius: 7,
    borderRightWidth: 0,
  },
  pillMiddle: {
    // No special border radius for middle pills
  },
  pillSelected: {
    backgroundColor: '#3498db',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  pillTextSelected: {
    color: '#fff',
  },
});
