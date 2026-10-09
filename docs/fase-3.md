# Fase 3 — Editais (CRUD Completo)

## Visão Geral

A Fase 3 implementa o CRUD completo de editais, incluindo listagem com busca e filtros, criação, edição, detalhes, favoritos, arquivamento e exclusão.

## Migration

**Arquivo:** `supabase/migrations/20261001120000_create_editais.sql`

### Estrutura da Tabela `editais`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Chave primária, gerada automaticamente |
| `user_id` | UUID | Referência ao usuário (FK com CASCADE) |
| `titulo` | TEXT | Título do edital (obrigatório) |
| `numero_edital` | TEXT | Número do edital (opcional) |
| `instituicao` | TEXT | Instituição (obrigatório) |
| `categoria` | TEXT | Categoria (obrigatório) |
| `cargo_curso` | TEXT | Cargo/curso/função (opcional) |
| `descricao` | TEXT | Descrição (opcional) |
| `cidade` | TEXT | Cidade (opcional) |
| `estado` | TEXT | Estado (opcional) |
| `modalidade` | TEXT | presencial, ead, hibrido, nao_informado |
| `link_pagina` | TEXT | URL da página oficial (opcional) |
| `link_inscricao` | TEXT | URL da inscrição (opcional) |
| `link_pdf` | TEXT | URL direto do PDF (opcional) |
| `valor_inscricao` | NUMERIC(10,2) | Valor da inscrição (opcional) |
| `possui_isencao` | BOOLEAN | Se possui isenção (default: false) |
| `status` | TEXT | Status do edital (default: 'encontrado') |
| `favorito` | BOOLEAN | Se é favorito (default: false) |
| `observacoes` | TEXT | Observações (opcional) |
| `inscricao_realizada` | BOOLEAN | Se inscrição foi realizada (default: false) |
| `data_inscricao_realizada` | TIMESTAMPTZ | Data da inscrição (opcional) |
| `created_at` | TIMESTAMPTZ | Data de criação (auto) |
| `updated_at` | TIMESTAMPTZ | Data de atualização (auto) |

### Status Disponíveis

- `encontrado` — Caixa de entrada
- `analisando` — Em análise
- `tenho_interesse` — Tenho interesse
- `vou_participar` — Vou participar
- `inscricao_aberta` — Inscrição aberta
- `inscricao_realizada` — Inscrição realizada
- `aguardando_resultado` — Aguardando resultado
- `aprovado` — Aprovado
- `nao_aprovado` — Não aprovado
- `desisti` — Desisti
- `arquivado` — Arquivado

### Categorias Disponíveis

Pós-graduação, Especialização, Mestrado, Doutorado, Residência, Concurso, Processo seletivo, Mediador pedagógico, Tutor, Professor, Estágio, Bolsa, Curso, Outro

### Índices

- `editais_user_status_idx` — (user_id, status)
- `editais_status_idx` — (status)
- `editais_categoria_idx` — (categoria)
- `editais_favorito_idx` — (favorito)
- `editais_created_at_idx` — (created_at DESC)
- `editais_user_created_at_idx` — (user_id, created_at DESC, id DESC)

### Triggers

- `set_updated_at()` — Atualiza `updated_at` automaticamente
- `sync_edital_inscricao()` — Sincroniza `inscricao_realizada`, `data_inscricao_realizada` e `status`

## Row Level Security (RLS)

A RLS está ativada na tabela `editais`. As policies garantem que usuários só podem acessar seus próprios registros:

| Policy | Operação | Regra |
|--------|----------|-------|
| `editais_select_own` | SELECT | `auth.uid() = user_id` |
| `editais_insert_own` | INSERT | `auth.uid() = user_id` |
| `editais_update_own` | UPDATE | `auth.uid() = user_id` (USING e WITH CHECK) |
| `editais_delete_own` | DELETE | `auth.uid() = user_id` |

## Service

**Arquivo:** `src/services/editais.service.ts`

### Funções

