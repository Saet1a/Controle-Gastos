# Bolso

App de controle de gastos pra universitário: lança despesa/receita em até 3 toques e vê
quanto ainda pode gastar no mês. Tudo fica salvo **só no aparelho**, sem conta, sem
internet, sem banco.

Escopo completo do MVP em [`docs/spec.md`](docs/spec.md).

**Stack:** React Native + Expo + TypeScript · Expo Router · Context API · AsyncStorage

## Pré-requisitos

- **Node.js LTS (20+) e npm.** Usados só pelas ferramentas de desenvolvimento (Expo CLI,
  Metro, TypeScript, ESLint, Jest). O app no celular não roda Node.
- Um jeito de abrir o app:
  - **Expo Go** no celular ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779)), na mesma rede Wi-Fi do computador; **ou**
  - Emulador Android (Android Studio) / Simulador iOS (Xcode, só no macOS).

## Rodando local

```bash
npm install
npm start
```

Depois:

- **Celular:** escaneie o QR code do terminal (Android: pelo Expo Go; iOS: pela câmera).
- **Emulador:** aperte `a` (Android) ou `i` (iOS) no terminal. Ou rode direto
  `npm run android` / `npm run ios`.

> Se o celular não conectar (rede da faculdade costuma bloquear), tente
> `npx expo start --tunnel`.

Não há variáveis de ambiente necessárias. Veja [`.env.example`](.env.example).

## Scripts

| Comando              | O que faz                                  |
| -------------------- | ------------------------------------------ |
| `npm start`          | Sobe o Metro/Expo dev server               |
| `npm run android`    | Abre no emulador/aparelho Android          |
| `npm run ios`        | Abre no simulador iOS                      |
| `npm run lint`       | ESLint com `eslint-config-expo`            |
| `npm run typecheck`  | `tsc --noEmit`                             |
| `npm test`           | Testes com Jest (`jest-expo`)              |
| `npm run test:watch` | Testes em modo watch                       |
| `npm run check`      | lint + typecheck + test (rode antes de commitar) |

## Estrutura

```
app/                        rotas (Expo Router)
  _layout.tsx               Stack raiz + LancamentosProvider
  (tabs)/index.tsx          Início
  (tabs)/historico.tsx      Histórico
  lancamento.tsx            modal criar/editar (?id= edita)
src/
  context/                  LancamentosContext (lista + adicionar/editar/excluir)
  storage/                  leitura/escrita no AsyncStorage
  constants/categorias.ts   categorias fixas
  types/                    tipos de domínio
  utils/                    dinheiro, datas, resumo (funções puras, testadas)
__tests__/                  testes Jest
docs/spec.md                especificação do MVP
```

Import com alias: `@/` aponta pra `src/` (ex.: `import { useLancamentos } from '@/context/LancamentosContext'`).

## Dados

- Salvos em JSON no AsyncStorage, chave `@bolso/lancamentos`.
- Valores guardados em **centavos** (inteiro) pra evitar erro de ponto flutuante.
- Carregados ao abrir o app e salvos a cada alteração.
- Pra zerar: limpe os dados do app (no Expo Go: Configurações do sistema → Apps → Expo Go →
  Limpar dados) ou desinstale.
