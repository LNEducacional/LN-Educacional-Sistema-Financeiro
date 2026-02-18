# QA Checklist — Sistema Financeiro

---

## Suposicoes Documentadas

- O ambiente de testes possui Docker (PostgreSQL) e backend/frontend rodando via `make dev`.
- Credenciais de teste conforme CLAUDE.md: Admin (`admin@test.com`), Student (`student@test.com`), Collaborator (`collaborator@test.com`), Financeiro (`financeiro@test.com`). Senha: `password123`.
- Gateway de pagamento ASAAS pode estar em modo sandbox.
- Notificacoes real-time via SSE estao habilitadas.
- Todos os testes assumem navegador moderno (Chrome/Firefox/Edge ultima versao).
- Textos da interface estao em portugues (pt-BR), hardcoded (sem i18n).

---

## 1. Tela: Login

**Objetivo:** Autenticar usuarios no sistema com email e senha, distribuindo-os para suas areas conforme role.

### Funcionalidades
- Autenticacao via JWT (access + refresh token)
- Redirecionamento por role apos login
- Validacao de campos do formulario
- Tratamento de erros de credenciais/rede/servidor

### Testes Funcionais

- [ ] Fazer login com credenciais validas de Admin e verificar redirecionamento para Dashboard Admin
- [ ] Fazer login com credenciais validas de Student e verificar redirecionamento para "Meus Pedidos"
- [ ] Fazer login com credenciais validas de Collaborator e verificar redirecionamento para Dashboard Collaborator
- [ ] Fazer login com credenciais validas de Financeiro e verificar redirecionamento para Dashboard (mesmo do Admin)
- [ ] Verificar que access_token e refresh_token sao armazenados no localStorage apos login
- [ ] Verificar que o JWT decodificado contem `sub` (userID) e `role` corretos
- [ ] Verificar que apos login, requisicoes subsequentes enviam header `Authorization: Bearer <token>`
- [ ] Verificar que o refresh automatico ocorre ~60 segundos antes do token expirar
- [ ] Verificar que apos expirar o access_token sem refresh valido, o usuario e redirecionado para login

### Validacoes de Campos

- [ ] Submeter formulario com email vazio — exibir erro "Email e obrigatorio"
- [ ] Submeter formulario com email invalido (ex: "abc") — exibir erro de formato
- [ ] Submeter formulario com senha vazia — exibir erro "Senha e obrigatoria"
- [ ] Submeter formulario com senha < 6 caracteres — exibir erro de comprimento minimo
- [ ] Verificar que o campo de senha e do tipo `password` (caracteres ocultos)

### Cenarios Negativos

- [ ] Login com email inexistente — exibir "Email ou senha incorretos"
- [ ] Login com senha incorreta — exibir "Email ou senha incorretos"
- [ ] Login com servidor indisponivel (backend offline) — exibir "Erro de conexao"
- [ ] Login com servidor retornando 500 — exibir "Erro no servidor"
- [ ] Login com timeout de rede — exibir "O servidor demorou para responder"
- [ ] Tentar acessar rota protegida sem autenticacao — redirecionar para login
- [ ] Verificar que o botao "Entrar" fica desabilitado durante o processamento da requisicao
- [ ] Verificar que multiplos cliques rapidos no botao nao disparam requisicoes duplicadas

### Mensagens de Erro e Feedback

- [ ] Mensagem de erro aparece em caixa vermelha visivel
- [ ] Mensagem desaparece ao corrigir os campos e tentar novamente
- [ ] Loading spinner e exibido durante a requisicao

---

## 2. Tela: Esqueci Minha Senha / Reset de Senha

**Objetivo:** Permitir que usuarios recuperem acesso via email de reset.

### Funcionalidades
- Solicitar reset via email
- Validar token de reset
- Definir nova senha

### Testes Funcionais

- [ ] Solicitar reset com email valido cadastrado — exibir confirmacao de envio
- [ ] Solicitar reset com email nao cadastrado — comportamento seguro (nao revelar se existe)
- [ ] Acessar link de reset com token valido — exibir formulario de nova senha
- [ ] Acessar link de reset com token invalido/expirado — exibir erro
- [ ] Definir nova senha com >= 6 caracteres — sucesso
- [ ] Verificar que `confirmPassword` deve coincidir com `password`
- [ ] Apos reset, fazer login com nova senha — sucesso
- [ ] Apos reset, fazer login com senha antiga — falha

### Validacoes

- [ ] Email vazio — erro de validacao
- [ ] Email formato invalido — erro de validacao
- [ ] Senha nova < 6 caracteres — erro de validacao
- [ ] Confirmacao de senha diferente — erro "Senhas nao coincidem"

---

## 3. Tela: Dashboard Admin / Financeiro (ReportsDashboard)

**Objetivo:** Apresentar visao geral financeira e operacional do sistema com KPIs, graficos e tabelas.

### Funcionalidades
- KPI Cards (GMV, receita liquida, escrow, transferido, pedidos pendentes/total)
- Graficos financeiros (mensal/semanal/trimestral/anual)
- Widget de saques pendentes
- Widget de cobrancas abertas
- Tabela de inadimplentes
- Widget de reembolsos
- Widget de revisoes
- Widget de alertas
- Tabela de jobs ativos (paginada)
- Widget de reclamacoes
- Estatisticas de produtividade
- Ranking de colaboradores

### Testes Funcionais

