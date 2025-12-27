import React, { useRef } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDollar } from '@/lib/utils';

interface SwipeableBillRowProps {
  billName: string;
  billAmount: number;
  runningTotal: number;
  isDeferred: boolean;
  onSwipeOpen?: () => void;
  onDollarPress: () => void;
}

export default function SwipeableBillRow({
  billName,
  billAmount,
  runningTotal,
  isDeferred,
  onSwipeOpen,
  onDollarPress,
}: SwipeableBillRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const SWIPE_THRESHOLD = -60;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, SWIPE_THRESHOLD));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < SWIPE_THRESHOLD / 2) {
          Animated.spring(translateX, {
            toValue: SWIPE_THRESHOLD,
            useNativeDriver: true,
          }).start();
          if (onSwipeOpen) onSwipeOpen();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.hiddenContent}
        onPress={onDollarPress}
        activeOpacity={0.7}
      >
        <Ionicons name="logo-usd" size={24} color="white" />
      </TouchableOpacity>
      
      <Animated.View
        style={[styles.visibleContent, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.entryInfo}>
          <View style={styles.billNameContainer}>
            <Text style={styles.entryDescription}>{billName}</Text>
            {isDeferred && (
              <Ionicons name="pause-circle-outline" size={16} color="#95a5a6" style={styles.deferredIcon} />
            )}
          </View>
          <Text style={[styles.entryAmount, styles.billAmount]}>
            {formatDollar(-billAmount, true)}
          </Text>
        </View>
        <Text style={styles.runningTotal}>{formatDollar(runningTotal)}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 1,
  },
  hiddenContent: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
  },
  visibleContent: {
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  entryInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deferredIcon: {
    marginLeft: 8,
  },
  entryDescription: {
    fontSize: 16,
    color: '#2c3e50',
  },
  entryAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  billAmount: {
    color: '#e74c3c',
  },
  runningTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 12,
    minWidth: 80,
    textAlign: 'right',
  },
});
