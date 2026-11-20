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

import { CATEGORIAS } from '@/constants/categorias';
import { useLancamentos } from '@/context/LancamentosContext';
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
            style={[styles.opcaoSegmentada, tipo === 'despesa' && styles.opcaoDespesaAtiva]}
          >
            <Text
              style={[styles.textoSegmentado, tipo === 'despesa' && styles.textoDespesaAtiva]}
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
            style={[styles.opcaoSegmentada, tipo === 'receita' && styles.opcaoReceitaAtiva]}
          >
            <Text
              style={[styles.textoSegmentado, tipo === 'receita' && styles.textoReceitaAtiva]}
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
        <View style={[styles.caixaValor, Boolean(errosCampo.valorCentavos) && styles.bordaErro]}>
          <Text style={styles.prefixoMoeda}>R$</Text>
          <TextInput
            accessibilityLabel="Valor"
            placeholder="0,00"
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
            value={valorTexto}
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
                style={[
                  styles.chipCategoria,
                  selecionada && {
                    borderColor: categoria.cor,
                    backgroundColor: '#F8FAFC',
                  },
                ]}
              >
                <View style={[styles.bolinhaCategoria, { backgroundColor: categoria.cor }]}>
                  <Ionicons name={categoria.icone} size={15} color="#FFFFFF" />
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
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            maxLength={10}
            value={outraDataTexto}
            onChangeText={(texto) => {
              setOutraDataTexto(formatarEntradaDataBR(texto));
              limparErroCampo('data');
            }}
            editable={!envioBloqueado}
            style={[styles.inputTexto, Boolean(errosCampo.data) && styles.bordaErro]}
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
          placeholderTextColor="#9CA3AF"
          value={descricao}
          onChangeText={(texto) => {
            setDescricao(texto);
            limparErroCampo('descricao');
          }}
          editable={!envioBloqueado}
          returnKeyType="done"
          style={[styles.inputTexto, Boolean(errosCampo.descricao) && styles.bordaErro]}
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
      <Stack.Screen options={{ title: tituloTela }} />
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
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.textoCarregando}>Carregando lançamentos...</Text>
          </View>
        ) : null}

        {naoEncontrado ? (
          <View style={styles.cardNaoEncontrado}>
            <Ionicons name="alert-circle-outline" size={32} color="#6B7280" />
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

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { flex: 1 },
  conteudo: { padding: 16, gap: 18, paddingBottom: 32 },
  titulo: { fontSize: 22, fontWeight: '700', color: '#111827' },
  secao: { gap: 8 },
  linhaRotulo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rotulo: { fontSize: 14, fontWeight: '600', color: '#374151' },
  dicaData: { fontSize: 13, color: '#6B7280' },
  contador: { fontSize: 12, color: '#6B7280' },
  segmentado: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
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
  opcaoDespesaAtiva: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5' },
  opcaoReceitaAtiva: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC' },
  textoSegmentado: { fontSize: 15, fontWeight: '600', color: '#4B5563' },
  textoDespesaAtiva: { color: '#DC2626' },
  textoReceitaAtiva: { color: '#16A34A' },
  caixaValor: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  prefixoMoeda: { fontSize: 20, fontWeight: '600', color: '#6B7280', marginRight: 8 },
  inputValor: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  bolinhaCategoria: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nomeCategoria: { flex: 1, fontSize: 14, fontWeight: '500', color: '#374151' },
  nomeCategoriaAtiva: { fontWeight: '700', color: '#111827' },
  linhaChipsData: { flexDirection: 'row', gap: 8 },
  chipData: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  chipDataAtivo: { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
  textoChipData: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  textoChipDataAtivo: { color: '#1D4ED8' },
  inputTexto: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  bordaErro: { borderColor: '#DC2626' },
  textoErro: { fontSize: 13, color: '#DC2626', fontWeight: '500' },
  alertaErro: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  tituloAlertaErro: { fontSize: 14, fontWeight: '700', color: '#991B1B' },
  textoAlertaErro: { fontSize: 13, color: '#B91C1C', lineHeight: 18 },
  botaoTentarNovamente: {
    alignSelf: 'flex-start',
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  textoBotaoTentarNovamente: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  bannerCarregando: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 12,
  },
  textoCarregando: { fontSize: 14, color: '#1E40AF', fontWeight: '500' },
  cardNaoEncontrado: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 20,
    gap: 10,
  },
  tituloNaoEncontrado: { fontSize: 17, fontWeight: '700', color: '#111827' },
  textoNaoEncontrado: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  acoes: { gap: 10, marginTop: 4 },
  botaoPrimario: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
  },
  botaoDesabilitado: { opacity: 0.5 },
  textoBotaoPrimario: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  botaoSecundario: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  textoBotaoSecundario: { fontSize: 15, fontWeight: '600', color: '#374151' },
});
