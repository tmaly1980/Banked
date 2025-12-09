import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CalculatorInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
}

export default function CalculatorInput({ value, onChangeText, label, ...props }: CalculatorInputProps) {
  const [showCalculator, setShowCalculator] = useState(false);
  const [display, setDisplay] = useState('0');
  const [currentValue, setCurrentValue] = useState('');
  const [operation, setOperation] = useState<string | null>(null);
  const [previousValue, setPreviousValue] = useState('');

  const handleNumberPress = (num: string) => {
    if (display === '0' || display === 'Error') {
      setDisplay(num);
    } else {
      setDisplay(display + num);
    }
  };

  const handleDecimalPress = () => {
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleOperationPress = (op: string) => {
    if (operation && previousValue) {
      handleEquals();
    }
    setPreviousValue(display);
    setOperation(op);
    setDisplay('0');
  };

  const handleEquals = () => {
    if (!operation || !previousValue) return;

    const prev = parseFloat(previousValue);
    const current = parseFloat(display);
    let result = 0;

    switch (operation) {
      case '+':
        result = prev + current;
        break;
      case '-':
        result = prev - current;
        break;
      case '×':
        result = prev * current;
        break;
      case '÷':
        result = current !== 0 ? prev / current : 0;
        break;
    }

    setDisplay(result.toString());
    setOperation(null);
    setPreviousValue('');
  };

  const handleClear = () => {
    setDisplay('0');
    setOperation(null);
    setPreviousValue('');
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const handleDone = () => {
    let finalValue = display;
    
    // If there's a pending operation, execute it first
    if (operation && previousValue) {
      const prev = parseFloat(previousValue);
      const current = parseFloat(display);
      let result = 0;

      switch (operation) {
        case '+':
          result = prev + current;
          break;
        case '-':
          result = prev - current;
          break;
        case '×':
          result = prev * current;
          break;
        case '÷':
          result = current !== 0 ? prev / current : 0;
          break;
      }
      
      finalValue = result.toString();
    }
    
    onChangeText(finalValue);
    setShowCalculator(false);
    handleClear();
  };

  const openCalculator = () => {
    if (value) {
      setDisplay(value);
    }
    setShowCalculator(true);
  };

  return (
    <>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputContainer}>
        <TextInput
          {...props}
          style={[styles.input, props.style]}
          value={value}
          onChangeText={onChangeText}
        />
        <TouchableOpacity style={styles.calculatorButton} onPress={openCalculator}>
          <Ionicons name="calculator" size={20} color="#9b59b6" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={showCalculator}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCalculator(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowCalculator(false)}
          />
          <View style={styles.calculator}>
            <View style={styles.calcHeader}>
              <Text style={styles.calcTitle}>Calculator</Text>
              <TouchableOpacity onPress={() => setShowCalculator(false)}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.displayContainer}>
              <Text style={styles.display}>{display}</Text>
            </View>

            <View style={styles.buttonGrid}>
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.button} onPress={handleClear}>
                  <Text style={styles.buttonTextSecondary}>C</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={handleBackspace}>
                  <Ionicons name="backspace-outline" size={24} color="#e74c3c" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => handleOperationPress('÷')}>
                  <Text style={styles.buttonTextOperation}>÷</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.button} onPress={() => handleNumberPress('7')}>
                  <Text style={styles.buttonText}>7</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => handleNumberPress('8')}>
                  <Text style={styles.buttonText}>8</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => handleNumberPress('9')}>
                  <Text style={styles.buttonText}>9</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => handleOperationPress('×')}>
                  <Text style={styles.buttonTextOperation}>×</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.button} onPress={() => handleNumberPress('4')}>
                  <Text style={styles.buttonText}>4</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => handleNumberPress('5')}>
                  <Text style={styles.buttonText}>5</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => handleNumberPress('6')}>
                  <Text style={styles.buttonText}>6</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => handleOperationPress('-')}>
                  <Text style={styles.buttonTextOperation}>−</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.button} onPress={() => handleNumberPress('1')}>
                  <Text style={styles.buttonText}>1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => handleNumberPress('2')}>
                  <Text style={styles.buttonText}>2</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => handleNumberPress('3')}>
                  <Text style={styles.buttonText}>3</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => handleOperationPress('+')}>
                  <Text style={styles.buttonTextOperation}>+</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={[styles.button, styles.buttonWide]} onPress={() => handleNumberPress('0')}>
                  <Text style={styles.buttonText}>0</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={handleDecimalPress}>
                  <Text style={styles.buttonText}>.</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.buttonDone]} onPress={handleDone}>
                  <Text style={styles.buttonTextDone}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  input: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    paddingRight: 48,
    fontSize: 16,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  calculatorButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  calculator: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  calcHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  calcTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  cancelButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  displayContainer: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  display: {
    fontSize: 48,
    fontWeight: '300',
    color: '#2c3e50',
  },
  buttonGrid: {
    padding: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  buttonWide: {
    flex: 2,
  },
  buttonDone: {
    backgroundColor: '#9b59b6',
    borderColor: '#9b59b6',
  },
  buttonText: {
    fontSize: 24,
    fontWeight: '400',
    color: '#2c3e50',
  },
  buttonTextSecondary: {
    fontSize: 24,
    fontWeight: '600',
    color: '#e74c3c',
  },
  buttonTextOperation: {
    fontSize: 28,
    fontWeight: '300',
    color: '#9b59b6',
  },
  buttonTextDone: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
});
