import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { LancamentosProvider } from '@/context/LancamentosContext';

export default function RootLayout() {
  return (
    <LancamentosProvider>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="lancamento" options={{ presentation: 'modal', title: 'Lançamento' }} />
      </Stack>
    </LancamentosProvider>
  );
}