- [ ] Verificar que todos os KPIs carregam corretamente com valores do backend
- [ ] Verificar que o GMV (Gross Merchandise Value) reflete a soma de todos os pedidos
- [ ] Verificar que "Receita Liquida" reflete a parcela da empresa
- [ ] Verificar que "Escrow" mostra o valor total em custodia (locked)
- [ ] Verificar que "Transferido" mostra o total ja repassado a colaboradores
- [ ] Verificar que "Pedidos Pendentes" e "Total de Pedidos" estao corretos
- [ ] Alternar periodo do grafico financeiro: mensal, semanal, trimestral, anual
- [ ] Verificar que o grafico renderiza barras/linhas coerentes com os dados
- [ ] Verificar widget de saques pendentes mostra quantidade e valor total
- [ ] Verificar widget de cobrancas abertas mostra quantidade e valor total
- [ ] Verificar tabela de inadimplentes mostra: nome, email, valor devido, dias de atraso
- [ ] Verificar botao de executar verificacao de inadimplencia (POST /admin/reports/delinquency/check)
- [ ] Verificar exportacao CSV de inadimplentes (download do arquivo)
- [ ] Verificar widget de reembolsos com valores e contagem
- [ ] Verificar widget de revisoes com estatisticas (resumo)
- [ ] Verificar widget de alertas mostra notificacoes do sistema
- [ ] Verificar tabela de jobs ativos com paginacao funcional
- [ ] Verificar widget de reclamacoes com top items e contagem
- [ ] Verificar estatisticas de produtividade (metricas)
- [ ] Verificar ranking de colaboradores (top colaboradores por criterio)
- [ ] Verificar que todas as queries sao disparadas em paralelo (sem waterfall)

### Cenarios Negativos

- [ ] Dashboard sem dados (sistema vazio) — exibir estados vazios nos widgets
- [ ] Backend retornando erro em um widget — exibir mensagem de erro localizada, sem quebrar os demais
- [ ] Latencia alta no backend — exibir skeletons/loading em cada widget independente
- [ ] Verificar staleTime dos dados (KPIs: 5min, Financials: 10min, Alerts: 2min)

### Permissoes

- [ ] Admin acessa dashboard — OK
- [ ] Financeiro acessa dashboard — OK
- [ ] Collaborator tenta acessar /admin/reports — redirecionado/bloqueado
- [ ] Student tenta acessar /admin/reports — redirecionado/bloqueado

---

## 4. Tela: Gestao de Colaboradores (CollaboratorsPage)

**Objetivo:** Listar, filtrar, buscar e cadastrar colaboradores.

### Funcionalidades
- Grid/cards de colaboradores
- Filtros por especialidade, avaliacao minima, status ativo
- Busca client-side por nome/email
- Paginacao com seletor de tamanho (12, 24, 48)
- Modal de adicionar colaborador
- Link para pagina de detalhe

### Testes Funcionais

- [ ] Listar todos os colaboradores com cards exibindo: nome, email, especialidade, ranking, avaliacao
- [ ] Filtrar por especialidade — lista atualiza corretamente
- [ ] Filtrar por avaliacao minima — somente colaboradores com avg_rating >= filtro
- [ ] Filtrar por status ativo (com pedidos pendentes) — lista atualiza
- [ ] Buscar por nome (client-side) — resultados filtrados em tempo real
- [ ] Buscar por email (client-side) — resultados filtrados em tempo real
- [ ] Alterar tamanho de pagina para 12, 24, 48 — grid atualiza
- [ ] Navegar entre paginas via paginacao — cards atualizam
- [ ] Clicar em card de colaborador — navegar para pagina de detalhe
- [ ] Exibir badges: ativo, especialidade, ranking interno, avaliacao, jobs atrasados

### Modal: Adicionar Colaborador

- [ ] Abrir modal via botao "Adicionar"
- [ ] Preencher todos os campos obrigatorios (nome, email, senha, especialidade) — criar com sucesso
- [ ] Verificar que senha >= 6 caracteres
- [ ] Verificar que email e unico (tentar email duplicado — erro)
- [ ] Preencher PIX key e tipo — salvar corretamente
- [ ] Preencher ranking interno (0-5) — salvar corretamente
- [ ] Submeter com campos obrigatorios vazios — exibir erros de validacao
- [ ] Fechar modal sem salvar — nenhum dado persistido
- [ ] Apos criar, lista atualiza automaticamente (invalidate query)

### Permissoes

- [ ] Admin acessa — OK
- [ ] Financeiro acessa — OK
- [ ] Collaborator tenta acessar — bloqueado
- [ ] Student tenta acessar — bloqueado

---

## 5. Tela: Detalhe do Colaborador (CollaboratorDetailPage)

**Objetivo:** Exibir perfil completo, metricas, carteira, jobs e posicoes no ranking de um colaborador.

### Funcionalidades
- Perfil: nome, email, especialidade, PIX, ranking
- Carteira: saldo disponivel e bloqueado
- Tabela de jobs recentes (paginada)
- Tabela de revisoes recentes (paginada)
- Posicoes no ranking (5 criterios)
- Estudantes inadimplentes (devedores ao colaborador)
- Modal de edicao

### Testes Funcionais

- [ ] Exibir dados do perfil corretamente (nome, email, especialidade, PIX key)
- [ ] Exibir ranking interno (0-5 estrelas/numero)
- [ ] Exibir saldo disponivel e saldo bloqueado da carteira
- [ ] Exibir tabela de jobs recentes com paginacao funcional
- [ ] Exibir tabela de revisoes recentes com paginacao funcional
- [ ] Exibir posicoes no ranking para: produtividade, receita, pontualidade, satisfacao, qualidade
- [ ] Exibir lista de estudantes inadimplentes (se houver)
- [ ] Verificar que jobs mostram: titulo, status, valor, data

### Modal: Editar Colaborador

- [ ] Abrir modal de edicao
- [ ] Editar especialidade — salvar com sucesso
- [ ] Editar PIX key e tipo — salvar com sucesso
- [ ] Editar ranking interno (0-5) — salvar com sucesso
- [ ] Ranking interno < 0 ou > 5 — erro de validacao
- [ ] Fechar modal sem salvar — dados nao alterados

### Cenarios Negativos

- [ ] Acessar colaborador inexistente (ID invalido na URL) — exibir 404 / erro
- [ ] Colaborador sem jobs — exibir estado vazio na tabela
- [ ] Colaborador sem ranking — exibir posicoes como "-" ou "N/A"

---

## 6. Tela: Gestao de Servicos (ServicesPage)

**Objetivo:** CRUD de servicos oferecidos na plataforma (Admin).

### Funcionalidades
- Listar servicos com paginacao
- Criar/editar servico
- Estatisticas de servicos
- Filtro por area (Direito, Pedagogia, Contabilidade, Enfermagem, Outros)
- Busca por nome
- Toggle ativo/inativo

