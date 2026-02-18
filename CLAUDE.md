# REGRAS OBRIGATÓRIAS - SEGUIR SEMPRE

## Ao Finalizar Cada Prompt
1. Corrigir TODOS os erros de tipagem e linter (BiomeJS).
2. Remover textos hardcoded e colocar em i18n.
3. Remover código morto, lógica antiga ou não utilizada.
4. Listar possíveis pontos de falha (compilação, tipagem, lógica).

## Antes de Escrever Código
1. Descrever plano de implementação, arquivos envolvidos e impacto esperado.
2. Preferir alterações pequenas e coesas (diffs focados).

---

# PADRÕES DE CÓDIGO

## Arquitetura e organização (frontend)
- Arquitetura altamente componentizada.
- Componentes de página apenas UI/JSX; toda lógica em usePageName() (estado, efeitos, handlers, fetch, regras).
- Separar UI (apresentação) de containers (estado/lógica).
- Layer Enforcement: App > Processes > Pages > Widgets > Features > Entities > Shared.
- Slice Isolation: proibido cross-import entre slices da mesma layer.
- Public API: index.ts apenas para exports públicos; detalhes internos ficam privados.
- Pastas/arquivos em src sempre em kebab-case.
- Padronizar nomes de arquivos/componentes/imports; index.tsx apenas para re-export organizado (sem lógica).
- Seguir rigorosamente a arquitetura de pastas definida inicialmente.
- Nomenclatura orientada a LLMs (clara, descritiva e consistente; sem abreviações obscuras).

## Qualidade (tipagem, lint, manutenção)
- Arquivos com no máximo 1999 linhas (componentes preferencialmente < 200 linhas).
- 100% tipado, sem any (usar generics quando fizer sentido).
- Usar BiomeJS para lint/format no frontend.
- Revisão final: remover código morto/lógica antiga não usada e corrigir erros de tipagem/linter.
- JSDoc "LLM-friendly" e atualizado quando mudar lógica/assinaturas.

## Dados, rede e performance (frontend)
- Estado do servidor via ConnectRPC + @connectrpc/connect-query (useQuery/useMutation) para cache/dedup automáticos.
- Axios apenas para REST/JSON legado ou serviços externos.
- Mínimo de requisições ao backend por página (agregar dados via BFF/resolvers gRPC quando necessário).
- Virtualizar listas/tabelas acima de um threshold (ex.: > 50 itens).
- Nunca retornar listas grandes sem paginação server-side.
- Debounce/throttle em buscas e filtros que disparam requisições.
- Interface otimista quando segura (com rollback e consistência).

## Backend Go (camadas, validação, resiliência)
- Clean Architecture: Handler → Service/Usecase → Repository (sem regra de negócio em handler/repo).
- Validar inputs nos handlers (structs, limites de tamanho, ranges) antes de chamar services.
- Tratamento de erros padronizado (wrapping com contexto + tipos de erro) e mapeamento para HTTP bem definido, sem vazar detalhes sensíveis.
- context.Context em toda função com I/O e propagação correta.
- Transações para múltiplas operações relacionadas (rollback em erro).
- Idempotência para operações críticas/repetíveis (ex.: criação de pedidos).

## Banco de dados e performance (backend)
- Queries otimizadas e índices guiados por uso real (EXPLAIN/telemetria) para máxima performance.
- Paginação server-side obrigatória em endpoints de listagem.
- Hard delete (sem soft-delete), com estratégia de arquivamento separada quando precisar auditoria.

## Segurança
- Não expor tokens; evitar LocalStorage quando possível; preferir cookies HttpOnly + Secure + SameSite=Strict.
- Identificadores de sessão de alta entropia (CSPRNG).
- Sanitizar entradas renderizadas como HTML; evitar dangerouslySetInnerHTML; se inevitável, usar sanitização (ex.: DOMPurify no front e bluemonday no backend).
- CSP estrito com nonce e strict-dynamic (com geração de nonce por request e integração com Vite/SSR quando aplicável).

## Observabilidade (sem vazar dados)
- Logs estruturados (JSON) com redaction automática de PII; sem dados sensíveis em logs.
- Incluir traceId/correlationId em erros/logs para rastreabilidade.

