# Upi — Assistente acadêmico da UniPinhal

Chatbot web embutível para professores e coordenadores. O Upi responde com base nos guias cadastrados, aceita imagens coladas ou anexadas para análise de telas e pode ser incorporado em outro sistema por meio de `widget.js`.

> **Importante:** este repositório foi criado originalmente no WebDev da Manus. O código ainda contém adaptadores Manus para autenticação, IA e storage. Este README descreve a instalação completa e também o trabalho obrigatório para operar de forma realmente independente.

## Índice

- [Arquitetura](#arquitetura)
- [Requisitos](#requisitos)
- [Obter o código](#obter-o-código)
- [Instalação local](#instalação-local)
- [Banco de dados](#banco-de-dados)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Executar em desenvolvimento](#executar-em-desenvolvimento)
- [Testar e gerar build](#testar-e-gerar-build)
- [Executar em produção](#executar-em-produção)
- [Independência da Manus](#independência-da-manus)
- [Autenticação](#autenticação)
- [IA e análise de screenshots](#ia-e-análise-de-screenshots)
- [Storage e assets](#storage-e-assets)
- [Migração do banco e dos guias](#migração-do-banco-e-dos-guias)
- [Widget embutível](#widget-embutível)
- [Segurança](#segurança)
- [Solução de problemas](#solução-de-problemas)
- [Checklist de produção](#checklist-de-produção)

## Arquitetura

| Camada | Tecnologia | Local principal |
|---|---|---|
| Interface | React 19, Vite, Tailwind CSS 4 | `client/` |
| API | Express 4 + tRPC 11 | `server/` |
| Persistência | MySQL/MariaDB/TiDB + Drizzle ORM | `drizzle/`, `server/db.ts` |
| Autenticação atual | Manus OAuth + JWT de sessão | `server/_core/oauth.ts`, `server/_core/sdk.ts` |
| IA atual | Endpoint Forge da Manus, compatível com OpenAI | `server/_core/llm.ts` |
| Arquivos atuais | Forge/S3 da Manus | `server/storage.ts`, `server/_core/storageProxy.ts` |
| Embedding | Shadow DOM + iframe | `client/public/widget.js` |

### Funcionalidades implementadas

- Chat em português do Brasil baseado nos guias ativos.
- Regra de não inventar procedimentos fora da base de guias.
- Análise multimodal de screenshots, priorizando texto, formato e ícones, sem usar cores como critério.
- Upload de imagens e colagem via `Ctrl + V`.
- Administração de guias: criar, editar, publicar e arquivar.
- Widget com botão flutuante, iframe isolado, posicionamento responsivo e comunicação de fechamento via `postMessage`.
- Login temporário de testes para a administração, protegido pelo segredo `TEST_ADMIN_PASSWORD`. **Remover antes de produção.**

## Requisitos

- Node.js 22 ou superior;
- pnpm 10 ou superior;
- MySQL 8+, MariaDB compatível ou TiDB;
- HTTPS em produção;
- um provedor de IA com suporte a visão para screenshots;
- um provedor de identidade para autenticação administrativa;
- um bucket S3 compatível para assets e uploads.

O projeto usa `pnpm-lock.yaml`; utilize pnpm para manter as versões reproduzíveis.

## Obter o código

```bash
git clone URL_DO_REPOSITORIO assistente-academico
cd assistente-academico
```

Se o projeto foi recebido como arquivo ZIP, extraia-o e entre na pasta raiz. Não copie `node_modules`, `dist`, logs ou arquivos `.env` de outra instalação.

## Instalação local

```bash
corepack enable
corepack prepare pnpm@10.4.1 --activate
pnpm install --frozen-lockfile
```

Se a versão de pnpm disponível for compatível, `pnpm install --frozen-lockfile` é suficiente.

## Banco de dados

O schema possui duas tabelas principais:

- `users`: usuários, email, papel (`user` ou `admin`) e datas de sessão;
- `guides`: título, categoria, resumo, conteúdo e status (`active` ou `archived`).

### Criar o banco

Crie um banco vazio no MySQL/MariaDB e conceda a ele um usuário exclusivo da aplicação:

```sql
CREATE DATABASE unipinhal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'upi_app'@'%' IDENTIFIED BY 'TROQUE_ESTA_SENHA';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX ON unipinhal.* TO 'upi_app'@'%';
FLUSH PRIVILEGES;
```

Em produção, restrinja o host do usuário em vez de usar `%` quando possível.

### Aplicar as migrações

Defina `DATABASE_URL` e execute:

```bash
pnpm drizzle-kit migrate
```

As migrações existentes estão em `drizzle/0000_clever_vanisher.sql` e `drizzle/0001_orange_wildside.sql`.

Para gerar uma nova migração após alterar `drizzle/schema.ts`:

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

Nunca altere o banco de produção manualmente sem registrar a mudança no schema e em uma migração.

### Inserir os guias iniciais

Os scripts em `scripts/` usam `DATABASE_URL` e são idempotentes quando encontram o mesmo título. Execute apenas os scripts que correspondem ao conteúdo desejado:

```bash
node scripts/seed-plano-ensino.mjs
```

Confira a base diretamente no banco antes de colocar o chat em produção:

```sql
SELECT id, title, category, status, CHAR_LENGTH(content) AS content_length
FROM guides
ORDER BY id;
```

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto. **Nunca versione esse arquivo e nunca coloque segredos em variáveis `VITE_*`.**

### Instalação independente — nomes planejados

Estes são os nomes recomendados para os adaptadores independentes:

```dotenv
NODE_ENV=development
PORT=3000
DATABASE_URL=mysql://upi_app:senha@127.0.0.1:3306/unipinhal
JWT_SECRET=gere-uma-chave-aleatoria-longa-e-exclusiva

# IA: chave somente no backend
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=chave-do-provedor
LLM_TEXT_MODEL=modelo-de-texto
LLM_VISION_MODEL=modelo-com-visao

# Storage S3/R2/MinIO
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=us-east-1
S3_BUCKET=unipinhal-upi
S3_ACCESS_KEY_ID=chave
S3_SECRET_ACCESS_KEY=segredo
S3_PUBLIC_BASE_URL=https://cdn.exemplo.edu.br

# Autenticação independente
AUTH_ISSUER=https://auth.exemplo.edu.br
AUTH_CLIENT_ID=upi-web
AUTH_CLIENT_SECRET=segredo
AUTH_CALLBACK_URL=https://chat.exemplo.edu.br/api/auth/callback

PUBLIC_APP_URL=http://localhost:3000
```

### Variáveis usadas pelo código atual na Manus

Até que os adaptadores sejam substituídos, o código atual espera também:

```dotenv
DATABASE_URL=...
JWT_SECRET=...
VITE_APP_ID=...
OAUTH_SERVER_URL=...
BUILT_IN_FORGE_API_URL=...
BUILT_IN_FORGE_API_KEY=...
```

Para manter o login temporário em staging, configure `TEST_ADMIN_PASSWORD` no ambiente do servidor. O valor não deve aparecer no código, frontend, Git ou logs. O login temporário deve ser removido antes do primeiro deploy público.

## Executar em desenvolvimento

Com `.env` configurado:

```bash
pnpm dev
```

O servidor inicia na porta definida em `PORT`, normalmente `3000`, e o Vite fornece atualização automática durante o desenvolvimento.

Para acessar de outro dispositivo na mesma rede, use um proxy de desenvolvimento ou altere o bind do servidor para `0.0.0.0`. Não exponha uma instalação de desenvolvimento com segredos reais.

## Testar e gerar build

Execute o ciclo completo antes de qualquer deploy:

```bash
pnpm check
pnpm test
pnpm build
```

Os testes atuais cobrem:

- logout e cookies;
- listagem e administração de guias;
- análise de visão;
- colagem de imagens;
- Widget;
- login temporário de administrador.

O build gera os arquivos do frontend e o servidor empacotado em `dist/`. O aviso de chunks grandes do Vite não impede o build; avalie code splitting caso o desempenho do frontend se torne um problema.

## Executar em produção

Depois de compilar:

```bash
NODE_ENV=production PORT=3000 pnpm start
```

O processo deve ficar atrás de um proxy reverso com HTTPS. Exemplos de opções:

- Caddy;
- Nginx;
- Traefik;
- um serviço gerenciado que suporte Node.js.

O proxy deve encaminhar para `127.0.0.1:3000`, preservar `X-Forwarded-Proto` e permitir o tamanho necessário para uploads de screenshots. Configure reinício automático com systemd, Docker, PM2 ou o supervisor da hospedagem escolhida.

## Independência da Manus

A instalação compila atualmente, mas não é independente enquanto os itens abaixo não forem trocados:

### 1. Autenticação

Substitua:

- `server/_core/sdk.ts`;
- `server/_core/oauth.ts`;
- a chamada de autenticação em `server/_core/context.ts`.

Opções adequadas:

- Keycloak ou Zitadel para hospedagem própria;
- Microsoft Entra ID ou Google Workspace para diretório institucional;
- Auth0, Clerk ou WorkOS para serviço gerenciado.

Preserve os contratos de `ctx.user`, o papel `admin` e a proteção `adminProcedure`. Em qualquer OAuth, use HTTPS, callback registrado e proteção CSRF com `state` e nonce. Nunca aceite uma URL de redirecionamento arbitrária enviada pelo usuário.

### 2. IA

Substitua o cliente de `server/_core/llm.ts` por um adaptador direto para o provedor escolhido. O contrato precisa continuar aceitando:

- mensagens de sistema, usuário e assistente;
- conteúdo multimodal com `image_url`;
- um modelo de texto e outro de visão;
- limite de tokens;
- timeout e tratamento de rate limit;
- detecção de `finish_reason = length` e continuação controlada.

A chave da IA deve ser lida somente pelo backend. Nunca a exponha em `VITE_*` ou no código React.

Provedores possíveis: OpenAI, Google Gemini direto, Azure OpenAI ou endpoint OpenAI-compatible hospedado pela instituição. Confirme se o modelo escolhido aceita imagens no formato enviado pelo chat.

### 3. Storage

Substitua `server/storage.ts` e `server/_core/storageProxy.ts` por AWS S3, Cloudflare R2, MinIO ou outro serviço S3-compatible.

O fluxo recomendado é:

1. o navegador envia a imagem para o backend;
2. o backend valida MIME type, tamanho e autorização;
3. o backend grava o objeto no bucket;
4. o banco guarda somente a chave e metadados;
5. o frontend recebe uma URL pública controlada ou assinada.

As URLs atuais `/manus-storage/...` não funcionam fora da Manus. O asset do Upi precisa ser copiado para o novo bucket e as referências em `Home.tsx` e `widget.js` precisam ser atualizadas.

### 4. Runtime

Depois das substituições, remova ou revise:

- `vite-plugin-manus-runtime` em `vite.config.ts`;
- `client/public/__manus__/debug-collector.js`;
- `.manus/` e `template.json` se não forem usados pelo novo deploy;
- módulos de Forge, mapas, notificações e geração de imagem que não sejam necessários;
- todas as chamadas que usam `BUILT_IN_FORGE_API_URL` ou `BUILT_IN_FORGE_API_KEY`.

## Autenticação administrativa atual

Durante os testes, a frase exata digitada no chat principal revela o formulário de login temporário. O usuário `Admin` é validado com `TEST_ADMIN_PASSWORD` e recebe um cookie JWT de curta duração.

Esse mecanismo é apenas temporário porque:

- a frase secreta pode ser descoberta;
- há uma única identidade compartilhada;
- não há recuperação, MFA ou auditoria adequada;
- não deve ser usado para proteger dados reais em produção.

Antes do deploy público:

1. remova o gatilho secreto do frontend;
2. remova a procedure `testAdminLogin`;
3. remova `TEST_ADMIN_PASSWORD`;
4. migre usuários para o provedor institucional;
5. mantenha apenas autorização por papel no backend.

## Widget embutível

Depois que o projeto estiver hospedado em `https://chat.exemplo.edu.br`, incorpore-o no sistema acadêmico:

```html
<script
  src="https://chat.exemplo.edu.br/widget.js"
  data-title="Abrir Upi">
</script>
```

O script cria um Shadow DOM para isolar o botão e carrega o chat em iframe. Ele deriva o domínio a partir do próprio `src`, por isso a URL do script deve apontar para a instalação correta.

Valide no sistema acadêmico:

- abertura e fechamento do painel;
- telas pequenas e zoom do navegador;
- `frame-src` e `img-src` da Content Security Policy;
- carregamento do asset do robô;
- `postMessage` de fechamento;
- bloqueios de cookies e políticas de iframe;
- ausência de conflito com z-index e estilos globais.

O Widget não deve carregar a área administrativa nem revelar o gatilho secreto.

## Migração do banco e dos guias

### Exportar

Obtenha uma credencial de leitura/exportação do banco de origem e execute:

```bash
mysqldump --single-transaction --routines --triggers \
  -h HOST_ORIGEM -u USUARIO -p BANCO users guides > backup-upi.sql
```

Não exporte ou reutilize sessões JWT. Não inclua arquivos `.env` no backup do código.

### Restaurar

```bash
mysql -h HOST_DESTINO -u USUARIO -p BANCO_NOVO < backup-upi.sql
```

Depois confira:

```sql
SELECT COUNT(*) FROM guides;
SELECT status, COUNT(*) FROM guides GROUP BY status;
SELECT id, title, category FROM guides ORDER BY id;
```

Faça a cópia dos assets para o novo bucket separadamente. Um dump MySQL não contém os objetos armazenados no S3.

## Segurança

- Use HTTPS em todas as instalações acessíveis externamente.
- Gere `JWT_SECRET` novo no servidor independente.
- Use segredos diferentes em desenvolvimento, staging e produção.
- Nunca coloque chaves em React, `VITE_*`, Git, screenshots ou logs.
- Restrinja o usuário MySQL ao mínimo necessário.
- Limite o tamanho e os tipos de imagens aceitos.
- Prefira URLs assinadas para screenshots potencialmente sensíveis.
- Configure backup do banco e do bucket, com teste periódico de restauração.
- Habilite rate limiting no login, no chat e nos uploads.
- Remova o login `Admin` temporário e o gatilho secreto antes do lançamento.
- Revogue as chaves da Manus somente depois de validar o ambiente independente.
- Não use dados reais em staging sem autorização e controles equivalentes aos de produção.

## Solução de problemas

### `DATABASE_URL is required`

O comando Drizzle não encontrou `DATABASE_URL`. Confirme que o `.env` está na raiz e que o processo está sendo iniciado a partir da raiz do projeto.

### `Storage config missing` ou `/manus-storage` retorna erro

O código ainda usa o storage da Manus. Configure as variáveis Forge temporariamente ou conclua a substituição por S3/R2/MinIO descrita acima.

### `OAUTH_SERVER_URL is not configured`

A autenticação Manus ainda está ativa. Configure as variáveis Manus para staging ou implemente o adaptador de autenticação independente.

### A IA não responde

Verifique o endpoint, a chave, o nome dos modelos e se o modelo de visão aceita imagens. Teste a chamada somente no backend e confirme os logs sem imprimir a chave.

### O Widget aparece, mas o iframe fica vazio

Confirme que `/widget` e `/widget.js` estão no mesmo domínio público, que o proxy encaminha as rotas e que a CSP do sistema acadêmico permite `frame-src` para o domínio do chatbot.

### O login funciona localmente, mas não em produção

Verifique HTTPS, cookies `Secure`/`SameSite`, domínio do callback OAuth e o proxy reverso. Não use URLs de callback hardcoded de outra instalação.

## Checklist de produção

- [ ] Provedor de IA com visão escolhido e adaptador implementado.
- [ ] Provedor de autenticação escolhido e callback HTTPS configurado.
- [ ] `server/_core/sdk.ts` e `server/_core/oauth.ts` não dependem da Manus.
- [ ] Storage S3/R2/MinIO implementado e asset do Upi migrado.
- [ ] Nenhuma chamada de produção usa `BUILT_IN_FORGE_API_*`.
- [ ] Nenhum asset de produção depende de `/manus-storage/`.
- [ ] Banco novo criado, migrações aplicadas e guias conferidos.
- [ ] Backups do banco e do bucket testados.
- [ ] `pnpm check`, `pnpm test` e `pnpm build` passam.
- [ ] Chat com texto e screenshot testado em staging.
- [ ] Colagem `Ctrl + V` testada.
- [ ] Administração e permissões testadas.
- [ ] Widget testado em um domínio externo.
- [ ] Login temporário e frase secreta removidos.
- [ ] Chaves da Manus revogadas somente após o corte confirmado.

## Documentos relacionados

- `EXPORTACAO-INDEPENDENTE.md`: inventário resumido das dependências e ordem de migração.
- `VARIAVEIS-INDEPENDENTES.md`: referência de variáveis do ambiente independente.
- `drizzle/schema.ts`: schema atual do banco.
- `drizzle/*.sql`: migrações existentes.
- `client/public/widget.js`: script de integração do Widget.
