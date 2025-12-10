import React, { useEffect, useRef } from 'react';
import { Text, Animated, TextStyle } from 'react-native';

interface AnimatedNumberProps {
  value: number;
  style?: TextStyle | TextStyle[];
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
}

export default function AnimatedNumber({ 
  value, 
  style, 
  prefix = '', 
  suffix = '',
  decimals = 2,
  duration = 1000,
}: AnimatedNumberProps) {
  const animatedValue = useRef(new Animated.Value(value)).current;
  const displayValue = useRef(value);

  useEffect(() => {
    // Store the current display value
    const currentValue = displayValue.current;

    // Animate to the new value
    Animated.timing(animatedValue, {
      toValue: value,
      duration,
      useNativeDriver: false,
    }).start();

    // Update display value
    displayValue.current = value;
  }, [value, duration]);

  const [displayText, setDisplayText] = React.useState(
    `${prefix}${value.toFixed(decimals)}${suffix}`
  );

  useEffect(() => {
    const listener = animatedValue.addListener(({ value: animValue }) => {
      setDisplayText(`${prefix}${animValue.toFixed(decimals)}${suffix}`);
    });

    return () => {
      animatedValue.removeListener(listener);
    };
  }, [animatedValue, prefix, suffix, decimals]);

  return <Text style={style}>{displayText}</Text>;
}