### Testes Funcionais

- [ ] Listar todos os servicos com: nome, area, tipo de trabalho, valor total, splits, status
- [ ] Filtrar por area — lista atualiza
- [ ] Buscar por nome — resultados filtrados
- [ ] Exibir estatisticas: total ativos, total inativos, valor medio, splits
- [ ] Paginacao funcional

### Criar Servico

- [ ] Preencher nome, area, tipo de trabalho, valor total — criar com sucesso
- [ ] Definir company_percent e collaborator_percent que somam 100% — sucesso
- [ ] Definir splits que NAO somam 100% — erro de validacao
- [ ] Valor total <= 0 — erro de validacao
- [ ] Nome vazio — erro de validacao
- [ ] Area invalida — erro de validacao
- [ ] Nome > 255 caracteres — erro de validacao

### Editar Servico

- [ ] Alterar nome — salvar com sucesso
- [ ] Alterar valor total — salvar com sucesso
- [ ] Alterar splits mantendo soma = 100% — sucesso
- [ ] Alterar splits quebrando soma = 100% — erro

### Toggle Ativo/Inativo

- [ ] Desativar servico ativo — status muda para inativo
- [ ] Ativar servico inativo — status muda para ativo
- [ ] Verificar que servico inativo nao aparece para criacao de pedidos (student)

### Deletar Servico

- [ ] Deletar servico sem pedidos vinculados — sucesso (hard delete)
- [ ] Deletar servico com pedidos vinculados — verificar comportamento (FK constraint)

### Permissoes

- [ ] Admin acessa — OK
- [ ] Financeiro acessa — OK
- [ ] Collaborator/Student — bloqueado

---

## 7. Tela: Gestao de Saques (WithdrawalsPage — Admin)

**Objetivo:** Gerenciar solicitacoes de saque dos colaboradores.

### Funcionalidades
- Listar saques com paginacao
- Filtros por status (PENDING, APPROVED, REJECTED, PROCESSING, DONE, FAILED, CANCELLED)
- Acoes: aprovar, rejeitar (com motivo), reprocessar
- Informacoes do colaborador, valores, chave PIX

### Testes Funcionais

- [ ] Listar todos os saques pendentes com: colaborador, valor, chave PIX, tipo PIX, data
- [ ] Filtrar por status — lista atualiza corretamente
- [ ] Aprovar saque PENDING — status muda para APPROVED
- [ ] Verificar que aprovacao debita `balance_available` do colaborador
- [ ] Rejeitar saque PENDING com motivo — status muda para REJECTED
- [ ] Verificar que rejeicao devolve valor ao `balance_available`
- [ ] Reprocessar saque FAILED — status volta para PROCESSING
- [ ] Verificar que saque DONE nao pode ser alterado
- [ ] Verificar que saque CANCELLED nao pode ser alterado

### Cenarios Negativos

- [ ] Aprovar saque quando colaborador tem saldo insuficiente (race condition) — erro tratado
- [ ] Rejeitar sem informar motivo — verificar se e obrigatorio
- [ ] Saque com chave PIX invalida (verificar no processamento ASAAS)

### Fluxo Completo

- [ ] PENDING → APPROVED → PROCESSING → DONE (fluxo feliz)
- [ ] PENDING → APPROVED → PROCESSING → FAILED → reprocessar → DONE
- [ ] PENDING → REJECTED

---

## 8. Tela: Reclamacoes (ComplaintsPage)

**Objetivo:** Visualizar e gerenciar reclamacoes do sistema.

### Funcionalidades
- Cards de reclamacao: servico, status, prioridade, revisoes, dias pendentes, valores
- Filtros: status, prioridade, busca
- Paginacao
- Modal de detalhe
- KPI cards com estatisticas

### Testes Funcionais

- [ ] Listar reclamacoes com cards exibindo: servico, estudante, colaborador, status, prioridade
- [ ] Exibir contagem de revisoes e dias pendentes
- [ ] Exibir valores: total, parcela estudante, parcela empresa
- [ ] Filtrar por status — lista atualiza
- [ ] Filtrar por prioridade — lista atualiza
- [ ] Buscar por texto — resultados filtrados
- [ ] Paginacao funcional
- [ ] Clicar em card — abrir modal de detalhe
- [ ] Modal exibe: detalhes completos, split de valores, historico

### KPI Cards

- [ ] Total de reclamacoes
- [ ] Reclamacoes abertas
- [ ] Tempo medio de resolucao
- [ ] Outros indicadores relevantes

### Cenarios Negativos

- [ ] Nenhuma reclamacao no sistema — estado vazio
- [ ] Reclamacao sem dados de revisao — exibir "0 revisoes"

---

## 9. Tela: Disputas — Lista (DisputesListPage)

**Objetivo:** Listar e filtrar todas as disputas do sistema.

### Funcionalidades
- Filtros por status: ABERTA, EM_ANALISE, AGUARDANDO_RESPOSTA, RESOLVIDA, CANCELADA
- Busca por titulo, descricao, order ID
- Contadores por status
- Cards de disputa com info resumida

### Testes Funcionais

- [ ] Listar todas as disputas com: titulo, descricao, status, pedido, data de abertura
- [ ] Exibir contadores de status (quantidade por cada status)
- [ ] Filtrar por status ABERTA — somente disputas abertas
- [ ] Filtrar por status EM_ANALISE — somente em analise
- [ ] Filtrar por status RESOLVIDA — somente resolvidas
- [ ] Buscar por titulo — resultados filtrados
- [ ] Buscar por order ID — resultados filtrados
- [ ] Clicar em disputa — navegar para detalhe

### Permissoes

- [ ] Admin ve todas as disputas — OK
- [ ] Financeiro ve todas as disputas — OK
- [ ] Collaborator ve apenas disputas de seus pedidos — OK
- [ ] Student ve apenas disputas de seus pedidos — OK

---

## 10. Tela: Disputas — Detalhe (DisputeDetailPage)

**Objetivo:** Visualizar detalhes, comentar, anexar evidencias e resolver disputas.

