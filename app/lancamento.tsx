import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CATEGORIAS, corCategoria } from '@/constants/categorias';
import { useLancamentos } from '@/context/LancamentosContext';
import type { CoresTema } from '@/theme/cores';
import { useTema } from '@/theme/useTema';
import {
  ErroValidacaoLancamento,
  type CampoLancamento,
  type CategoriaId,
  type DataISO,
  type Lancamento,
  type NovoLancamento,
  type TipoLancamento,
} from '@/types/lancamento';
import {
  formatarDataBR,
  formatarEntradaDataBR,
  hojeISO,
  ontemISO,
  parseDataBRParaISO,
} from '@/utils/datas';
import { formatarCentavos, parseValorParaCentavos } from '@/utils/dinheiro';
import { MAX_DESCRICAO_LENGTH } from '@/utils/validacao';

type ModoData = 'hoje' | 'ontem' | 'outra';
type CampoFoco = 'valor' | 'data' | 'descricao';
type EstilosLancamento = ReturnType<typeof criarEstilos>;

interface EstadoInicialFormulario {
  tipo: TipoLancamento;
  valorTexto: string;
  descricao: string;
  modoData: ModoData;
  dataISO: DataISO;
  outraDataTexto: string;
  categoriaId: CategoriaId | null;
}

function criarEstadoInicial(lancamento?: Lancamento): EstadoInicialFormulario {
  if (!lancamento) {
    return {
      tipo: 'despesa',
      valorTexto: '',
      descricao: '',
      modoData: 'hoje',
      dataISO: hojeISO(),
      outraDataTexto: '',
      categoriaId: null,
    };
  }

  const hoje = hojeISO();
  const ontem = ontemISO();
  let modoData: ModoData = 'outra';
  let outraDataTexto = formatarDataBR(lancamento.data);

  if (lancamento.data === hoje) {
    modoData = 'hoje';
    outraDataTexto = '';
  } else if (lancamento.data === ontem) {
    modoData = 'ontem';
    outraDataTexto = '';
  }

  return {
    tipo: lancamento.tipo,
    valorTexto: formatarCentavos(lancamento.valorCentavos).replace(/^R\$\s*/, ''),
    descricao: lancamento.descricao,
    modoData,
    dataISO: lancamento.data,
    outraDataTexto,
    categoriaId: lancamento.categoriaId,
  };
}

interface FormularioLancamentoProps {
  idEdicao?: string;
  lancamentoInicial?: Lancamento;
  carregando: boolean;
  erroLeitura: boolean;
  cores: CoresTema;
  escuro: boolean;
  styles: EstilosLancamento;
  adicionar: (novo: NovoLancamento) => Promise<Lancamento>;
  editar: (id: string, dados: NovoLancamento) => Promise<Lancamento>;
  onCancelar: () => void;
  onSucesso: () => void;
}

