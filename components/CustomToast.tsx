import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ToastConfig {
  type: 'success' | 'error' | 'info';
  text1: string;
  text2?: string;
}

interface ToastContextType {
  show: (config: ToastConfig) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

  const show = useCallback((config: ToastConfig) => {
    setToast(config);
  }, []);

  useEffect(() => {
    if (toast) {
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after 3 seconds
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setToast(null);
        });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [toast, fadeAnim, slideAnim]);

  const getToastColor = () => {
    switch (toast?.type) {
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
    switch (toast?.type) {
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
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              backgroundColor: getToastColor(),
            },
          ]}
        >
          <Ionicons name={getIconName()} size={24} color="#fff" style={styles.icon} />
          <View style={styles.textContainer}>
            <Text style={styles.text1}>{toast.text1}</Text>
            {toast.text2 && <Text style={styles.text2}>{toast.text2}</Text>}
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 999999,
    zIndex: 999999,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  text1: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  text2: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
    opacity: 0.9,
  },
});