### Funcionalidades
- Info da disputa: titulo, descricao, aberto por, status, pedido vinculado
- Timeline de comentarios (publicos e internos)
- Evidencias anexadas (arquivos com descricao)
- Resolucao (admin only): tipo e notas
- Acoes: comentar, anexar evidencia, resolver

### Testes Funcionais — Comentarios

- [ ] Adicionar comentario publico — exibido na timeline para todos
- [ ] Adicionar comentario interno (admin) — visivel apenas para admin/financeiro
- [ ] Verificar que comentarios internos NAO aparecem para student/collaborator
- [ ] Comentario vazio — erro de validacao
- [ ] Verificar que comentarios exibem: autor, role, data, texto

### Testes Funcionais — Evidencias

- [ ] Upload de evidencia (arquivo + descricao) — sucesso
- [ ] Verificar que evidencia exibe: nome do arquivo, tamanho, quem enviou, data
- [ ] Upload de arquivo invalido (ex: .exe) — verificar validacao MIME
- [ ] Upload de arquivo > 10MB — verificar limite

### Testes Funcionais — Resolucao (Admin)

- [ ] Resolver como FAVOR_ALUNO — reembolso ao estudante
- [ ] Resolver como FAVOR_COLABORADOR — liberacao ao colaborador
- [ ] Resolver como ACORDO — resolucao negociada
- [ ] Resolver como PARCIAL — resolucao parcial
- [ ] Adicionar notas de resolucao — salvas corretamente
- [ ] Verificar que status muda para RESOLVIDA apos resolucao
- [ ] Verificar que resolucao gera notificacao para ambas as partes

### Transicoes de Status

- [ ] ABERTA → EM_ANALISE — OK
- [ ] EM_ANALISE → AGUARDANDO_RESPOSTA — OK
- [ ] AGUARDANDO_RESPOSTA → EM_ANALISE — OK
- [ ] Qualquer status → RESOLVIDA (via resolucao) — OK
- [ ] Qualquer status → CANCELADA — OK
- [ ] RESOLVIDA → qualquer outro — bloqueado (estado final)
- [ ] CANCELADA → qualquer outro — bloqueado (estado final)

### Permissoes

- [ ] Admin pode resolver disputas — OK
- [ ] Financeiro pode resolver disputas — verificar se permitido
- [ ] Collaborator NAO pode resolver disputas — bloqueado
- [ ] Student NAO pode resolver disputas — bloqueado
- [ ] Qualquer parte pode comentar — OK
- [ ] Qualquer parte pode enviar evidencia — OK
- [ ] Usuario sem vinculo com o pedido — acesso negado (403)

---

## 11. Tela: Producao — Admin (AdminDashboard)

**Objetivo:** Gerenciar jobs de producao, status e atribuicoes.

### Funcionalidades
- Lista de jobs com filtros, paginacao, ordenacao
- Modal de mudanca de status
- Alertas de inadimplencia
- Widget financeiro
- Widget de ranking
- Modal de detalhe do job

### Testes Funcionais

- [ ] Listar todos os jobs com: titulo, colaborador, estudante, status, valor, prazo
- [ ] Filtrar por status — lista atualiza
- [ ] Paginacao funcional
- [ ] Ordenar por coluna (data, valor, status)
- [ ] Clicar em job — abrir modal de detalhe
- [ ] Modal de detalhe exibe: info completa, historico de status
- [ ] Alertas de inadimplencia visiveis para pedidos atrasados
- [ ] Widget financeiro com valores agregados
- [ ] Widget de ranking com top colaboradores

### Mudanca de Status

- [ ] Alterar status de NOVO para EM_ANDAMENTO — sucesso
- [ ] Verificar que mudanca gera registro no historico (audit trail)
- [ ] Verificar que mudanca gera notificacao para partes envolvidas
- [ ] Transicao invalida (ex: CONCLUIDO → NOVO) — erro

### Permissoes

- [ ] Admin acessa — OK
- [ ] Financeiro acessa — OK (verificar nivel de acesso)
- [ ] Collaborator/Student — bloqueado

---

## 12. Tela: Producao — Colaborador (CollaboratorDashboard — Producao)

**Objetivo:** Visualizar e gerenciar jobs atribuidos ao colaborador.

### Testes Funcionais

- [ ] Listar somente jobs atribuidos ao colaborador logado
- [ ] Exibir status, valor, prazo de cada job
- [ ] Alterar status para status permitidos (ex: EM_ANDAMENTO → ENVIADO_VISUALIZACAO)
- [ ] Nao permitir transicoes que exigem acao do admin
- [ ] Exibir resumo financeiro (total ganho, pendente)

---

## 13. Tela: Configuracoes (SettingsPage — Admin)

**Objetivo:** Gerenciar configuracoes do sistema (ASAAS, limites de saque, etc.).

### Testes Funcionais

- [ ] Exibir configuracoes atuais (ASAAS API key mascarada, webhook token)
- [ ] Atualizar configuracao (ex: ASAAS API key) — sucesso
- [ ] Verificar mascaramento de API key (somente ultimos 4 caracteres visiveis)
- [ ] Testar conexao ASAAS (POST /admin/settings/test-asaas) — retorno de sucesso/falha
- [ ] Exibir limites de saque: minimo, maximo, diario
- [ ] Atualizar limites de saque — validar ranges
- [ ] Verificar que configuracoes sao criptografadas (AES-256-GCM) no banco

### Permissoes

- [ ] Admin acessa — OK
- [ ] Financeiro — verificar se tem acesso
- [ ] Collaborator/Student — bloqueado

---

## 14. Tela: Dashboard do Colaborador (CollaboratorDashboardPage)

**Objetivo:** Visao geral do colaborador com carteira, pedidos e saques.

### Funcionalidades
- Ranking: posicao do usuario nos 5 criterios
- Carteira: saldo disponivel e bloqueado
- Formulario de saque ou historico de saques (toggle)
- Tabela de pedidos (com modal de entrega e visualizacao de revisoes)

### Testes Funcionais — Carteira

