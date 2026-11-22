import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CoresTema } from '@/theme/cores';
import { useTema } from '@/theme/useTema';
import type { MesISO } from '@/types/lancamento';
import { deslocarMes, rotuloMes } from '@/utils/datas';

export interface SeletorMesProps {
  mes: MesISO;
  onChange: (novoMes: MesISO) => void;
  disabled?: boolean;
}

export function SeletorMes({ mes, onChange, disabled = false }: SeletorMesProps) {
  const { cores } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);

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
        <Ionicons name="chevron-back" size={20} color={cores.text} />
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
        <Ionicons name="chevron-forward" size={20} color={cores.text} />
      </Pressable>
    </View>
  );
}

function criarEstilos(cores: CoresTema) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: cores.surface,
      borderWidth: 1,
      borderColor: cores.border,
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
      backgroundColor: cores.surfaceAlt,
    },
    botaoDesabilitado: {
      opacity: 0.45,
    },
    rotulo: {
      fontSize: 16,
      fontWeight: '700',
      color: cores.text,
    },
  });
}
