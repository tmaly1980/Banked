import React, { useRef } from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';

interface AmountInputProps extends Omit<TextInputProps, 'keyboardType' | 'selectTextOnFocus'> {
  value: string;
  onChangeText: (text: string) => void;
}

export default function AmountInput({ value, onChangeText, style, ...props }: AmountInputProps) {
  const inputRef = useRef<TextInput>(null);

  const handleFocus = () => {
    // Select all text on focus so typing replaces the value
    if (inputRef.current) {
      inputRef.current.setNativeProps({
        selection: { start: 0, end: value.length }
      });
    }
  };

  return (
    <TextInput
      ref={inputRef}
      style={[styles.input, style]}
      value={value}
      onChangeText={onChangeText}
      onFocus={handleFocus}
      keyboardType="decimal-pad"
      selectTextOnFocus={true}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
});
