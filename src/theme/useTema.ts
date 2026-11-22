import { useContext } from 'react';
import { useColorScheme } from 'react-native';

import { coresClaro, coresEscuro } from '@/theme/cores';
import { TemaContext, type Tema } from '@/theme/TemaContext';

export type { Tema } from '@/theme/TemaContext';

function semAcao() {}

const TEMA_CLARO_FALLBACK: Tema = Object.freeze({
  cores: coresClaro,
  escuro: false,
  alternarTema: semAcao,
});

const TEMA_ESCURO_FALLBACK: Tema = Object.freeze({
  cores: coresEscuro,
  escuro: true,
  alternarTema: semAcao,
});

export function useTema(): Tema {
  const contexto = useContext(TemaContext);
  const esquema = useColorScheme();

  if (contexto) {
    return contexto;
  }

  return esquema === 'dark' ? TEMA_ESCURO_FALLBACK : TEMA_CLARO_FALLBACK;
}
