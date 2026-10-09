# Supabase Auth — configuração e teste

Este guia corresponde à Fase 2 do EditalTrack. Não é necessário criar tabelas, migrations, buckets ou configurar Storage.

## 1. Abrir o projeto

1. Entre em [supabase.com/dashboard](https://supabase.com/dashboard).
2. Selecione sua organização e o projeto que será usado no EditalTrack.
3. Se ainda não houver projeto, clique em **New project**, selecione a organização, informe nome, senha do banco e região, e aguarde a criação. A senha do banco não deve ser colocada no frontend.

Nesta implementação, uma consulta somente de leitura ao endpoint público de configurações confirmou: conexão válida, Email habilitado, novos cadastros permitidos e confirmação de e-mail ativada. Redirects e SMTP precisam ser conferidos no painel; essa consulta não permite verificar esses valores.

## 2. Obter URL e chave pública

1. No projeto, clique em **Connect** para localizar a **Project URL**. Também pode encontrá-la em **Project Settings → Data API** (em versões anteriores do painel, **Settings → API**).
2. Abra **Project Settings → API Keys**.
3. Copie uma **Publishable key** ou a chave **anon** na seção **Legacy anon, service_role API keys**. A variável mantém o nome solicitado `VITE_SUPABASE_ANON_KEY` e aceita ambas as chaves públicas.
4. Na raiz do projeto, crie `.env.local` (não versionado) com as duas variáveis públicas:

```dotenv
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<CHAVE_PUBLICA_COPIADA_DO_PAINEL>
```

Não inclua `/rest/v1/` na URL. Não utilize Secret key ou service_role. `.env.local` está ignorado pelo Git. Para deploy, configure as mesmas duas variáveis no ambiente de build da hospedagem; consulte [`production-deploy.md`](production-deploy.md).

## 3. Habilitar cadastro por e-mail

1. No menu lateral do projeto, clique em **Authentication**.
2. Abra **Sign In / Providers** (ou **Providers**, dependendo da versão do painel).
3. Abra o provedor **Email** e mantenha **Enable Email provider** habilitado.
4. Na configuração de cadastro dessa página, mantenha **Allow new users to sign up** habilitado.
5. Configure **Confirm email** conforme seu objetivo:
   - **Ativado:** cadastro mostra “Cadastro realizado. Verifique seu e-mail para confirmar sua conta.” O login depende da confirmação.
   - **Desativado:** o Supabase pode devolver uma sessão no cadastro; a aplicação entra diretamente em `/dashboard`.
6. Se a configuração de senha mínima estiver disponível em Email/Password Security, defina **8 ou mais caracteres** também no servidor. O frontend já exige no mínimo 8 caracteres para criar/redefinir a senha.
7. Clique em **Save** ao alterar configurações.

Atalho oficial para o projeto selecionado: [Auth Providers](https://supabase.com/dashboard/project/_/auth/providers).

## 4. Configurar Site URL e Redirect URLs

Abra **Authentication → URL Configuration**.

### Desenvolvimento

Defina **Site URL** como:

```text
http://localhost:5173
```

Em **Redirect URLs**, clique em **Add URL** e cadastre os dois endereços exatos:

```text
http://localhost:5173/dashboard
http://localhost:5173/redefinir-senha
```

O cadastro envia `emailRedirectTo` para `/dashboard`. A recuperação envia `redirectTo` para `/redefinir-senha`.

Se for testar `npm run preview`, adicione também:

```text
http://localhost:4173/dashboard
http://localhost:4173/redefinir-senha
```

Para testar pelo celular na mesma rede, adicione as URLs com o IP real do computador:

```text
http://<IP-LOCAL-DO-COMPUTADOR>:5173/dashboard
http://<IP-LOCAL-DO-COMPUTADOR>:5173/redefinir-senha
```

Substitua o placeholder. O aplicativo usa a origem onde foi aberto; `localhost`, `127.0.0.1` e um IP da rede são origens diferentes. Uma sessão iniciada em uma delas não é compartilhada automaticamente com as outras. No celular, `localhost` aponta para o celular, não para o computador.

### Produção

Quando houver domínio real, defina **Site URL** para `https://<DOMINIO-DE-PRODUCAO>` e adicione:

```text
https://<DOMINIO-DE-PRODUCAO>/dashboard
https://<DOMINIO-DE-PRODUCAO>/redefinir-senha
```

Não cadastre os placeholders literalmente. Use HTTPS e o endereço exato publicado. Configure a hospedagem para devolver `/index.html` nas rotas da SPA, preservando os arquivos estáticos existentes.

Não é possível inferir seu domínio de produção nem modificar essas configurações usando a chave pública do frontend.

## 5. Conferir os e-mails

1. Em **Authentication → Email Templates** (ou **Emails → Templates**), abra **Confirm signup** e **Reset password**.
2. Preserve nos links o template padrão do Supabase com `{{ .ConfirmationURL }}`:

```html
<a href="{{ .ConfirmationURL }}">Continuar no EditalTrack</a>
```

Essa URL passa pela verificação do Supabase e depois utiliza o redirect informado pelo aplicativo. Não substitua por um link direto ao frontend sem verificação, nem por um callback server-side de outro tutorial.

O projeto é uma SPA e utiliza o fluxo **implicit** oficial do Supabase JS. O SDK processa o fragmento de autenticação recebido no e-mail e remove seus tokens da URL. Não é necessário criar Edge Function, callback OAuth ou trocar código manualmente nesta fase.

### Entrega de e-mails / SMTP

O envio padrão do Supabase é destinado a testes, tem limite reduzido e entrega apenas para endereços autorizados da equipe do projeto. No momento da consulta à documentação, o limite padrão informado era 2 e-mails por hora; confira os valores atuais do seu painel.

Para testar com outros endereços ou publicar:

1. Contrate/configure um provedor de e-mail que ofereça SMTP.
2. Abra **Authentication → SMTP Settings** (ou **Emails → SMTP Settings**).
3. Habilite **Enable Custom SMTP**.
4. Preencha remetente, nome, host, porta, usuário e senha fornecidos pelo provedor, e clique em **Save**.
5. Se o provedor exigir verificação de domínio/DNS, conclua-a no painel dele.
6. Confira **Authentication → Rate Limits**.

Os dados SMTP ficam somente no painel Supabase; não devem ser adicionados ao código ou a variáveis `VITE_*`.

Atalho oficial: [SMTP Settings](https://supabase.com/dashboard/project/_/auth/smtp).

## 6. Executar

```powershell
cd "C:\Users\Notebook Gamer\OneDrive\Documentos\Projeto X\Org. Editais"
npm install
npm run dev
```

Abra `http://localhost:5173/login`. Reinicie o processo sempre que alterar `.env.local`.

## Testar os fluxos reais

Use um e-mail seu ao qual tenha acesso. Nenhuma conta de teste é criada automaticamente.

### Cadastro e confirmação

1. Abra `/cadastro` em uma janela anônima.
2. Envie vazio: devem aparecer mensagens de validação.
3. Teste nome vazio, e-mail inválido, senha com menos de 8 caracteres e confirmação diferente.
4. Preencha valores válidos e clique em **Criar conta**. O botão deve ficar desabilitado durante a requisição.
5. Com confirmação ativada, confira a mensagem e abra o e-mail recebido. Clique no link: deve chegar a `/dashboard` autenticado.
6. No painel, abra **Authentication → Users**, localize o usuário e confira o nome em `user_metadata.name`.
7. Para testar o cadastro sem confirmação, use um projeto de desenvolvimento com **Confirm email** desativado e outro e-mail seu. Deve abrir a dashboard diretamente.

O Supabase pode ocultar deliberadamente contas existentes. A interface traduz erros explícitos de duplicidade e também trata a resposta com `identities` vazio, quando o serviço a utiliza. Não promete distinguir todos os casos em que o serviço oculta essa informação.

### Login e persistência

1. Abra **Configurações → Sua conta → Sair da conta**.
2. Em `/login`, tente uma senha incorreta: deve aparecer “E-mail ou senha incorretos.”
3. Entre com os dados válidos: deve abrir `/dashboard`.
4. Atualize a página: a sessão deve continuar ativa.
5. Abra `/login` e `/cadastro` enquanto conectado: devem redirecionar para `/dashboard`.
6. Abra outra aba autenticada e saia pela primeira: ambas devem voltar ao login.

### Rotas protegidas

1. Sem login, abra diretamente `/dashboard`, `/editais`, `/editais/novo`, `/calendario` e `/configuracoes`.
2. Todas devem redirecionar para `/login` sem exibir o conteúdo privado.

### Recuperação e redefinição

1. Saia da conta e clique em **Esqueci minha senha**.
2. Informe o e-mail cadastrado e clique em **Enviar link de recuperação**.
3. Confira o feedback. Por privacidade, o Supabase retorna sucesso mesmo quando não existe uma conta; nesse caso não envia e-mail.
4. Abra o e-mail real e clique no link mais recente. Deve abrir `/redefinir-senha` com os dois campos de nova senha.
5. Atualize essa página: a sessão de recuperação deve ser mantida.
6. Teste confirmações diferentes e depois salve uma nova senha válida.
7. Confira a mensagem de sucesso, vá ao início e saia em Configurações.
8. Tente entrar com a senha antiga (deve falhar) e com a nova (deve funcionar).
9. Em uma janela sem sessão, abra diretamente `/redefinir-senha`: deve orientar a solicitar o link, sem oferecer um salvamento não autorizado.
10. Um link expirado/usado deve exibir mensagem amigável e permitir solicitar outro.

### Código de recuperação no terminal (desenvolvimento local)

Se o SMTP ainda não estiver configurado, há um utilitário somente local que usa a Admin API do Supabase para gerar um OTP de recuperação sem enviar e-mail. Esse código permite redefinir **a senha real da conta informada**; use somente na sua conta e somente durante desenvolvimento. A opção não substitui SMTP para produção.

1. Crie `.env.recovery.local` na raiz (o Git ignora arquivos `*.local`) com a Project URL e a chave `service_role` do mesmo projeto Supabase:

   ```dotenv
   SUPABASE_URL=https://<PROJECT_REF>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<CHAVE_SERVICE_ROLE_DO_SUPABASE>
   SUPABASE_RECOVERY_CODE_DEV_ONLY=1
   ```

2. Mantenha a chave apenas nesse arquivo local. Nunca use `VITE_`, não faça commit e não a compartilhe em chats, prints ou logs.
3. No terminal, gere o código para o e-mail já cadastrado:

   ```powershell
   npm run auth:recovery-code -- seu-email@exemplo.com
   ```

4. Abra `http://localhost:5173/redefinir-senha`, informe o mesmo e-mail e o OTP que o script imprimiu. Depois defina e confirme a nova senha.

O script imprime apenas o OTP, nunca a chave service role, a resposta completa da API ou o link de ação. O OTP é de uso único e segue o prazo configurado em **Authentication → Settings → OTP Expiry**. Apague `.env.recovery.local` quando terminar. Se a chave service role já foi exposta, faça rotação no painel Supabase.

## Problemas comuns

- **“Configure o acesso ao Supabase”:** variável vazia, URL inválida ou URL contendo `/rest/v1/`; confira o arquivo local e reinicie o Vite.
- **Não chega e-mail:** confira spam, SMTP, endereço autorizado e limites no painel.
- **Link abre `localhost:3000` ou domínio diferente:** confira Site URL, Redirect URLs e template de e-mail.
- **Link expirado:** solicite outro e use o mais recente. Os links de recuperação são de uso único.
- **Senha rejeitada apesar de 8 caracteres:** o projeto pode exigir regras adicionais ou rejeitar senhas comprometidas; confira Password Security. A política do servidor prevalece.
- **404 após clicar no e-mail em produção:** configure o fallback SPA para `/index.html`.

## Referências oficiais consultadas

- [Password-based Auth](https://supabase.com/docs/guides/auth/passwords)
- [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Auth state changes](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
