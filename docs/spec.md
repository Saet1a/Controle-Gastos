# Bolso
## O problema
Estudante gasta no Pix e no cartão ao longo da semana, esquece de anotar e só descobre que estourou no fim do mês. Planilha no celular é chata, e os apps pedem conta, internet ou acesso ao banco.
## Pra quem
Universitário estagiário (21 anos, bolsa fixa) que quer saber quanto ainda pode gastar no mês.
## O que o MVP faz
1. Usuário lança despesa ou receita (valor, data, descrição, categoria) em até 3 toques
2. Vê na tela inicial o saldo do mês (receitas − despesas)
3. Vê quanto gastou por categoria no mês (R$ e %)
4. Consulta o histórico filtrando por mês e categoria
5. Edita ou exclui um lançamento e o saldo recalcula na hora em todas as telas
## O que NÃO entra no MVP
login/conta, Firebase/nuvem, qualquer API externa, versão web, categorias personalizadas, integração bancária, orçamentos e metas, lançamentos recorrentes/parcelados, várias contas/cartões, exportar CSV/PDF, foto de comprovante, notificações, gráficos comparativos, PIN/biometria, tema escuro
## Telas
- Início: seletor de mês, saldo, receitas, despesas, gastos por categoria, botão "+"
- Lançamento: formulário de criar/editar (tipo, valor, descrição, data, categoria)
- Histórico: FlatList dos lançamentos (mais recente primeiro), filtros de mês e categoria, tocar para editar e excluir com confirmação
## Dados
Tudo digitado pelo próprio usuário, salvo no AsyncStorage em JSON:
- `@bolso/lancamentos`: lista de { id, descricao, valorCentavos, tipo (despesa/receita), data (YYYY-MM-DD), categoriaId }
- categorias: lista fixa no código, com id, nome, ícone e cor (Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Salário, Outros)
## Stack
- React Native + Expo + TypeScript
- Expo Router (abas Início/Histórico + Lançamento em modal)
- Context API: `LancamentosContext` com a lista e as funções adicionar, editar e excluir, compartilhado pelas 3 telas
- AsyncStorage: carrega ao abrir o app e salva a cada alteração
- FlatList no Histórico
- Sem API e sem backend: Vercel, Supabase, Firebase, Resend e Cloudflare não se aplicam
## Como eu sei que deu certo
5 colegas lançando gastos por 4 semanas seguidas, sem perder dados ao fechar o app.