## Processo, testes e compatibilidade
- Antes de escrever código: descrever plano (arquivos envolvidos + impacto) e depois implementar.
- Preferir mudanças pequenas e coesas (diffs focados).
- Não mudar contratos públicos (funções/endpoints/protos) sem checar todos os usos; se necessário, versionar (v2) mantendo compatibilidade.
- Para cada regra de negócio criada/alterada: atualizar/criar testes (frontend e backend) cobrindo sucesso, erro e edge cases.
- Validar comportamento para todas as roles do sistema quando a mudança afetar permissão/fluxo.
- Acessibilidade mínima: foco correto em modais, teclado e aria-*.

## Commits e documentação
- Todo commit deve seguir Conventional Commits: type(scope): descrição (+ BREAKING CHANGE: quando aplicável).
- README por módulo/domínio importante com visão geral/fluxos/decisões, atualizado em refatorações relevantes.

## Extras (para reduzir erros e melhorar performance/estabilidade)
- Prefetch com critério: apenas rotas/modais prováveis (hover/viewport), com limite de concorrência e cancelamento.
- Cache com política por tipo de dado: definir staleTime/revalidate por domínio (evitar regra global).
- Timeouts e rate limit padrão no backend: todo I/O com deadline; endpoints com limites por IP/usuário.
- Retry só quando idempotente: backoff + jitter; nada de retry cego.
- DoD obrigatório: typecheck + lint + testes passando antes de considerar a tarefa concluída.
- Checagem de dependências: varredura de vulnerabilidades (Go + npm) em CI para evitar regressões de segurança.

## Contratos e geração (Schema-Driven)
- Protobuf é a fonte única da verdade: todo modelo público (requests/responses/events) nasce no .proto; TS/Go são sempre gerados.
- Buf obrigatório: todo change em .proto exige buf lint + buf breaking (breaking check) no CI.
- Versionamento de contrato: mudanças incompatíveis geram v2 (novo package/service/method), mantendo v1 funcionando.

## ConnectRPC / rede (cross-cutting)
- Interceptors obrigatórios no client Connect: auth (inject token), tracing (traceparent), normalização de erro e retry/backoff somente onde idempotente.
- Sem try/catch espalhado: erros de rede são tratados centralmente via interceptor + mapeamento de códigos gRPC → UX (inline/form, toast, redirect).
- AbortSignal sempre ligado: chamadas via Connect devem respeitar cancelamento do React Query para evitar requisições órfãs.

## Validação end-to-end
- Protovalidate como validação canônica: regras de input vivem no .proto (CEL/annotations) e são executadas no backend via interceptor.
- Frontend valida igual ao backend: formulários usam react-hook-form com resolver baseado em @bufbuild/protovalidate (sem duplicar regra em Zod/Yup).
- Erros de validação estruturados: mapear InvalidArgument para erros por campo no RHF, mantendo mensagens consistentes.

## FSD (sem vazamento de domínio)
- Shared é agnóstico a negócio: shared/ não pode importar entities/features/widgets/pages.
- Entities não se importam entre si: relações entre entidades são compostas em camadas superiores (features/widgets/pages).
- Features são descartáveis: uma feature deve poder ser removida sem quebrar outras (sem depender de features irmãs).
- Widgets são plugáveis: widgets não dependem de contexto da página; recebem dados/handlers via props ou usam entities/features.

## Enforcement automático (CI)
- Boundary lint obrigatório: CI deve falhar se quebrar regras de import do FSD (dependency-cruiser ou boundaries).
- Quality gates obrigatórios: CI sempre roda typecheck + Biome + testes + buf checks + golangci-lint (sem warnings ignorados).

## Go hardening e performance
- PGO em produção: coletar perfil representativo e usar default.pgo no build do main.
- golangci-lint estrito: incluir ao menos gosec, errcheck, bodyclose, e limite de complexidade (cognitive/cyclo).
- Cancelamento respeitado no server: handlers e loops longos checam ctx.Done() e abortam rápido.
- TLS mínimo 1.2: rejeitar TLS 1.0/1.1 no server.
- Comparações sensíveis em tempo constante: usar crypto/subtle.ConstantTimeCompare quando validar assinaturas/tokens manualmente.

## CSP/Vite (runtime security)
- Nonce por requisição: gerar nonce criptográfico no server e injetar no HTML servido.
- Placeholder no build: Vite deve produzir HTML com placeholder (__CSP_NONCE__) para substituição no server em runtime.
- CSP padrão: manter script-src 'nonce-…' 'strict-dynamic' + object-src 'none' + base-uri 'none'.

