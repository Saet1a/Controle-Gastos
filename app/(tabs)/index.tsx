import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

// TODO: seletor de mês, saldo, receitas, despesas, gastos por categoria.
export default function InicioScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Início</Text>
      <Text>Placeholder — saldo do mês e gastos por categoria.</Text>
      <Link href="/lancamento" style={styles.botao}>
        + Novo lançamento
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 },
  titulo: { fontSize: 24, fontWeight: 'bold' },
  botao: { fontSize: 18, color: '#2563EB', marginTop: 16 },
});