- [ ] Exibir saldo disponivel corretamente
- [ ] Exibir saldo bloqueado corretamente
- [ ] Verificar que saldo disponivel = total liberado - total sacado
- [ ] Verificar que saldo bloqueado = total de pedidos em andamento

### Testes Funcionais — Ranking

- [ ] Exibir posicao nos 5 criterios: produtividade, receita, pontualidade, satisfacao, qualidade
- [ ] Posicao atualiza apos conclusao de pedido
- [ ] Colaborador sem dados suficientes — exibir "-" ou "Sem dados"

### Testes Funcionais — Pedidos

- [ ] Listar pedidos atribuidos com: estudante, servico, valor (minha parcela), status, prazo
- [ ] Exibir contagem de revisoes por pedido
- [ ] Exibir payment_status (LOCKED, RELEASED, REFUNDED)
- [ ] Clicar em "Entregar" — abrir modal de entrega

### Modal: Entrega

- [ ] Upload de arquivo (PDF) — sucesso
- [ ] Verificar que status do pedido muda para ENTREGUE apos entrega
- [ ] Upload sem arquivo — erro de validacao
- [ ] Verificar nome original, MIME type, tamanho do arquivo salvos
- [ ] Fechar modal sem enviar — pedido inalterado

### Testes Funcionais — Saques

- [ ] Alternar entre formulario de saque e historico
- [ ] Solicitar saque com valor valido — sucesso (status PENDING)
- [ ] Solicitar saque com valor < minimo (R$ 50) — erro
- [ ] Solicitar saque com valor > maximo (R$ 10.000) — erro
- [ ] Solicitar saque excedendo limite diario (R$ 50.000) — erro
- [ ] Solicitar saque com saldo insuficiente — erro
- [ ] Preencher PIX key e tipo (CPF, CNPJ, EMAIL, PHONE, EVP/RANDOM) — sucesso
- [ ] PIX key vazia — erro de validacao
- [ ] Tipo de PIX invalido — erro de validacao
- [ ] Historico de saques com: valor, status, data, chave PIX, mensagem de erro (se FAILED)
- [ ] Verificar limites de saque (GET /api/payment/withdrawals/limits)

---

## 15. Tela: Meus Pedidos — Estudante (OrdersListPage)

**Objetivo:** Listar pedidos do estudante com acoes rapidas e criacao de novos.

### Funcionalidades
- Agrupamento: "Aguardando sua acao" (ENTREGUE) vs "Outros pedidos"
- Filtros: status, busca por servico/colaborador
- Badges: requer acao, atrasado, status de conclusao
- Modal de criacao de pedido
- Link para detalhe do pedido

### Testes Funcionais

- [ ] Listar todos os pedidos do estudante logado (nao de outros)
- [ ] Verificar agrupamento: pedidos com status ENTREGUE aparecem em "Aguardando sua acao"
- [ ] Demais pedidos aparecem em "Outros Pedidos"
- [ ] Filtrar por status — lista atualiza
- [ ] Buscar por nome do servico — resultados filtrados
- [ ] Buscar por nome do colaborador — resultados filtrados
- [ ] Badge "Requer acao" em pedidos ENTREGUE — visivel
- [ ] Badge "Atrasado" em pedidos com due_date < today — visivel
- [ ] Clicar em pedido — navegar para detalhe

### Modal: Criar Pedido

- [ ] Selecionar servico (lista de servicos ativos) — OK
- [ ] Selecionar colaborador (lista de colaboradores ativos) — OK
- [ ] Definir data de entrega (futuro) — OK
- [ ] Data de entrega no passado — erro "due_date must be in the future"
- [ ] Servico nao selecionado — erro de validacao
- [ ] Colaborador nao selecionado — erro de validacao
- [ ] Verificar que ao criar pedido: status=NOVO, payment_status=LOCKED
- [ ] Verificar que escrow e criado (colaborador locked_balance += collab_value)
- [ ] Verificar que cobranca ASAAS e criada para o estudante
- [ ] Verificar que notificacao e enviada para colaborador e estudante
- [ ] Estudante inadimplente tenta criar pedido — verificar se ha bloqueio
- [ ] Servico inativo nao aparece na lista — OK
- [ ] Apos criacao, lista atualiza automaticamente

---

## 16. Tela: Detalhe do Pedido — Estudante (OrderDetailsPage)

**Objetivo:** Visualizar detalhes completos do pedido com acoes de aprovacao/rejeicao/revisao/disputa.

### Funcionalidades
- Info do pedido: servico, colaborador, valor, status, data de entrega
- Entregas: arquivos enviados (nome, tamanho, data)
- Revisoes: motivo, data
- Timeline de status
- Disputas vinculadas
- Informacoes de pagamento (metodo, status, invoice, PIX/boleto)
- Acoes: aprovar, rejeitar, solicitar revisao, abrir disputa

### Testes Funcionais — Visualizacao

- [ ] Exibir info correta: servico, colaborador, valor total, parcela empresa, parcela colaborador
- [ ] Exibir status atual com badge colorido
- [ ] Exibir data de entrega e verificar se esta atrasado
- [ ] Exibir entregas: nome original, tamanho formatado, data
- [ ] Download de arquivo de entrega funcional
- [ ] Exibir revisoes: motivo, data de cada revisao
- [ ] Timeline de status com progressao visual
- [ ] Exibir disputas vinculadas (se houver)

### Testes Funcionais — Pagamento

- [ ] Exibir metodo de pagamento (PIX, Boleto, Cartao)
- [ ] Exibir status do pagamento (PENDING, CONFIRMED, RECEIVED, OVERDUE, REFUNDED)
- [ ] Exibir QR Code PIX (se PIX)
- [ ] Exibir link de boleto (se Boleto)
- [ ] Exibir link de invoice
- [ ] QR Code PIX expirado — opcao de regenerar

### Testes Funcionais — Aprovacao

- [ ] Aprovar pedido com status ENTREGUE — status muda para CONCLUIDO
- [ ] Verificar que aprovacao libera escrow (locked → available no colaborador)
- [ ] Verificar que transacao financeira e registrada
- [ ] Verificar que notificacao e enviada ao colaborador
- [ ] Aprovar pedido com status != ENTREGUE — acao nao disponivel/bloqueada

