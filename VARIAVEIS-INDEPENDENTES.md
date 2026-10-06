# Variáveis do ambiente independente

Use este documento para criar o arquivo `.env` no servidor novo. **Não versionar o `.env` e não colocar chaves no frontend.**

```dotenv
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://usuario:senha@host:3306/unipinhal
JWT_SECRET=chave-aleatoria-longa-e-exclusiva

# IA — nomes sugeridos para o adaptador independente
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=segredo-do-backend
LLM_TEXT_MODEL=modelo-de-texto
LLM_VISION_MODEL=modelo-com-visao

# S3/R2/MinIO — nomes sugeridos para o storage independente
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=us-east-1
S3_BUCKET=unipinhal-upi
S3_ACCESS_KEY_ID=segredo
S3_SECRET_ACCESS_KEY=segredo
S3_PUBLIC_BASE_URL=https://cdn.exemplo.edu.br

# Identidade — preencher após escolher Keycloak, Entra, Google, Auth0 etc.
AUTH_ISSUER=https://auth.exemplo.edu.br
AUTH_CLIENT_ID=upi-web
AUTH_CLIENT_SECRET=segredo
AUTH_CALLBACK_URL=https://chat.exemplo.edu.br/api/auth/callback

PUBLIC_APP_URL=https://chat.exemplo.edu.br
```

## Regras

- `DATABASE_URL`, `JWT_SECRET`, `LLM_API_KEY` e chaves S3 ficam somente no servidor.
- Variáveis prefixadas com `VITE_` são incorporadas ao JavaScript público; nunca use esse prefixo para segredos.
- `JWT_SECRET` deve ser novo na migração. Não reutilize a chave da Manus.
- O domínio usado em `AUTH_CALLBACK_URL` precisa estar cadastrado no provedor de identidade.
- O bucket deve permitir acesso somente conforme a política escolhida; prefira URLs assinadas para prints de usuários.
- Configure rotação de chaves, backup do banco e backup do bucket antes do corte de produção.

## Compatibilidade temporária

Enquanto os adaptadores ainda não forem implementados, o código atual continua esperando:

```dotenv
DATABASE_URL=...
JWT_SECRET=...
VITE_APP_ID=...
OAUTH_SERVER_URL=...
BUILT_IN_FORGE_API_URL=...
BUILT_IN_FORGE_API_KEY=...
```

Essas variáveis mantêm o projeto ligado à Manus e devem ser removidas somente depois da substituição de `server/_core/sdk.ts`, `server/_core/oauth.ts`, `server/_core/llm.ts`, `server/storage.ts` e `server/_core/storageProxy.ts`.
