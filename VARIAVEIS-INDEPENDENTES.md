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
LLM_REQUEST_DELAY_MS=15000
STORAGE_DIR=/var/lib/upi/storage
PUBLIC_APP_URL=https://chat.seu-dominio.edu.br
```

Gere o segredo de sessão com:

```bash
openssl rand -base64 48
```

A chave da IA deve ser criada no [Google AI Studio](https://aistudio.google.com/) e permanecer somente no backend. O Upi usa o endpoint OpenAI-compatible do Gemini; a URL não deve incluir `/chat/completions`, pois o adaptador acrescenta esse caminho.

`LLM_REQUEST_DELAY_MS` controla o intervalo entre o início de cada requisição à IA. O padrão é `15000` milissegundos, equivalente a quatro requisições por minuto; valores menores que `12000` são automaticamente elevados para o mínimo seguro de 12 segundos. O intervalo vale também para as tentativas de fallback.

`LLM_TEXT_FALLBACK_MODELS` e `LLM_VISION_FALLBACK_MODELS` são opcionais. Informe os modelos separados por vírgula, na ordem em que devem ser testados. Se ficarem vazias, o Upi usará somente o modelo principal correspondente (`LLM_TEXT_MODEL` ou `LLM_VISION_MODEL`).

## Regras de segurança

- `DATABASE_URL`, `JWT_SECRET`, `LOCAL_ADMIN_PASSWORD` e `LLM_API_KEY` ficam somente no servidor.
- `JWT_SECRET` deve ser novo na instalação independente; não reutilize uma chave da Manus.
- Em produção, use `STORAGE_DIR` absoluto e persistente, como `/var/lib/upi/storage`.
- O usuário MySQL deve ter permissões somente no banco do Upi.
- Use HTTPS no domínio público.
- Remova o login secreto e migre para OIDC institucional antes do lançamento para toda a instituição.
- Não envie screenshots reais com dados pessoais durante os testes gratuitos sem revisar a política de privacidade do provedor.
