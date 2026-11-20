import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';

import { LancamentosProvider, useLancamentos } from '@/context/LancamentosContext';
import { STORAGE_KEY } from '@/storage/lancamentosStorage';
import type { DataISO, Lancamento, LancamentosContextValue } from '@/types/lancamento';
import { chaveMes, deslocarMes, hojeISO, rotuloMes } from '@/utils/datas';

import InicioScreen from '../app/(tabs)/index';

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
      <InicioScreen />
    </LancamentosProvider>,
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('InicioScreen', () => {
  it('exibe mês atual, resumo financeiro, gastos por categoria ordenados e navega pelo botão +', async () => {
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
        id: 'desp-1',
        tipo: 'despesa',
        valorCentavos: 2500,
        data: `${mesAtual}-10` as DataISO,
        categoriaId: 'alimentacao',
        descricao: 'Mercado',
      }),
      criarLancamento({
        id: 'desp-2',
        tipo: 'despesa',
        valorCentavos: 1500,
        data: `${mesAtual}-12` as DataISO,
        categoriaId: 'alimentacao',
        descricao: 'Bandejão',
      }),
      criarLancamento({
        id: 'desp-3',
        tipo: 'despesa',
        valorCentavos: 1000,
        data: `${mesAtual}-14` as DataISO,
        categoriaId: 'transporte',
        descricao: 'Ônibus',
      }),
      criarLancamento({
        id: 'outro-mes',
        tipo: 'despesa',
        valorCentavos: 9900,
        data: `${mesAnterior}-20` as DataISO,
        categoriaId: 'lazer',
      }),
    ];

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
    jest.clearAllMocks();

    await renderTela();

    await waitFor(() => expect(screen.queryByText('Carregando lançamentos...')).toBeNull());

    expect(screen.getByTestId('seletor-mes-rotulo')).toHaveTextContent(rotuloMes(mesAtual));
    expect(screen.getByTestId('resumo-saldo')).toHaveTextContent('R$ 1.450,00');
    expect(screen.getByTestId('resumo-saldo')).toHaveStyle({ color: '#16A34A' });
    expect(screen.getByTestId('resumo-receitas')).toHaveTextContent('R$ 1.500,00');
    expect(screen.getByTestId('resumo-despesas')).toHaveTextContent('R$ 50,00');

    const itensCategoria = screen.getAllByTestId(/^gasto-categoria-/);
    expect(itensCategoria.map((item) => item.props.testID)).toEqual([
      'gasto-categoria-alimentacao',
      'gasto-categoria-transporte',
    ]);

    expect(screen.getByText('Alimentação')).toBeTruthy();
    expect(screen.getByTestId('gasto-valor-alimentacao')).toHaveTextContent('R$ 40,00');
    expect(screen.getByTestId('gasto-percentual-alimentacao')).toHaveTextContent('80%');

    expect(screen.getByText('Transporte')).toBeTruthy();
    expect(screen.getByTestId('gasto-valor-transporte')).toHaveTextContent('R$ 10,00');
    expect(screen.getByTestId('gasto-percentual-transporte')).toHaveTextContent('20%');

    expect(screen.queryByTestId('gasto-categoria-salario')).toBeNull();
    expect(screen.queryByText('Salário')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Novo lançamento' }));
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/lancamento');
  });

  it('exibe resumo zerado e estado vazio quando não há lançamentos no mês', async () => {
    await renderTela();

    await waitFor(() => expect(screen.queryByText('Carregando lançamentos...')).toBeNull());

    expect(screen.getByTestId('resumo-saldo')).toHaveTextContent('R$ 0,00');
    expect(screen.getByTestId('resumo-saldo')).toHaveStyle({ color: '#111827' });
    expect(screen.getByTestId('resumo-receitas')).toHaveTextContent('R$ 0,00');
    expect(screen.getByTestId('resumo-despesas')).toHaveTextContent('R$ 0,00');

    expect(screen.getByTestId('estado-vazio-mes')).toBeTruthy();
    expect(screen.getByText('Nenhum lançamento neste mês')).toBeTruthy();
    expect(screen.queryByTestId('lista-gastos-categoria')).toBeNull();
  });

  it('exibe estado sem despesas sem erro de divisão por zero quando há apenas receitas no mês', async () => {
    const mesAtual = chaveMes(hojeISO());
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        criarLancamento({
          id: 'rec-unica',
          tipo: 'receita',
          valorCentavos: 120000,
          data: `${mesAtual}-05` as DataISO,
          categoriaId: 'salario',
        }),
      ]),
    );

    await renderTela();

    await waitFor(() => expect(screen.queryByText('Carregando lançamentos...')).toBeNull());

    expect(screen.getByTestId('resumo-saldo')).toHaveTextContent('R$ 1.200,00');
    expect(screen.getByTestId('resumo-receitas')).toHaveTextContent('R$ 1.200,00');
    expect(screen.getByTestId('resumo-despesas')).toHaveTextContent('R$ 0,00');

    expect(screen.getByTestId('estado-sem-despesas')).toBeTruthy();
    expect(screen.getByText('Nenhuma despesa registrada neste mês')).toBeTruthy();
    expect(screen.queryByTestId('lista-gastos-categoria')).toBeNull();
    expect(screen.queryByText(/NaN/i)).toBeNull();
  });

  it('destaca saldo negativo em vermelho quando despesas superam receitas', async () => {
    const mesAtual = chaveMes(hojeISO());
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        criarLancamento({
          id: 'rec-1',
          tipo: 'receita',
          valorCentavos: 5000,
          data: `${mesAtual}-02` as DataISO,
          categoriaId: 'salario',
        }),
        criarLancamento({
          id: 'desp-1',
          tipo: 'despesa',
          valorCentavos: 12550,
          data: `${mesAtual}-08` as DataISO,
          categoriaId: 'moradia',
        }),
      ]),
    );

    await renderTela();

    await waitFor(() => expect(screen.queryByText('Carregando lançamentos...')).toBeNull());

    expect(screen.getByTestId('resumo-saldo')).toHaveTextContent('-R$ 75,50');
    expect(screen.getByTestId('resumo-saldo')).toHaveStyle({ color: '#DC2626' });
  });

  it('navega entre meses com virada de ano (dez -> jan -> dez) e formata percentuais com vírgula', async () => {
    const mesAtual = chaveMes(hojeISO());
    const [anoStr, mesStr] = mesAtual.split('-');
    const anoAtual = Number(anoStr);
    const mesNumero = Number(mesStr);

    const dados: Lancamento[] = [
      criarLancamento({
        id: 'dez-1',
        tipo: 'despesa',
        valorCentavos: 1000,
        data: `${anoAtual}-12-10` as DataISO,
        categoriaId: 'alimentacao',
      }),
      criarLancamento({
        id: 'dez-2',
        tipo: 'despesa',
        valorCentavos: 1000,
        data: `${anoAtual}-12-11` as DataISO,
        categoriaId: 'transporte',
      }),
      criarLancamento({
        id: 'dez-3',
        tipo: 'despesa',
        valorCentavos: 1000,
        data: `${anoAtual}-12-12` as DataISO,
        categoriaId: 'lazer',
      }),
      criarLancamento({
        id: 'jan-1',
        tipo: 'despesa',
        valorCentavos: 50000,
        data: `${anoAtual + 1}-01-05` as DataISO,
        categoriaId: 'moradia',
      }),
    ];

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dados));

    await renderTela();

    await waitFor(() => expect(screen.queryByText('Carregando lançamentos...')).toBeNull());

    const botaoProximo = screen.getByRole('button', { name: 'Próximo mês' });
    const botaoAnterior = screen.getByRole('button', { name: 'Mês anterior' });

    const passosAteDezembro = 12 - mesNumero;
    for (let i = 0; i < passosAteDezembro; i += 1) {
      await fireEvent.press(botaoProximo);
    }

    expect(screen.getByTestId('seletor-mes-rotulo')).toHaveTextContent(`dez/${anoAtual}`);
    expect(screen.getByTestId('resumo-despesas')).toHaveTextContent('R$ 30,00');
    expect(screen.getByTestId('gasto-percentual-alimentacao')).toHaveTextContent('33,3%');
    expect(screen.getByTestId('gasto-percentual-transporte')).toHaveTextContent('33,3%');
    expect(screen.getByTestId('gasto-percentual-lazer')).toHaveTextContent('33,3%');

    await fireEvent.press(botaoProximo);

    expect(screen.getByTestId('seletor-mes-rotulo')).toHaveTextContent(`jan/${anoAtual + 1}`);
    expect(screen.getByTestId('resumo-despesas')).toHaveTextContent('R$ 500,00');
    expect(screen.getByText('Moradia')).toBeTruthy();
    expect(screen.getByTestId('gasto-percentual-moradia')).toHaveTextContent('100%');

    await fireEvent.press(botaoAnterior);

    expect(screen.getByTestId('seletor-mes-rotulo')).toHaveTextContent(`dez/${anoAtual}`);
    expect(screen.getByTestId('resumo-despesas')).toHaveTextContent('R$ 30,00');
  });

  it('recalcula saldo e categorias imediatamente ao adicionar e editar lançamento no contexto', async () => {
    let contexto!: LancamentosContextValue;

    await renderTela((ctx) => {
      contexto = ctx;
    });

    await waitFor(() => expect(screen.queryByText('Carregando lançamentos...')).toBeNull());
    expect(screen.getByTestId('estado-vazio-mes')).toBeTruthy();
    expect(screen.getByTestId('resumo-saldo')).toHaveTextContent('R$ 0,00');

    let criado!: Lancamento;
    await act(async () => {
      criado = await contexto.adicionar({
        tipo: 'despesa',
        valorCentavos: 2500,
        descricao: 'Almoço',
        data: hojeISO(),
        categoriaId: 'alimentacao',
      });
    });

    expect(screen.getByTestId('resumo-saldo')).toHaveTextContent('-R$ 25,00');
    expect(screen.getByTestId('resumo-despesas')).toHaveTextContent('R$ 25,00');
    expect(screen.getByTestId('gasto-valor-alimentacao')).toHaveTextContent('R$ 25,00');
    expect(screen.getByTestId('gasto-percentual-alimentacao')).toHaveTextContent('100%');

    await act(async () => {
      await contexto.editar(criado.id, {
        tipo: 'despesa',
        valorCentavos: 4000,
        descricao: 'Almoço e lanche',
        data: hojeISO(),
        categoriaId: 'alimentacao',
      });
    });

    expect(screen.getByTestId('resumo-saldo')).toHaveTextContent('-R$ 40,00');
    expect(screen.getByTestId('resumo-despesas')).toHaveTextContent('R$ 40,00');
    expect(screen.getByTestId('gasto-valor-alimentacao')).toHaveTextContent('R$ 40,00');
  });

  it('exibe carregamento inicial com botão + desabilitado e libera após leitura', async () => {
    const leitura = criarDeferred<string | null>();
    (AsyncStorage.getItem as jest.Mock).mockReturnValueOnce(leitura.promise);

    await renderTela();

    expect(screen.getByText('Carregando lançamentos...')).toBeTruthy();
    expect(screen.getByTestId('botao-novo-lancamento')).toBeDisabled();

    await act(async () => {
      leitura.resolver(null);
      await leitura.promise;
    });

    await waitFor(() => expect(screen.queryByText('Carregando lançamentos...')).toBeNull());
    expect(screen.getByTestId('botao-novo-lancamento')).not.toBeDisabled();
  });

  it('exibe aviso dispensável nos estados invalido e parcial mantendo o resumo visível', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '{corrompido');

    const { unmount } = await renderTela();

    await waitFor(() => expect(screen.getByTestId('aviso-contexto')).toBeTruthy());
    expect(screen.getByText(/corrompidos/i)).toBeTruthy();
    expect(screen.getByTestId('resumo-saldo')).toHaveTextContent('R$ 0,00');

    await fireEvent.press(screen.getByRole('button', { name: 'Dispensar' }));
    expect(screen.queryByTestId('aviso-contexto')).toBeNull();

    unmount();
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
        }),
        { id: 'invalido-1', valorCentavos: -10 },
      ]),
    );

    await renderTela();

    await waitFor(() => expect(screen.getByTestId('aviso-contexto')).toBeTruthy());
    expect(screen.getByText(/registro\(s\) inválido\(s\)/i)).toBeTruthy();
    expect(screen.getByTestId('resumo-despesas')).toHaveTextContent('R$ 30,00');

    await fireEvent.press(screen.getByRole('button', { name: 'Dispensar' }));
    expect(screen.queryByTestId('aviso-contexto')).toBeNull();
  });

  it('exibe alerta de erro_leitura sem falso saldo zerado, bloqueia botão + e recupera ao recarregar', async () => {
    const mesAtual = chaveMes(hojeISO());
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('I/O failure'));

    await renderTela();

    await waitFor(() => expect(screen.getByTestId('erro-leitura')).toBeTruthy());
    expect(screen.getByText('Erro na leitura dos dados salvos')).toBeTruthy();
    expect(screen.queryByTestId('resumo-saldo')).toBeNull();
    expect(screen.getByTestId('botao-novo-lancamento')).toBeDisabled();

    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        criarLancamento({
          id: 'recuperado-1',
          tipo: 'receita',
          valorCentavos: 80000,
          data: `${mesAtual}-05` as DataISO,
          categoriaId: 'salario',
        }),
        criarLancamento({
          id: 'recuperado-2',
          tipo: 'despesa',
          valorCentavos: 20000,
          data: `${mesAtual}-06` as DataISO,
          categoriaId: 'saude',
        }),
      ]),
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() => expect(screen.queryByTestId('erro-leitura')).toBeNull());
    expect(screen.getByTestId('botao-novo-lancamento')).not.toBeDisabled();
    expect(screen.getByTestId('resumo-saldo')).toHaveTextContent('R$ 600,00');
    expect(screen.getByText('Saúde')).toBeTruthy();
    expect(screen.getByTestId('gasto-valor-saude')).toHaveTextContent('R$ 200,00');
  });
});