### Testes Funcionais — Rejeicao

- [ ] Rejeitar pedido com motivo — status muda para REVISAO_SOLICITADA
- [ ] Motivo vazio — erro de validacao
- [ ] Verificar que revisao e registrada no historico
- [ ] Verificar que notificacao e enviada ao colaborador

### Testes Funcionais — Solicitar Revisao

- [ ] Solicitar revisao com motivo — revisao criada
- [ ] Motivo vazio — erro de validacao
- [ ] Verificar que contagem de revisoes incrementa
- [ ] Verificar que status muda conforme estado atual

### Testes Funcionais — Avaliar Pedido

- [ ] Avaliar pedido CONCLUIDO com nota 1-5 e comentario — sucesso
- [ ] Avaliar sem nota — erro de validacao
- [ ] Nota fora do range (0 ou 6) — erro
- [ ] Avaliar pedido ja avaliado — erro "order has already been rated"
- [ ] Avaliar pedido nao CONCLUIDO — acao nao disponivel
- [ ] Verificar que avaliacao atualiza ranking do colaborador

### Testes Funcionais — Abrir Disputa

- [ ] Abrir disputa com titulo e descricao — disputa criada
- [ ] Titulo vazio — erro
- [ ] Descricao vazia — erro
- [ ] Verificar que disputa aparece vinculada ao pedido
- [ ] Verificar que notificacao e enviada (ambas as partes + admin)

### Cenarios Negativos

- [ ] Acessar pedido de outro estudante — 403 Forbidden
- [ ] Acessar pedido inexistente — 404 Not Found
- [ ] Pedido CANCELADO — nenhuma acao disponivel

---

## 17. Tela: Pagamentos — Estudante (PaymentsPage)

**Objetivo:** Listar cobrancas/pagamentos do estudante.

### Testes Funcionais

- [ ] Listar todas as cobrancas do estudante com paginacao
- [ ] Exibir: servico, valor, status, tipo de cobranca (PIX/Boleto/Cartao), data de vencimento
- [ ] Filtrar por status — lista atualiza
- [ ] Cobranca PENDING — exibir opcoes de pagamento
- [ ] Cobranca RECEIVED — exibir como paga
- [ ] Cobranca OVERDUE — exibir como vencida com destaque
- [ ] Cobranca REFUNDED — exibir como reembolsada
- [ ] Clicar em cobranca — ver detalhes com QR Code PIX / link de boleto
- [ ] Verificar que cobrancas de outros estudantes nao aparecem

---

## 18. Tela: Ranking (RankingPage)

**Objetivo:** Exibir ranking gamificado dos colaboradores em 5 criterios.

### Funcionalidades
- Tabs de criterio: produtividade, receita, pontualidade, satisfacao, qualidade
- Seletor de periodo: este mes, todos os tempos
- Podium (top 3)
- Tabela de ranking (posicao 4+)
- Barra de posicao do usuario atual
- Painel informativo com dicas e formula de qualidade

### Testes Funcionais

- [ ] Selecionar criterio "Produtividade" — exibir ranking por # de jobs concluidos
- [ ] Selecionar criterio "Receita" — exibir ranking por valor total
- [ ] Selecionar criterio "Pontualidade" — exibir ranking por % de entregas no prazo
- [ ] Selecionar criterio "Satisfacao" — exibir ranking por media de avaliacao
- [ ] Selecionar criterio "Qualidade" — exibir ranking por formula: (1 - revision_rate) x 50% + (1 - refund_rate) x 30% + direct_approval_rate x 20%
- [ ] Alternar periodo "Este mes" — dados do mes atual
- [ ] Alternar periodo "Todos os tempos" — dados historicos completos
- [ ] Podium exibe top 3 com destaque visual (ouro, prata, bronze)
- [ ] Tabela exibe posicoes 4+ com: posicao, nome, valor, # pedidos
- [ ] Barra do usuario mostra posicao atual do colaborador logado
- [ ] Exibir painel com dicas de melhoria
- [ ] Exibir formula de qualidade no painel informativo

### Cenarios Negativos

- [ ] Nenhum colaborador com dados — estado vazio "Sem dados para exibir"
- [ ] Colaborador com < 3 jobs concluidos no ranking de qualidade — verificar threshold minimo
- [ ] Usuario nao-colaborador (admin) acessando ranking — sem barra de posicao pessoal

### Permissoes

- [ ] Admin — ve ranking completo
- [ ] Financeiro — ve ranking completo
- [ ] Collaborator — ve ranking completo + sua posicao destacada
- [ ] Student — verificar se tem acesso (verificar rota)

---

## 19. Tela: Notificacoes (NotificationsPage)

**Objetivo:** Listar e gerenciar notificacoes do usuario.

### Funcionalidades
- Lista de notificacoes (paginada, filtravel)
- Marcar como lida (individual e todas)
- Filtro por tipo e somente nao lidas
- Notificacao em tempo real via SSE

### Testes Funcionais

- [ ] Listar notificacoes do usuario logado com: titulo, mensagem, tipo, data
- [ ] Filtrar por tipo de notificacao (ORDER_CREATED, DISPUTE_OPENED, etc.)
- [ ] Filtrar somente nao lidas — lista atualiza
- [ ] Marcar notificacao individual como lida — badge atualiza
- [ ] Marcar todas como lidas — todas marcadas
- [ ] Paginacao funcional (limit/offset)
- [ ] Verificar contagem de nao lidas no sino (header)
- [ ] Clicar em notificacao — navegar para entidade relacionada (pedido, disputa, etc.)

### Real-time (SSE)

- [ ] Criar pedido em outra sessao — notificacao aparece em tempo real
- [ ] Mudar status de pedido — notificacao aparece sem refresh
- [ ] Abrir disputa — notificacao aparece para partes envolvidas
- [ ] Verificar que SSE reconecta apos desconexao

### Tipos de Notificacao

