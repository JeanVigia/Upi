# Exportação independente do Upi / UniPinhal

## Estado atual

O projeto funciona na Manus, mas ainda não é independente. O código depende de quatro serviços da plataforma:

1. **Autenticação:** Manus OAuth e o SDK em `server/_core/sdk.ts`.
2. **IA:** endpoint Forge usado por `server/_core/llm.ts`, atualmente com os modelos Gemini configurados no projeto.
3. **Armazenamento:** Forge/S3 da Manus através de `server/storage.ts` e da rota `/manus-storage/*`.
4. **Configuração de execução:** variáveis `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`, `OAUTH_SERVER_URL`, `VITE_APP_ID` e demais variáveis injetadas pela Manus.

O banco é MySQL compatível e pode ser migrado. O frontend React/Vite, o backend Express/tRPC, as tabelas Drizzle e o `widget.js` são portáveis.

## O que já pode ser exportado

- Código-fonte em React 19, Vite, Express 4, tRPC 11 e Drizzle ORM.
- Migrações em `drizzle/0000_clever_vanisher.sql` e `drizzle/0001_orange_wildside.sql`.
- Guias armazenados na tabela `guides`.
- Usuários e papéis armazenados na tabela `users`.
- Testes em `server/*.test.ts`.
- Widget isolado por Shadow DOM + iframe em `client/public/widget.js`.
- Assets do Upi publicados em `/manus-storage/`; eles precisam ser copiados para o novo storage.

## Dependências que precisam ser substituídas

### 1. IA

Substituir a implementação de `server/_core/llm.ts` por um adaptador baseado em uma API compatível com OpenAI ou por um SDK direto do provedor escolhido.

O adaptador precisa manter estas capacidades:

- conversa com mensagens `system`, `user` e `assistant`;
- envio de imagem em `image_url` para análise multimodal;
- seleção de um modelo de texto e um modelo de visão;
- limite de tokens e detecção de resposta truncada;
- tratamento de timeout, rate limit e indisponibilidade;
- chave mantida somente no backend.

**Opções práticas:** OpenAI, Google Gemini direto, Azure OpenAI ou um endpoint compatível hospedado pela instituição.

### 2. Autenticação

Substituir `server/_core/oauth.ts`, `server/_core/sdk.ts` e o uso de `OAUTH_SERVER_URL` por um provedor independente.

Opções recomendadas:

- **Keycloak ou Zitadel:** melhor para controle institucional e hospedagem própria;
- **Auth0, Clerk ou WorkOS:** menor esforço operacional, porém serviço externo pago;
- **Microsoft Entra ID / Google Workspace:** adequado se a UniPinhal já possui diretório institucional.

O login temporário `Admin / 123` não deve ser levado para produção. Ele deve ser removido antes da publicação independente.

### 3. Armazenamento de arquivos

Substituir `server/storage.ts` e `server/_core/storageProxy.ts` por S3, Cloudflare R2, MinIO ou outro storage compatível.

A aplicação deve:

- enviar o arquivo ao backend;
- salvar apenas a chave e o MIME type no banco;
- devolver uma URL pública/CDN ou uma URL assinada;
- preservar o asset do Upi e eventuais prints enviados pelo usuário;
- limitar tamanho e tipos de arquivo.

As referências atuais `/manus-storage/...` não funcionarão fora da Manus sem essa substituição.

### 4. Runtime e ferramentas Manus

Na exportação, revisar ou remover:

- `vite-plugin-manus-runtime` do `vite.config.ts`;
- `client/public/__manus__/debug-collector.js`;
- `template.json` e `.manus/`, caso não sejam necessários ao novo ambiente;
- imports e rotas do SDK Manus que não forem substituídos;
- `ManusDialog` e componentes auxiliares não usados pela aplicação final.

## Banco de dados

O schema atual contém:

- `users`: identidade, email, papel (`user` ou `admin`) e datas de sessão;
- `guides`: título, categoria, resumo, conteúdo e status (`active` ou `archived`).

No novo MySQL/MariaDB:

```bash
pnpm install --frozen-lockfile
export DATABASE_URL='mysql://usuario:senha@host:3306/unipinhal'
pnpm drizzle-kit migrate
```

Para transportar os dados da instalação atual, gerar um dump somente depois de obter acesso ao banco de origem:

```bash
mysqldump --single-transaction --routines --triggers \
  -h HOST -u USUARIO -p BANCO users guides > backup-upi.sql
```

Restaurar no banco novo:

```bash
mysql -h HOST_NOVO -u USUARIO -p BANCO_NOVO < backup-upi.sql
```

Não copiar sessões JWT. Após a migração, gerar um `JWT_SECRET` novo e obrigar novo login.

## Deploy recomendado

A arquitetura mínima é:

- Node.js 22+;
- processo web executando `pnpm start`;
- MySQL/MariaDB gerenciado;
- bucket S3/R2/MinIO;
- provedor de IA com visão;
- provedor de identidade;
- HTTPS com domínio próprio;
- proxy reverso (Nginx, Caddy, Traefik ou serviço equivalente).

Comandos atuais do projeto:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
NODE_ENV=production PORT=3000 pnpm start
```

Antes do primeiro deploy, trocar `server/_core/llm.ts`, autenticação e storage. O comando de produção atual ainda inicializa as integrações Manus.

## Widget após a migração

O código de integração continuará sendo:

```html
<script src="https://chat.exemplo.edu.br/widget.js" data-title="Abrir Upi"></script>
```

O `widget.js` deriva o domínio a partir da URL do próprio script. Portanto, após hospedar o chatbot em outro domínio, o iframe e o ícone deverão apontar automaticamente para a nova instalação, desde que os assets e a rota `/widget` existam.

Verificar também:

- `frame-src` e `img-src` na CSP do sistema acadêmico;
- CORS, se o backend receber chamadas fora do próprio domínio;
- cookies e `SameSite` do provedor de autenticação;
- carregamento em celular e dentro de páginas com CSP rígida.

## Ordem segura de migração

1. Escolher provedor de IA, autenticação, storage e hospedagem.
2. Criar ambiente de staging independente.
3. Implementar adaptadores de IA, storage e autenticação mantendo os contratos tRPC atuais.
4. Criar banco novo e aplicar as migrações Drizzle.
5. Copiar guias e assets; validar quantidade e conteúdo.
6. Executar `pnpm check`, `pnpm test` e `pnpm build`.
7. Testar chat, análise de screenshots, Ctrl+V, administração e Widget em staging.
8. Publicar com HTTPS e configurar o novo domínio no script do sistema acadêmico.
9. Fazer o corte de produção e manter a instalação Manus como fallback temporário.
10. Revogar chaves antigas e remover o login de teste.

## Checklist de aceite

- [ ] Nenhum runtime depende de `OAUTH_SERVER_URL` da Manus.
- [ ] Nenhuma chamada de IA usa `BUILT_IN_FORGE_API_URL`.
- [ ] Nenhum asset de produção depende de `/manus-storage/`.
- [ ] Login institucional e logout foram testados.
- [ ] Papel administrativo foi preservado.
- [ ] Todos os guias ativos foram conferidos.
- [ ] Análise de imagem funciona no novo provedor.
- [ ] Widget abre, fecha e funciona em domínio externo.
- [ ] Backups do banco e do bucket foram configurados.
- [ ] `Admin / 123` foi removido.
- [ ] Segredos não estão no Git, frontend ou logs.
