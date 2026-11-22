import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

import { coresClaro, coresEscuro, type CoresTema } from '@/theme/cores';

export const TEMA_STORAGE_KEY = '@bolso/tema';

export type PreferenciaTema = 'sistema' | 'claro' | 'escuro';

export interface Tema {
  readonly cores: CoresTema;
  readonly escuro: boolean;
  alternarTema: () => void;
}

export const TemaContext = createContext<Tema | null>(null);

export function TemaProvider({ children }: { children: ReactNode }) {
  const esquemaSistema = useColorScheme();
  const [preferencia, setPreferencia] = useState<PreferenciaTema>('sistema');
  const alteradoManualmenteRef = useRef(false);

  useEffect(() => {
    let ativo = true;

    async function carregarPreferencia() {
      try {
        const salvo = await AsyncStorage.getItem(TEMA_STORAGE_KEY);
        if (!ativo || alteradoManualmenteRef.current) return;
        if (salvo === 'claro' || salvo === 'escuro') {
          setPreferencia(salvo);
        }
      } catch {
        // Ignora falha de leitura e mantém o esquema do sistema.
      }
    }

    void carregarPreferencia();

    return () => {
      ativo = false;
    };
  }, []);

  const alternarTema = useCallback(() => {
    alteradoManualmenteRef.current = true;
    setPreferencia((atual) => {
      const escuroAtual = atual === 'sistema' ? esquemaSistema === 'dark' : atual === 'escuro';
      const proxima: PreferenciaTema = escuroAtual ? 'claro' : 'escuro';
      void AsyncStorage.setItem(TEMA_STORAGE_KEY, proxima).catch(() => {});
      return proxima;
    });
  }, [esquemaSistema]);

  const escuro = preferencia === 'sistema' ? esquemaSistema === 'dark' : preferencia === 'escuro';

  const value = useMemo<Tema>(
    () => ({
      cores: escuro ? coresEscuro : coresClaro,
      escuro,
      alternarTema,
    }),
    [escuro, alternarTema],
  );

  return <TemaContext.Provider value={value}>{children}</TemaContext.Provider>;
}
