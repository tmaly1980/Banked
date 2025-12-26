import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

export default function Budget() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Track your spending categories</Text>
      <Text style={[styles.placeholder, { fontSize: 14, marginTop: 8 }]}>Set budgets and monitor expenses</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholder: {
    fontSize: 16,
    color: '#95a5a6',
    textAlign: 'center',
  },
});
