import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SeletorMes } from '@/components/SeletorMes';
import { corCategoria, getCategoria } from '@/constants/categorias';
import { useLancamentos } from '@/context/LancamentosContext';
import type { CoresTema } from '@/theme/cores';
import { useTema } from '@/theme/useTema';
import type { MesISO } from '@/types/lancamento';
import { chaveMes, hojeISO } from '@/utils/datas';
import { formatarCentavos } from '@/utils/dinheiro';
import { gastosPorCategoria, resumoDoMes } from '@/utils/resumo';

function formatarPercentual(percentual: number): string {
  if (!Number.isFinite(percentual)) return '0%';
  if (Number.isInteger(percentual)) return `${percentual}%`;
  return `${percentual.toFixed(1).replace('.', ',')}%`;
}

export default function InicioScreen() {
  const router = useRouter();
  const { cores, escuro } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);
  const {
    lancamentos,
    carregando,
    statusCarregamento,
    erro,
    recarregar,
    limparErro,
  } = useLancamentos();

  const [mesSelecionado, setMesSelecionado] = useState<MesISO>(() => chaveMes(hojeISO()));

  const erroLeitura = statusCarregamento === 'erro_leitura';
  const avisoContexto = !erroLeitura && Boolean(erro);
  const fabDesabilitado = carregando || erroLeitura;

  const resumo = useMemo(
    () => resumoDoMes(lancamentos, mesSelecionado),
    [lancamentos, mesSelecionado],
  );

  const gastos = useMemo(
    () => gastosPorCategoria(lancamentos, mesSelecionado),
    [lancamentos, mesSelecionado],
  );

  const possuiLancamentosNoMes = useMemo(
    () => lancamentos.some((item) => chaveMes(item.data) === mesSelecionado),
    [lancamentos, mesSelecionado],
  );

  const estiloCorSaldo =
    resumo.saldoCentavos > 0
      ? styles.saldoPositivo
      : resumo.saldoCentavos < 0
        ? styles.saldoNegativo
        : styles.saldoNeutro;

  const tituloAviso =
    statusCarregamento === 'invalido'
      ? 'Dados salvos recuperados'
      : statusCarregamento === 'parcial'
        ? 'Alguns registros foram ignorados'
        : 'Aviso';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.conteudo}>
        <SeletorMes
          mes={mesSelecionado}
          onChange={setMesSelecionado}
          disabled={carregando}
        />

        {avisoContexto && erro ? (
          <View testID="aviso-contexto" style={styles.alertaAviso} accessibilityRole="alert">
            <View style={styles.cabecalhoAviso}>
              <Text style={styles.tituloAlertaAviso}>{tituloAviso}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={limparErro}
                style={styles.botaoDispensar}
              >
                <Text style={styles.textoBotaoDispensar}>Dispensar</Text>
              </Pressable>
            </View>
            <Text style={styles.textoAlertaAviso}>{erro}</Text>
          </View>
        ) : null}

        {carregando ? (
          <View testID="estado-carregando" style={styles.bannerCarregando}>
            <ActivityIndicator size="small" color={cores.primary} />
            <Text style={styles.textoCarregando}>Carregando lançamentos...</Text>
          </View>
        ) : erroLeitura ? (
          <View testID="erro-leitura" style={styles.alertaErro} accessibilityRole="alert">
            <Text style={styles.tituloAlertaErro}>Erro na leitura dos dados salvos</Text>
            <Text style={styles.textoAlertaErro}>
              {erro ?? 'Não foi possível ler os lançamentos salvos no aparelho.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void recarregar()}
              style={styles.botaoTentarNovamente}
            >
              <Text style={styles.textoBotaoTentarNovamente}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.cardResumo}>
              <Text style={styles.rotuloSaldo}>Saldo do mês</Text>
              <Text testID="resumo-saldo" style={[styles.valorSaldo, estiloCorSaldo]}>
                {formatarCentavos(resumo.saldoCentavos)}
              </Text>

              <View style={styles.divisor} />

              <View style={styles.linhaTotais}>
                <View style={styles.colunaTotal}>
                  <Text style={styles.rotuloTotal}>Receitas</Text>
                  <Text testID="resumo-receitas" style={styles.valorReceitas}>
                    {formatarCentavos(resumo.receitasCentavos)}
                  </Text>
                </View>

                <View style={styles.divisorVertical} />

                <View style={styles.colunaTotal}>
                  <Text style={styles.rotuloTotal}>Despesas</Text>
                  <Text testID="resumo-despesas" style={styles.valorDespesas}>
                    {formatarCentavos(resumo.despesasCentavos)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.secao}>
              <Text style={styles.tituloSecao}>Gastos por categoria</Text>

              {!possuiLancamentosNoMes ? (
                <View testID="estado-vazio-mes" style={styles.cardVazio}>
                  <Ionicons name="wallet-outline" size={32} color={cores.textSecondary} />
                  <Text style={styles.tituloVazio}>Nenhum lançamento neste mês</Text>
                  <Text style={styles.subtituloVazio}>
                    Toque no botão + para registrar sua primeira despesa ou receita.
                  </Text>
                </View>
              ) : gastos.length === 0 ? (
                <View testID="estado-sem-despesas" style={styles.cardVazio}>
                  <Ionicons name="checkmark-circle-outline" size={32} color={cores.success} />
                  <Text style={styles.tituloVazio}>Nenhuma despesa registrada neste mês</Text>
                  <Text style={styles.subtituloVazio}>
                    Há receitas registradas neste mês, mas nenhuma despesa por categoria.
                  </Text>
                </View>
              ) : (
                <View testID="lista-gastos-categoria" style={styles.cardCategorias}>
                  {gastos.map((item, indice) => {
                    const categoria = getCategoria(item.categoriaId);
                    const corCat = corCategoria(item.categoriaId, escuro);
                    const larguraBarra = Math.max(0, Math.min(100, item.percentual));

                    return (
                      <View
                        key={item.categoriaId}
                        testID={`gasto-categoria-${item.categoriaId}`}
                        style={[
                          styles.itemCategoria,
                          indice > 0 && styles.itemCategoriaSeparador,
                        ]}
                      >
                        <View style={styles.linhaCategoria}>
                          <View
                            style={[
                              styles.bolinhaCategoria,
                              { backgroundColor: corCat },
                            ]}
                          >
                            <Ionicons name={categoria.icone} size={16} color={cores.onPrimary} />
                          </View>

                          <Text style={styles.nomeCategoria} numberOfLines={1}>
                            {categoria.nome}
                          </Text>

                          <View style={styles.valoresCategoria}>
                            <Text
                              testID={`gasto-valor-${item.categoriaId}`}
                              style={styles.valorCategoria}
                            >
                              {formatarCentavos(item.totalCentavos)}
                            </Text>
                            <Text
                              testID={`gasto-percentual-${item.categoriaId}`}
                              style={styles.percentualCategoria}
                            >
                              {formatarPercentual(item.percentual)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.trilhaBarra}>
                          <View
                            style={[
                              styles.preenchimentoBarra,
                              {
                                backgroundColor: corCat,
                                width: `${larguraBarra}%`,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Pressable
        testID="botao-novo-lancamento"
        accessibilityRole="button"
        accessibilityLabel="Novo lançamento"
        accessibilityState={{ disabled: fabDesabilitado }}
        disabled={fabDesabilitado}
        onPress={() => router.push('/lancamento')}
        style={({ pressed }) => [
          styles.fab,
          fabDesabilitado && styles.fabDesabilitado,
          pressed && !fabDesabilitado && styles.fabPressionado,
        ]}
      >
        <Ionicons name="add" size={28} color={cores.onPrimary} />
      </Pressable>
    </View>
  );
}

function criarEstilos(cores: CoresTema) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: cores.background,
    },
    scroll: {
      flex: 1,
    },
    conteudo: {
      padding: 16,
      gap: 16,
      paddingBottom: 96,
    },
    alertaAviso: {
      backgroundColor: cores.warningBg,
      borderWidth: 1,
      borderColor: cores.warningBorder,
      borderRadius: 10,
      padding: 12,
      gap: 6,
    },
    cabecalhoAviso: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    tituloAlertaAviso: {
      flex: 1,
      fontSize: 14,
      fontWeight: '700',
      color: cores.warningText,
    },
    textoAlertaAviso: {
      fontSize: 13,
      color: cores.warningText,
      lineHeight: 18,
    },
    botaoDispensar: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    textoBotaoDispensar: {
      fontSize: 13,
      fontWeight: '700',
      color: cores.warningText,
    },
    bannerCarregando: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: cores.primaryBg,
      borderRadius: 10,
      padding: 12,
    },
    textoCarregando: {
      fontSize: 14,
      color: cores.primary,
      fontWeight: '500',
    },
    alertaErro: {
      backgroundColor: cores.dangerBg,
      borderWidth: 1,
      borderColor: cores.dangerBorder,
      borderRadius: 10,
      padding: 12,
      gap: 6,
    },
    tituloAlertaErro: {
      fontSize: 14,
      fontWeight: '700',
      color: cores.danger,
    },
    textoAlertaErro: {
      fontSize: 13,
      color: cores.danger,
      lineHeight: 18,
    },
    botaoTentarNovamente: {
      alignSelf: 'flex-start',
      backgroundColor: cores.danger,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 14,
      marginTop: 4,
    },
    textoBotaoTentarNovamente: {
      fontSize: 13,
      fontWeight: '600',
      color: cores.onPrimary,
    },
    cardResumo: {
      backgroundColor: cores.surface,
      borderWidth: 1,
      borderColor: cores.border,
      borderRadius: 12,
      padding: 16,
      gap: 12,
    },
    rotuloSaldo: {
      fontSize: 13,
      fontWeight: '600',
      color: cores.textSecondary,
    },
    valorSaldo: {
      fontSize: 28,
      fontWeight: '700',
    },
    saldoPositivo: {
      color: cores.success,
    },
    saldoNegativo: {
      color: cores.danger,
    },
    saldoNeutro: {
      color: cores.text,
    },
    divisor: {
      height: 1,
      backgroundColor: cores.border,
    },
    linhaTotais: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    colunaTotal: {
      flex: 1,
      gap: 4,
    },
    divisorVertical: {
      width: 1,
      height: 32,
      backgroundColor: cores.border,
      marginHorizontal: 12,
    },
    rotuloTotal: {
      fontSize: 13,
      fontWeight: '500',
      color: cores.textSecondary,
    },
    valorReceitas: {
      fontSize: 17,
      fontWeight: '700',
      color: cores.success,
    },
    valorDespesas: {
      fontSize: 17,
      fontWeight: '700',
      color: cores.danger,
    },
    secao: {
      gap: 10,
    },
    tituloSecao: {
      fontSize: 15,
      fontWeight: '700',
      color: cores.text,
    },
    cardVazio: {
      alignItems: 'center',
      backgroundColor: cores.surface,
      borderWidth: 1,
      borderColor: cores.border,
      borderRadius: 12,
      padding: 20,
      gap: 8,
    },
    tituloVazio: {
      fontSize: 16,
      fontWeight: '700',
      color: cores.text,
      textAlign: 'center',
    },
    subtituloVazio: {
      fontSize: 13,
      color: cores.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },
    cardCategorias: {
      backgroundColor: cores.surface,
      borderWidth: 1,
      borderColor: cores.border,
      borderRadius: 12,
      paddingHorizontal: 14,
    },
    itemCategoria: {
      paddingVertical: 12,
      gap: 8,
    },
    itemCategoriaSeparador: {
      borderTopWidth: 1,
      borderTopColor: cores.border,
    },
    linhaCategoria: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    bolinhaCategoria: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nomeCategoria: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: cores.text,
    },
    valoresCategoria: {
      alignItems: 'flex-end',
      gap: 2,
    },
    valorCategoria: {
      fontSize: 14,
      fontWeight: '700',
      color: cores.text,
    },
    percentualCategoria: {
      fontSize: 12,
      fontWeight: '500',
      color: cores.textSecondary,
    },
    trilhaBarra: {
      height: 6,
      borderRadius: 3,
      backgroundColor: cores.surfaceAlt,
      overflow: 'hidden',
    },
    preenchimentoBarra: {
      height: '100%',
      borderRadius: 3,
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: cores.primary,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 4,
      shadowColor: cores.overlay,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    fabPressionado: {
      opacity: 0.9,
    },
    fabDesabilitado: {
      opacity: 0.5,
    },
  });
}
