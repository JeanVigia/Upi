# Variáveis do ambiente independente

O modelo pronto está em [`deploy/upi.env.example`](deploy/upi.env.example).

Em desenvolvimento, copie-o para `.env` na raiz do projeto. Em produção com Apache/systemd, copie-o para `/etc/upi/upi.env` e ajuste os valores:

```bash
cp deploy/upi.env.example .env
```

**Nunca versione o arquivo preenchido e nunca coloque chaves em variáveis `VITE_*`.**

## Variáveis obrigatórias

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
DATABASE_URL=mysql://upi_app:SENHA@127.0.0.1:3306/unipinhal
JWT_SECRET=chave-longa-gerada-com-openssl
LOCAL_ADMIN_USERNAME=Admin
LOCAL_ADMIN_PASSWORD=senha-forte
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
LLM_API_KEY=chave-do-google-ai-studio
LLM_TEXT_MODEL=gemini-3.8-flash
LLM_VISION_MODEL=gemini-3.8-flash
LLM_TEXT_FALLBACK_MODELS=gemini-3.5-flash-lite,gemini-3.6-flash,gemini-3.1-flash-lite,gemini-3-flash-preview,gemini-2.5-flash-lite,gemini-2.5-flash
LLM_VISION_FALLBACK_MODELS=gemini-3.5-flash-lite,gemini-3.6-flash,gemini-3.1-flash-lite,gemini-3-flash-preview,gemini-2.5-flash-lite,gemini-2.5-flash
CHAT_RATE_LIMIT_WINDOW_MS=60000
CHAT_RATE_LIMIT_MAX_REQUESTS=10
CHAT_MAX_CONCURRENT_PER_IP=1
CHAT_MAX_CONCURRENT_GLOBAL=4
STORAGE_DIR=/var/lib/upi/storage
PUBLIC_APP_URL=https://chat.seu-dominio.edu.br
```

Gere o segredo de sessão com:

```bash
openssl rand -base64 48
```

A chave da IA deve ser criada no [Google AI Studio](https://aistudio.google.com/) e permanecer somente no backend. O Upi usa o endpoint OpenAI-compatible do Gemini; a URL não deve incluir `/chat/completions`, pois o adaptador acrescenta esse caminho.

`LLM_TEXT_FALLBACK_MODELS` e `LLM_VISION_FALLBACK_MODELS` são opcionais. Informe os modelos separados por vírgula, na ordem em que devem ser testados. Se ficarem vazias, o Upi usará somente o modelo principal correspondente (`LLM_TEXT_MODEL` ou `LLM_VISION_MODEL`).

## Regras de segurança

- `DATABASE_URL`, `JWT_SECRET`, `LOCAL_ADMIN_PASSWORD` e `LLM_API_KEY` ficam somente no servidor.
- `JWT_SECRET` deve ser novo na instalação independente; não reutilize uma chave da Manus.
- Em produção, use `STORAGE_DIR` absoluto e persistente, como `/var/lib/upi/storage`.
- O usuário MySQL deve ter permissões somente no banco do Upi.
- Use HTTPS no domínio público.
- Remova o login secreto e migre para OIDC institucional antes do lançamento para toda a instituição.
- Não envie screenshots reais com dados pessoais durante os testes gratuitos sem revisar a política de privacidade do provedor.

O login administrativo aplica bloqueio progressivo no backend por IP e usuário. O primeiro erro não bloqueia; falhas consecutivas aumentam a espera até 15 minutos. Um login válido limpa o histórico.

O endpoint público do chat aplica rate limit no backend: por padrão, 10 chamadas por IP a cada 60 segundos, uma chamada simultânea por IP e quatro chamadas simultâneas no processo. Chamadas bloqueadas recebem HTTP 429 e não consomem a API da IA.

Screenshots são validados no backend como `data URL` Base64 de PNG, JPEG ou WebP, com assinatura binária compatível e limite de 6 MB após decodificação.
