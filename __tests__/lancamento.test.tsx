import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { CATEGORIAS } from '@/constants/categorias';
import { LancamentosProvider } from '@/context/LancamentosContext';
import { STORAGE_KEY } from '@/storage/lancamentosStorage';
import type { Lancamento } from '@/types/lancamento';
import { hojeISO, ontemISO } from '@/utils/datas';
import { MAX_DESCRICAO_LENGTH } from '@/utils/validacao';

import LancamentoScreen from '../app/lancamento';

const mockBack = jest.fn();
let mockParams: { id?: string | string[] } = {};

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- factory do jest.mock precisa de require
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => ({
  Stack: {
    Screen: function MockStackScreen() {
      return null;
    },
  },
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ back: mockBack }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: function MockIonicons() {
    return null;
  },
}));

async function renderTela() {
  return render(
    <LancamentosProvider>
      <LancamentoScreen />
    </LancamentosProvider>,
  );
}

async function lerSalvos(): Promise<Lancamento[]> {
  return JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? '[]');
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

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockParams = {};
});

describe('LancamentoScreen', () => {
  it('inicia no modo criação com despesa, data de hoje, 8 categorias e salva fluxo rápido sem descrição', async () => {
    await renderTela();

    await waitFor(() => expect(screen.queryByText('Carregando lançamentos...')).toBeNull());

    expect(screen.getByText('Novo lançamento')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Despesa' })).toHaveProp('accessibilityState', {
      selected: true,
      disabled: false,
    });
    expect(screen.getByRole('button', { name: 'Hoje' })).toHaveProp('accessibilityState', {
      selected: true,
      disabled: false,
    });
    for (const categoria of CATEGORIAS) {
      expect(screen.getByText(categoria.nome)).toBeTruthy();
    }

    await fireEvent.changeText(screen.getByLabelText('Valor'), '6,50');
    await fireEvent.press(screen.getByRole('button', { name: 'Alimentação' }));
    await fireEvent.press(screen.getByTestId('botao-salvar'));

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));

    const salvos = await lerSalvos();
    expect(salvos).toHaveLength(1);
    expect(salvos[0]).toMatchObject({
      tipo: 'despesa',
      valorCentavos: 650,
      descricao: '',
      data: hojeISO(),
      categoriaId: 'alimentacao',
    });
  });

  it('cria receita com descrição normalizada e atalho Ontem', async () => {
    await renderTela();
    await waitFor(() => expect(screen.queryByText('Carregando lançamentos...')).toBeNull());

    await fireEvent.press(screen.getByRole('button', { name: 'Receita' }));
    await fireEvent.changeText(screen.getByLabelText('Valor'), '1.500,00');
    await fireEvent.press(screen.getByRole('button', { name: 'Salário' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Ontem' }));
    await fireEvent.changeText(screen.getByLabelText('Descrição'), '  Bolsa estágio  ');
    await fireEvent.press(screen.getByTestId('botao-salvar'));

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));

    const salvos = await lerSalvos();
    expect(salvos).toHaveLength(1);
    expect(salvos[0]).toMatchObject({
      tipo: 'receita',
      valorCentavos: 150000,
      descricao: 'Bolsa estágio',
      data: ontemISO(),
      categoriaId: 'salario',
    });
  });

  it('permite selecionar Outra data no formato DD/MM/AAAA', async () => {
    await renderTela();
    await waitFor(() => expect(screen.queryByText('Carregando lançamentos...')).toBeNull());

    expect(screen.queryByLabelText('Outra data')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Outra data' }));
    const campoOutraData = screen.getByLabelText('Outra data');
    await fireEvent.changeText(campoOutraData, '15032026');
    expect(screen.getByDisplayValue('15/03/2026')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Valor'), '25,00');
    await fireEvent.press(screen.getByRole('button', { name: 'Transporte' }));
    await fireEvent.press(screen.getByTestId('botao-salvar'));

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));

    const salvos = await lerSalvos();
    expect(salvos[0]).toMatchObject({
      data: '2026-03-15',
      valorCentavos: 2500,
      categoriaId: 'transporte',
    });
  });

  it('pré-preenche dados no modo edição, exibe título Editar lançamento e salva alterações', async () => {
    const existente: Lancamento = {
      id: 'lanc-1',
      tipo: 'despesa',
      valorCentavos: 1250,
      descricao: 'Cinema',
      data: '2026-03-10',
      categoriaId: 'lazer',
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([existente]));
    jest.clearAllMocks();
    mockParams = { id: 'lanc-1' };

    await renderTela();

    await waitFor(() => expect(screen.getByDisplayValue('12,50')).toBeTruthy());

    expect(screen.getByText('Editar lançamento')).toBeTruthy();
    expect(screen.getByDisplayValue('Cinema')).toBeTruthy();
    expect(screen.getByDisplayValue('10/03/2026')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Lazer' })).toHaveProp('accessibilityState', {
      selected: true,
      disabled: false,
    });

    await fireEvent.changeText(screen.getByLabelText('Valor'), '25,00');
    await fireEvent.changeText(screen.getByLabelText('Descrição'), 'Teatro');
    await fireEvent.press(screen.getByRole('button', { name: 'Hoje' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Educação' }));
    await fireEvent.press(screen.getByTestId('botao-salvar'));

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));

    const salvos = await lerSalvos();
    expect(salvos).toEqual([
      {
        id: 'lanc-1',
        tipo: 'despesa',
        valorCentavos: 2500,
        descricao: 'Teatro',
        data: hojeISO(),
        categoriaId: 'educacao',
      },
    ]);
  });

  it('trata id inexistente na rota exibindo aviso e permitindo voltar sem alterar dados', async () => {
    const existente: Lancamento = {
      id: 'lanc-1',
      tipo: 'despesa',
      valorCentavos: 500,
      descricao: 'Café',
      data: '2026-11-18',
      categoriaId: 'alimentacao',
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([existente]));
    jest.clearAllMocks();
    mockParams = { id: 'id-inexistente' };

    await renderTela();

    await waitFor(() => expect(screen.getByText('Lançamento não encontrado')).toBeTruthy());

    expect(screen.queryByTestId('botao-salvar')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('exibe erros por campo (locais e ErroValidacaoLancamento) e limpa ao editar', async () => {
    await renderTela();
    await waitFor(() => expect(screen.queryByText('Carregando lançamentos...')).toBeNull());

    await fireEvent.press(screen.getByTestId('botao-salvar'));
    expect(screen.getByTestId('erro-valorCentavos')).toHaveTextContent(
      'Informe um valor válido (ex.: 12,50).',
    );
    expect(screen.getByTestId('erro-categoriaId')).toHaveTextContent('Selecione uma categoria.');
    expect(mockBack).not.toHaveBeenCalled();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Valor'), '0,00');
    expect(screen.queryByTestId('erro-valorCentavos')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Outros' }));
    expect(screen.queryByTestId('erro-categoriaId')).toBeNull();

    await fireEvent.press(screen.getByTestId('botao-salvar'));
    await waitFor(() =>
      expect(screen.getByTestId('erro-valorCentavos')).toHaveTextContent(
        'O valor deve ser maior que zero (em centavos inteiros).',
      ),
    );
    expect(mockBack).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Valor'), '10,00');
    await fireEvent.changeText(
      screen.getByLabelText('Descrição'),
      'a'.repeat(MAX_DESCRICAO_LENGTH + 1),
    );
    await fireEvent.press(screen.getByTestId('botao-salvar'));
    await waitFor(() =>
      expect(screen.getByTestId('erro-descricao')).toHaveTextContent(
        `A descrição deve ter no máximo ${MAX_DESCRICAO_LENGTH} caracteres.`,
      ),
    );

    await fireEvent.changeText(screen.getByLabelText('Descrição'), 'Lanche');
    expect(screen.queryByTestId('erro-descricao')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Outra data' }));
    await fireEvent.changeText(screen.getByLabelText('Outra data'), '31/02/2026');
    await fireEvent.press(screen.getByTestId('botao-salvar'));
    expect(screen.getByTestId('erro-data')).toHaveTextContent(
      'Data inválida. Use o formato DD/MM/AAAA.',
    );
    expect(mockBack).not.toHaveBeenCalled();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('bloqueia envio enquanto carregando e libera após leitura inicial', async () => {
    const leitura = criarDeferred<string | null>();
    (AsyncStorage.getItem as jest.Mock).mockReturnValueOnce(leitura.promise);

    await renderTela();

    expect(screen.getByText('Carregando lançamentos...')).toBeTruthy();
    const botaoSalvar = screen.getByTestId('botao-salvar');
    expect(botaoSalvar).toBeDisabled();

    await fireEvent.press(botaoSalvar);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();

    await act(async () => {
      leitura.resolver(null);
      await leitura.promise;
    });

    await waitFor(() => expect(screen.queryByText('Carregando lançamentos...')).toBeNull());
    expect(screen.getByTestId('botao-salvar')).not.toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('Valor'), '15,00');
    await fireEvent.press(screen.getByRole('button', { name: 'Saúde' }));
    await fireEvent.press(screen.getByTestId('botao-salvar'));

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });

  it('desabilita o envio durante salvando e evita submissões duplicadas', async () => {
    await renderTela();
    await waitFor(() => expect(screen.queryByText('Carregando lançamentos...')).toBeNull());

    const escrita = criarDeferred<void>();
    (AsyncStorage.setItem as jest.Mock).mockReturnValueOnce(escrita.promise);

    await fireEvent.changeText(screen.getByLabelText('Valor'), '20,00');
    await fireEvent.press(screen.getByRole('button', { name: 'Moradia' }));

    const botaoSalvar = screen.getByTestId('botao-salvar');
    await fireEvent.press(botaoSalvar);

    expect(screen.getByText('Salvando...')).toBeTruthy();
    expect(screen.getByTestId('botao-salvar')).toBeDisabled();
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
    expect(mockBack).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('botao-salvar'));
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
    expect(mockBack).not.toHaveBeenCalled();

    await act(async () => {
      escrita.resolver(undefined);
      await escrita.promise;
    });

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });

  it('bloqueia gravação em erro_leitura, exibe alerta claro e permite recarregar', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('I/O failure'));

    await renderTela();

    await waitFor(() =>
      expect(screen.getByText('Erro na leitura dos dados salvos')).toBeTruthy(),
    );
    expect(screen.getByText(/salvamento foi bloqueado/i)).toBeTruthy();

    const botaoSalvar = screen.getByTestId('botao-salvar');
    expect(botaoSalvar).toBeDisabled();
    await fireEvent.press(botaoSalvar);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() =>
      expect(screen.queryByText('Erro na leitura dos dados salvos')).toBeNull(),
    );
    expect(screen.getByTestId('botao-salvar')).not.toBeDisabled();
  });
});
