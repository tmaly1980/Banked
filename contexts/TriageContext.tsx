import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@triage_data';

export type PayFrequency = 'daily' | 'per_project' | 'weekly' | 'biweekly' | 'monthly';
export type PayVariation = 'fixed' | 'varies_by_day';
export type DeadlineType = 'catastrophic' | 'preferred' | 'flexible';
export type AllocationMode = 'all' | 'percentage' | 'fixed_amount';

export interface DailyPay {
  sunday: number;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
}

export interface IncomeSource {
  id: string;
  name: string;
  payFrequency: PayFrequency;
  daysPerWeek?: number;
  payVariation?: PayVariation;
  dailyPay?: number | DailyPay;
  potentialForMore?: 'yes' | 'no' | 'maybe';
  projectPayFrequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  projectPayAmount?: number;
  projectHoursPerWeek?: number;
}

export interface GoalPurchase {
  id: string;
  name: string;
  amount: number;
}

export interface GoalAllocation {
  sourceId: string;
  mode: AllocationMode;
  percentage?: number;
  fixedAmount?: number;
}

export interface FinancialGoal {
  id: string;
  title: string;
  multiplePurchases: boolean;
  purchases: GoalPurchase[];
  totalAmount: number;
  deadlineType?: DeadlineType;
  dueDate?: string;
  useBankBalance: boolean;
  bankBalanceAmount: number;
  allocations: GoalAllocation[];
  isPaid: boolean;
  order: number;
}

interface TriageContextType {
  // Onboarding state
  priorities: string[];
  setPriorities: (priorities: string[]) => void;
  bankBalance: number;
  setBankBalance: (balance: number) => void;
  hasMultipleIncomeSources: boolean;
  setHasMultipleIncomeSources: (has: boolean) => void;
  incomeSources: IncomeSource[];
  setIncomeSources: (sources: IncomeSource[]) => void;
  addIncomeSource: (source: IncomeSource) => void;
  updateIncomeSource: (id: string, updates: Partial<IncomeSource>) => void;
  
  // Goals state
  goals: FinancialGoal[];
  setGoals: (goals: FinancialGoal[]) => void;
  addGoal: (goal: FinancialGoal) => void;
  updateGoal: (id: string, updates: Partial<FinancialGoal>) => void;
  markGoalPaid: (id: string) => void;
  reorderGoals: (startIndex: number, endIndex: number) => void;
  
  // Navigation state
  currentStep: string;
  setCurrentStep: (step: string) => void;
  onboardingComplete: boolean;
  setOnboardingComplete: (complete: boolean) => void;
  
  // Helper functions
  getRemainingBankBalance: () => number;
  calculateGoalProjection: (goalId: string) => {
    canAfford: boolean;
    projectedDate: string;
    shortfall: number;
    surplus: number;
  };
}

const TriageContext = createContext<TriageContextType | undefined>(undefined);

interface TriageState {
  priorities: string[];
  bankBalance: number;
  hasMultipleIncomeSources: boolean;
  incomeSources: IncomeSource[];
  goals: FinancialGoal[];
  currentStep: string;
  onboardingComplete: boolean;
}

