import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import Toast from 'react-native-toast-message';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { BillsProvider } from '@/contexts/BillsContext';

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
    <AuthProvider>
      <BillsProvider>
        <RootLayoutNav />
        <Toast />
      </BillsProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});