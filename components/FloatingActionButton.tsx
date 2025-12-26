import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface FABOption {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

interface FloatingActionButtonProps {
  options: FABOption[];
  mainButtonColor?: string;
  optionButtonColor?: string;
}

export default function FloatingActionButton({
  options,
  mainButtonColor = '#3498db',
  optionButtonColor = '#3498db',
}: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOptionPress = (onPress: () => void) => {
    onPress();
    setIsOpen(false);
  };

  return (
    <View style={styles.fabContainer}>
      {isOpen && (
        <>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.fabOption}
              onPress={() => handleOptionPress(option.onPress)}
            >
              <View style={styles.fabLabel}>
                <Text style={styles.fabLabelText}>{option.label}</Text>
              </View>
              <View style={[styles.fabOptionButton, { backgroundColor: optionButtonColor }]}>
                <Ionicons name={option.icon} size={24} color="white" />
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: isOpen ? '#e74c3c' : mainButtonColor },
        ]}
        onPress={() => setIsOpen(!isOpen)}
      >
        <Ionicons name={isOpen ? "close" : "add"} size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    alignItems: 'flex-end',
  },
  fabOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  fabLabel: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  fabLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  fabOptionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
});