export const TriageProvider = ({ children }: { children: ReactNode }) => {
  const [priorities, setPriorities] = useState<string[]>([]);
  const [bankBalance, setBankBalance] = useState(0);
  const [hasMultipleIncomeSources, setHasMultipleIncomeSources] = useState(false);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [currentStep, setCurrentStep] = useState('step1');
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data from AsyncStorage on mount
  useEffect(() => {
    loadData();
  }, []);

  // Save data to AsyncStorage whenever state changes
  useEffect(() => {
    if (isLoaded) {
      saveData();
    }
  }, [priorities, bankBalance, hasMultipleIncomeSources, incomeSources, goals, currentStep, onboardingComplete, isLoaded]);

  const loadData = async () => {
    try {
      const storedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedData) {
        const data: TriageState = JSON.parse(storedData);
        setPriorities(data.priorities || []);
        setBankBalance(data.bankBalance || 0);
        setHasMultipleIncomeSources(data.hasMultipleIncomeSources || false);
        setIncomeSources(data.incomeSources || []);
        setGoals(data.goals || []);
        setCurrentStep(data.currentStep || 'step1');
        setOnboardingComplete(data.onboardingComplete || false);
      }
    } catch (error) {
      console.error('Error loading triage data:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveData = async () => {
    try {
      const data: TriageState = {
        priorities,
        bankBalance,
        hasMultipleIncomeSources,
        incomeSources,
        goals,
        currentStep,
        onboardingComplete,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving triage data:', error);
    }
  };

  const addIncomeSource = (source: IncomeSource) => {
    setIncomeSources(prev => [...prev, source]);
  };

  const updateIncomeSource = (id: string, updates: Partial<IncomeSource>) => {
    setIncomeSources(prev =>
      prev.map(source => (source.id === id ? { ...source, ...updates } : source))
    );
  };

  const addGoal = (goal: FinancialGoal) => {
    setGoals(prev => [...prev, goal]);
  };

  const updateGoal = (id: string, updates: Partial<FinancialGoal>) => {
    setGoals(prev =>
      prev.map(goal => (goal.id === id ? { ...goal, ...updates } : goal))
    );
  };

  const markGoalPaid = (id: string) => {
    updateGoal(id, { isPaid: true });
  };

  const reorderGoals = (startIndex: number, endIndex: number) => {
    const result = Array.from(goals);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    
    const reordered = result.map((goal, index) => ({
      ...goal,
      order: index,
    }));
    
    setGoals(reordered);
  };

  const getRemainingBankBalance = () => {
    let used = 0;
    goals.forEach(goal => {
      if (!goal.isPaid && goal.useBankBalance) {
        used += goal.bankBalanceAmount;
      }
    });
    return bankBalance - used;
  };

  const calculateGoalProjection = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) {
      return { canAfford: false, projectedDate: '', shortfall: 0, surplus: 0 };
    }

    let totalIncome = goal.useBankBalance ? goal.bankBalanceAmount : 0;

    // Calculate income from allocations
    goal.allocations.forEach(allocation => {
      const source = incomeSources.find(s => s.id === allocation.sourceId);
      if (!source) return;

      let sourceIncome = 0;
      
      if (source.payFrequency === 'daily' && typeof source.dailyPay === 'number') {
        const daysPerWeek = source.daysPerWeek || 5;
        sourceIncome = source.dailyPay * daysPerWeek * 4.33; // monthly
      } else if (source.payFrequency === 'per_project' && source.projectPayAmount) {
        sourceIncome = source.projectPayAmount;
      }

      if (allocation.mode === 'all') {
        totalIncome += sourceIncome;
      } else if (allocation.mode === 'percentage' && allocation.percentage) {
        totalIncome += (sourceIncome * allocation.percentage) / 100;
      } else if (allocation.mode === 'fixed_amount' && allocation.fixedAmount) {
        totalIncome += allocation.fixedAmount;
      }
    });

    const canAfford = totalIncome >= goal.totalAmount;
    const shortfall = canAfford ? 0 : goal.totalAmount - totalIncome;
    const surplus = canAfford ? totalIncome - goal.totalAmount : 0;

    // Simple projection: assume monthly income continues
    let projectedDate = '';
    if (!canAfford && totalIncome > 0) {
      const monthsNeeded = Math.ceil(goal.totalAmount / totalIncome);
      const today = new Date();
      today.setMonth(today.getMonth() + monthsNeeded);
      projectedDate = today.toISOString().split('T')[0];
    } else if (canAfford) {
      projectedDate = new Date().toISOString().split('T')[0];
    }

    return { canAfford, projectedDate, shortfall, surplus };
  };

  return (
    <TriageContext.Provider
      value={{
        priorities,
        setPriorities,
        bankBalance,
        setBankBalance,
        hasMultipleIncomeSources,
        setHasMultipleIncomeSources,
        incomeSources,
        setIncomeSources,
        addIncomeSource,
        updateIncomeSource,
        goals,
        setGoals,
        addGoal,
        updateGoal,
        markGoalPaid,
        reorderGoals,
        currentStep,
        setCurrentStep,
        onboardingComplete,
        setOnboardingComplete,
        getRemainingBankBalance,
        calculateGoalProjection,
      }}
    >
      {children}
    </TriageContext.Provider>
  );
};

export const useTriage = () => {
  const context = useContext(TriageContext);
  if (!context) {
    throw new Error('useTriage must be used within TriageProvider');
  }
  return context;
};