- [ ] ORDER_CREATED — gerada ao criar pedido
- [ ] ORDER_STATUS_CHANGED — gerada ao mudar status
- [ ] DELIVERY_UPLOADED — gerada ao colaborador entregar
- [ ] PAYMENT_RELEASED — gerada ao liberar pagamento
- [ ] DISPUTE_OPENED — gerada ao abrir disputa
- [ ] DISPUTE_MESSAGE — gerada ao comentar em disputa
- [ ] DISPUTE_RESOLVED — gerada ao resolver disputa
- [ ] REVISION_REQUESTED — gerada ao solicitar revisao
- [ ] APPROVAL_RECEIVED — gerada ao aprovar pedido
- [ ] DEADLINE_APPROACHING — gerada proximo ao prazo
- [ ] PAYMENT_PENDING — gerada para pagamento pendente

---

## 20. Fluxo: Maquina de Estados do Pedido (Order State Machine)

**Objetivo:** Validar todas as transicoes de status do pedido.

### Transicoes Validas

- [ ] NOVO → EM_ANDAMENTO
- [ ] NOVO → CANCELADO
- [ ] NOVO → ATRASADO (via worker, due_date expirado)
- [ ] EM_ANDAMENTO → AGUARDANDO_REVISAO
- [ ] EM_ANDAMENTO → ENVIADO_VISUALIZACAO
- [ ] EM_ANDAMENTO → ATRASADO
- [ ] EM_ANDAMENTO → CANCELADO
- [ ] AGUARDANDO_REVISAO → EM_ANDAMENTO
- [ ] AGUARDANDO_REVISAO → ENVIADO_VISUALIZACAO
- [ ] AGUARDANDO_REVISAO → ATRASADO
- [ ] AGUARDANDO_REVISAO → CANCELADO
- [ ] ENVIADO_VISUALIZACAO → AGUARDANDO_APROVACAO
- [ ] ENVIADO_VISUALIZACAO → CANCELADO
- [ ] AGUARDANDO_APROVACAO → APROVADO
- [ ] AGUARDANDO_APROVACAO → REVISAO_SOLICITADA
- [ ] AGUARDANDO_APROVACAO → CANCELADO
- [ ] REVISAO_SOLICITADA → EM_ANDAMENTO
- [ ] REVISAO_SOLICITADA → CANCELADO
- [ ] APROVADO → CONCLUIDO
- [ ] ATRASADO → EM_ANDAMENTO
- [ ] ATRASADO → CANCELADO

### Transicoes Invalidas (devem ser bloqueadas)

- [ ] CONCLUIDO → qualquer estado — bloqueado
- [ ] CANCELADO → qualquer estado — bloqueado
- [ ] NOVO → CONCLUIDO (pular etapas) — bloqueado
- [ ] EM_ANDAMENTO → CONCLUIDO (pular aprovacao) — bloqueado

---

## 21. Fluxo: Escrow e Financeiro

**Objetivo:** Validar integridade do fluxo financeiro (custodia, liberacao, reembolso).

### Criacao do Pedido

- [ ] Ao criar pedido, `balance_locked` do colaborador incrementa pelo `collab_value`
- [ ] Transacao financeira registrada (type=CREDIT, status=LOCKED)
- [ ] Cobranca ASAAS criada para o estudante
- [ ] Valor da cobranca = `total_value` do pedido

### Aprovacao do Pedido

- [ ] `balance_locked` decrementado pelo `collab_value`
- [ ] `balance_available` incrementado pelo `collab_value`
- [ ] Transacao financeira registrada (type=CREDIT, status=RELEASED)
- [ ] Status do pedido = CONCLUIDO

### Cancelamento do Pedido

- [ ] `balance_locked` decrementado pelo `collab_value` (refund)
- [ ] `balance_available` NAO incrementado
- [ ] Reembolso processado para o estudante (se ja pagou)

### Saque

- [ ] `balance_available` decrementado pelo valor do saque (apos aprovacao)
- [ ] Transferencia ASAAS criada
- [ ] Status: PENDING → APPROVED → PROCESSING → DONE
- [ ] Saldo nunca negativo (constraint CHECK >= 0)

### Integridade

- [ ] Saldo disponivel nunca negativo
- [ ] Saldo bloqueado nunca negativo
- [ ] Soma de transacoes = saldo atual
- [ ] Operacoes concorrentes nao causam inconsistencia (uso de transacoes DB)

---

## 22. Fluxo: Webhook ASAAS

**Objetivo:** Validar processamento de webhooks de pagamento.

### Testes Funcionais

- [ ] Webhook `PAYMENT_RECEIVED` — status da cobranca muda para RECEIVED
- [ ] Webhook `PAYMENT_OVERDUE` — status muda para OVERDUE
- [ ] Webhook `TRANSFER_CONFIRMED` — payout status muda para PROCESSING
- [ ] Webhook `TRANSFER_COMPLETED` — payout status muda para DONE
- [ ] Webhook `TRANSFER_FAILED` — payout status muda para FAILED

### Seguranca

- [ ] Webhook sem header `X-Webhook-Token` — rejeitado (401)
- [ ] Webhook com token invalido — rejeitado (401)
- [ ] Webhook duplicado (mesmo evento) — processado de forma idempotente (log de webhook)
- [ ] Webhook com payload malformado — erro 400, sem efeito colateral

---

## 23. Fluxo: Inadimplencia

**Objetivo:** Validar deteccao e tratamento de inadimplencia.

### Testes Funcionais

- [ ] Pedido com due_date + 3 dias (grace period) expirado → estudante marcado como inadimplente
- [ ] Campo `is_delinquent` = true no usuario
- [ ] Campo `delinquent_since` preenchido
- [ ] Historico de inadimplencia criado
- [ ] Estudante quita divida → `is_delinquent` = false, `delinquent_since` limpo
- [ ] Historico de "cleared" criado
- [ ] Worker de inadimplencia roda a cada 24h
- [ ] Execucao manual via dashboard admin funciona

### Efeitos

- [ ] Inadimplente aparece na tabela de inadimplentes do admin
- [ ] Verificar se inadimplente e bloqueado de criar novos pedidos
- [ ] Exportacao CSV de inadimplentes funcional

