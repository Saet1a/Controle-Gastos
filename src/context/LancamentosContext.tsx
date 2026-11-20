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
import {
  ErroValidacaoLancamento,
  type Lancamento,
  type LancamentosContextValue,
  type NovoLancamento,
  type StatusCarregamento,
} from '@/types/lancamento';
import { ordenarPorDataDesc } from '@/utils/resumo';
import { normalizarNovoLancamento } from '@/utils/validacao';

const LancamentosContext = createContext<LancamentosContextValue | null>(null);

let ultimoTimestampId = 0;
let sequenciaId = 0;

function gerarId(): string {
  const agora = Date.now();
  if (agora <= ultimoTimestampId) {
    sequenciaId += 1;
  } else {
    ultimoTimestampId = agora;
    sequenciaId = 0;
  }
  const ts = ultimoTimestampId.toString(36).padStart(9, '0');
  const seq = sequenciaId.toString(36).padStart(4, '0');
  const rand = Math.random().toString(36).slice(2, 6).padEnd(4, '0');
  return `${ts}-${seq}-${rand}`;
}

export function LancamentosProvider({ children }: { children: ReactNode }) {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [statusCarregamento, setStatusCarregamento] =
    useState<StatusCarregamento>('carregando');
  const [registrosDescartados, setRegistrosDescartados] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  const montadoRef = useRef(true);
  const lancamentosRef = useRef<Lancamento[]>([]);
  const ultimoConfirmadoRef = useRef<Lancamento[]>([]);
  const statusRef = useRef<StatusCarregamento>('carregando');
  const carregandoRef = useRef(true);
  const filaEscritaRef = useRef<Promise<void>>(Promise.resolve());
  const escritasPendentesRef = useRef(0);
  const carregamentoSeqRef = useRef(0);

  const aplicarResultadoCarregamento = useCallback(async (seq: number) => {
    await filaEscritaRef.current;
    const resultado = await carregarLancamentos();

    if (!montadoRef.current || seq !== carregamentoSeqRef.current) return;

    lancamentosRef.current = resultado.lancamentos;
    ultimoConfirmadoRef.current = resultado.lancamentos;
    statusRef.current = resultado.status;
    carregandoRef.current = false;

    setLancamentos(resultado.lancamentos);
    setStatusCarregamento(resultado.status);
    setRegistrosDescartados(resultado.status === 'parcial' ? resultado.descartados : 0);
    setCarregando(false);

    if (resultado.status === 'erro_leitura') {
      setErro(resultado.erro);
    } else if (resultado.status === 'invalido') {
      setErro('Os dados salvos estavam corrompidos e foram guardados em backup.');
    } else if (resultado.status === 'parcial') {
      setErro(
        `${resultado.descartados} registro(s) inválido(s) foram ignorados e mantidos em backup.`,
      );
    } else {
      setErro(null);
    }
  }, []);

  useEffect(() => {
    montadoRef.current = true;
    const seq = ++carregamentoSeqRef.current;
    void aplicarResultadoCarregamento(seq);
    return () => {
      montadoRef.current = false;
    };
  }, [aplicarResultadoCarregamento]);

  const garantirProntoParaEscrita = useCallback(() => {
    if (carregandoRef.current) {
      throw new Error('Aguarde o carregamento inicial dos lançamentos.');
    }
    if (statusRef.current === 'erro_leitura') {
      throw new Error(
        'Não é possível salvar enquanto houver erro na leitura dos dados salvos.',
      );
    }
  }, []);

  const enfileirarMutacao = useCallback(
    (transformar: (base: Lancamento[]) => Lancamento[]): Promise<void> => {
      const proximoOtimista = transformar(lancamentosRef.current);
      lancamentosRef.current = proximoOtimista;
      escritasPendentesRef.current += 1;

      if (montadoRef.current) {
        setLancamentos(proximoOtimista);
        setErro(null);
      }

      const promessaEscrita = filaEscritaRef.current.then(async () => {
        const proximaPersistida = transformar(ultimoConfirmadoRef.current);
        try {
          await salvarLancamentos(proximaPersistida);
          ultimoConfirmadoRef.current = proximaPersistida;
          statusRef.current = 'ok';
          escritasPendentesRef.current -= 1;

          if (escritasPendentesRef.current === 0) {
            lancamentosRef.current = ultimoConfirmadoRef.current;
          }

          if (montadoRef.current) {
            setStatusCarregamento('ok');
            setRegistrosDescartados(0);
            if (escritasPendentesRef.current === 0) {
              setLancamentos(ultimoConfirmadoRef.current);
            }
          }
        } catch (err) {
          escritasPendentesRef.current -= 1;
          if (escritasPendentesRef.current === 0) {
            lancamentosRef.current = ultimoConfirmadoRef.current;
            if (montadoRef.current) {
              setLancamentos(ultimoConfirmadoRef.current);
            }
          }
          if (montadoRef.current) {
            setErro('Não foi possível salvar a alteração no aparelho.');
          }
          throw err;
        }
      });

      filaEscritaRef.current = promessaEscrita.catch(() => {});
      return promessaEscrita;
    },
    [],
  );

  const adicionar = useCallback(
    async (novo: NovoLancamento): Promise<Lancamento> => {
      garantirProntoParaEscrita();
      const validado = normalizarNovoLancamento(novo);
      const lancamento: Lancamento = { ...validado, id: gerarId() };

      await enfileirarMutacao((base) => ordenarPorDataDesc([...base, lancamento]));
      return lancamento;
    },
    [enfileirarMutacao, garantirProntoParaEscrita],
  );

  const editar = useCallback(
    async (id: string, dados: NovoLancamento): Promise<Lancamento> => {
      garantirProntoParaEscrita();
      if (!lancamentosRef.current.some((l) => l.id === id)) {
        throw new ErroValidacaoLancamento('id', 'Lançamento não encontrado.');
      }

      const validado = normalizarNovoLancamento(dados);
      const atualizado: Lancamento = { ...validado, id };

      await enfileirarMutacao((base) =>
        ordenarPorDataDesc(base.map((l) => (l.id === id ? atualizado : l))),
      );
      return atualizado;
    },
    [enfileirarMutacao, garantirProntoParaEscrita],
  );

  const excluir = useCallback(
    async (id: string): Promise<void> => {
      garantirProntoParaEscrita();
      if (!lancamentosRef.current.some((l) => l.id === id)) {
        return;
      }

      await enfileirarMutacao((base) => base.filter((l) => l.id !== id));
    },
    [enfileirarMutacao, garantirProntoParaEscrita],
  );

  const recarregar = useCallback(async () => {
    const seq = ++carregamentoSeqRef.current;
    carregandoRef.current = true;
    statusRef.current = 'carregando';
    if (montadoRef.current) {
      setCarregando(true);
      setStatusCarregamento('carregando');
    }
    await aplicarResultadoCarregamento(seq);
  }, [aplicarResultadoCarregamento]);

  const limparErro = useCallback(() => {
    setErro(null);
  }, []);

  const value = useMemo<LancamentosContextValue>(
    () => ({
      lancamentos,
      carregando,
      statusCarregamento,
      registrosDescartados,
      erro,
      adicionar,
      editar,
      excluir,
      recarregar,
      limparErro,
    }),
    [
      lancamentos,
      carregando,
      statusCarregamento,
      registrosDescartados,
      erro,
      adicionar,
      editar,
      excluir,
      recarregar,
      limparErro,
    ],
  );

  return <LancamentosContext.Provider value={value}>{children}</LancamentosContext.Provider>;
}

export function useLancamentos(): LancamentosContextValue {
  const ctx = useContext(LancamentosContext);
  if (!ctx) throw new Error('useLancamentos precisa estar dentro de <LancamentosProvider>');
  return ctx;
}
