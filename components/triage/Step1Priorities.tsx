import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useTriage } from '@/contexts/TriageContext';
import { Ionicons } from '@expo/vector-icons';

export default function Step1Priorities() {
  const { priorities, setPriorities, setCurrentStep } = useTriage();
  const [inputValue, setInputValue] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleSubmit = () => {
    if (!inputValue.trim()) return;

    if (editingIndex !== null) {
      const updated = [...priorities];
      updated[editingIndex] = inputValue.trim();
      setPriorities(updated);
      setEditingIndex(null);
    } else {
      setPriorities([inputValue.trim(), ...priorities]);
    }
    setInputValue('');
  };

  const handleEdit = (index: number) => {
    setInputValue(priorities[index]);
    setEditingIndex(index);
  };

  const handleDelete = (index: number) => {
    setPriorities(priorities.filter((_, i) => i !== index));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...priorities];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setPriorities(updated);
  };

  const moveDown = (index: number) => {
    if (index === priorities.length - 1) return;
    const updated = [...priorities];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setPriorities(updated);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>What are your biggest financial priorities?</Text>
        <Text style={styles.subtitle}>
          You'll be able to add more items and details (including amounts and deadlines) later
        </Text>

        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={setInputValue}
          onSubmitEditing={handleSubmit}
          placeholder={editingIndex !== null ? 'Edit priority...' : 'Add a priority...'}
          placeholderTextColor="#95a5a6"
          returnKeyType="done"
          blurOnSubmit={false}
        />

        {priorities.length > 0 && (
          <View style={styles.list}>
            {priorities.map((priority, index) => (
              <TouchableOpacity
                key={index}
                style={styles.priorityItem}
                onPress={() => handleEdit(index)}
              >
                <View style={styles.priorityContent}>
                  <Text style={styles.priorityNumber}>{index + 1}</Text>
                  <Text style={styles.priorityText}>{priority}</Text>
                </View>
                <View style={styles.priorityActions}>
                  <TouchableOpacity onPress={() => moveUp(index)} disabled={index === 0}>
                    <Ionicons
                      name="chevron-up"
                      size={20}
                      color={index === 0 ? '#bdc3c7' : '#3498db'}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveDown(index)}
                    disabled={index === priorities.length - 1}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={index === priorities.length - 1 ? '#bdc3c7' : '#3498db'}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(index)}>
                    <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {priorities.length > 0 && (
          <Text style={styles.helpText}>
            Feel free to move items up the list based on urgency or importance
          </Text>
        )}
      </ScrollView>

      {priorities.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => setCurrentStep('step2-intro')}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 24,
    lineHeight: 22,
  },
  input: {
    borderWidth: 2,
    borderColor: '#3498db',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2c3e50',
    backgroundColor: 'white',
    marginBottom: 16,
  },
  list: {
    marginBottom: 16,
  },
  priorityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  priorityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  priorityNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3498db',
    marginRight: 12,
    minWidth: 24,
  },
  priorityText: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
  },
  priorityActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  helpText: {
    fontSize: 14,
    color: '#95a5a6',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    backgroundColor: 'white',
  },
  nextButton: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
