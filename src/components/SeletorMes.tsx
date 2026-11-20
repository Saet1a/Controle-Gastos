import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MesISO } from '@/types/lancamento';
import { deslocarMes, rotuloMes } from '@/utils/datas';

export interface SeletorMesProps {
  mes: MesISO;
  onChange: (novoMes: MesISO) => void;
  disabled?: boolean;
}

export function SeletorMes({ mes, onChange, disabled = false }: SeletorMesProps) {
  return (
    <View style={styles.container}>
      <Pressable
        testID="seletor-mes-anterior"
        accessibilityRole="button"
        accessibilityLabel="Mês anterior"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => onChange(deslocarMes(mes, -1))}
        style={({ pressed }) => [
          styles.botao,
          disabled && styles.botaoDesabilitado,
          pressed && !disabled && styles.botaoPressionado,
        ]}
      >
        <Ionicons name="chevron-back" size={20} color="#374151" />
      </Pressable>

      <Text testID="seletor-mes-rotulo" style={styles.rotulo}>
        {rotuloMes(mes)}
      </Text>

      <Pressable
        testID="seletor-mes-proximo"
        accessibilityRole="button"
        accessibilityLabel="Próximo mês"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => onChange(deslocarMes(mes, 1))}
        style={({ pressed }) => [
          styles.botao,
          disabled && styles.botaoDesabilitado,
          pressed && !disabled && styles.botaoPressionado,
        ]}
      >
        <Ionicons name="chevron-forward" size={20} color="#374151" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  botao: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoPressionado: {
    backgroundColor: '#F3F4F6',
  },
  botaoDesabilitado: {
    opacity: 0.45,
  },
  rotulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
});