function FormularioLancamento({
  idEdicao,
  lancamentoInicial,
  carregando,
  erroLeitura,
  cores,
  escuro,
  styles,
  adicionar,
  editar,
  onCancelar,
  onSucesso,
}: FormularioLancamentoProps) {
  const modoEdicao = Boolean(idEdicao);
  const [inicial] = useState<EstadoInicialFormulario>(() =>
    criarEstadoInicial(lancamentoInicial),
  );

  const [tipo, setTipo] = useState<TipoLancamento>(inicial.tipo);
  const [valorTexto, setValorTexto] = useState(inicial.valorTexto);
  const [descricao, setDescricao] = useState(inicial.descricao);
  const [modoData, setModoData] = useState<ModoData>(inicial.modoData);
  const [dataISO, setDataISO] = useState<DataISO>(inicial.dataISO);
  const [outraDataTexto, setOutraDataTexto] = useState(inicial.outraDataTexto);
  const [categoriaId, setCategoriaId] = useState<CategoriaId | null>(inicial.categoriaId);
  const [salvando, setSalvando] = useState(false);
  const [errosCampo, setErrosCampo] = useState<Partial<Record<CampoLancamento, string>>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [campoFocado, setCampoFocado] = useState<CampoFoco | null>(null);

  const salvandoRef = useRef(false);
  const concluidoRef = useRef(false);
  const montadoRef = useRef(true);

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
    };
  }, []);

  const envioBloqueado = carregando || salvando || erroLeitura;

  function limparErroCampo(campo: CampoLancamento) {
    setErrosCampo((atual) => {
      if (!atual[campo]) return atual;
      const proximo = { ...atual };
      delete proximo[campo];
      return proximo;
    });
    setErroGeral(null);
  }

  function selecionarHoje() {
    setModoData('hoje');
    setDataISO(hojeISO());
    limparErroCampo('data');
  }

  function selecionarOntem() {
    setModoData('ontem');
    setDataISO(ontemISO());
    limparErroCampo('data');
  }

  function selecionarOutraData() {
    setModoData('outra');
    limparErroCampo('data');
  }

  async function handleSalvar() {
    if (envioBloqueado || salvandoRef.current || concluidoRef.current) {
      return;
    }

    setErrosCampo({});
    setErroGeral(null);

    const errosLocais: Partial<Record<CampoLancamento, string>> = {};

    const valorCentavos = parseValorParaCentavos(valorTexto);
    if (valorCentavos === null) {
      errosLocais.valorCentavos = 'Informe um valor válido (ex.: 12,50).';
    }

    const dataResolvida = modoData === 'outra' ? parseDataBRParaISO(outraDataTexto) : dataISO;
    if (dataResolvida === null) {
      errosLocais.data = 'Data inválida. Use o formato DD/MM/AAAA.';
    }

    if (categoriaId === null) {
      errosLocais.categoriaId = 'Selecione uma categoria.';
    }

    if (
      Object.keys(errosLocais).length > 0 ||
      valorCentavos === null ||
      dataResolvida === null ||
      categoriaId === null
    ) {
      setErrosCampo(errosLocais);
      return;
    }

    salvandoRef.current = true;
    setSalvando(true);

    const dados: NovoLancamento = {
      tipo,
      valorCentavos,
      descricao,
      data: dataResolvida,
      categoriaId,
    };

    try {
      if (modoEdicao && idEdicao) {
        await editar(idEdicao, dados);
      } else {
        await adicionar(dados);
      }
      concluidoRef.current = true;
      onSucesso();
    } catch (err) {
      if (!montadoRef.current) return;

      if (err instanceof ErroValidacaoLancamento) {
        if (err.campo === 'id') {
          setErroGeral(err.message);
        } else {
          setErrosCampo({ [err.campo]: err.message });
        }
      } else {
        setErroGeral(
          err instanceof Error && err.message
            ? err.message
            : 'Não foi possível salvar o lançamento.',
        );
      }
    } finally {
      if (!concluidoRef.current) {
        salvandoRef.current = false;
        if (montadoRef.current) {
          setSalvando(false);
        }
      }
    }
  }

  const textoBotaoSalvar = salvando
    ? 'Salvando...'
    : modoEdicao
      ? 'Salvar alterações'
      : 'Salvar lançamento';

  return (
    <>
      <View style={styles.secao}>
        <Text style={styles.rotulo}>Tipo</Text>
        <View style={styles.segmentado}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: tipo === 'despesa', disabled: envioBloqueado }}
            disabled={envioBloqueado}
            onPress={() => {
              setTipo('despesa');
              limparErroCampo('tipo');
            }}
            style={[styles.opcaoSegmentada, tipo === 'despesa' && styles.opcaoSegmentadaAtiva]}
          >
            <Text
              style={[styles.textoSegmentado, tipo === 'despesa' && styles.textoSegmentadoAtivo]}
            >
              Despesa
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: tipo === 'receita', disabled: envioBloqueado }}
            disabled={envioBloqueado}
            onPress={() => {
              setTipo('receita');
              limparErroCampo('tipo');
            }}
            style={[styles.opcaoSegmentada, tipo === 'receita' && styles.opcaoSegmentadaAtiva]}
          >
            <Text
              style={[styles.textoSegmentado, tipo === 'receita' && styles.textoSegmentadoAtivo]}
            >
              Receita
            </Text>
          </Pressable>
        </View>
        {errosCampo.tipo ? (
          <Text testID="erro-tipo" style={styles.textoErro}>
            {errosCampo.tipo}
          </Text>
        ) : null}
      </View>

      <View style={styles.secao}>
        <Text style={styles.rotulo}>Valor</Text>
        <View
          style={[
            styles.caixaValor,
            campoFocado === 'valor' && styles.bordaFoco,
            Boolean(errosCampo.valorCentavos) && styles.campoErro,
          ]}
        >
          <Text style={styles.prefixoMoeda}>R$</Text>
          <TextInput
            accessibilityLabel="Valor"
            placeholder="0,00"
            placeholderTextColor={cores.textMuted}
            selectionColor={cores.primary}
            keyboardAppearance={escuro ? 'dark' : 'light'}
            keyboardType="decimal-pad"
            value={valorTexto}
            onFocus={() => setCampoFocado('valor')}
            onBlur={() => setCampoFocado((atual) => (atual === 'valor' ? null : atual))}
            onChangeText={(texto) => {
              setValorTexto(texto);
              limparErroCampo('valorCentavos');
            }}
            editable={!envioBloqueado}
            style={styles.inputValor}
          />
        </View>
        {errosCampo.valorCentavos ? (
          <Text testID="erro-valorCentavos" style={styles.textoErro}>
            {errosCampo.valorCentavos}
          </Text>
        ) : null}
      </View>

      <View style={styles.secao}>
        <Text style={styles.rotulo}>Categoria</Text>
        <View style={styles.gradeCategorias}>
          {CATEGORIAS.map((categoria) => {
            const selecionada = categoriaId === categoria.id;
            const corCat = corCategoria(categoria.id, escuro);
            return (
              <Pressable
                key={categoria.id}
                testID={`categoria-${categoria.id}`}
                accessibilityRole="button"
                accessibilityLabel={categoria.nome}
                accessibilityState={{ selected: selecionada, disabled: envioBloqueado }}
                disabled={envioBloqueado}
                onPress={() => {
                  setCategoriaId(categoria.id);
                  limparErroCampo('categoriaId');
                }}
                style={[styles.chipCategoria, selecionada && styles.chipCategoriaAtivo]}
              >
                <View style={[styles.bolinhaCategoria, { backgroundColor: corCat }]}>
                  <Ionicons name={categoria.icone} size={15} color={cores.onPrimary} />
                </View>
                <Text
                  style={[styles.nomeCategoria, selecionada && styles.nomeCategoriaAtiva]}
                  numberOfLines={1}
                >
                  {categoria.nome}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {errosCampo.categoriaId ? (
          <Text testID="erro-categoriaId" style={styles.textoErro}>
            {errosCampo.categoriaId}
          </Text>
        ) : null}
      </View>

      <View style={styles.secao}>
        <View style={styles.linhaRotulo}>
          <Text style={styles.rotulo}>Data</Text>
          {modoData !== 'outra' ? (
            <Text style={styles.dicaData}>{formatarDataBR(dataISO)}</Text>
          ) : null}
        </View>
        <View style={styles.linhaChipsData}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: modoData === 'hoje', disabled: envioBloqueado }}
            disabled={envioBloqueado}
            onPress={selecionarHoje}
            style={[styles.chipData, modoData === 'hoje' && styles.chipDataAtivo]}
          >
            <Text style={[styles.textoChipData, modoData === 'hoje' && styles.textoChipDataAtivo]}>
              Hoje
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: modoData === 'ontem', disabled: envioBloqueado }}
            disabled={envioBloqueado}
            onPress={selecionarOntem}
            style={[styles.chipData, modoData === 'ontem' && styles.chipDataAtivo]}
          >
            <Text
              style={[styles.textoChipData, modoData === 'ontem' && styles.textoChipDataAtivo]}
            >
              Ontem
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: modoData === 'outra', disabled: envioBloqueado }}
            disabled={envioBloqueado}
            onPress={selecionarOutraData}
            style={[styles.chipData, modoData === 'outra' && styles.chipDataAtivo]}
          >
            <Text
              style={[styles.textoChipData, modoData === 'outra' && styles.textoChipDataAtivo]}
            >
              Outra data
            </Text>
          </Pressable>
        </View>
        {modoData === 'outra' ? (
          <TextInput
            accessibilityLabel="Outra data"
            placeholder="DD/MM/AAAA"
            placeholderTextColor={cores.textMuted}
            selectionColor={cores.primary}
            keyboardAppearance={escuro ? 'dark' : 'light'}
            keyboardType="number-pad"
            maxLength={10}
            value={outraDataTexto}
            onFocus={() => setCampoFocado('data')}
            onBlur={() => setCampoFocado((atual) => (atual === 'data' ? null : atual))}
            onChangeText={(texto) => {
              setOutraDataTexto(formatarEntradaDataBR(texto));
              limparErroCampo('data');
            }}
            editable={!envioBloqueado}
            style={[
              styles.inputTexto,
              campoFocado === 'data' && styles.bordaFoco,
              Boolean(errosCampo.data) && styles.campoErro,
            ]}
          />
        ) : null}
        {errosCampo.data ? (
          <Text testID="erro-data" style={styles.textoErro}>
            {errosCampo.data}
          </Text>
        ) : null}
      </View>

      <View style={styles.secao}>
        <View style={styles.linhaRotulo}>
          <Text style={styles.rotulo}>Descrição (opcional)</Text>
          <Text style={styles.contador}>
            {descricao.trim().length}/{MAX_DESCRICAO_LENGTH}
          </Text>
        </View>
        <TextInput
          accessibilityLabel="Descrição"
          placeholder="Ex.: Bandejão, ônibus, bolsa..."
          placeholderTextColor={cores.textMuted}
          selectionColor={cores.primary}
          keyboardAppearance={escuro ? 'dark' : 'light'}
          value={descricao}
          onFocus={() => setCampoFocado('descricao')}
          onBlur={() => setCampoFocado((atual) => (atual === 'descricao' ? null : atual))}
          onChangeText={(texto) => {
            setDescricao(texto);
            limparErroCampo('descricao');
          }}
          editable={!envioBloqueado}
          returnKeyType="done"
          style={[
            styles.inputTexto,
            campoFocado === 'descricao' && styles.bordaFoco,
            Boolean(errosCampo.descricao) && styles.campoErro,
          ]}
        />
        {errosCampo.descricao ? (
          <Text testID="erro-descricao" style={styles.textoErro}>
            {errosCampo.descricao}
          </Text>
        ) : null}
      </View>

      {erroGeral ? (
        <View style={styles.alertaErro} accessibilityRole="alert">
          <Text style={styles.textoAlertaErro}>{erroGeral}</Text>
        </View>
      ) : null}

      <View style={styles.acoes}>
        <Pressable
          testID="botao-salvar"
          accessibilityRole="button"
          accessibilityState={{ disabled: envioBloqueado, busy: salvando }}
          disabled={envioBloqueado}
          onPress={() => void handleSalvar()}
          style={[styles.botaoPrimario, envioBloqueado && styles.botaoDesabilitado]}
        >
          <Text style={styles.textoBotaoPrimario}>{textoBotaoSalvar}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: salvando }}
          disabled={salvando}
          onPress={onCancelar}
          style={styles.botaoSecundario}
        >
          <Text style={styles.textoBotaoSecundario}>Cancelar</Text>
        </Pressable>
      </View>
    </>
  );
}

