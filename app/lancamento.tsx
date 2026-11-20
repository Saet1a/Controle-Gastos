import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

// TODO: formulário (tipo, valor, descrição, data com atalhos ontem/hoje, categoria).
// Sem `id` = criar; com `id` = editar.
export default function LancamentoScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>{id ? 'Editar lançamento' : 'Novo lançamento'}</Text>
      <Text>Placeholder — formulário.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 },
  titulo: { fontSize: 24, fontWeight: 'bold' },
});
