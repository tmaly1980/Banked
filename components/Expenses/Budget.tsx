import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

export default function Budget() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Budget component coming soon...</Text>
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
