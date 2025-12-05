import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface WeeklyCardProps {
  title: string;
  headerRight?: ReactNode;
  subheading?: ReactNode;
  children: ReactNode;
  containerStyle?: ViewStyle;
  titleStyle?: TextStyle;
}

export default function WeeklyCard({
  title,
  headerRight,
  subheading,
  children,
  containerStyle,
  titleStyle,
}: WeeklyCardProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={[styles.title, titleStyle]}>{title}</Text>
        {headerRight && <View style={styles.headerRight}>{headerRight}</View>}
      </View>

      {/* Card Content */}
      <View style={styles.card}>
        {/* Subheading (e.g., progress bar) */}
        {subheading && <View style={styles.subheading}>{subheading}</View>}

        {/* Card children (rows) */}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  subheading: {
    // Container for progress bar or other subheading content
  },
});
