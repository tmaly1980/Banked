import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TriageProvider, useTriage } from '@/contexts/TriageContext';
import Step1Priorities from '@/components/triage/Step1Priorities';
import Step2Income from '@/components/triage/Step2Income';
import GoalsList from '@/components/triage/GoalsList';
import GoalDetails from '@/components/triage/GoalDetails';

function TriageContent() {
  const { currentStep, onboardingComplete } = useTriage();

  if (onboardingComplete) {
    if (currentStep.startsWith('goal-')) {
      return <GoalDetails />;
    }
    return <GoalsList />;
  }

  if (currentStep === 'step1') {
    return <Step1Priorities />;
  }

  if (currentStep.startsWith('step2')) {
    return <Step2Income />;
  }

  return <GoalsList />;
}

export default function TriageScreen() {
  return (
    <TriageProvider>
      <View style={styles.container}>
        <TriageContent />
      </View>
    </TriageProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ecf0f1',
  },
});
