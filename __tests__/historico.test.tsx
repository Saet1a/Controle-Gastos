import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';

import { CATEGORIAS } from '@/constants/categorias';
import { LancamentosProvider, useLancamentos } from '@/context/LancamentosContext';
import { STORAGE_KEY } from '@/storage/lancamentosStorage';
import type { DataISO, Lancamento, LancamentosContextValue } from '@/types/lancamento';
import { chaveMes, deslocarMes, formatarDataBR, hojeISO, rotuloMes } from '@/utils/datas';
import { resumoDoMes } from '@/utils/resumo';

import HistoricoScreen from '../app/(tabs)/historico';

const mockPush = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- factory do jest.mock precisa de require
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: function MockIonicons() {
    return null;
  },
}));

function criarLancamento(
  parcial: Partial<Lancamento> & Pick<Lancamento, 'id' | 'data'>,
): Lancamento {
  return {
    descricao: '',
    valorCentavos: 1000,
    tipo: 'despesa',
    categoriaId: 'outros',
    ...parcial,
  };
}

function criarDeferred<T>() {
  let resolver!: (valor: T) => void;
  let rejeitar!: (erro?: unknown) => void;
  const promise = new Promise<T>((resolve, reject) => {
    resolver = resolve;
    rejeitar = reject;
  });
  return { promise, resolver, rejeitar };
}

function PonteContexto({
  onContexto,
}: {
  onContexto: (ctx: LancamentosContextValue) => void;
}) {
  const ctx = useLancamentos();

  useEffect(() => {
    onContexto(ctx);
  }, [ctx, onContexto]);

  return null;
}

async function renderTela(onContexto?: (ctx: LancamentosContextValue) => void) {
  return render(
    <LancamentosProvider>
      {onContexto ? <PonteContexto onContexto={onContexto} /> : null}
      <HistoricoScreen />
    </LancamentosProvider>,
  );
}

