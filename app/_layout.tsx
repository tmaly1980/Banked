import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { BillsProvider } from '@/contexts/BillsContext';
import { DepositsProvider } from '@/contexts/DepositsContext';
import { IncomeProvider } from '@/contexts/IncomeContext';
import { ToastProvider } from '@/components/CustomToast';

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Redirect to tabs if authenticated
      router.replace('/(tabs)');
    }
  }, [session, segments, loading]);

  if (loading) {
    return <View style={styles.loading} />;
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#3498db' }}>
        <AuthProvider>
          <BillsProvider>
            <DepositsProvider>
              <IncomeProvider>
                <ToastProvider>
                  <RootLayoutNav />
                </ToastProvider>
              </IncomeProvider>
            </DepositsProvider>
          </BillsProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
