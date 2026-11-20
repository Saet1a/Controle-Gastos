import { StyleSheet, Text, View } from 'react-native';

// TODO: FlatList (mais recente primeiro), filtros de mês e categoria,
// tocar para editar, excluir com confirmação.
export default function HistoricoScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Histórico</Text>
      <Text>Placeholder — lista de lançamentos com filtros.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 },
  titulo: { fontSize: 24, fontWeight: 'bold' },
});
