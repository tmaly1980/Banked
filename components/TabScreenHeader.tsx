import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface TabScreenHeaderProps {
  title: string;
  rightContent?: ReactNode;
  style?: ViewStyle;
}

export default function TabScreenHeader({ title, rightContent, style }: TabScreenHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      <Text style={styles.headerTitle}>{title}</Text>
      {rightContent && <View style={styles.rightContent}>{rightContent}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#2c3e50',
    paddingTop: 0,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
