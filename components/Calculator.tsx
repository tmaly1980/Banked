import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CalculatorProps {
  visible: boolean;
  onClose: () => void;
  initialValue: number;
  onConfirm: (value: number) => void;
  title?: string;
}

export default function Calculator({ visible, onClose, initialValue, onConfirm, title = 'Calculator' }: CalculatorProps) {
  const [formula, setFormula] = useState('');
  const [result, setResult] = useState('');

  useEffect(() => {
    if (visible) {
      setFormula(initialValue.toFixed(2));
      setResult(initialValue.toFixed(2));
    }
  }, [visible, initialValue]);

  const handleNumberPress = (num: string) => {
    setFormula(prev => prev + num);
  };

  const handleOperatorPress = (operator: string) => {
    const lastChar = formula.slice(-1);
    // Don't allow multiple operators in a row
    if (['+', '-', '×', '÷'].includes(lastChar)) {
      setFormula(prev => prev.slice(0, -1) + operator);
    } else {
      setFormula(prev => prev + operator);
    }
  };

  const handleDecimalPress = () => {
    // Get the last number in the formula
    const parts = formula.split(/[+\-×÷]/);
    const lastPart = parts[parts.length - 1];
    // Only add decimal if the current number doesn't have one
    if (!lastPart.includes('.')) {
      setFormula(prev => prev + '.');
    }
  };

  const handleClear = () => {
    setFormula('');
    setResult('');
  };

  const handleBackspace = () => {
    setFormula(prev => prev.slice(0, -1));
  };

  const evaluateFormula = (expr: string): number => {
    try {
      // Replace × and ÷ with * and /
      const normalized = expr.replace(/×/g, '*').replace(/÷/g, '/');
      // Use Function constructor for safe evaluation
      const result = Function('"use strict"; return (' + normalized + ')')();
      return isNaN(result) ? 0 : result;
    } catch {
      return 0;
    }
  };

  const handleEquals = () => {
    if (!formula) return;
    
    try {
      const calculated = evaluateFormula(formula);
      setResult(calculated.toFixed(2));
      setFormula(calculated.toFixed(2));
    } catch {
      setResult('Error');
    }
  };

  const handleConfirm = () => {
    const finalValue = result ? parseFloat(result) : parseFloat(formula) || 0;
    onConfirm(finalValue);
    onClose();
  };

  const getFontSize = () => {
    const length = formula.length;
    if (length > 20) return 24;
    if (length > 15) return 32;
    if (length > 10) return 40;
    return 48;
  };

  const Button = ({ value, onPress, style, textStyle }: any) => (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
      <Text style={[styles.buttonText, textStyle]}>{value}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.calculator}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#7f8c8d" />
            </TouchableOpacity>
          </View>

          <View style={styles.display}>
            <Text 
              style={[styles.formula, { fontSize: getFontSize() }]} 
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formula || '0'}
            </Text>
            {result && result !== formula && (
              <Text style={styles.result}>= {result}</Text>
            )}
          </View>

          <View style={styles.buttonGrid}>
            <View style={styles.row}>
              <Button value="C" onPress={handleClear} style={styles.functionButton} textStyle={styles.functionText} />
              <Button value="⌫" onPress={handleBackspace} style={styles.functionButton} textStyle={styles.functionText} />
              <Button value="÷" onPress={() => handleOperatorPress('÷')} style={styles.operatorButton} textStyle={styles.operatorText} />
            </View>

            <View style={styles.row}>
              <Button value="7" onPress={() => handleNumberPress('7')} />
              <Button value="8" onPress={() => handleNumberPress('8')} />
              <Button value="9" onPress={() => handleNumberPress('9')} />
              <Button value="×" onPress={() => handleOperatorPress('×')} style={styles.operatorButton} textStyle={styles.operatorText} />
            </View>

            <View style={styles.row}>
              <Button value="4" onPress={() => handleNumberPress('4')} />
              <Button value="5" onPress={() => handleNumberPress('5')} />
              <Button value="6" onPress={() => handleNumberPress('6')} />
              <Button value="-" onPress={() => handleOperatorPress('-')} style={styles.operatorButton} textStyle={styles.operatorText} />
            </View>

            <View style={styles.row}>
              <Button value="1" onPress={() => handleNumberPress('1')} />
              <Button value="2" onPress={() => handleNumberPress('2')} />
              <Button value="3" onPress={() => handleNumberPress('3')} />
              <Button value="+" onPress={() => handleOperatorPress('+')} style={styles.operatorButton} textStyle={styles.operatorText} />
            </View>

            <View style={styles.row}>
              <Button value="0" onPress={() => handleNumberPress('0')} style={styles.zeroButton} />
              <Button value="." onPress={handleDecimalPress} />
              <Button value="=" onPress={handleEquals} style={styles.operatorButton} textStyle={styles.operatorText} />
            </View>

            <View style={styles.row}>
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                <Ionicons name="checkmark" size={24} color="white" />
                <Text style={styles.confirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');
const buttonSize = (width - 80) / 4;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
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
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  display: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    minHeight: 100,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  formula: {
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  result: {
    fontSize: 18,
    color: '#7f8c8d',
    marginTop: 8,
  },
  buttonGrid: {
    padding: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  button: {
    width: buttonSize,
    height: buttonSize,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  zeroButton: {
    width: buttonSize * 2 + 10,
    height: buttonSize,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  buttonText: {
    fontSize: 24,
    color: '#2c3e50',
    fontWeight: '600',
  },
  functionButton: {
    backgroundColor: '#bdc3c7',
  },
  functionText: {
    color: '#2c3e50',
  },
  operatorButton: {
    backgroundColor: '#3498db',
  },
  operatorText: {
    color: 'white',
    fontWeight: 'bold',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#27ae60',
    height: buttonSize,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  confirmText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
});
