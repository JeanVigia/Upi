# Implantação do Upi com Apache + MySQL

Este cenário usa:

- **Apache 2.4** como servidor público e proxy reverso;
- **Node.js 22** executando o backend Express e o frontend compilado;
- **MySQL 8+ ou MariaDB compatível** para usuários e guias;
- **systemd** para manter o processo Node ativo;
- **Let's Encrypt/Certbot** para HTTPS.

O Apache não executa diretamente o React nem o TypeScript. Ele encaminha as requisições para o Node.js em `127.0.0.1:3000`.

## 1. Requisitos do servidor

Exemplo para Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y apache2 mysql-server git curl build-essential
```

Instale Node.js 22 pelo método oficial escolhido pela equipe. Confirme:

```bash
node --version
npm --version
corepack enable
corepack prepare pnpm@10.4.1 --activate
pnpm --version
```

Ative os módulos Apache necessários:

```bash
sudo a2enmod proxy proxy_http proxy_wstunnel ssl headers rewrite
sudo systemctl restart apache2
```

## 2. Criar usuário e diretórios da aplicação

Não execute a aplicação como `root`:

```bash
sudo useradd --system --home /var/www/upi --shell /usr/sbin/nologin upi
sudo mkdir -p /var/www/upi /var/lib/upi/storage /etc/upi
sudo chown -R upi:upi /var/www/upi /var/lib/upi
sudo chmod 750 /etc/upi
```

Clone o repositório:

```bash
sudo -u upi git clone https://github.com/JeanVigia/Upi.git /var/www/upi
cd /var/www/upi
sudo -u upi pnpm install --frozen-lockfile
```

## 3. Criar o banco MySQL

Execute o arquivo de exemplo somente depois de trocar a senha:

```bash
sudo mysql < deploy/mysql/01-create-database.sql
```

Aplique o schema e as migrações:

```bash
cd /var/www/upi
sudo -u upi env DATABASE_URL='mysql://upi_app:SENHA@127.0.0.1:3306/unipinhal' pnpm db:push
```

Se o MySQL estiver em outro servidor, troque `127.0.0.1` pelo hostname privado e permita somente o IP do servidor Upi no firewall do banco.

## 4. Configurar variáveis de ambiente

Crie o arquivo protegido `/etc/upi/upi.env`:

```dotenv
NODE_ENV=production
PORT=3000

DATABASE_URL=mysql://upi_app:SENHA_DO_BANCO@127.0.0.1:3306/unipinhal
JWT_SECRET=GERE_UMA_CHAVE_LONGA_E_ALEATORIA

LOCAL_ADMIN_USERNAME=Admin
LOCAL_ADMIN_PASSWORD=TROQUE_POR_UMA_SENHA_FORTE

LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=CHAVE_DA_IA
LLM_TEXT_MODEL=gpt-4o-mini
LLM_VISION_MODEL=gpt-4o