async function lerSalvos(): Promise<Lancamento[]> {
  return JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? '[]');
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('HistoricoScreen', () => {
  it('lista lançamentos do mês atual ordenados do mais recente ao mais antigo, formata título/sinal/cores, não exibe botão + e abre edição ao tocar', async () => {
    const mesAtual = chaveMes(hojeISO());
    const mesAnterior = deslocarMes(mesAtual, -1);

    const dados: Lancamento[] = [
      criarLancamento({
        id: 'rec-1',
        tipo: 'receita',
        valorCentavos: 150000,
        data: `${mesAtual}-05` as DataISO,
        categoriaId: 'salario',
        descricao: 'Bolsa estágio',
      }),
      criarLancamento({
        id: 'desp-2',
        tipo: 'despesa',
        valorCentavos: 450,
        data: `${mesAtual}-10` as DataISO,
        categoriaId: 'transporte',
        descricao: '',
      }),
      criarLancamento({
        id: 'desp-1',
        tipo: 'despesa',
        valorCentavos: 1250,
        data: `${mesAtual}-14` as DataISO,
        categoriaId: 'alimentacao',
        descricao: 'Bandejão',
      }),
      criarLancamento({
        id: 'ant-1',
        tipo: 'despesa',
        valorCentavos: 3000,
        data: `${mesAnterior}-20` as DataISO,
        categoriaId: 'lazer',
        descricao: 'Cinema',
      }),
    ];

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
    jest.clearAllMocks();

    await renderTela();

    await waitFor(() => expect(screen.queryByText('Carregando lançamentos...')).toBeNull());

    expect(screen.getByTestId('seletor-mes-rotulo')).toHaveTextContent(rotuloMes(mesAtual));
    expect(screen.getByTestId('contador-lancamentos')).toHaveTextContent('3 lançamentos');

    const itens = screen.getAllByTestId(/^item-lancamento-/);
    expect(itens.map((item) => item.props.testID)).toEqual([
      'item-lancamento-desp-1',
      'item-lancamento-desp-2',
      'item-lancamento-rec-1',
    ]);

    expect(screen.getByTestId('titulo-lancamento-desp-1')).toHaveTextContent('Bandejão');
    expect(screen.getByTestId('subtitulo-lancamento-desp-1')).toHaveTextContent(
      `Alimentação · ${formatarDataBR(`${mesAtual}-14` as DataISO)}`,
    );

    expect(screen.getByTestId('titulo-lancamento-desp-2')).toHaveTextContent('Transporte');
    expect(screen.getByTestId('subtitulo-lancamento-desp-2')).toHaveTextContent(
      formatarDataBR(`${mesAtual}-10` as DataISO),
    );
    expect(screen.getByTestId('subtitulo-lancamento-desp-2').props.children).not.toContain(
      'Transporte',
    );

    expect(screen.getByTestId('valor-lancamento-desp-1')).toHaveTextContent('- R$ 12,50');
    expect(screen.getByTestId('valor-lancamento-desp-1')).toHaveStyle({ color: '#DC2626' });

    expect(screen.getByTestId('valor-lancamento-rec-1')).toHaveTextContent('+ R$ 1.500,00');
    expect(screen.getByTestId('valor-lancamento-rec-1')).toHaveStyle({ color: '#16A34A' });

    expect(screen.queryByTestId('item-lancamento-ant-1')).toBeNull();
    expect(screen.queryByTestId('botao-novo-lancamento')).toBeNull();
    expect(screen.queryByRole('button', { name: /novo lançamento/i })).toBeNull();

    await fireEvent.press(screen.getByTestId('editar-lancamento-desp-1'));
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/lancamento?id=desp-1');
    expect(screen.queryByTestId('modal-confirmar-exclusao')).toBeNull();
  });

  it('filtra por categoria em seleção única e mantém a categoria ao trocar de mês', async () => {
    const mesAtual = chaveMes(hojeISO());
    const mesAnterior = deslocarMes(mesAtual, -1);

    const dados: Lancamento[] = [
      criarLancamento({
        id: 'atual-alim',
        tipo: 'despesa',
        valorCentavos: 2200,
        data: `${mesAtual}-12` as DataISO,
        categoriaId: 'alimentacao',
        descricao: 'Almoço',
      }),
      criarLancamento({
        id: 'atual-transp',
        tipo: 'despesa',
        valorCentavos: 500,
        data: `${mesAtual}-10` as DataISO,
        categoriaId: 'transporte',
        descricao: 'Metrô',
      }),
      criarLancamento({
        id: 'ant-alim',
        tipo: 'despesa',
        valorCentavos: 1800,
        data: `${mesAnterior}-15` as DataISO,
        categoriaId: 'alimentacao',
        descricao: 'Café',
      }),
      criarLancamento({
        id: 'ant-lazer',
        tipo: 'despesa',
        valorCentavos: 4000,
        data: `${mesAnterior}-08` as DataISO,
        categoriaId: 'lazer',
        descricao: 'Show',
      }),
    ];

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
    await renderTela();

    await waitFor(() => expect(screen.queryByText('Carregando lançamentos...')).toBeNull());

    expect(screen.getByTestId('filtro-categoria-todas')).toHaveProp('accessibilityState', {
      selected: true,
      disabled: false,
    });
    for (const categoria of CATEGORIAS) {
      expect(screen.getByTestId(`filtro-categoria-${categoria.id}`)).toBeTruthy();
    }

    await fireEvent.press(screen.getByTestId('filtro-categoria-alimentacao'));

    expect(screen.getByTestId('filtro-categoria-alimentacao')).toHaveProp('accessibilityState', {
      selected: true,
      disabled: false,
    });
    expect(screen.getByTestId('filtro-categoria-todas')).toHaveProp('accessibilityState', {
      selected: false,
      disabled: false,
    });
    expect(screen.getByTestId('contador-lancamentos')).toHaveTextContent('1 lançamento');
    expect(screen.getByTestId('item-lancamento-atual-alim')).toBeTruthy();
    expect(screen.queryByTestId('item-lancamento-atual-transp')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Mês anterior' }));

    expect(screen.getByTestId('seletor-mes-rotulo')).toHaveTextContent(rotuloMes(mesAnterior));
    expect(screen.getByTestId('filtro-categoria-alimentacao')).toHaveProp('accessibilityState', {
      selected: true,
      disabled: false,
    });
    expect(screen.getByTestId('item-lancamento-ant-alim')).toBeTruthy();
    expect(screen.queryByTestId('item-lancamento-ant-lazer')).toBeNull();

    await fireEvent.press(screen.getByTestId('filtro-categoria-todas'));
    expect(screen.getByTestId('contador-lancamentos')).toHaveTextContent('2 lançamentos');
    expect(screen.getByTestId('item-lancamento-ant-alim')).toBeTruthy();
    expect(screen.getByTestId('item-lancamento-ant-lazer')).toBeTruthy();
  });

  it('exige confirmação para excluir: cancelar mantém o item e confirmar remove, recalcula resumo e persiste', async () => {
    const mesAtual = chaveMes(hojeISO());
    const dados: Lancamento[] = [
      criarLancamento({
        id: 'rec-1',
        tipo: 'receita',
        valorCentavos: 150000,
        data: `${mesAtual}-05` as DataISO,
        categoriaId: 'salario',
        descricao: 'Bolsa estágio',
      }),
      criarLancamento({
        id: 'desp-1',
        tipo: 'despesa',
        valorCentavos: 2500,
        data: `${mesAtual}-10` as DataISO,
        categoriaId: 'alimentacao',
        descricao: 'Mercado',
      }),
    ];

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dados));

    let contexto!: LancamentosContextValue;
    await renderTela((ctx) => {
      contexto = ctx;
    });

    await waitFor(() => expect(screen.queryByText('Carregando lançamentos...')).toBeNull());

    await fireEvent.press(screen.getByTestId('excluir-lancamento-desp-1'));

    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByTestId('modal-confirmar-exclusao')).toBeTruthy();
    expect(screen.getByText('Excluir lançamento')).toBeTruthy();
    expect(screen.getByTestId('modal-excluir-mensagem')).toHaveTextContent(/Mercado/);
    expect(screen.getByTestId('modal-excluir-mensagem')).toHaveTextContent(/- R\$ 25,00/);

    await fireEvent.press(screen.getByTestId('modal-excluir-cancelar'));

    expect(screen.queryByTestId('modal-confirmar-exclusao')).toBeNull();
    expect(screen.getByTestId('item-lancamento-desp-1')).toBeTruthy();
    expect(resumoDoMes(contexto.lancamentos, mesAtual).saldoCentavos).toBe(147500);
    expect(await lerSalvos()).toHaveLength(2);

    await fireEvent.press(screen.getByTestId('excluir-lancamento-desp-1'));
    expect(screen.getByTestId('modal-confirmar-exclusao')).toBeTruthy();

    await fireEvent.press(
      screen.getByTestId('modal-excluir-backdrop', { includeHiddenElements: true }),
    );
    expect(screen.queryByTestId('modal-confirmar-exclusao')).toBeNull();
    expect(screen.getByTestId('item-lancamento-desp-1')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('excluir-lancamento-desp-1'));
    await fireEvent.press(screen.getByTestId('modal-excluir-confirmar'));

    expect(screen.queryByTestId('modal-confirmar-exclusao')).toBeNull();
    await waitFor(() => expect(screen.queryByTestId('item-lancamento-desp-1')).toBeNull());

    expect(screen.getByTestId('contador-lancamentos')).toHaveTextContent('1 lançamento');
    expect(resumoDoMes(contexto.lancamentos, mesAtual)).toEqual({
      receitasCentavos: 150000,
      despesasCentavos: 0,
      saldoCentavos: 150000,
    });

    const salvos = await lerSalvos();
    expect(salvos).toHaveLength(1);
    expect(salvos[0].id).toBe('rec-1');
  });

  it('exibe estado vazio de mês mesmo com categoria filtrada quando não há lançamentos no mês', async () => {
    await renderTela();

    await waitFor(() => expect(screen.queryByText('Carregando lançamentos...')).toBeNull());

    expect(screen.getByTestId('estado-vazio-mes')).toBeTruthy();
    expect(screen.getByText('Nenhum lançamento neste mês')).toBeTruthy();
    expect(screen.queryByTestId('estado-vazio-categoria')).toBeNull();
    expect(screen.queryByTestId('contador-lancamentos')).toBeNull();

    await fireEvent.press(screen.getByTestId('filtro-categoria-alimentacao'));

    expect(screen.getByTestId('estado-vazio-mes')).toBeTruthy();
    expect(screen.queryByTestId('estado-vazio-categoria')).toBeNull();
  });

  it('exibe estado vazio específico da categoria e limpa filtro ao tocar em Limpar filtro', async () => {
    const mesAtual = chaveMes(hojeISO());
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        criarLancamento({
          id: 'alim-1',
          tipo: 'despesa',
          valorCentavos: 1900,
          data: `${mesAtual}-09` as DataISO,
          categoriaId: 'alimentacao',
          descricao: 'Lanche',
        }),
      ]),
    );

    await renderTela();
    await waitFor(() => expect(screen.queryByText('Carregando lançamentos...')).toBeNull());

    await fireEvent.press(screen.getByTestId('filtro-categoria-saude'));

    expect(screen.getByTestId('estado-vazio-categoria')).toBeTruthy();
    expect(screen.getByText('Nenhum lançamento em Saúde')).toBeTruthy();
    expect(screen.queryByTestId('estado-vazio-mes')).toBeNull();

    await fireEvent.press(screen.getByTestId('botao-limpar-filtro'));

    expect(screen.getByTestId('filtro-categoria-todas')).toHaveProp('accessibilityState', {
      selected: true,
      disabled: false,
    });
    expect(screen.getByTestId('item-lancamento-alim-1')).toBeTruthy();
  });

  it('mantém filtro de categoria após excluir último item da categoria e exibe vazio do mês ao excluir último item do mês', async () => {
    const mesAtual = chaveMes(hojeISO());
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        criarLancamento({
          id: 'alim-1',
          tipo: 'despesa',
          valorCentavos: 1500,
          data: `${mesAtual}-11` as DataISO,
          categoriaId: 'alimentacao',
          descricao: 'Pizza',
        }),
        criarLancamento({
          id: 'transp-1',
          tipo: 'despesa',
          valorCentavos: 600,
          data: `${mesAtual}-08` as DataISO,
          categoriaId: 'transporte',
          descricao: 'Passagem',
        }),
      ]),
    );

    await renderTela();
    await waitFor(() => expect(screen.queryByText('Carregando lançamentos...')).toBeNull());

    await fireEvent.press(screen.getByTestId('filtro-categoria-alimentacao'));
    await fireEvent.press(screen.getByTestId('excluir-lancamento-alim-1'));
    await fireEvent.press(screen.getByTestId('modal-excluir-confirmar'));

    await waitFor(() => expect(screen.getByTestId('estado-vazio-categoria')).toBeTruthy());
    expect(screen.getByTestId('filtro-categoria-alimentacao')).toHaveProp('accessibilityState', {
      selected: true,
      disabled: false,
    });

    await fireEvent.press(screen.getByTestId('botao-limpar-filtro'));
    expect(screen.getByTestId('item-lancamento-transp-1')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('excluir-lancamento-transp-1'));
    await fireEvent.press(screen.getByTestId('modal-excluir-confirmar'));

    await waitFor(() => expect(screen.getByTestId('estado-vazio-mes')).toBeTruthy());
    expect(await lerSalvos()).toEqual([]);
  });

  it('desempata lançamentos com mesma data YYYY-MM-DD de forma determinística por id decrescente sem mutar o array do contexto', async () => {
    const mesAtual = chaveMes(hojeISO());
    const mesmaData = `${mesAtual}-15` as DataISO;
    const dados: Lancamento[] = [
      criarLancamento({
        id: 'id-a',
        data: mesmaData,
        categoriaId: 'alimentacao',
        descricao: 'Item A',
      }),
      criarLancamento({
        id: 'id-c',
        data: mesmaData,
        categoriaId: 'transporte',
        descricao: 'Item C',
      }),
      criarLancamento({
        id: 'id-b',
        data: mesmaData,
        categoriaId: 'lazer',
        descricao: 'Item B',
      }),
    ];

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dados));

    let contexto!: LancamentosContextValue;
    await renderTela((ctx) => {
      contexto = ctx;
    });

    await waitFor(() => expect(screen.queryByText('Carregando lançamentos...')).toBeNull());

    const idsAntes = contexto.lancamentos.map((l) => l.id);
    const refAntes = contexto.lancamentos;

    const itens = screen.getAllByTestId(/^item-lancamento-/);
    expect(itens.map((item) => item.props.testID)).toEqual([
      'item-lancamento-id-c',
      'item-lancamento-id-b',
      'item-lancamento-id-a',
    ]);

    await fireEvent.press(screen.getByTestId('filtro-categoria-lazer'));
    await fireEvent.press(screen.getByTestId('filtro-categoria-todas'));
    await fireEvent.press(screen.getByRole('button', { name: 'Mês anterior' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Próximo mês' }));

    expect(contexto.lancamentos).toBe(refAntes);
    expect(contexto.lancamentos.map((l) => l.id)).toEqual(idsAntes);
  });

  it('exibe carregamento inicial desabilitando filtros e exibe avisos dispensáveis nos estados invalido e parcial', async () => {
    const leitura = criarDeferred<string | null>();
    (AsyncStorage.getItem as jest.Mock).mockReturnValueOnce(leitura.promise);

    const { unmount } = await renderTela();

    expect(screen.getByTestId('estado-carregando')).toBeTruthy();
    expect(screen.getByText('Carregando lançamentos...')).toBeTruthy();
    expect(screen.getByTestId('seletor-mes-anterior')).toBeDisabled();
    expect(screen.getByTestId('seletor-mes-proximo')).toBeDisabled();
    expect(screen.getByTestId('filtro-categoria-todas')).toBeDisabled();

    await act(async () => {
      leitura.resolver(null);
      await leitura.promise;
    });

    await waitFor(() => expect(screen.queryByTestId('estado-carregando')).toBeNull());
    expect(screen.getByTestId('seletor-mes-anterior')).not.toBeDisabled();
    expect(screen.getByTestId('filtro-categoria-todas')).not.toBeDisabled();

    unmount();
    await AsyncStorage.clear();
    await AsyncStorage.setItem(STORAGE_KEY, '{corrompido');

    const { unmount: unmountInvalido } = await renderTela();

    await waitFor(() => expect(screen.getByTestId('aviso-contexto')).toBeTruthy());
    expect(screen.getByText('Dados salvos recuperados')).toBeTruthy();
    expect(screen.getByTestId('estado-vazio-mes')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Dispensar' }));
    expect(screen.queryByTestId('aviso-contexto')).toBeNull();

    unmountInvalido();
    await AsyncStorage.clear();

    const mesAtual = chaveMes(hojeISO());
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        criarLancamento({
          id: 'valido-1',
          tipo: 'despesa',
          valorCentavos: 3000,
          data: `${mesAtual}-10` as DataISO,
          categoriaId: 'educacao',
          descricao: 'Livro',
        }),
        { id: 'invalido-1', valorCentavos: -10 },
      ]),
    );

    await renderTela();

    await waitFor(() => expect(screen.getByTestId('aviso-contexto')).toBeTruthy());
    expect(screen.getByText('Alguns registros foram ignorados')).toBeTruthy();
    expect(screen.getByTestId('item-lancamento-valido-1')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Dispensar' }));
    expect(screen.queryByTestId('aviso-contexto')).toBeNull();
  });

  it('trata erro_leitura sem falso estado vazio e recupera ao tentar novamente', async () => {
    const mesAtual = chaveMes(hojeISO());
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('I/O failure'));

    await renderTela();

    await waitFor(() => expect(screen.getByTestId('erro-leitura')).toBeTruthy());
    expect(screen.getByText('Erro na leitura dos dados salvos')).toBeTruthy();
    expect(screen.queryByTestId('estado-vazio-mes')).toBeNull();
    expect(screen.queryByTestId('lista-lancamentos')).toBeNull();

    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        criarLancamento({
          id: 'rec-ok',
          tipo: 'receita',
          valorCentavos: 50000,
          data: `${mesAtual}-03` as DataISO,
          categoriaId: 'salario',
          descricao: 'Freela',
        }),
      ]),
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() => expect(screen.queryByTestId('erro-leitura')).toBeNull());
    expect(screen.getByTestId('item-lancamento-rec-ok')).toBeTruthy();
  });

  it('exibe banner vermelho dedicado ao falhar persistência da exclusão, suprime aviso amarelo e limpa ambos ao dispensar', async () => {
    const mesAtual = chaveMes(hojeISO());
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        criarLancamento({
          id: 'valido-1',
          tipo: 'despesa',
          valorCentavos: 2500,
          data: `${mesAtual}-12` as DataISO,
          categoriaId: 'alimentacao',
          descricao: 'Jantar',
        }),
        { id: 'corrompido-1', valorCentavos: -5 },
      ]),
    );

    await renderTela();

    await waitFor(() => expect(screen.getByTestId('aviso-contexto')).toBeTruthy());

    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Disk full'));

    await fireEvent.press(screen.getByTestId('excluir-lancamento-valido-1'));
    await fireEvent.press(screen.getByTestId('modal-excluir-confirmar'));

    await waitFor(() => expect(screen.getByTestId('erro-exclusao')).toBeTruthy());

    expect(screen.getByText('Erro ao excluir lançamento')).toBeTruthy();
    expect(screen.queryByTestId('aviso-contexto')).toBeNull();
    expect(screen.getByTestId('item-lancamento-valido-1')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Dispensar' }));
    expect(screen.queryByTestId('erro-exclusao')).toBeNull();
    expect(screen.queryByTestId('aviso-contexto')).toBeNull();
  });
});