---

## 24. Fluxo: Workers em Background

**Objetivo:** Validar execucao dos workers automaticos.

### Cleanup de Refresh Tokens (1h)

- [ ] Tokens expirados sao removidos do banco
- [ ] Tokens validos nao sao afetados

### Marcacao de Pedidos Atrasados (1h)

- [ ] Pedidos com due_date < agora e status EM_ANDAMENTO → status muda para ATRASADO
- [ ] Pedidos ja CONCLUIDOS/CANCELADOS nao sao afetados

### Processamento de Payouts (5min)

- [ ] Payouts APPROVED sao enviados ao ASAAS
- [ ] Status muda para PROCESSING → DONE ou FAILED
- [ ] Retry em caso de falha (max 3 tentativas)

---

## 25. Layout e Navegacao (AppLayout / Sidebar)

**Objetivo:** Validar estrutura de navegacao, sidebar e responsividade.

### Testes Funcionais

- [ ] Sidebar expande e colapsa corretamente
- [ ] Itens de menu corretos para cada role:
  - Admin: Dashboard, Producao, Colaboradores, Saques, Reclamacoes, Disputas, Servicos, Ranking, Configuracoes
  - Financeiro: Dashboard, Producao, Colaboradores, Saques, Reclamacoes, Disputas, Servicos, Ranking
  - Collaborator: Dashboard, Minha Producao, Ranking
  - Student: Meus Pedidos, Pagamentos
- [ ] Clicar em item do menu — navega para rota correta
- [ ] Item ativo destacado visualmente
- [ ] Sino de notificacoes no header — exibe contagem de nao lidas
- [ ] Menu do usuario no header — exibe nome/email e opcao de logout

### Logout

- [ ] Clicar em logout — tokens removidos, redirecionado para login
- [ ] Endpoint POST /auth/logout chamado
- [ ] Apos logout, tentar acessar rota protegida — redirecionado para login
- [ ] Logout de todos os dispositivos (POST /auth/logout-all) — todos os refresh tokens revogados

### Responsividade

- [ ] Desktop (1920px) — layout completo com sidebar expandida
- [ ] Tablet (768px) — sidebar colapsa automaticamente
- [ ] Mobile (375px) — sidebar como drawer/overlay com botao toggle
- [ ] Conteudo nao transborda horizontalmente em nenhuma resolucao
- [ ] Tabelas responsivas (scroll horizontal em mobile)
- [ ] Modais centralizados e usaveis em todas as resolucoes

---

## 26. Testes Cross-Cutting de Seguranca

### Autenticacao

- [ ] Requisicao sem token para rota protegida — 401 Unauthorized
- [ ] Requisicao com token expirado — 401 + tentativa de refresh
- [ ] Requisicao com token invalido (assinatura errada) — 401
- [ ] Token de refresh reutilizado (reuse detection) — todos os tokens revogados
- [ ] Access token dura 15 minutos (verificar exp claim)
- [ ] Refresh token dura 7 dias (verificar no banco)

### Autorizacao

- [ ] Student acessando rota de admin — 403 Forbidden
- [ ] Collaborator acessando rota de admin — 403 Forbidden
- [ ] Admin acessando rota de colaborador — verificar comportamento
- [ ] Student acessando pedido de outro student — 403 Forbidden
- [ ] Collaborator acessando pedido nao atribuido — 403 Forbidden

### Validacao de Entrada

- [ ] SQL injection em campos de busca — sem efeito (queries parametrizadas)
- [ ] XSS em campos de texto (titulo, descricao, comentario) — sem execucao de script
- [ ] Payload > limite em requests — rejeitado
- [ ] Upload de arquivo > 10MB — rejeitado
- [ ] MIME type inesperado em upload — tratado

### CORS

- [ ] Requisicao de origem permitida (localhost:8082) — aceita
- [ ] Requisicao de origem nao permitida — rejeitada
- [ ] Pre-flight OPTIONS retorna headers corretos

---

## 27. Testes de Acessibilidade (Minimo)

- [ ] Modais recebem foco ao abrir
- [ ] ESC fecha modais
- [ ] Navegacao por teclado (Tab) funcional em formularios
- [ ] Campos de formulario possuem labels associados (htmlFor/aria-label)
- [ ] Botoes possuem texto acessivel (aria-label quando icone-only)
- [ ] Contraste de texto suficiente no tema escuro
- [ ] Mensagens de erro associadas aos campos via aria-describedby

---

## 28. Testes de Performance (Observacao)

- [ ] Dashboard admin carrega todos os widgets sem waterfall (queries paralelas)
- [ ] Listas com paginacao server-side nao carregam todos os registros
- [ ] Busca client-side nao causa re-renders excessivos
- [ ] Modais nao carregam dados ate serem abertos
- [ ] Stale time configurado por tipo de dado (nao global)
- [ ] AbortSignal respeitado (cancelar requisicoes ao desmontar componente)

---

## 29. Testes de Estados Vazios e Limites

- [ ] Sistema recem-instalado (sem dados) — todas as telas exibem estados vazios amigaveis
- [ ] Listas vazias — mensagem "Nenhum registro encontrado" (ou similar)
- [ ] Graficos sem dados — exibir placeholder ou mensagem
- [ ] Ranking sem colaboradores — estado vazio
- [ ] Colaborador sem jobs — tabela vazia
- [ ] Estudante sem pedidos — lista vazia com CTA para criar
- [ ] Paginacao com 1 pagina — controles de pagina ocultos/desabilitados
- [ ] Paginacao na ultima pagina — botao "Proximo" desabilitado

---

## 30. Testes de Consistencia de Dados

- [ ] Valor do pedido (total_value) = company_percent + collaborator_percent (soma = 100%)
- [ ] `collab_value` = total_value * (collaborator_percent / 100)
- [ ] KPIs do dashboard admin consistentes com dados reais do banco
- [ ] Contagem de pedidos no dashboard = total real
- [ ] Saldo da carteira = soma das transacoes financeiras
- [ ] Ranking recalcula corretamente apos nova avaliacao/conclusao