export default function LancamentoScreen() {
  const { cores, escuro } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);

  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const idBruto = Array.isArray(params.id) ? params.id[0] : params.id;
  const idEdicao =
    typeof idBruto === 'string' && idBruto.trim() !== '' ? idBruto.trim() : undefined;
  const modoEdicao = Boolean(idEdicao);
  const tituloTela = modoEdicao ? 'Editar lançamento' : 'Novo lançamento';

  const router = useRouter();
  const {
    lancamentos,
    carregando,
    statusCarregamento,
    erro: erroContexto,
    adicionar,
    editar,
    recarregar,
  } = useLancamentos();

  const erroLeitura = statusCarregamento === 'erro_leitura';

  const lancamentoEdicao = useMemo(
    () => (idEdicao ? lancamentos.find((item) => item.id === idEdicao) : undefined),
    [idEdicao, lancamentos],
  );

  const naoEncontrado = modoEdicao && !carregando && !erroLeitura && !lancamentoEdicao;

  const chaveFormulario = !idEdicao
    ? 'novo'
    : lancamentoEdicao
      ? `editar-${lancamentoEdicao.id}`
      : `carregando-${idEdicao}`;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          title: tituloTela,
          headerStyle: { backgroundColor: cores.surface },
          headerTintColor: cores.text,
          headerTitleStyle: { color: cores.text },
          contentStyle: { backgroundColor: cores.background },
        }}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.conteudo}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.titulo} accessibilityRole="header">
          {tituloTela}
        </Text>

        {erroLeitura ? (
          <View style={styles.alertaErro} accessibilityRole="alert">
            <Text style={styles.tituloAlertaErro}>Erro na leitura dos dados salvos</Text>
            <Text style={styles.textoAlertaErro}>
              {erroContexto ?? 'Não foi possível ler os lançamentos salvos no aparelho.'} O
              salvamento foi bloqueado para não sobrescrever dados existentes.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: carregando }}
              disabled={carregando}
              onPress={() => void recarregar()}
              style={[styles.botaoTentarNovamente, carregando && styles.botaoDesabilitado]}
            >
              <Text style={styles.textoBotaoTentarNovamente}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : null}

        {carregando ? (
          <View style={styles.bannerCarregando}>
            <ActivityIndicator size="small" color={cores.primary} />
            <Text style={styles.textoCarregando}>Carregando lançamentos...</Text>
          </View>
        ) : null}

        {naoEncontrado ? (
          <View style={styles.cardNaoEncontrado}>
            <Ionicons name="alert-circle-outline" size={32} color={cores.textSecondary} />
            <Text style={styles.tituloNaoEncontrado}>Lançamento não encontrado</Text>
            <Text style={styles.textoNaoEncontrado}>
              Este lançamento não está na lista carregada. Ele pode ter sido excluído.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.botaoPrimario}
            >
              <Text style={styles.textoBotaoPrimario}>Voltar</Text>
            </Pressable>
          </View>
        ) : (
          <FormularioLancamento
            key={chaveFormulario}
            idEdicao={idEdicao}
            lancamentoInicial={lancamentoEdicao}
            carregando={carregando}
            erroLeitura={erroLeitura}
            cores={cores}
            escuro={escuro}
            styles={styles}
            adicionar={adicionar}
            editar={editar}
            onCancelar={() => router.back()}
            onSucesso={() => router.back()}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function criarEstilos(cores: CoresTema) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: cores.background },
    scroll: { flex: 1 },
    conteudo: { padding: 16, gap: 18, paddingBottom: 32 },
    titulo: { fontSize: 22, fontWeight: '700', color: cores.text },
    secao: { gap: 8 },
    linhaRotulo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rotulo: { fontSize: 14, fontWeight: '600', color: cores.text },
    dicaData: { fontSize: 13, color: cores.textSecondary },
    contador: { fontSize: 12, color: cores.textSecondary },
    segmentado: {
      flexDirection: 'row',
      backgroundColor: cores.surfaceAlt,
      borderWidth: 1,
      borderColor: cores.border,
      borderRadius: 10,
      padding: 3,
      gap: 4,
    },
    opcaoSegmentada: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    opcaoSegmentadaAtiva: {
      backgroundColor: cores.primaryBg,
      borderWidth: 1,
      borderColor: cores.primary,
    },
    textoSegmentado: { fontSize: 15, fontWeight: '600', color: cores.textSecondary },
    textoSegmentadoAtivo: { color: cores.primary },
    caixaValor: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: cores.surfaceAlt,
      borderWidth: 1,
      borderColor: cores.border,
      borderRadius: 10,
      paddingHorizontal: 14,
    },
    prefixoMoeda: { fontSize: 20, fontWeight: '600', color: cores.textSecondary, marginRight: 8 },
    inputValor: {
      flex: 1,
      fontSize: 24,
      fontWeight: '700',
      color: cores.text,
      paddingVertical: 12,
    },
    gradeCategorias: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chipCategoria: {
      width: '48%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: cores.surface,
      borderWidth: 1.5,
      borderColor: cores.border,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 10,
    },
    chipCategoriaAtivo: {
      backgroundColor: cores.primaryBg,
      borderColor: cores.primary,
    },
    bolinhaCategoria: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nomeCategoria: { flex: 1, fontSize: 14, fontWeight: '500', color: cores.text },
    nomeCategoriaAtiva: { fontWeight: '700', color: cores.primary },
    linhaChipsData: { flexDirection: 'row', gap: 8 },
    chipData: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: cores.surface,
      borderWidth: 1.5,
      borderColor: cores.border,
    },
    chipDataAtivo: { backgroundColor: cores.primaryBg, borderColor: cores.primary },
    textoChipData: { fontSize: 14, fontWeight: '600', color: cores.textSecondary },
    textoChipDataAtivo: { color: cores.primary },
    inputTexto: {
      backgroundColor: cores.surfaceAlt,
      borderWidth: 1,
      borderColor: cores.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: cores.text,
    },
    bordaFoco: { borderColor: cores.primary },
    campoErro: { borderColor: cores.danger, backgroundColor: cores.dangerBg },
    textoErro: {
      fontSize: 13,
      color: cores.danger,
      fontWeight: '500',
      backgroundColor: cores.dangerBg,
      borderWidth: 1,
      borderColor: cores.dangerBorder,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    alertaErro: {
      backgroundColor: cores.dangerBg,
      borderWidth: 1,
      borderColor: cores.dangerBorder,
      borderRadius: 10,
      padding: 12,
      gap: 6,
    },
    tituloAlertaErro: { fontSize: 14, fontWeight: '700', color: cores.danger },
    textoAlertaErro: { fontSize: 13, color: cores.danger, lineHeight: 18 },
    botaoTentarNovamente: {
      alignSelf: 'flex-start',
      backgroundColor: cores.danger,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 14,
      marginTop: 4,
    },
    textoBotaoTentarNovamente: { fontSize: 13, fontWeight: '600', color: cores.onPrimary },
    bannerCarregando: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: cores.primaryBg,
      borderRadius: 10,
      padding: 12,
    },
    textoCarregando: { fontSize: 14, color: cores.primary, fontWeight: '500' },
    cardNaoEncontrado: {
      alignItems: 'center',
      backgroundColor: cores.surface,
      borderWidth: 1,
      borderColor: cores.border,
      borderRadius: 12,
      padding: 20,
      gap: 10,
    },
    tituloNaoEncontrado: { fontSize: 17, fontWeight: '700', color: cores.text },
    textoNaoEncontrado: {
      fontSize: 14,
      color: cores.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    acoes: { gap: 10, marginTop: 4 },
    botaoPrimario: {
      backgroundColor: cores.primary,
      borderRadius: 10,
      paddingVertical: 14,
      paddingHorizontal: 20,
      alignItems: 'center',
      width: '100%',
    },
    botaoDesabilitado: { opacity: 0.55 },
    textoBotaoPrimario: { fontSize: 16, fontWeight: '700', color: cores.onPrimary },
    botaoSecundario: {
      backgroundColor: cores.surface,
      borderWidth: 1,
      borderColor: cores.border,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    textoBotaoSecundario: { fontSize: 15, fontWeight: '600', color: cores.text },
  });
}
