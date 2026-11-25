import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';

import { SeletorMes } from '@/components/SeletorMes';
import { CATEGORIAS, corCategoria, getCategoria } from '@/constants/categorias';
import { useLancamentos } from '@/context/LancamentosContext';
import type { CoresTema } from '@/theme/cores';
import { useTema } from '@/theme/useTema';
import type { CategoriaId, Lancamento, MesISO } from '@/types/lancamento';
import { chaveMes, formatarDataBR, hojeISO } from '@/utils/datas';
import { formatarCentavos } from '@/utils/dinheiro';
import { filtrarLancamentos, ordenarPorDataDesc } from '@/utils/resumo';

const estiloSeparador = StyleSheet.create({
  separador: {
    height: 10,
  },
});

function formatarValorComSinal(item: Lancamento): string {
  const sinal = item.tipo === 'despesa' ? '-' : '+';
  return `${sinal} ${formatarCentavos(item.valorCentavos)}`;
}

function SeparadorItem() {
  return <View style={estiloSeparador.separador} />;
}

export default function HistoricoScreen() {
  const router = useRouter();
  const { cores, escuro } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);
  const {
    lancamentos,
    carregando,
    statusCarregamento,
    erro,
    excluir,
    recarregar,
    limparErro,
  } = useLancamentos();

  const [mesSelecionado, setMesSelecionado] = useState<MesISO>(() => chaveMes(hojeISO()));
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<CategoriaId | null>(null);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);
  const [excluindoIds, setExcluindoIds] = useState<ReadonlySet<string>>(() => new Set());
  const [itemParaExcluir, setItemParaExcluir] = useState<Lancamento | null>(null);

  const excluindoIdsRef = useRef<Set<string>>(new Set());
  const montadoRef = useRef(true);

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
    };
  }, []);

  const erroLeitura = statusCarregamento === 'erro_leitura';
  const avisoContexto = !erroLeitura && !erroExclusao && Boolean(erro);

  const tituloAviso =
    statusCarregamento === 'invalido'
      ? 'Dados salvos recuperados'
      : statusCarregamento === 'parcial'
        ? 'Alguns registros foram ignorados'
        : 'Aviso';

  const possuiLancamentosNoMes = useMemo(
    () => lancamentos.some((item) => chaveMes(item.data) === mesSelecionado),
    [lancamentos, mesSelecionado],
  );

  const lancamentosVisiveis = useMemo(
    () =>
      ordenarPorDataDesc(
        filtrarLancamentos(lancamentos, {
          mes: mesSelecionado,
          categoriaId: categoriaSelecionada,
        }),
      ),
    [lancamentos, mesSelecionado, categoriaSelecionada],
  );

  const extraDataLista = useMemo(
    () => ({ escuro, excluindoIds }),
    [escuro, excluindoIds],
  );

  const categoriaAtiva = useMemo(
    () => (categoriaSelecionada ? getCategoria(categoriaSelecionada) : null),
    [categoriaSelecionada],
  );

  function dispensarErroExclusao() {
    setErroExclusao(null);
    limparErro();
  }

  function handleRecarregar() {
    setErroExclusao(null);
    setItemParaExcluir(null);
    void recarregar();
  }

  function abrirEdicao(id: string) {
    if (carregando || erroLeitura || excluindoIdsRef.current.has(id)) return;
    router.push(`/lancamento?id=${encodeURIComponent(id)}`);
  }

  async function executarExclusao(id: string) {
    if (carregando || erroLeitura || excluindoIdsRef.current.has(id)) return;

    excluindoIdsRef.current.add(id);
    setExcluindoIds(new Set(excluindoIdsRef.current));
    setErroExclusao(null);

    try {
      await excluir(id);
    } catch {
      if (montadoRef.current) {
        setErroExclusao('Não foi possível excluir o lançamento. Os dados foram mantidos.');
      }
    } finally {
      excluindoIdsRef.current.delete(id);
      if (montadoRef.current) {
        setExcluindoIds(new Set(excluindoIdsRef.current));
      }
    }
  }

  function solicitarExclusao(item: Lancamento) {
    if (carregando || erroLeitura || excluindoIdsRef.current.has(item.id)) return;
    setItemParaExcluir(item);
  }

  function cancelarExclusao() {
    setItemParaExcluir(null);
  }

  function confirmarExclusao() {
    if (!itemParaExcluir) return;
    const id = itemParaExcluir.id;
    setItemParaExcluir(null);
    void executarExclusao(id);
  }

  const tituloItemParaExcluir = itemParaExcluir
    ? itemParaExcluir.descricao.trim() || getCategoria(itemParaExcluir.categoriaId).nome
    : '';

  const renderItem: ListRenderItem<Lancamento> = ({ item }) => {
    const categoria = getCategoria(item.categoriaId);
    const corCat = corCategoria(item.categoriaId, escuro);
    const descricaoLimpa = item.descricao.trim();
    const temDescricao = descricaoLimpa.length > 0;
    const titulo = temDescricao ? descricaoLimpa : categoria.nome;
    const dataBR = formatarDataBR(item.data);
    const subtitulo = temDescricao ? `${categoria.nome} · ${dataBR}` : dataBR;
    const excluindo = excluindoIds.has(item.id);
    const valorComSinal = formatarValorComSinal(item);
    const corValor = item.tipo === 'despesa' ? styles.valorDespesa : styles.valorReceita;

    return (
      <View
        testID={`item-lancamento-${item.id}`}
        style={[styles.cardItem, excluindo && styles.cardItemDesabilitado]}
      >
        <Pressable
          testID={`editar-lancamento-${item.id}`}
          accessibilityRole="button"
          accessibilityLabel={`Editar ${titulo}`}
          accessibilityState={{ disabled: excluindo }}
          disabled={excluindo}
          onPress={() => abrirEdicao(item.id)}
          style={({ pressed }) => [
            styles.areaEdicao,
            pressed && !excluindo && styles.itemPressionado,
          ]}
        >
          <View style={[styles.bolinhaCategoria, { backgroundColor: corCat }]}>
            <Ionicons name={categoria.icone} size={18} color={cores.onPrimary} />
          </View>

          <View style={styles.infoItem}>
            <Text testID={`titulo-lancamento-${item.id}`} style={styles.tituloItem} numberOfLines={1}>
              {titulo}
            </Text>
            <Text
              testID={`subtitulo-lancamento-${item.id}`}
              style={styles.subtituloItem}
              numberOfLines={1}
            >
              {subtitulo}
            </Text>
          </View>

          <Text testID={`valor-lancamento-${item.id}`} style={[styles.valorItem, corValor]}>
            {valorComSinal}
          </Text>
        </Pressable>

        <Pressable
          testID={`excluir-lancamento-${item.id}`}
          accessibilityRole="button"
          accessibilityLabel={`Excluir ${titulo}`}
          accessibilityState={{ disabled: excluindo, busy: excluindo }}
          disabled={excluindo}
          hitSlop={8}
          onPress={() => solicitarExclusao(item)}
          style={({ pressed }) => [
            styles.botaoExcluir,
            pressed && !excluindo && styles.botaoExcluirPressionado,
          ]}
        >
          <Ionicons name="trash-outline" size={20} color={cores.danger} />
        </Pressable>
      </View>
    );
  };

  function renderVazio() {
    if (!possuiLancamentosNoMes) {
      return (
        <View testID="estado-vazio-mes" style={styles.cardVazio}>
          <Ionicons name="receipt-outline" size={32} color={cores.textSecondary} />
          <Text style={styles.tituloVazio}>Nenhum lançamento neste mês</Text>
          <Text style={styles.subtituloVazio}>
            Os lançamentos registrados neste mês aparecerão aqui.
          </Text>
        </View>
      );
    }

    return (
      <View testID="estado-vazio-categoria" style={styles.cardVazio}>
        <Ionicons name="funnel-outline" size={32} color={cores.textSecondary} />
        <Text style={styles.tituloVazio}>
          Nenhum lançamento em {categoriaAtiva?.nome ?? 'esta categoria'}
        </Text>
        <Text style={styles.subtituloVazio}>
          Não há lançamentos desta categoria no mês selecionado.
        </Text>
        <Pressable
          testID="botao-limpar-filtro"
          accessibilityRole="button"
          onPress={() => setCategoriaSelecionada(null)}
          style={({ pressed }) => [
            styles.botaoLimparFiltro,
            pressed && styles.botaoLimparFiltroPressionado,
          ]}
        >
          <Text style={styles.textoBotaoLimparFiltro}>Limpar filtro</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cabecalho}>
        <SeletorMes mes={mesSelecionado} onChange={setMesSelecionado} disabled={carregando} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scrollFiltros}
          contentContainerStyle={styles.listaFiltros}
        >
          <Pressable
            testID="filtro-categoria-todas"
            accessibilityRole="button"
            accessibilityLabel="Todas"
            accessibilityState={{ selected: categoriaSelecionada === null, disabled: carregando }}
            disabled={carregando}
            onPress={() => setCategoriaSelecionada(null)}
            style={[
              styles.chipFiltro,
              categoriaSelecionada === null && styles.chipFiltroAtivo,
              carregando && styles.chipDesabilitado,
            ]}
          >
            <Text
              style={[
                styles.textoChipFiltro,
                categoriaSelecionada === null && styles.textoChipFiltroAtivo,
              ]}
            >
              Todas
            </Text>
          </Pressable>

          {CATEGORIAS.map((categoria) => {
            const selecionada = categoriaSelecionada === categoria.id;
            const corCat = corCategoria(categoria.id, escuro);
            return (
              <Pressable
                key={categoria.id}
                testID={`filtro-categoria-${categoria.id}`}
                accessibilityRole="button"
                accessibilityLabel={categoria.nome}
                accessibilityState={{ selected: selecionada, disabled: carregando }}
                disabled={carregando}
                onPress={() => setCategoriaSelecionada(categoria.id)}
                style={[
                  styles.chipFiltro,
                  selecionada && styles.chipFiltroAtivo,
                  carregando && styles.chipDesabilitado,
                ]}
              >
                <View style={[styles.pontoCategoria, { backgroundColor: corCat }]} />
                <Text
                  style={[styles.textoChipFiltro, selecionada && styles.textoChipFiltroAtivo]}
                >
                  {categoria.nome}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {erroExclusao ? (
          <View testID="erro-exclusao" style={styles.alertaErro} accessibilityRole="alert">
            <View style={styles.cabecalhoAlerta}>
              <Text style={[styles.tituloAlertaErro, styles.tituloAlertaLinha]}>
                Erro ao excluir lançamento
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={dispensarErroExclusao}
                style={styles.botaoDispensar}
              >
                <Text style={styles.textoBotaoDispensarErro}>Dispensar</Text>
              </Pressable>
            </View>
            <Text style={styles.textoAlertaErro}>{erroExclusao}</Text>
          </View>
        ) : avisoContexto && erro ? (
          <View testID="aviso-contexto" style={styles.alertaAviso} accessibilityRole="alert">
            <View style={styles.cabecalhoAlerta}>
              <Text style={styles.tituloAlertaAviso}>{tituloAviso}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={limparErro}
                style={styles.botaoDispensar}
              >
                <Text style={styles.textoBotaoDispensarAviso}>Dispensar</Text>
              </Pressable>
            </View>
            <Text style={styles.textoAlertaAviso}>{erro}</Text>
          </View>
        ) : null}
      </View>

      {carregando ? (
        <View style={styles.conteudoEstado}>
          <View testID="estado-carregando" style={styles.bannerCarregando}>
            <ActivityIndicator size="small" color={cores.primary} />
            <Text style={styles.textoCarregando}>Carregando lançamentos...</Text>
          </View>
        </View>
      ) : erroLeitura ? (
        <View style={styles.conteudoEstado}>
          <View testID="erro-leitura" style={styles.alertaErro} accessibilityRole="alert">
            <Text style={styles.tituloAlertaErro}>Erro na leitura dos dados salvos</Text>
            <Text style={styles.textoAlertaErro}>
              {erro ?? 'Não foi possível ler os lançamentos salvos no aparelho.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={handleRecarregar}
              style={styles.botaoTentarNovamente}
            >
              <Text style={styles.textoBotaoTentarNovamente}>Tentar novamente</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.corpoLista}>
          {lancamentosVisiveis.length > 0 ? (
            <Text testID="contador-lancamentos" style={styles.contador}>
              {lancamentosVisiveis.length}{' '}
              {lancamentosVisiveis.length === 1 ? 'lançamento' : 'lançamentos'}
            </Text>
          ) : null}

          <FlatList
            testID="lista-lancamentos"
            data={lancamentosVisiveis}
            extraData={extraDataLista}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ItemSeparatorComponent={SeparadorItem}
            ListEmptyComponent={renderVazio}
            style={styles.lista}
            contentContainerStyle={[
              styles.conteudoLista,
              lancamentosVisiveis.length === 0 && styles.conteudoListaVazia,
            ]}
          />
        </View>
      )}

      <Modal
        visible={itemParaExcluir !== null}
        transparent
        animationType={Platform.OS === 'web' ? 'none' : 'fade'}
        statusBarTranslucent
        onRequestClose={cancelarExclusao}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            testID="modal-excluir-backdrop"
            accessible={false}
            tabIndex={-1}
            onPress={cancelarExclusao}
            style={StyleSheet.absoluteFill}
          />
          {itemParaExcluir ? (
            <View
              testID="modal-confirmar-exclusao"
              accessibilityViewIsModal
              style={styles.modalCard}
            >
              <Text style={styles.modalTitulo}>Excluir lançamento</Text>
              <Text testID="modal-excluir-mensagem" style={styles.modalMensagem}>
                {`Deseja excluir "${tituloItemParaExcluir}" (${formatarValorComSinal(itemParaExcluir)})? Esta ação não pode ser desfeita.`}
              </Text>
              <View style={styles.modalAcoes}>
                <Pressable
                  testID="modal-excluir-cancelar"
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar"
                  onPress={cancelarExclusao}
                  style={({ pressed }) => [
                    styles.modalBotaoCancelar,
                    pressed && styles.modalBotaoPressionado,
                  ]}
                >
                  <Text style={styles.modalTextoCancelar}>Cancelar</Text>
                </Pressable>
                <Pressable
                  testID="modal-excluir-confirmar"
                  accessibilityRole="button"
                  accessibilityLabel="Excluir"
                  onPress={confirmarExclusao}
                  style={({ pressed }) => [
                    styles.modalBotaoExcluir,
                    pressed && styles.modalBotaoPressionado,
                  ]}
                >
                  <Text style={styles.modalTextoExcluir}>Excluir</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function criarEstilos(cores: CoresTema) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: cores.background,
    },
    cabecalho: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
      gap: 12,
    },
    scrollFiltros: {
      flexGrow: 0,
    },
    listaFiltros: {
      gap: 8,
      paddingVertical: 2,
    },
    chipFiltro: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: cores.surface,
      borderWidth: 1.5,
      borderColor: cores.border,
      borderRadius: 999,
      paddingVertical: 7,
      paddingHorizontal: 12,
    },
    chipFiltroAtivo: {
      backgroundColor: cores.primaryBg,
      borderColor: cores.primary,
    },
    chipDesabilitado: {
      opacity: 0.5,
    },
    pontoCategoria: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    textoChipFiltro: {
      fontSize: 13,
      fontWeight: '600',
      color: cores.textSecondary,
    },
    textoChipFiltroAtivo: {
      color: cores.primary,
      fontWeight: '700',
    },
    cabecalhoAlerta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    botaoDispensar: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    alertaAviso: {
      backgroundColor: cores.warningBg,
      borderWidth: 1,
      borderColor: cores.warningBorder,
      borderRadius: 10,
      padding: 12,
      gap: 6,
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
    textoBotaoDispensarAviso: {
      fontSize: 13,
      fontWeight: '700',
      color: cores.warningText,
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
    tituloAlertaLinha: {
      flex: 1,
    },
    textoAlertaErro: {
      fontSize: 13,
      color: cores.danger,
      lineHeight: 18,
    },
    textoBotaoDispensarErro: {
      fontSize: 13,
      fontWeight: '700',
      color: cores.danger,
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
    conteudoEstado: {
      paddingHorizontal: 16,
      paddingTop: 8,
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
    corpoLista: {
      flex: 1,
    },
    contador: {
      fontSize: 12,
      fontWeight: '600',
      color: cores.textSecondary,
      paddingHorizontal: 16,
      paddingBottom: 6,
    },
    lista: {
      flex: 1,
    },
    conteudoLista: {
      paddingHorizontal: 16,
      paddingTop: 2,
      paddingBottom: 24,
    },
    conteudoListaVazia: {
      paddingTop: 8,
    },
    cardItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: cores.surface,
      borderWidth: 1,
      borderColor: cores.border,
      borderRadius: 12,
      overflow: 'hidden',
    },
    cardItemDesabilitado: {
      opacity: 0.6,
    },
    areaEdicao: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingLeft: 12,
      paddingRight: 8,
    },
    itemPressionado: {
      backgroundColor: cores.surfaceAlt,
    },
    bolinhaCategoria: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoItem: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    tituloItem: {
      fontSize: 15,
      fontWeight: '600',
      color: cores.text,
    },
    subtituloItem: {
      fontSize: 12,
      fontWeight: '500',
      color: cores.textSecondary,
    },
    valorItem: {
      fontSize: 15,
      fontWeight: '700',
      flexShrink: 0,
    },
    valorDespesa: {
      color: cores.danger,
    },
    valorReceita: {
      color: cores.success,
    },
    botaoExcluir: {
      width: 44,
      height: 44,
      marginRight: 6,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    botaoExcluirPressionado: {
      backgroundColor: cores.dangerBg,
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
    botaoLimparFiltro: {
      marginTop: 4,
      backgroundColor: cores.primaryBg,
      borderWidth: 1,
      borderColor: cores.primary,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    botaoLimparFiltroPressionado: {
      opacity: 0.85,
    },
    textoBotaoLimparFiltro: {
      fontSize: 13,
      fontWeight: '700',
      color: cores.primary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: cores.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    modalCard: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: cores.surface,
      borderWidth: 1,
      borderColor: cores.border,
      borderRadius: 16,
      padding: 20,
      gap: 12,
      elevation: 6,
      shadowColor: cores.overlay,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
    },
    modalTitulo: {
      fontSize: 18,
      fontWeight: '700',
      color: cores.text,
    },
    modalMensagem: {
      fontSize: 14,
      color: cores.textSecondary,
      lineHeight: 20,
    },
    modalAcoes: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 6,
    },
    modalBotaoCancelar: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: cores.surfaceAlt,
      borderWidth: 1,
      borderColor: cores.border,
    },
    modalTextoCancelar: {
      fontSize: 14,
      fontWeight: '600',
      color: cores.text,
    },
    modalBotaoExcluir: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: cores.danger,
    },
    modalTextoExcluir: {
      fontSize: 14,
      fontWeight: '700',
      color: cores.onPrimary,
    },
    modalBotaoPressionado: {
      opacity: 0.85,
    },
  });
}
