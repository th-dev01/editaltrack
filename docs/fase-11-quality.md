# Fase 11 — qualidade e preparação para produção

## Revisão e correções

- Páginas principais agora carregam sob demanda (`React.lazy`/`Suspense`). O chunk de entrada passou de **570,41 kB para 448,32 kB** (−21,4%); o chunk Supabase segue separado em 214,18 kB. O aviso de 500 kB deixou de aparecer.
- Corrigida a comparação de períodos all-day no Dashboard para usar o timezone configurado, em vez do timezone do navegador, evitando desvio na virada do dia.
- Aumentado para 60 s o timeout do teste que visita rotas lazy em série; o timeout padrão era insuficiente em execução lenta.
- Mantidos os fluxos Google: sync atualiza vínculo existente, 404 limpa vínculo, revogação pede reconexão, remoção remota não apaga o evento interno, e lote reporta falha parcial. Testes usam mocks; nenhum teste automatizado usa credenciais reais.

## Segurança revisada

- RLS nas tabelas de editais, eventos e documentos limita operações ao proprietário; `INSERT`/`UPDATE` de eventos e documentos verificam também que o edital associado pertence ao usuário. `user_preferences` usa `auth.uid() = user_id` em `USING` e `WITH CHECK`.
- `google_oauth_states` e `google_calendar_connections` têm RLS sem policies/grants para clientes. A RPC de consumo de state é `SECURITY DEFINER`, tem `search_path` vazio e execução concedida somente a `service_role`.
- Edge Functions autenticadas derivam o usuário do JWT verificado via Supabase Auth e filtram operações por esse usuário; o callback OAuth é a única função pública necessária e consome state de uso único. Tokens e credenciais são tratados no backend; tokens persistidos são criptografados.
- Busca por segredos não encontrou valores de credenciais hardcoded. As ocorrências encontradas são nomes de variáveis, campos de token, dados sintéticos dos testes ou exemplos com placeholders. `.gitignore` exclui `.env*`, exceto `.env.example`.

## Google Calendar — checklist manual real

Usar uma conta de teste, sem compartilhar tokens ou códigos nos logs:

1. Conectar a conta Google e confirmar o status/e-mail em Configurações.
2. Criar evento all-day e evento com horário; conferir datas, timezone, fim inclusivo e reminders no Google Calendar.
3. Editar a data de um evento sincronizado; conferir atualização do mesmo evento, sem duplicata.
4. Remover somente do Google; confirmar que o evento interno permanece e pode ser sincronizado novamente.
5. Sincronizar novamente e conferir vínculo atualizado.
6. Excluir escolhendo ambos; confirmar remoção local e remota.
7. Desconectar e reconectar a conta; confirmar que a integração volta a sincronizar.

## Riscos e dívida técnica

- O Dashboard ainda agrega até 1.000 eventos e documentos pendentes no cliente, e `getProximosEventos(1000)` pode buscar até 3.000 linhas antes do filtro. Migrar contagens/agregações para consultas server-side requer desenho e paginação próprios; mantido como dívida, sem reestruturação nesta fase.
- A execução automatizada cobre fluxos por mocks, não substitui o checklist Google real. Confirmar publicação das Edge Functions e migrations no projeto de produção.
- A suíte E2E verifica responsividade em mobile (inclui 320/390 px) e desktop; a validação visual manual nas larguras 375, 768, 1024 e 1440 px continua recomendada antes do release, incluindo modais e formulários longos.
- Foram revisados labels, nomes acessíveis, foco visível, estados de envio e mensagens seguras existentes. Não foi feita auditoria formal de contraste ou certificação WCAG.