PUBLIC_APP_URL=https://chat.seu-dominio.edu.br
STORAGE_DIR=/var/lib/upi/storage
```

Gere um segredo JWT, por exemplo:

```bash
openssl rand -base64 48
```

Proteja o arquivo:

```bash
sudo chown root:upi /etc/upi/upi.env
sudo chmod 640 /etc/upi/upi.env
```

Nunca coloque esse arquivo no GitHub, em `client/` ou em variáveis `VITE_*`.

## 5. Compilar e testar

```bash
cd /var/www/upi
sudo -u upi pnpm check
sudo -u upi pnpm test
sudo -u upi pnpm build
```

O build deve gerar:

- `dist/index.js`: backend Node;
- `dist/public/`: frontend, `widget.js` e assets públicos.

## 6. Ativar o serviço systemd

Copie o modelo:

```bash
sudo cp deploy/systemd/upi.service.example /etc/systemd/system/upi.service
sudo systemctl daemon-reload
sudo systemctl enable --now upi
```

Verifique:

```bash
sudo systemctl status upi
sudo journalctl -u upi -f
curl -I http://127.0.0.1:3000/
```

O serviço deve escutar somente localmente. O acesso público será feito pelo Apache.

## 7. Configurar o Apache

Copie o VirtualHost:

```bash
sudo cp deploy/apache/upi.conf.example /etc/apache2/sites-available/upi.conf
sudo nano /etc/apache2/sites-available/upi.conf
```

Substitua todas as ocorrências de `chat.seu-dominio.edu.br` pelo domínio real. Antes de ativar HTTPS, a configuração pode ser simplificada para usar temporariamente apenas a porta 80; o ideal é emitir o certificado primeiro.

Ative o site:

```bash
sudo a2ensite upi.conf
sudo apachectl configtest
sudo systemctl reload apache2
```

Para emitir HTTPS com Certbot:

```bash
sudo apt install -y certbot python3-certbot-apache
sudo certbot --apache -d chat.seu-dominio.edu.br
```

Depois confirme novamente:

```bash
sudo apachectl configtest
sudo systemctl reload apache2
```

O Apache deve encaminhar também `/api/trpc`, `/widget`, `/widget.js`, `/storage` e os assets do frontend para o Node.

## 8. Firewall

Libere somente SSH, HTTP e HTTPS:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Apache Full'
sudo ufw enable
```

Não abra a porta 3000 para a internet. O Node deve ficar acessível somente em `127.0.0.1`.

## 9. Testes após o deploy

```bash
curl -I https://chat.seu-dominio.edu.br/
curl -I https://chat.seu-dominio.edu.br/widget.js
curl -I https://chat.seu-dominio.edu.br/assets/upi/up-one-bot-transparent.png
```

No navegador, valide:

1. chat principal;
2. envio de pergunta textual;
3. envio de screenshot;
4. colagem via Ctrl+V;
5. frase secreta e login administrativo;
6. criação e edição de guia;
7. `/widget` e carregamento do `widget.js` em outro domínio.

## 10. Atualizar uma versão

```bash
cd /var/www/upi
sudo -u upi git pull --ff-only origin main
sudo -u upi pnpm install --frozen-lockfile
sudo -u upi pnpm check
sudo -u upi pnpm test
sudo -u upi pnpm build
sudo systemctl restart upi
sudo systemctl reload apache2
```

Se houver nova migração:

```bash
sudo -u upi pnpm db:push
```

Faça backup do banco antes de aplicar migrações em produção.

## 11. Backups

Backup do MySQL:

```bash
sudo mysqldump --single-transaction --routines --triggers \
  unipinhal > /var/backups/upi-$(date +%F).sql
```

Backup do storage local:

```bash
sudo tar -czf /var/backups/upi-storage-$(date +%F).tar.gz /var/lib/upi/storage
```

Mantenha os backups fora do mesmo disco do servidor e teste periodicamente a restauração.

## 12. Problemas comuns

### Apache mostra 502 Bad Gateway

```bash
sudo systemctl status upi
sudo journalctl -u upi -n 100 --no-pager
curl -i http://127.0.0.1:3000/
```

### O chat abre, mas não responde

Verifique `DATABASE_URL`, `LLM_API_KEY` e os logs:

```bash
sudo journalctl -u upi -f
```

### Login funciona localmente, mas não via HTTPS

Confirme que o Apache envia `X-Forwarded-Proto: https` e que o VirtualHost HTTPS está ativo. O cookie da sessão depende dessa informação.

### Upload/storage retorna erro

Confirme que `STORAGE_DIR` existe e pertence ao usuário `upi`:

```bash
sudo install -d -o upi -g upi -m 750 /var/lib/upi/storage
```

### O widget não carrega no sistema acadêmico

Confirme CSP, especialmente `script-src`, `frame-src` e `img-src`, e use o script do domínio do Upi:

```html
<script src="https://chat.seu-dominio.edu.br/widget.js" data-title="Abrir Upi"></script>
```
