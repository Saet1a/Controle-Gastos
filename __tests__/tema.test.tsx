import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { coresClaro, coresEscuro } from '@/theme/cores';
import { TEMA_STORAGE_KEY, TemaProvider } from '@/theme/TemaContext';
import { useTema } from '@/theme/useTema';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- factory do jest.mock precisa de require
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function LeitorTema() {
  const { cores, escuro, alternarTema } = useTema();

  return (
    <>
      <Text testID="tema-escuro">{String(escuro)}</Text>
      <Text testID="tema-bg">{cores.background}</Text>
      <Pressable testID="tema-toggle" onPress={alternarTema} />
    </>
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('TemaProvider e useTema', () => {
  it('segue o esquema do sistema quando não há preferência salva', async () => {
    const spyColorScheme = jest.spyOn(
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- spy em hook nativo para simular esquema do SO
      require('react-native'),
      'useColorScheme',
    );
    spyColorScheme.mockReturnValue('dark');

    try {
      await render(
        <TemaProvider>
          <LeitorTema />
        </TemaProvider>,
      );

      await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(TEMA_STORAGE_KEY));
      expect(screen.getByTestId('tema-escuro')).toHaveTextContent('true');
      expect(screen.getByTestId('tema-bg')).toHaveTextContent(coresEscuro.background);
    } finally {
      spyColorScheme.mockRestore();
    }
  });

  it('atualiza automaticamente ao alternar o esquema do sistema enquanto não há preferência manual', async () => {
    const spyColorScheme = jest.spyOn(
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- spy em hook nativo para simular esquema do SO
      require('react-native'),
      'useColorScheme',
    );
    spyColorScheme.mockReturnValue('light');

    try {
      const { rerender } = await render(
        <TemaProvider>
          <LeitorTema />
        </TemaProvider>,
      );

      await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(TEMA_STORAGE_KEY));
      expect(screen.getByTestId('tema-escuro')).toHaveTextContent('false');
      expect(screen.getByTestId('tema-bg')).toHaveTextContent(coresClaro.background);

      spyColorScheme.mockReturnValue('dark');
      await rerender(
        <TemaProvider>
          <LeitorTema />
        </TemaProvider>,
      );

      expect(screen.getByTestId('tema-escuro')).toHaveTextContent('true');
      expect(screen.getByTestId('tema-bg')).toHaveTextContent(coresEscuro.background);

      spyColorScheme.mockReturnValue('light');
      await rerender(
        <TemaProvider>
          <LeitorTema />
        </TemaProvider>,
      );

      expect(screen.getByTestId('tema-escuro')).toHaveTextContent('false');
      expect(screen.getByTestId('tema-bg')).toHaveTextContent(coresClaro.background);
    } finally {
      spyColorScheme.mockRestore();
    }
  });

  it('alterna tema manualmente, atualiza tokens e persiste no AsyncStorage', async () => {
    await render(
      <TemaProvider>
        <LeitorTema />
      </TemaProvider>,
    );

    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(TEMA_STORAGE_KEY));
    expect(screen.getByTestId('tema-escuro')).toHaveTextContent('false');
    expect(screen.getByTestId('tema-bg')).toHaveTextContent(coresClaro.background);

    await fireEvent.press(screen.getByTestId('tema-toggle'));

    expect(screen.getByTestId('tema-escuro')).toHaveTextContent('true');
    expect(screen.getByTestId('tema-bg')).toHaveTextContent(coresEscuro.background);
    await waitFor(() =>
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(TEMA_STORAGE_KEY, 'escuro'),
    );

    await fireEvent.press(screen.getByTestId('tema-toggle'));

    expect(screen.getByTestId('tema-escuro')).toHaveTextContent('false');
    expect(screen.getByTestId('tema-bg')).toHaveTextContent(coresClaro.background);
    await waitFor(() =>
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(TEMA_STORAGE_KEY, 'claro'),
    );
  });

  it('restaura preferência salva do AsyncStorage ao montar', async () => {
    await AsyncStorage.setItem(TEMA_STORAGE_KEY, 'escuro');

    await render(
      <TemaProvider>
        <LeitorTema />
      </TemaProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('tema-escuro')).toHaveTextContent('true'));
    expect(screen.getByTestId('tema-bg')).toHaveTextContent(coresEscuro.background);
  });

  it('funciona com fallback fora de TemaProvider sem lançar erro', async () => {
    await render(<LeitorTema />);

    expect(screen.getByTestId('tema-escuro')).toHaveTextContent('false');
    expect(screen.getByTestId('tema-bg')).toHaveTextContent(coresClaro.background);
    await fireEvent.press(screen.getByTestId('tema-toggle'));
    expect(screen.getByTestId('tema-escuro')).toHaveTextContent('false');
  });
});
