import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';

import { LancamentosProvider } from '@/context/LancamentosContext';
import { TemaProvider } from '@/theme/TemaContext';
import { useTema } from '@/theme/useTema';

function NavegacaoRaiz() {
  const { cores, escuro } = useTema();
  const temaNavegacao = useMemo(() => {
    const base = escuro ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: escuro,
      colors: {
        ...base.colors,
        primary: cores.primary,
        background: cores.background,
        card: cores.surface,
        text: cores.text,
        border: cores.border,
        notification: cores.danger,
      },
    };
  }, [cores, escuro]);

  return (
    <ThemeProvider value={temaNavegacao}>
      <StatusBar style={escuro ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: cores.surface },
          headerTintColor: cores.text,
          headerTitleStyle: { color: cores.text },
          contentStyle: { backgroundColor: cores.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="lancamento" options={{ presentation: 'modal', title: 'Lançamento' }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <TemaProvider>
      <LancamentosProvider>
        <NavegacaoRaiz />
      </LancamentosProvider>
    </TemaProvider>
  );
}
