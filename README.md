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
> Se o Expo Go reclamar de versão incompatível, atualize o Expo Go na App Store/Play Store.

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

## Bibliotecas extras

Além do núcleo React Native, Expo, TypeScript e Expo Router, o projeto utiliza[cite: 9, 10, 16, 21]:

- **`@react-native-async-storage/async-storage`**: persistência local chave-valor em JSON no aparelho para os lançamentos (`@bolso/lancamentos`), backup de segurança (`@bolso/lancamentos:backup`) e preferência de tema (`@bolso/tema`)[cite: 9, 10, 16].
- **`@expo/vector-icons` (`Ionicons`)**: ícones das 8 categorias fixas, barra de navegação inferior, alternância de tema e botões de ação[cite: 10, 16].
- **`react-native-safe-area-context`**: ajuste automático das margens seguras da tela (notch, barra de status e gestos do sistema)[cite: 16].
- **`react-native-screens`**: otimização nativa das telas e transições de pilha/abas no Expo Router[cite: 16].
- **`react-native-web`**: suporte à compilação e execução da aplicação como SPA estática em navegadores web[cite: 16].
- **`jest`, `jest-expo` e `@testing-library/react-native`**: suíte de testes automatizados (105 testes em 10 suítes) cobrindo utilitários, persistência, contextos e telas[cite: 10, 16].
- **`eslint` (`eslint-config-expo`)**: análise estática e padronização da qualidade do código TypeScript/React Native[cite: 16, 19].

## Arquitetura e Chamadas de API (100% Offline)

Conforme definido na especificação do MVP ([`docs/spec.md`](docs/spec.md)), o **Bolso** foi projetado como uma aplicação **100% offline** (*client-side standalone*), sem backend remoto e **sem chamadas a APIs externas**[cite: 1, 8, 15, 21].

- **Camada de dados local:** toda a leitura, gravação e sincronização ocorre no próprio aparelho por meio de `src/storage/lancamentosStorage.ts` e `src/context/LancamentosContext.tsx`[cite: 1, 9, 21].
- **Estados de carregamento e erro:** o `LancamentosContext` gerencia o estado de carregamento inicial (`carregando`), mensagens de erro e fila serializada de escrita com reversão automática (*rollback*) caso alguma operação local falhe — garantindo resposta instantânea (< 500 ms) e privacidade total sem depender de internet[cite: 9, 15, 21].

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

## Dados e Validações

- **Persistência local em JSON (`AsyncStorage`):** os lançamentos são armazenados na chave `@bolso/lancamentos` em `src/storage/lancamentosStorage.ts`, carregados ao abrir o app e regravados a cada operação CRUD (adicionar, editar ou excluir). Os dados permanecem salvos mesmo fechando e reabrindo o aplicativo.
- **Valores em centavos inteiros:** todos os valores monetários são convertidos e guardados em **centavos** (`valorCentavos`, inteiro positivo) para evitar erros de arredondamento de ponto flutuante.
- **Validação estrita de entrada (`src/utils/validacao.ts`):** antes de salvar qualquer lançamento, o sistema valida o tipo (`despesa` ou `receita`), valor monetário positivo, existência da categoria no catálogo fixo, data válida de calendário no padrão ISO (`AAAA-MM-DD`) e limite de até 120 caracteres para a descrição opcional.
- **Integridade, backup e proteção contra perda de dados:** ao carregar os registros do `AsyncStorage`, o sistema valida o esquema e os identificadores; se detectar JSON corrompido ou registros inválidos/duplicados, salva automaticamente uma cópia do conteúdo bruto original na chave `@bolso/lancamentos:backup`. Em caso de erro de leitura (`erro_leitura`), novas gravações são bloqueadas preventivamente para evitar sobrescrever o histórico existente.
- **Tema e categorias fixas:** a preferência manual de tema claro/escuro fica salva em `@bolso/tema` (acompanhando o tema do sistema operacional quando não definida), enquanto as 8 categorias (*Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Salário e Outros*) são imutáveis (`Object.freeze`) no código em `src/constants/categorias.ts`.
- **Como zerar os dados:** limpe os dados do app (no Expo Go: *Configurações do sistema → Apps → Expo Go → Limpar dados*) ou desinstale o aplicativo.
