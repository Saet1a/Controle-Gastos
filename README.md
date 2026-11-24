# Bolso

Aplicativo móvel de controle de gastos pessoais para universitários, estagiários e quem busca acompanhar suas finanças sem complicações: permite registrar despesas ou receitas, visualizar o saldo mensal, consultar gastos por categoria e navegar pelo histórico com filtros. Toda a aplicação funciona de forma **100% offline**, sem backend e sem chamadas a API's externas, mantendo os dados salvos apenas no próprio aparelho.

Escopo completo do MVP em [`docs/spec.md`](docs/spec.md).

**Stack:** React Native + Expo + TypeScript · Expo Router · Context API · AsyncStorage

## Pré-requisitos

- **Node.js LTS (20+) e npm** instalados no computador (usados apenas pelas ferramentas de desenvolvimento como Expo CLI, Metro, TypeScript, ESLint e Jest; o aplicativo no celular não executa Node).

- Como abrir o Bolso:
  - Aplicativo **Expo Go** instalado no smartphone ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779)), com versão compatível com o SDK do projeto.
  - **Pelo computador:** emulador Android (Android Studio) / Simulador iOS (Xcode, só no macOS).
  - Adicione o link: **exps://2q3vr2s-anonymous-8082.exp.direct** em "Enter URL" e clique em "Connect".
    
  - **Conexão de rede:** preferencialmente o celular e o computador na **mesma rede Wi-Fi**. Caso a rede bloqueie a conexão (como ocorre em algumas redes institucionais/universitárias) ou o iPhone esteja em outra rede, o modo túnel (`npm run start:tunnel`) permite conectar mesmo em redes diferentes.

## Rodando local

```bash
npm install
npm start
```

Depois:

- **Celular:** escaneie o QR code do terminal (Android: pelo Expo Go; iOS: pela câmera).
- **Emulador:** aperte `a` (Android) ou `i` (iOS) no terminal. Ou rode direto
  `npm run android` / `npm run ios`.

> Se o celular não conectar (rede da faculdade costuma bloquear, ou o iPhone
> não está na mesma rede), use `npm run start:tunnel` e escaneie o QR code
> com a câmera do iPhone. O túnel funciona mesmo em redes diferentes.
>
> Se o Expo Go reclamar de versão incompatível, atualize o Expo Go na App Store.

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
