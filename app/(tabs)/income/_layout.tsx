import { Stack } from 'expo-router';

export default function IncomeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="planner" />
    </Stack>
  );
}
