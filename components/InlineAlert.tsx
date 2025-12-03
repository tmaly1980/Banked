import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface InlineAlertProps {
  type: 'success' | 'error' | 'info';
  message: string;
  visible: boolean;
  onDismiss?: () => void;
  autoDismiss?: boolean;
  autoDismissDelay?: number;
}

export const InlineAlert = ({ 
  type, 
  message, 
  visible,
  onDismiss,
  autoDismiss = true,
  autoDismissDelay = 3000
}: InlineAlertProps) => {
  const [fadeAnim] = React.useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      if (autoDismiss && onDismiss) {
        const timer = setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onDismiss();
          });
        }, autoDismissDelay);

        return () => clearTimeout(timer);
      }
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, autoDismiss, autoDismissDelay, onDismiss]);

  if (!visible && fadeAnim._value === 0) {
    return null;
  }

  const getAlertColor = () => {
    switch (type) {
      case 'success':
        return '#27ae60';
      case 'error':
        return '#e74c3c';
      case 'info':
        return '#3498db';
      default:
        return '#3498db';
    }
  };

  const getIconName = (): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'info':
        return 'information-circle';
      default:
        return 'information-circle';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { 
          backgroundColor: getAlertColor(),
          opacity: fadeAnim,
        },
      ]}
    >
      <Ionicons name={getIconName()} size={20} color="#fff" style={styles.icon} />
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  icon: {
    marginRight: 10,
  },
  message: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
