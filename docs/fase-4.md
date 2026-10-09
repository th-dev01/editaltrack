# Fase 4 — Eventos / Cronograma dos Editais

## Visão Geral

A Fase 4 implementa o sistema de eventos/cronograma para cada edital. Cada edital pode ter múltiplas datas importantes (publicação, inscrição, isenção, provas, resultados, matrícula, etc.) armazenadas como registros independentes na tabela `eventos_edital`.

## Migration

**Arquivo:** `supabase/migrations/20261001130000_create_eventos_edital.sql`

### Estrutura da Tabela `eventos_edital`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Chave primária, gerada automaticamente |
| `user_id` | UUID | Referência ao usuário (FK com CASCADE) |
| `edital_id` | UUID | Referência ao edital (FK com CASCADE) |
| `titulo` | TEXT | Título do evento (obrigatório) |
| `tipo` | TEXT | Tipo do evento (obrigatório, default: 'outro') |
| `data_inicio` | TIMESTAMPTZ | Data/hora de início (obrigatória) |
| `data_fim` | TIMESTAMPTZ | Data/hora de fim (opcional) |
| `dia_inteiro` | BOOLEAN | Se é evento de dia inteiro (default: true) |
| `descricao` | TEXT | Descrição (opcional) |
| `concluido` | BOOLEAN | Se evento foi concluído (default: false) |
| `created_at` | TIMESTAMPTZ | Data de criação (auto) |
| `updated_at` | TIMESTAMPTZ | Data de atualização (auto) |

### Tipos de Evento Disponíveis

| Valor Interno | Label |
|---------------|-------|
| `publicacao` | Publicação |
| `inscricao` | Inscrição |
| `isencao` | Isenção |
| `pagamento` | Pagamento |
| `envio_documentos` | Envio de documentos |
| `homologacao` | Homologação |
| `prova` | Prova |
| `entrevista` | Entrevista |
| `avaliacao_titulos` | Avaliação de títulos |
| `resultado_preliminar` | Resultado preliminar |
| `recurso` | Recurso |
| `resultado_recurso` | Resultado do recurso |
| `resultado_final` | Resultado final |
| `matricula` | Matrícula |
| `convocacao` | Convocação |
| `outro` | Outro |

### Constraints

- `eventos_edital_data_fim_check`: `data_fim >= data_inicio` quando `data_fim` existir

### Índices

- `eventos_edital_user_id_idx` — (user_id)
- `eventos_edital_edital_id_idx` — (edital_id)
- `eventos_edital_data_inicio_idx` — (data_inicio)
- `eventos_edital_tipo_idx` — (tipo)
- `eventos_edital_concluido_idx` — (concluido)
- `eventos_edital_user_data_inicio_idx` — (user_id, data_inicio)

### Triggers

- Reutiliza a função `set_updated_at()` da Fase 3 via trigger `eventos_edital_updated_at`

## Row Level Security (RLS)

RLS ativado na tabela `eventos_edital`. Policies garantem isolamento por usuário:

| Policy | Operação | Regra |
|--------|----------|-------|
| `eventos_edital_select_own` | SELECT | `auth.uid() = user_id` |
| `eventos_edital_insert_own` | INSERT | `auth.uid() = user_id` AND `EXISTS (SELECT 1 FROM editais WHERE editais.id = eventos_edital.edital_id AND editais.user_id = auth.uid())` |
| `eventos_edital_update_own` | UPDATE | `auth.uid() = user_id` (USING) AND mesma verificação de posse do edital (WITH CHECK) |
| `eventos_edital_delete_own` | DELETE | `auth.uid() = user_id` |

**Importante:** A policy de INSERT/UPDATE verifica também se o `edital_id` pertence ao mesmo usuário, impedindo associar eventos a editais de outros usuários.

## Tipos TypeScript

**Arquivo:** `src/types/edital.ts`

```typescript
export type EventoTipo = 'publicacao' | 'inscricao' | 'isencao' | 'pagamento' | 'envio_documentos' |
  'homologacao' | 'prova' | 'entrevista' | 'avaliacao_titulos' | 'resultado_preliminar' |
  'recurso' | 'resultado_recurso' | 'resultado_final' | 'matricula' | 'convocacao' | 'outro'

export type EventoEdital = {
  id: string
  user_id: string
  edital_id: string
  titulo: string
  tipo: EventoTipo
  data_inicio: string
  data_fim: string | null
  dia_inteiro: boolean
  descricao: string | null
  concluido: boolean
  created_at: string
  updated_at: string
}

export type CreateEventoEditalInput = Pick<EventoEdital, 'edital_id' | 'titulo' | 'tipo' | 'data_inicio'> &
  Partial<Omit<EventoEdital, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'edital_id' | 'titulo' | 'tipo' | 'data_inicio'>>

export type UpdateEventoEditalInput = Partial<CreateEventoEditalInput>

export interface ProximoEvento extends EventoEdital {
  edital_titulo: string
  edital_numero: string | null
  edital_categoria: string
}
```

## Schema Zod

**Arquivo:** `src/features/editais/evento-edital-schema.ts`

```typescript
export const eventoEditalSchema = z.object({
  titulo: z.string().trim().min(1, 'Informe o título do evento.'),
  tipo: z.enum(EVENTO_TIPOS, { message: 'Selecione um tipo de evento.' }),
  data_inicio: z.string().min(1, 'Informe uma data válida.').refine(isValidDateString, 'Informe uma data válida.'),
  data_fim: z.string().trim()
    .refine((value) => !value || isValidDateString(value), 'Informe uma data válida.')
    .transform((value) => value || null),
  dia_inteiro: z.boolean(),
  descricao: optionalText,
  concluido: z.boolean(),
}).superRefine((data, ctx) => {
  if (data.data_fim && data.data_inicio) {
    const inicio = new Date(data.data_inicio).getTime()
    const fim = new Date(data.data_fim).getTime()
    if (fim < inicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['data_fim'],
        message: 'A data final deve ser posterior ou igual à data inicial.',
      })
    }
  }
})

export type EventoEditalFormInput = z.input<typeof eventoEditalSchema>
export type EventoEditalFormOutput = z.output<typeof eventoEditalSchema>
```

