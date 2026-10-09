# Fase 8 — Preferências e preparação para integração

- `user_preferences` armazena timezone e lembretes padrão; não há criação automática de registro. A tela mostra defaults até o primeiro salvamento.
- Migration habilita RLS para `SELECT`, `INSERT`, `UPDATE` e `DELETE`, restringindo cada linha a `auth.uid() = user_id`. O trigger usa `public.set_updated_at()` já existente.
- `user-preferences.service.ts` consulta somente o usuário autenticado, valida os dados com Zod e salva por upsert. Os lembretes são minutos: 10080, 4320, 1440 e 0.
- `src/lib/date.ts` mantém `America/Fortaleza` como fallback e permite configurar/fornecer timezone para conversão, formatação e urgência. As preferências carregadas/salvas em Configurações atualizam o timezone ativo no cliente sem reescrever os fluxos anteriores.
- A seção Google Calendar exibe “Não conectado” e o botão desabilitado com “Disponível na próxima etapa”. Não há OAuth, API Google, tokens, sincronização ou notificações.

Testes em `tests/settings.spec.ts` verificam defaults sem registro, conta, lembretes, timezone, persistência simulada após reload e escopo das consultas ao usuário autenticado. O isolamento efetivo entre usuários é garantido pelas políticas RLS no Supabase.
