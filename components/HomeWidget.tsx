import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HomeWidgetProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  backgroundColor: string;
  onPress: () => void;
  children?: ReactNode;
  style?: ViewStyle;
}

export default function HomeWidget({
  icon,
  title,
  backgroundColor,
  onPress,
  children,
  style,
}: HomeWidgetProps) {
  return (
    <TouchableOpacity
      style={[styles.widget, { backgroundColor }, style]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={32} color="white" />
      <Text style={styles.widgetTitle}>{title}</Text>
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  widget: {
    width: '48%',
    aspectRatio: 1.2,
    borderRadius: 16,
    padding: 20,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  widgetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginTop: 8,
  },
});
