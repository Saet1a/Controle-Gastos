import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { useTema } from '@/theme/useTema';

function BotaoAlternarTema() {
  const { cores, escuro, alternarTema } = useTema();

  return (
    <Pressable
      testID="botao-alternar-tema"
      accessibilityRole="button"
      accessibilityLabel={escuro ? 'Ativar modo claro' : 'Ativar modo escuro'}
      hitSlop={8}
      onPress={alternarTema}
      style={({ pressed }) => [
        styles.botaoTema,
        pressed && { backgroundColor: cores.surfaceAlt },
      ]}
    >
      <Ionicons
        name={escuro ? 'sunny-outline' : 'moon-outline'}
        size={20}
        color={cores.textSecondary}
      />
    </Pressable>
  );
}

export default function TabsLayout() {
  const { cores } = useTema();

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: cores.surface,
          borderBottomColor: cores.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: cores.text,
        headerTitleStyle: { color: cores.text },
        sceneStyle: { backgroundColor: cores.background },
        tabBarActiveTintColor: cores.primary,
        tabBarInactiveTintColor: cores.textSecondary,
        tabBarStyle: {
          backgroundColor: cores.surface,
          borderTopColor: cores.border,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          headerRight: () => <BotaoAlternarTema />,
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="historico"
        options={{
          title: 'Histórico',
          tabBarIcon: ({ color, size }) => <Ionicons name="list" color={color as string} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  botaoTema: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