- `getEditais(signal?)` — Lista todos os editais do usuário autenticado
- `getEditalById(id, signal?)` — Busca um edital por ID
- `createEdital(input)` — Cria novo edital (user_id obtido do auth)
- `updateEdital(id, input)` — Atualiza edital existente
- `deleteEdital(id)` — Remove edital
- `toggleFavorito(id, favorito)` — Alterna estado de favorito

## Rotas

| Rota | Página | Descrição |
|------|--------|-----------|
| `/editais` | EditaisPage | Listagem com busca e filtros |
| `/editais/novo` | EditalEditorPage (create) | Formulário de criação |
| `/editais/:id` | EditalDetailsPage | Detalhes do edital |
| `/editais/:id/editar` | EditalEditorPage (edit) | Formulário de edição |

## Componentes

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `EditalCard` | `src/features/editais/EditalCard.tsx` | Card de listagem |
| `EditalForm` | `src/features/editais/EditalForm.tsx` | Formulário reutilizável |
| `EditalStatusBadge` | `src/features/editais/EditalStatusBadge.tsx` | Badge de status |
| `EditalFilters` | `src/features/editais/EditalFilters.tsx` | Filtros e busca |
| `DeleteEditalDialog` | `src/features/editais/DeleteEditalDialog.tsx` | Diálogo de confirmação |
| `ExternalLinkButton` | `src/features/editais/ExternalLinkButton.tsx` | Botão para links externos |

## Validação

O formulário utiliza React Hook Form + Zod com as seguintes regras:

- **Obrigatórios:** título, instituição, categoria
- **URLs:** devem ser válidas (http:// ou https://) quando preenchidas
- **Valor:** deve ser >= 0, com até 2 casas decimais
- **Campos opcionais vazios:** convertidos para `null`

## Como Aplicar a Migration

### Recomendado: SQL Editor

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Copie o conteúdo de `supabase/migrations/20261001120000_create_editais.sql`
4. Execute o SQL

Execute esta migration uma única vez. O arquivo contém `BEGIN`/`COMMIT` e pode ser aplicado integralmente.

### Supabase CLI

O repositório também contém migrations de outras fases. Portanto, `supabase db push` pode aplicar **todas** as migrations pendentes, não somente a Fase 3. Use-o apenas se também pretende aplicar todas as migrations pendentes e já tiver o projeto linkado:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Para aplicar exclusivamente esta fase, use o SQL Editor acima. A migration não foi executada automaticamente.

## Como Testar

### Testes E2E

```bash
npm run test:auth
```

Os testes utilizam mocks controlados (sem chamadas reais ao Supabase) e cobrem:

- Validação do formulário (campos obrigatórios, URL inválida)
- Criação de edital
- Listagem
- Edição
- Favoritar/desfavoritar
- Exclusão
- Rota protegida
- Edital inexistente
- Busca e filtros
- Arquivamento

### Verificações

```bash
npm run typecheck
npm run lint
npm run build
```

## Funcionalidades Implementadas

- [x] Tabela `editais` com todos os campos
- [x] Migration SQL com constraints e índices
- [x] RLS com policies de segurança
- [x] Trigger de `updated_at` automático
- [x] Trigger de sincronização de inscrição
- [x] Tipos TypeScript completos
- [x] Service de editais com CRUD
- [x] Tela "Meus Editais" com cards
- [x] Tela "Novo Edital" com formulário
- [x] Tela "Detalhes do Edital"
- [x] Tela "Editar Edital"
- [x] Busca por título, instituição, número, cargo e cidade
- [x] Filtros por categoria, status, modalidade e favoritos
- [x] Ordenação (recentes, antigos, título A-Z, instituição A-Z)
- [x] Favoritar/desfavoritar
- [x] Arquivar edital
- [x] Excluir edital com confirmação
- [x] Estados vazios e de loading
- [x] Tradução de erros
- [x] Testes E2E com mocks

## Próximas Fases

- **Fase 4:** Eventos/cronograma
- **Fase 5:** Documentos
- **Fase 6:** Google Calendar
- **Fase 7:** Notificações e IA