## Observabilidade (sem PII)
- Tracing distribuído obrigatório: propagar traceparent no client e incluir traceId nos logs do Go.
- Redaction na pipeline: logs/traces devem passar por redaction (PII) antes de exportar (ex.: OTel Collector).

## Semântica de erros (gRPC → UX)
- Tabela oficial de mapeamento: padronizar ações da UI por código (InvalidArgument→inline, Unauthenticated→refresh/login, PermissionDenied→acesso negado, Unavailable→reconnect/backoff etc.).
- Sem vazar detalhes internos: mensagens para usuário são amigáveis; detalhes técnicos só em logs/redacted.

## Supply chain
- Build reprodutível: binário estático (CGO_ENABLED=0, -ldflags "-s -w") e imagem distroless em produção.
- Assinatura obrigatória: imagens assinadas via Cosign (keyless) e verificadas na entrega/cluster quando aplicável.

## Complementos finais (para reduzir ambiguidades)
- Pages são orquestração: regras de negócio devem viver em Entities/Features (Pages não carregam domínio).
- Design de proto: nunca reutilizar número de campo; campos novos sempre opcionais com default compatível; deprecar antes de remover.
- Toda mutation define claramente estratégia de cache: invalidar/atualizar queries e onde usar otimista.
- Limites de payload: impor limites de tamanho em requests (texto/upload/listas) no server e no contrato/validação.
- Testes instáveis não entram: "flaky test" bloqueia merge até estabilizar.
- Mudança arriscada entra atrás de feature-flag (rollout gradual e rollback rápido).

---

# CONFIGURAÇÕES DO PROJETO

## Estrutura de Diretórios
```
sistema-financeiro/
├── client/              # Frontend (React/Vite)
│   ├── src/             # Código fonte
│   └── dist/            # Build de produção
├── server/              # Backend (Go)
│   ├── cmd/api/         # Entrypoint
│   ├── internal/        # Código interno
│   ├── migrations/      # Scripts SQL
│   └── uploads/         # Arquivos enviados
├── .docker/             # Dados PostgreSQL
├── .claude/             # Configurações Claude Code
├── Makefile             # Comandos de automação
└── docker-compose.yml   # Serviços Docker
```

## Portas dos Serviços
| Serviço | Porta | URL |
|---------|-------|-----|
| Frontend | 8082 | http://localhost:8082 |
| Backend | 8080 | http://localhost:8080 |
| PostgreSQL | 5435 | localhost:5435 |

## Comandos (Makefile)
| Comando | Descrição |
|---------|-----------|
| `make dev` | Inicia ambiente completo (Docker + Backend + Frontend) |
| `make stop` | Para todos os serviços |
| `make up` | Inicia containers Docker |
| `make down` | Para containers Docker |
| `make run-api` | Inicia apenas o backend Go |
| `make run-web` | Inicia apenas o frontend Vite |
| `make migrate-create` | Cria novos arquivos de migração |
| `make migrate-up` | Aplica todas as migrações |
| `make migrate-down` | Reverte todas as migrações |

## Desenvolvimento Local
- Rodar tudo: `make dev`
- Rodar apenas frontend: `make run-web`
- Rodar apenas backend: `make run-api`
- Nunca usar PM2 no ambiente local.
- Para reiniciar: `make stop` e depois `make dev`.

## Stack
- Frontend: React 19 + Vite + TypeScript
- Estilização: Tailwind CSS
- Linter/Formatter: BiomeJS
- Roteamento: React Router DOM
- Backend: Go + chi/v5
- Banco: PostgreSQL 15 (Docker)
- Auth: JWT

## Arquivos Ignorados (.claudeignore)
- client/node_modules/
- client/dist/
- client/package-lock.json
- server/go.sum
- server/api (binário)
- server/financial-system (binário)
- server/uploads/
- .docker/postgres-data/
- .git/
- *.log

## 18. Credenciais de Teste
| Role | Email | Senha |
|------|-------|-------|
| Admin | admin@test.com | password123 |
| Student | student@test.com | password123 |
| Collaborator | collaborator@test.com | password123 |
| Financeiro | financeiro@test.com | password123 |
