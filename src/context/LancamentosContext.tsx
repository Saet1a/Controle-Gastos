import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { carregarLancamentos, salvarLancamentos } from '@/storage/lancamentosStorage';
import type { Lancamento, NovoLancamento } from '@/types/lancamento';

interface LancamentosContextValue {
  lancamentos: Lancamento[];
  carregando: boolean;
  adicionar: (novo: NovoLancamento) => Lancamento;
  editar: (id: string, dados: NovoLancamento) => void;
  excluir: (id: string) => void;
}

const LancamentosContext = createContext<LancamentosContextValue | null>(null);

function gerarId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function LancamentosProvider({ children }: { children: ReactNode }) {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const carregou = useRef(false);

  // Carrega uma vez ao abrir o app.
  useEffect(() => {
    carregarLancamentos()
      .then(setLancamentos)
      .finally(() => {
        carregou.current = true;
        setCarregando(false);
      });
  }, []);

  // Salva a cada alteração (só depois de carregar, pra não sobrescrever com []).
  useEffect(() => {
    if (carregou.current) void salvarLancamentos(lancamentos);
  }, [lancamentos]);

  const adicionar = useCallback((novo: NovoLancamento) => {
    const lancamento: Lancamento = { ...novo, id: gerarId() };
    setLancamentos((atual) => [...atual, lancamento]);
    return lancamento;
  }, []);

  const editar = useCallback((id: string, dados: NovoLancamento) => {
    setLancamentos((atual) => atual.map((l) => (l.id === id ? { ...dados, id } : l)));
  }, []);

  const excluir = useCallback((id: string) => {
    setLancamentos((atual) => atual.filter((l) => l.id !== id));
  }, []);

  const value = useMemo(
    () => ({ lancamentos, carregando, adicionar, editar, excluir }),
    [lancamentos, carregando, adicionar, editar, excluir],
  );

  return <LancamentosContext.Provider value={value}>{children}</LancamentosContext.Provider>;
}

export function useLancamentos(): LancamentosContextValue {
  const ctx = useContext(LancamentosContext);
  if (!ctx) throw new Error('useLancamentos precisa estar dentro de <LancamentosProvider>');
  return ctx;
}
