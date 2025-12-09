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
import type { IncomeSource, PayFrequency, DailyPay } from '@/contexts/TriageContext';

export default function Step2Income() {
  const {
    bankBalance,
    setBankBalance,
    hasMultipleIncomeSources,
    setHasMultipleIncomeSources,
    incomeSources,
    addIncomeSource,
    setCurrentStep,
    setOnboardingComplete,
    priorities,
    setGoals,
  } = useTriage();

  const [step, setStep] = useState<string>('bank-balance');
  const [tempBankBalance, setTempBankBalance] = useState(bankBalance.toString());
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  
  // Current income source being configured
  const [sourceName, setSourceName] = useState('');
  const [payFrequency, setPayFrequency] = useState<PayFrequency>('daily');
  const [daysPerWeek, setDaysPerWeek] = useState('');
  const [payVaries, setPayVaries] = useState<boolean | null>(null);
  const [dailyPayAmount, setDailyPayAmount] = useState('');
  const [dailyPayByDay, setDailyPayByDay] = useState<DailyPay>({
    sunday: 0,
    monday: 0,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0,
    saturday: 0,
  });
  const [potentialForMore, setPotentialForMore] = useState<'yes' | 'no' | 'maybe' | null>(null);
  const [projectPayFrequency, setProjectPayFrequency] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>('monthly');
  const [projectPayAmount, setProjectPayAmount] = useState('');
  const [projectHours, setProjectHours] = useState('');

  const saveCurrentSource = () => {
    const source: IncomeSource = {
      id: `source-${Date.now()}`,
      name: sourceName,
      payFrequency,
    };

    if (payFrequency === 'daily') {
      source.daysPerWeek = parseFloat(daysPerWeek) || 0;
      source.payVariation = payVaries ? 'varies_by_day' : 'fixed';
      source.dailyPay = payVaries ? dailyPayByDay : parseFloat(dailyPayAmount) || 0;
      source.potentialForMore = potentialForMore || undefined;
    } else if (payFrequency === 'per_project') {
      source.projectPayFrequency = projectPayFrequency;
      source.projectPayAmount = parseFloat(projectPayAmount) || 0;
      source.projectHoursPerWeek = parseFloat(projectHours) || 0;
    }

    addIncomeSource(source);
    
    // Reset for next source
    setSourceName('');
    setPayFrequency('daily');
    setDaysPerWeek('');
    setPayVaries(null);
    setDailyPayAmount('');
    setDailyPayByDay({
      sunday: 0,
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0,
    });
    setPotentialForMore(null);
    setProjectPayFrequency('monthly');
    setProjectPayAmount('');
    setProjectHours('');
  };

  const completeOnboarding = () => {
    // Convert priorities to goals
    const goals = priorities.map((priority, index) => ({
      id: `goal-${Date.now()}-${index}`,
      title: priority,
      multiplePurchases: false,
      purchases: [],
      totalAmount: 0,
      useBankBalance: false,
      bankBalanceAmount: 0,
      allocations: [],
      isPaid: false,
      order: index,
    }));
    
    setGoals(goals);
    setOnboardingComplete(true);
    setCurrentStep('goals-list');
  };

  if (step === 'bank-balance') {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>OK, tell me a little bit about your income</Text>
          
          <Text style={styles.question}>About how much do you have in your bank account right now?</Text>
          <TextInput
            style={styles.input}
            value={tempBankBalance}
            onChangeText={setTempBankBalance}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#95a5a6"
          />

          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              setBankBalance(parseFloat(tempBankBalance) || 0);
              setStep('multiple-sources');
            }}
          >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (step === 'multiple-sources') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.question}>Do you have multiple sources of income?</Text>
          
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.choiceButton}
              onPress={() => {
                setHasMultipleIncomeSources(true);
                setStep('source-name');
              }}
            >
              <Text style={styles.choiceButtonText}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.choiceButton}
              onPress={() => {
                setHasMultipleIncomeSources(false);
                setStep('source-name');
              }}
            >
            <Text style={styles.choiceButtonText}>No, just one</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'source-name') {
    const sourceNumber = currentSourceIndex + 1;
    const isFirst = currentSourceIndex === 0;
    const prompt = hasMultipleIncomeSources && isFirst
      ? "OK, let's talk about each source of income, starting with the first."
      : '';

    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.content}>
            {prompt ? <Text style={styles.subtitle}>{prompt}</Text> : null}
            
            <Text style={styles.question}>
              What do you call this source of income?
            {hasMultipleIncomeSources ? ` (Source ${sourceNumber})` : ''}
          </Text>
          <TextInput
            style={styles.input}
            value={sourceName}
            onChangeText={setSourceName}
            placeholder="e.g., Day job, Freelance, Gig work"
            placeholderTextColor="#95a5a6"
          />

          {sourceName.trim() && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => setStep('pay-frequency')}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (step === 'pay-frequency') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.question}>How do you get paid?</Text>
            
            <TouchableOpacity
              style={styles.choiceButton}
              onPress={() => {
                setPayFrequency('daily');
                setStep('days-per-week');
              }}
            >
              <Text style={styles.choiceButtonText}>Daily</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.choiceButton}
              onPress={() => {
                setPayFrequency('per_project');
                setStep('project-frequency');
              }}
            >
              <Text style={styles.choiceButtonText}>Per Project/Milestone</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'days-per-week') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.question}>How many days per week do you typically work?</Text>
          <TextInput
            style={styles.input}
            value={daysPerWeek}
            onChangeText={setDaysPerWeek}
            keyboardType="decimal-pad"
            placeholder="e.g., 5"
            placeholderTextColor="#95a5a6"
          />

          {daysPerWeek.trim() && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => setStep('pay-varies')}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (step === 'pay-varies') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.question}>Does your pay vary by day of the week?</Text>
          
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.choiceButton}
              onPress={() => {
                setPayVaries(true);
                setStep('daily-pay-breakdown');
              }}
            >
              <Text style={styles.choiceButtonText}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.choiceButton}
              onPress={() => {
                setPayVaries(false);
                setStep('daily-pay-amount');
              }}
            >
            <Text style={styles.choiceButtonText}>No, it's the same</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'daily-pay-amount') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.question}>What do you typically get paid in a day?</Text>
          <TextInput
            style={styles.input}
            value={dailyPayAmount}
            onChangeText={setDailyPayAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#95a5a6"
          />

          {dailyPayAmount.trim() && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => setStep('potential-more')}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (step === 'daily-pay-breakdown') {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.question}>OK, tell me what you typically get paid each specific day of the week</Text>
          
          {days.map((day, index) => (
            <View key={day} style={styles.dayRow}>
              <Text style={styles.dayLabel}>{dayLabels[index]}</Text>
              <TextInput
                style={styles.dayInput}
                value={dailyPayByDay[day]?.toString() || ''}
                onChangeText={(val) => setDailyPayByDay(prev => ({
                  ...prev,
                  [day]: parseFloat(val) || 0,
                }))}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#95a5a6"
              />
            </View>
          ))}

          <TouchableOpacity
            style={styles.button}
            onPress={() => setStep('source-complete')}
          >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (step === 'potential-more') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.question}>Is there potential to make more than this?</Text>
          
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.choiceButton}
              onPress={() => {
                setPotentialForMore('yes');
                setStep('source-complete');
              }}
            >
              <Text style={styles.choiceButtonText}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.choiceButton}
              onPress={() => {
                setPotentialForMore('no');
                setStep('source-complete');
              }}
            >
              <Text style={styles.choiceButtonText}>No</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.choiceButton}
              onPress={() => {
                setPotentialForMore('maybe');
                setStep('source-complete');
              }}
            >
            <Text style={styles.choiceButtonText}>No, that's all</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'project-frequency') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.question}>How often do you get paid for project work?</Text>
            
            <TouchableOpacity style={styles.choiceButton} onPress={() => { setProjectPayFrequency('daily'); setStep('project-amount'); }}>
              <Text style={styles.choiceButtonText}>Daily</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.choiceButton} onPress={() => { setProjectPayFrequency('weekly'); setStep('project-amount'); }}>
              <Text style={styles.choiceButtonText}>Weekly</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.choiceButton} onPress={() => { setProjectPayFrequency('biweekly'); setStep('project-amount'); }}>
              <Text style={styles.choiceButtonText}>Every two weeks</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.choiceButton} onPress={() => { setProjectPayFrequency('monthly'); setStep('project-amount'); }}>
              <Text style={styles.choiceButtonText}>Monthly</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'project-amount') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.question}>How much do you typically get paid per deposit?</Text>
          <TextInput
            style={styles.input}
            value={projectPayAmount}
            onChangeText={setProjectPayAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#95a5a6"
          />

          {projectPayAmount.trim() && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => setStep('project-hours')}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (step === 'project-hours') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.question}>How many hours do you typically work on project work each week?</Text>
          <TextInput
            style={styles.input}
            value={projectHours}
            onChangeText={setProjectHours}
            keyboardType="decimal-pad"
            placeholder="e.g., 20"
            placeholderTextColor="#95a5a6"
          />

          {projectHours.trim() && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => setStep('source-complete')}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (step === 'source-complete') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>Great! Income source added.</Text>
          
          {hasMultipleIncomeSources && (
            <>
              <Text style={styles.question}>Do you have another income source to add?</Text>
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={styles.choiceButton}
                  onPress={() => {
                    saveCurrentSource();
                    setCurrentSourceIndex(currentSourceIndex + 1);
                    setStep('source-name');
                  }}
                >
                  <Text style={styles.choiceButtonText}>Yes, add another</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.choiceButton}
                  onPress={() => {
                    saveCurrentSource();
                    completeOnboarding();
                  }}
                >
                  <Text style={styles.choiceButtonText}>No, I'm done</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          
          {!hasMultipleIncomeSources && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                saveCurrentSource();
                completeOnboarding();
              }}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return null;
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
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 16,
    lineHeight: 22,
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
    lineHeight: 24,
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
  button: {
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonGroup: {
    gap: 12,
  },
  choiceButton: {
    backgroundColor: '#ecf0f1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#bdc3c7',
  },
  choiceButtonText: {
    color: '#2c3e50',
    fontSize: 16,
    fontWeight: '600',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dayLabel: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
    flex: 1,
  },
  dayInput: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
    width: 100,
    textAlign: 'right',
  },
});
