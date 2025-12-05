import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface PillPickerProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  labels?: Record<T, string>;
}

export default function PillPicker<T extends string>({
  options,
  value,
  onChange,
  labels,
}: PillPickerProps<T>) {
  return (
    <View style={styles.container}>
      {options.map((option, index) => {
        const isSelected = option === value;
        const isFirst = index === 0;
        const isLast = index === options.length - 1;
        
        return (
          <TouchableOpacity
            key={option}
            style={[
              styles.pill,
              isSelected && styles.pillSelected,
              isFirst && styles.pillFirst,
              isLast && styles.pillLast,
              !isFirst && !isLast && styles.pillMiddle,
            ]}
            onPress={() => onChange(option)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
              {labels?.[option] || option}
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