## Service

**Arquivo:** `src/services/eventos.service.ts`

### Funções

- `getEventosByEdital(editalId, signal?)` — Lista eventos de um edital
- `getEventoById(id, signal?)` — Busca evento por ID
- `createEvento(input)` — Cria novo evento (user_id obtido do auth)
- `updateEvento(id, input)` — Atualiza evento existente
- `deleteEvento(id)` — Remove evento
- `toggleEventoConcluido(id, concluido)` — Alterna estado de concluído
- `getProximosEventos(limite?, signal?)` — Busca próximos eventos do usuário (não concluídos, data futura)
- `getEventosParaDashboard(signal?)` — Versão simplificada para Dashboard (limite 5)

### Tratamento de Timezone

Todas as datas são convertidas para UTC meia-noite no timezone `America/Fortaleza` antes de salvar no banco, garantindo que datas de "dia inteiro" não sofram deslocamento de fuso horário.

## Componentes

### EventoForm
**Arquivo:** `src/features/editais/EventoForm.tsx`

Formulário reutilizável para criar/editar eventos com:
- Validação via React Hook Form + Zod
- Campos: Título*, Tipo*, Dia inteiro, Data início*, Data fim, Descrição
- Tipo de input muda entre `date` e `datetime-local` conforme "Dia inteiro"
- Validação cruzada: data fim ≥ data início

### EventoCard
**Arquivo:** `src/features/editais/EventoCard.tsx`

Exibição de um evento com:
- Badge do tipo com cor baseada na urgência
- Título e período formatado
- Indicador visual de urgência (hoje, amanhã, urgente, atenção, normal, encerrado, futuro, concluído)
- Ações: Concluir, Editar, Excluir

### EventoList
**Arquivo:** `src/features/editais/EventoList.tsx`

Lista de eventos de um edital com:
- Botão "Adicionar evento" abre modal com EventoForm
- Lista de EventoCard ordenados por data
- Confirmação de exclusão com dialog
- Feedback de loading/error/empty state

## Integração com EditalDetailsPage

**Arquivo:** `src/pages/EditalDetailsPage.tsx`

Adicionada seção "Cronograma" na sidebar do detalhe do edital:
- Renderiza `EventoList` com o `editalId` atual
- Callback `onEventoChange` recarrega o edital para atualizar o card de próximo prazo

## Integração com Dashboard

**Arquivo:** `src/pages/DashboardPage.tsx`

Seção "Próximos prazos" atualizada para usar dados reais:
- Busca `getEventosParaDashboard()` no mount
- Lista até 5 próximos eventos não concluídos
- Cada item mostra: data (dia/mês), título do evento, título do edital, badge de urgência
- Clique no item navega para `/editais/:id`

### Cálculo de Urgência

**Arquivo:** `src/lib/date.ts` — `calcularUrgencia()`

Estados retornados:
| Status | Label | Cor |
|--------|-------|-----|
| `today` | Hoje | Vermelho |
| `tomorrow` | Amanhã | Vermelho |
| `urgent` | Faltam X dias (1-2) | Vermelho |
| `attention` | Faltam X dias (3-7) | Amarelo |
| `normal` | Faltam X dias (8+) | Verde/neutro |
| `expired` | Encerrado | Cinza |
| `completed` | Concluído | Verde discreto |

### Lógica de Prazo

- **Com `data_fim`**: usa `data_fim` como prazo principal
- **Sem `data_fim`**: usa `data_inicio`
- **Dia inteiro**: considera fim do dia (23:59:59)
- **Evento concluído**: status "Concluído", não entra em urgência
- **Prazo passado**: status "Encerrado"

## Utilitários de Data

**Arquivo:** `src/lib/date.ts`

- `getTimezone()` — Retorna `America/Fortaleza`
- `formatDate(dateStr, { includeTime? })` — Formato `dd/MM/yyyy` ou `dd/MM/yyyy às HH:mm`
- `formatPeriod(inicio, fim)` — Período `dd/MM/yyyy → dd/MM/yyyy`
- `calcularUrgencia(inicio, fim, diaInteiro, concluido)` — Retorna `{ status, label, daysRemaining }`
- `getUrgenciaStyle(status)` — Retorna `{ bg, text, border }` para estilização

## Como Aplicar a Migration

### Opção 1: Supabase CLI
```bash
npx supabase db push
```

### Opção 2: SQL Editor no Supabase Dashboard
1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Copie o conteúdo de `supabase/migrations/20261001130000_create_eventos_edital.sql`
4. Execute o SQL

## Como Testar

### Testes E2E
```bash
npm run test:auth
```

Os testes cobrem:
- Criação, edição, exclusão de eventos
- Validação de datas (fim < início)
- Eventos de um dia vs período
- Cálculo de urgência (hoje, amanhã, X dias, encerrado, concluído)
- Próximos eventos ordenados
- RLS (quando possível com mocks)

### Verificações
```bash
npm run typecheck
npm run lint
npm run build
npm run test:auth
```

## Próximas Fases

- **Fase 5:** Documentos / Checklist de documentos
- **Fase 6:** Google Calendar sync
- **Fase 7:** Notificações e IA