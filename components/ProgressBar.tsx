import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface ProgressBarProps {
  current: number;
  total: number;
  formatAmount?: (amount: number) => string;
  onLeftPress?: () => void;
  leftPressable?: boolean;
}

const getProgressBarColor = (progressPercentage: number) => {
  if (progressPercentage >= 100) return '#27ae60'; // success
  if (progressPercentage >= 75) return '#f39c12'; // moderate
  if (progressPercentage >= 50) return '#3498db'; // info
  if (progressPercentage >= 25) return '#e67e22'; // warning
  return '#e74c3c'; // danger
};

export default function ProgressBar({
  current,
  total,
  formatAmount = (amount: number) => `$${Math.abs(amount).toFixed(0)}`,
  onLeftPress,
  leftPressable = false,
}: ProgressBarProps) {
  const progressPercentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  const remaining = current - total;

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressWrapper}>
        <View style={styles.progressBackground}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${progressPercentage}%`,
                backgroundColor: getProgressBarColor(progressPercentage),
              },
            ]}
          />
        </View>

        {/* Left amount (current) */}
        {leftPressable ? (
          <TouchableOpacity
            style={styles.leftTextWrapper}
            onPress={onLeftPress}
            activeOpacity={0.7}
            disabled={!onLeftPress}
          >
            <Text style={styles.leftText}>
              {formatAmount(current)}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.leftTextWrapper}>
            <Text style={styles.leftText}>
              {formatAmount(current)}
            </Text>
          </View>
        )}

        {/* Right amount (remaining) */}
        <Text style={[styles.rightText, remaining >= 0 && styles.rightTextNonNegative]}>
          {remaining >= 0 ? '$0' : formatAmount(remaining)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  progressWrapper: {
    position: 'relative',
    height: 32,
  },
  progressBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ecf0f1',
    borderRadius: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 16,
  },
  leftTextWrapper: {
    position: 'absolute',
    left: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  leftText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  rightText: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e74c3c',
    textAlignVertical: 'center',
    lineHeight: 32,
  },
  rightTextNonNegative: {
    color: '#95a5a6',
  },
});
