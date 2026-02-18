# Guia Completo de Deploy - Sistema Financeiro

## Sumario

1. [Visao Geral da Arquitetura](#1-visao-geral-da-arquitetura)
2. [Requisitos da VPS](#2-requisitos-da-vps)
3. [Dominio e DNS](#3-dominio-e-dns)
4. [Setup Inicial da VPS](#4-setup-inicial-da-vps)
5. [Instalacao de Dependencias](#5-instalacao-de-dependencias)
6. [Configuracao do PostgreSQL](#6-configuracao-do-postgresql)
7. [Configuracao de Variaveis de Ambiente](#7-configuracao-de-variaveis-de-ambiente)
8. [Build da Aplicacao](#8-build-da-aplicacao)
9. [Servicos Systemd](#9-servicos-systemd)
10. [Nginx Reverse Proxy + SSL](#10-nginx-reverse-proxy--ssl)
11. [Migrations do Banco de Dados](#11-migrations-do-banco-de-dados)
12. [CI/CD com GitHub Actions](#12-cicd-com-github-actions)
13. [Monitoramento e Logs](#13-monitoramento-e-logs)
14. [Backups](#14-backups)
15. [Rollback e Recovery](#15-rollback-e-recovery)
16. [Checklist de Seguranca em Producao](#16-checklist-de-seguranca-em-producao)
17. [Troubleshooting](#17-troubleshooting)

---

## 1. Visao Geral da Arquitetura

```
                        Internet
                           |
                      [ Firewall ]
                           |
                    [ Nginx (443/80) ]
                     /            \
            /app (SPA)        /api (proxy)
               |                   |
     [ Static Files ]    [ Go Backend :8080 ]
       (client/dist)              |
                          [ PostgreSQL :5432 ]
```

### Stack Tecnologica

| Camada     | Tecnologia                            |
|------------|---------------------------------------|
| Frontend   | React 19 + Vite 7 + TypeScript 5.9   |
| Estilizacao| Tailwind CSS 4.1                      |
| Backend    | Go 1.24 + Chi v5                      |
| Banco      | PostgreSQL 15                         |
| Auth       | JWT (access + refresh tokens)         |
| Pagamento  | ASAAS Payment Gateway                 |
| Email      | SMTP (Gmail compativel)               |

### Portas Internas (producao)

| Servico    | Porta | Acesso Externo        |
|------------|-------|-----------------------|
| Nginx      | 80/443| Sim (HTTPS)           |
| Backend Go | 8080  | Nao (apenas via Nginx)|
| PostgreSQL | 5432  | Nao (apenas local)    |

### Modulos do Backend

O backend possui 13 modulos independentes:

- **users** - Autenticacao, JWT, refresh tokens, reset de senha
- **services** - CRUD de servicos/produtos
- **orders** - Ciclo de vida completo de pedidos
- **finance** - Contas financeiras e transacoes
- **admin** - Relatorios, verificacao de inadimplencia
- **ranking** - Gamificacao e ranking de colaboradores
- **notifications** - Sistema de notificacoes em tempo real (SSE)
- **disputes** - Resolucao de conflitos com evidencias
- **production** - Gerenciamento de jobs/producao
- **payment** - Integracao ASAAS (cobranccas, saques, reembolsos)
- **settings** - Configuracao dinamica do sistema
- **collaborator** - Dashboard do colaborador
- **bureau** - Integracao com bureau de credito

### Background Workers

O backend executa 4 workers em goroutines:

1. **Token Cleanup** - A cada 1 hora, remove refresh tokens expirados
2. **Delinquency Check** - A cada 24 horas, verifica inadimplencia
3. **Overdue Orders** - A cada 1 hora, marca pedidos vencidos
4. **Payout Processing** - A cada 5 minutos, processa saques pendentes (requer ASAAS configurado)

---

## 2. Requisitos da VPS

### Hardware Minimo

| Recurso  | Minimo     | Recomendado |
|----------|------------|-------------|
| CPU      | 1 vCPU     | 2 vCPU      |
| RAM      | 1 GB       | 2 GB        |
| Disco    | 20 GB SSD  | 40 GB SSD   |
| Banda    | 1 TB/mes   | 2 TB/mes    |

### Sistema Operacional

- **Ubuntu 22.04 LTS** ou **24.04 LTS** (recomendado)
- Alternativas: Debian 12, Rocky Linux 9

### Provedores Sugeridos

- Hetzner (melhor custo-beneficio na Europa)
- DigitalOcean
- Contabo
- Vultr
- Oracle Cloud (free tier)

---

## 3. Dominio e DNS

### Registros DNS Necessarios

Supondo que o dominio seja `seudominio.com.br`:

```
Tipo  | Nome                  | Valor             | TTL
------|-----------------------|-------------------|-----
A     | seudominio.com.br     | <IP_DA_VPS>       | 300
A     | api.seudominio.com.br | <IP_DA_VPS>       | 300
```

**Alternativa com subdominio unico** (recomendado para simplificar):

```
Tipo  | Nome                  | Valor             | TTL
------|-----------------------|-------------------|-----
A     | seudominio.com.br     | <IP_DA_VPS>       | 300
```

Nesta alternativa, o Nginx roteia `/api/*` para o backend e todo o resto para o frontend.

### Verificacao

Apos configurar o DNS, aguarde a propagacao e verifique:

```bash
dig seudominio.com.br +short
# Deve retornar o IP da VPS
```

---

## 4. Setup Inicial da VPS

### 4.1 Primeiro Acesso (como root)

```bash
ssh root@<IP_DA_VPS>
```

### 4.2 Atualizar o Sistema

```bash
apt update && apt upgrade -y
apt install -y curl wget git unzip software-properties-common \
  build-essential ca-certificates gnupg lsb-release ufw fail2ban
```

### 4.3 Criar Usuario de Deploy

```bash
adduser deploy
usermod -aG sudo deploy

# Copiar chave SSH para o novo usuario
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

### 4.4 Configurar SSH Seguro

Editar `/etc/ssh/sshd_config`:

```
Port 2222                         # Mudar porta padrao
PermitRootLogin no                # Desabilitar login root
PasswordAuthentication no         # Apenas chave SSH
MaxAuthTries 3
AllowUsers deploy
```

```bash
systemctl restart sshd
```

> **IMPORTANTE**: Antes de fechar a sessao root, abra um novo terminal e teste o acesso com o usuario `deploy` na nova porta para nao ficar trancado fora da VPS.

### 4.5 Configurar Firewall (UFW)

```bash
ufw default deny incoming
ufw default allow outgoing

# SSH (porta customizada)
ufw allow 2222/tcp

# HTTP e HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

ufw enable
ufw status verbose
```

### 4.6 Configurar Fail2Ban

```bash
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = 2222
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400
EOF

systemctl enable fail2ban
systemctl restart fail2ban
```

### 4.7 Configurar Timezone e NTP

```bash
timedatectl set-timezone America/Sao_Paulo
apt install -y chrony
systemctl enable chrony
```

### 4.8 Configurar Swap (para VPS com 1GB RAM)

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 4.9 Limites do Sistema

```bash
cat >> /etc/security/limits.conf << 'EOF'
deploy soft nofile 65536
deploy hard nofile 65536
EOF

cat >> /etc/sysctl.conf << 'EOF'
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
vm.overcommit_memory = 1
EOF

sysctl -p
```

---

## 5. Instalacao de Dependencias

### 5.1 Go 1.24

```bash
# Verificar versao mais recente em https://go.dev/dl/
GO_VERSION="1.24.4"

wget "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz"
rm -rf /usr/local/go
tar -C /usr/local -xzf "go${GO_VERSION}.linux-amd64.tar.gz"
rm "go${GO_VERSION}.linux-amd64.tar.gz"

# Adicionar ao PATH do usuario deploy
echo 'export PATH=$PATH:/usr/local/go/bin' >> /home/deploy/.bashrc
echo 'export GOPATH=/home/deploy/go' >> /home/deploy/.bashrc
echo 'export PATH=$PATH:$GOPATH/bin' >> /home/deploy/.bashrc

# Verificar
su - deploy -c "go version"
# Saida esperada: go version go1.24.4 linux/amd64
```

### 5.2 Node.js 22 LTS (para build do frontend)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# Verificar
node --version  # v22.x.x
npm --version   # 10.x.x
```

### 5.3 PostgreSQL 15

```bash
# Adicionar repositorio oficial
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt update
apt install -y postgresql-15

# Verificar
systemctl status postgresql
psql --version  # psql (PostgreSQL) 15.x
```

### 5.4 Nginx

```bash
apt install -y nginx
systemctl enable nginx
```

### 5.5 Certbot (Let's Encrypt)

```bash
apt install -y certbot python3-certbot-nginx
```

---

## 6. Configuracao do PostgreSQL

### 6.1 Configurar Banco e Usuario

```bash
sudo -u postgres psql
```

```sql
-- Criar usuario da aplicacao (usar senha forte!)
CREATE USER sistema_financeiro WITH PASSWORD 'SUA_SENHA_FORTE_AQUI';

-- Criar banco de dados
CREATE DATABASE financial_system OWNER sistema_financeiro;

-- Conceder privilegios
GRANT ALL PRIVILEGES ON DATABASE financial_system TO sistema_financeiro;

-- Conectar ao banco para dar permissoes no schema
\c financial_system
GRANT ALL ON SCHEMA public TO sistema_financeiro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO sistema_financeiro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO sistema_financeiro;

\q
```

### 6.2 Configurar Autenticacao

Editar `/etc/postgresql/15/main/pg_hba.conf`:

```
# Permitir conexao local via password
local   financial_system   sistema_financeiro                 scram-sha-256
host    financial_system   sistema_financeiro   127.0.0.1/32  scram-sha-256
```

### 6.3 Tuning do PostgreSQL

Editar `/etc/postgresql/15/main/postgresql.conf` (ajustar conforme RAM disponivel):

```ini
# Conexoes
max_connections = 100
superuser_reserved_connections = 3

# Memoria (para VPS com 2GB RAM)
shared_buffers = 512MB
effective_cache_size = 1536MB
work_mem = 4MB
maintenance_work_mem = 128MB

# WAL
wal_buffers = 16MB
min_wal_size = 80MB
max_wal_size = 1GB

# Checkpoint
checkpoint_completion_target = 0.9

# Logging
log_min_duration_statement = 1000   # Log queries > 1s
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on

# Locale
lc_messages = 'en_US.UTF-8'
lc_monetary = 'pt_BR.UTF-8'
lc_numeric = 'pt_BR.UTF-8'
lc_time = 'pt_BR.UTF-8'

# Escutar apenas localhost (seguranca)
listen_addresses = 'localhost'
port = 5432
```

```bash
systemctl restart postgresql
```

### 6.4 Testar Conexao

```bash
psql -U sistema_financeiro -d financial_system -h 127.0.0.1 -c "SELECT 1;"
```

---

## 7. Configuracao de Variaveis de Ambiente

### 7.1 Arquivo de Ambiente em Producao

Criar o arquivo `/home/deploy/sistema-financeiro/.env`:

```bash
mkdir -p /home/deploy/sistema-financeiro
cat > /home/deploy/sistema-financeiro/.env << 'EOF'
# ===========================================
# Database Configuration
# ===========================================
DB_URL=postgres://sistema_financeiro:SUA_SENHA_FORTE_AQUI@localhost:5432/financial_system?sslmode=disable

# ===========================================
# JWT Configuration
# ===========================================
# GERAR COM: openssl rand -base64 64
JWT_SECRET=GERAR_UMA_CHAVE_FORTE_AQUI
ACCESS_TOKEN_DURATION=15m
REFRESH_TOKEN_DURATION=168h

# ===========================================
# CORS Configuration
# ===========================================
# Multiplas origens separadas por virgula
CORS_ALLOWED_ORIGINS=https://seudominio.com.br
CORS_ALLOW_CREDENTIALS=true

# ===========================================
# SMTP Configuration (Google)
# ===========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USERNAME=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-de-app-do-google
SMTP_FROM=seu-email@gmail.com
SMTP_FROM_NAME=Sistema Financeiro

# URL base do frontend (para links nos emails)
APP_BASE_URL=https://seudominio.com.br

# ===========================================
# ASAAS Payment Gateway
# ===========================================
ASAAS_API_KEY=
ASAAS_SANDBOX=false
ASAAS_WEBHOOK_TOKEN=

# Limites de saque (em BRL)
WITHDRAWAL_MIN_AMOUNT=50
WITHDRAWAL_MAX_AMOUNT=10000
WITHDRAWAL_DAILY_LIMIT=50000

# ===========================================
# Docker/PostgreSQL (usado pelo docker-compose local, ignorar em prod)
# ===========================================
POSTGRES_USER=sistema_financeiro
POSTGRES_PASSWORD=SUA_SENHA_FORTE_AQUI
POSTGRES_DB=financial_system
EOF

# Proteger o arquivo
chmod 600 /home/deploy/sistema-financeiro/.env
chown deploy:deploy /home/deploy/sistema-financeiro/.env
```

### 7.2 Variaveis Obrigatorias

| Variavel             | Obrigatoria | Descricao                                   |
|----------------------|-------------|---------------------------------------------|
| `DB_URL`             | Sim         | Connection string do PostgreSQL              |
| `JWT_SECRET`         | Sim         | Chave secreta para assinar tokens JWT        |
| `CORS_ALLOWED_ORIGINS`| Sim        | Dominio(s) do frontend (separados por virgula)|
| `APP_BASE_URL`       | Sim         | URL publica do frontend                      |

### 7.3 Variaveis Opcionais

| Variavel             | Default     | Descricao                                    |
|----------------------|-------------|----------------------------------------------|
| `ACCESS_TOKEN_DURATION`  | `15m`   | Duracao do access token                      |
| `REFRESH_TOKEN_DURATION` | `168h`  | Duracao do refresh token (7 dias)            |
| `SMTP_HOST`          | -           | Host SMTP (sem = email desabilitado)         |
| `SMTP_PORT`          | -           | Porta SMTP (465 para SSL, 587 para TLS)      |
| `ASAAS_API_KEY`      | -           | Chave da API ASAAS (sem = pagamento desabilitado)|
| `ASAAS_SANDBOX`      | `false`     | Modo sandbox do ASAAS                        |
| `WITHDRAWAL_MIN_AMOUNT`  | `50`    | Valor minimo de saque (BRL)                  |
| `WITHDRAWAL_MAX_AMOUNT`  | `10000` | Valor maximo de saque (BRL)                  |
| `WITHDRAWAL_DAILY_LIMIT` | `50000` | Limite diario de saque (BRL)                 |

### 7.4 Gerar JWT_SECRET Seguro

```bash
openssl rand -base64 64
# Copiar a saida e usar como valor de JWT_SECRET
```

### 7.5 Configurar Senha de App do Gmail (SMTP)

1. Acessar https://myaccount.google.com/security
2. Ativar verificacao em 2 etapas
3. Em "Senhas de app", criar uma nova para "Email"
4. Usar a senha gerada como `SMTP_PASSWORD`

---

## 8. Build da Aplicacao

### 8.1 Estrutura de Deploy

```
/home/deploy/sistema-financeiro/
├── .env                    # Variaveis de ambiente
├── server/
│   ├── api                 # Binario Go compilado
│   └── migrations/         # Scripts SQL
├── client/
│   └── dist/               # Build estatico do frontend
└── uploads/                # Arquivos enviados pelos usuarios
```

### 8.2 Clonar o Repositorio

```bash
su - deploy
cd /home/deploy
git clone <URL_DO_REPOSITORIO> sistema-financeiro
cd sistema-financeiro
```

### 8.3 Build do Backend (Go)

```bash
cd /home/deploy/sistema-financeiro/server

# Baixar dependencias
go mod download

# Compilar binario estatico otimizado
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
  -ldflags="-s -w" \
  -o api \
  ./cmd/api/main.go

# Verificar
./api --version 2>/dev/null || echo "Binario compilado: $(ls -lh api | awk '{print $5}')"
```

Flags de build explicadas:
- `CGO_ENABLED=0` - Binario estatico sem dependencia de C
- `-ldflags="-s -w"` - Remove tabela de simbolos e debug info (binario menor)
- `GOOS=linux GOARCH=amd64` - Cross-compile para Linux x86_64

### 8.4 Build do Frontend (React/Vite)

```bash
cd /home/deploy/sistema-financeiro/client

# Instalar dependencias
npm ci --production=false

# Build de producao
npm run build
# Equivale a: tsc -b && vite build

# Verificar
ls -la dist/
# Deve conter index.html e assets/
```

### 8.5 Configurar URL da API no Frontend

**IMPORTANTE**: O frontend tem a URL da API hardcoded em `client/src/lib/axios.ts`:

```typescript
const api = axios.create({
  baseURL: 'http://localhost:8080',
});
```

Para producao, voce precisa alterar para a URL real. Ha duas abordagens:

**Opcao A - Usar variavel de ambiente no Vite (recomendado):**

1. Criar `client/.env.production`:
```
VITE_API_URL=https://seudominio.com.br
```

2. Alterar `client/src/lib/axios.ts`:
```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
});
```

3. Rebuildar: `npm run build`

**Opcao B - Proxy via Nginx (sem alterar codigo):**

Configurar o Nginx para rotear `/api/*`, `/auth/*`, `/admin/*`, `/health`, `/webhook/*` para o backend, e todo o resto para os arquivos estaticos. Esta opcao e detalhada na secao 10.

### 8.6 Diretorio de Uploads

```bash
mkdir -p /home/deploy/sistema-financeiro/server/uploads
chown deploy:deploy /home/deploy/sistema-financeiro/server/uploads
chmod 755 /home/deploy/sistema-financeiro/server/uploads
```

---

## 9. Servicos Systemd

### 9.1 Servico do Backend Go

Criar `/etc/systemd/system/sistema-financeiro-api.service`:

```ini
[Unit]
Description=Sistema Financeiro - Backend API (Go)
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=deploy
Group=deploy

# Diretorio de trabalho (o config.Load() busca ../.env relativo ao server/)
WorkingDirectory=/home/deploy/sistema-financeiro/server

# Usar o arquivo .env da raiz do projeto
EnvironmentFile=/home/deploy/sistema-financeiro/.env

# Executar o binario compilado
ExecStart=/home/deploy/sistema-financeiro/server/api

# Restart automatico em caso de falha
Restart=always
RestartSec=5
StartLimitIntervalSec=60
StartLimitBurst=5

# Limites de recursos
LimitNOFILE=65536
MemoryMax=512M

# Seguranca (sandboxing)
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/home/deploy/sistema-financeiro/server/uploads
PrivateTmp=true

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=sistema-financeiro-api

[Install]
WantedBy=multi-user.target
```

### 9.2 Ativar e Iniciar o Servico

```bash
systemctl daemon-reload
systemctl enable sistema-financeiro-api
systemctl start sistema-financeiro-api

# Verificar status
systemctl status sistema-financeiro-api

# Ver logs
journalctl -u sistema-financeiro-api -f
```

### 9.3 Comandos Uteis

```bash
# Reiniciar apos deploy
systemctl restart sistema-financeiro-api

# Parar
systemctl stop sistema-financeiro-api

# Ver logs das ultimas 100 linhas
journalctl -u sistema-financeiro-api -n 100

# Ver logs desde uma data
journalctl -u sistema-financeiro-api --since "2025-01-01 00:00:00"

# Ver logs em tempo real
journalctl -u sistema-financeiro-api -f
```

---

## 10. Nginx Reverse Proxy + SSL

### 10.1 Configuracao do Nginx (sem SSL - passo inicial)

Criar `/etc/nginx/sites-available/sistema-financeiro`:

```nginx
server {
    listen 80;
    server_name seudominio.com.br;

    # Logs
    access_log /var/log/nginx/sistema-financeiro-access.log;
    error_log /var/log/nginx/sistema-financeiro-error.log;

    # Tamanho maximo de upload (para PDFs e evidencias)
    client_max_body_size 50M;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Backend API - rotas que comecam com /api, /auth, /admin, /health, /webhook, /protected
    location ~ ^/(api|auth|admin|health|webhook|protected)(/|$) {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;

        # Headers padrao de proxy
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE (Server-Sent Events) para notificacoes
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;  # 24h para conexoes SSE

        # Timeouts
        proxy_connect_timeout 10s;
        proxy_send_timeout 60s;
    }

    # Servir uploads/arquivos estaticos do backend
    location /uploads/ {
        alias /home/deploy/sistema-financeiro/server/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Frontend SPA - arquivos estaticos
    location / {
        root /home/deploy/sistema-financeiro/client/dist;
        index index.html;

        # SPA fallback - redirecionar todas as rotas para index.html
        try_files $uri $uri/ /index.html;

        # Cache para assets com hash
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Nao cachear index.html (para receber novas versoes)
        location = /index.html {
            expires -1;
            add_header Cache-Control "no-store, no-cache, must-revalidate";
        }
    }

    # Bloquear acesso a arquivos ocultos
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

### 10.2 Ativar o Site

```bash
# Remover site padrao
rm -f /etc/nginx/sites-enabled/default

# Ativar o site
ln -sf /etc/nginx/sites-available/sistema-financeiro /etc/nginx/sites-enabled/

# Testar configuracao
nginx -t

# Recarregar
systemctl reload nginx
```

### 10.3 Instalar Certificado SSL com Let's Encrypt

```bash
certbot --nginx -d seudominio.com.br --non-interactive --agree-tos -m seu-email@gmail.com
```

O Certbot vai automaticamente:
- Obter o certificado SSL
- Modificar o arquivo Nginx para redirecionar HTTP para HTTPS
- Configurar renovacao automatica

### 10.4 Verificar Renovacao Automatica

```bash
# Testar renovacao
certbot renew --dry-run

# O timer systemd ja e criado automaticamente
systemctl list-timers | grep certbot
```

### 10.5 Configuracao Final do Nginx (apos SSL)

Apos o Certbot rodar, o arquivo sera similar a:

```nginx
server {
    listen 80;
    server_name seudominio.com.br;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seudominio.com.br;

    ssl_certificate /etc/letsencrypt/live/seudominio.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seudominio.com.br/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'self';" always;

    client_max_body_size 50M;

    # Logs
    access_log /var/log/nginx/sistema-financeiro-access.log;
    error_log /var/log/nginx/sistema-financeiro-error.log;

    # Backend API
    location ~ ^/(api|auth|admin|health|webhook|protected)(/|$) {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
        proxy_connect_timeout 10s;
        proxy_send_timeout 60s;
    }

    # Uploads
    location /uploads/ {
        alias /home/deploy/sistema-financeiro/server/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Frontend SPA
    location / {
        root /home/deploy/sistema-financeiro/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        location = /index.html {
            expires -1;
            add_header Cache-Control "no-store, no-cache, must-revalidate";
        }
    }

    location ~ /\. {
        deny all;
    }
}
```

### 10.6 Rate Limiting (opcional, recomendado)

Adicionar ao bloco `http` em `/etc/nginx/nginx.conf`:

```nginx
http {
    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

    # ... resto da config
}
```

E no site config, dentro do `server` block:

```nginx
    # Rate limit para autenticacao (protecao contra brute force)
    location ~ ^/auth/ {
        limit_req zone=auth burst=3 nodelay;
        proxy_pass http://127.0.0.1:8080;
        # ... headers ...
    }

    # Rate limit para API geral
    location ~ ^/(api|admin)/ {
        limit_req zone=api burst=50 nodelay;
        proxy_pass http://127.0.0.1:8080;
        # ... headers ...
    }
```

---

## 11. Migrations do Banco de Dados

### 11.1 Lista Completa de Migrations

As migrations estao em `server/migrations/` e devem ser aplicadas em ordem cronologica:

| # | Timestamp        | Nome                                    | Descricao                          |
|---|------------------|-----------------------------------------|------------------------------------|
| 1 | 20251210040000   | create_users_table                      | Tabela de usuarios e roles         |
| 2 | 20251210050000   | create_services_table                   | Tabela de servicos/produtos        |
| 3 | 20251210060000   | create_financial_schema                 | Contas financeiras e transacoes    |
| 4 | 20251210070000   | create_deliveries_table                 | Entregas de pedidos                |
| 5 | 20251210080000   | create_order_revisions_table            | Revisoes de pedidos                |
| 6 | 20251210090000   | add_delinquency_fields                  | Campos de inadimplencia            |
| 7 | 20251210100000   | create_ratings_and_ranking_indexes      | Avaliacoes e ranking               |
| 8 | 20251215010000   | create_collaborator_profiles            | Perfis de colaboradores            |
| 9 | 20251215020000   | create_production_jobs                  | Jobs de producao                   |
| 10| 20251215030000   | create_job_histories                    | Historico de jobs                  |
| 11| 20251215040000   | create_refresh_tokens                   | Tokens de refresh                  |
| 12| 20251215050000   | add_enfermagem_service_area             | Area de servico enfermagem         |
| 13| 20251228010000   | expand_order_status_enum                | Novos status de pedido             |
| 14| 20251228020000   | create_notifications_table              | Sistema de notificacoes            |
| 15| 20251228030000   | create_disputes_tables                  | Disputas e evidencias              |
| 16| 20251230010000   | create_payment_tables                   | Cobrancas e pagamentos             |
| 17| 20251230010000   | create_delinquency_history              | Historico de inadimplencia         |
| 18| 20251230020000   | add_serasa_fields                       | Campos do bureau de credito        |
| 19| 20251231010000   | create_system_settings                  | Configuracoes do sistema           |
| 20| 20260129010000   | add_financeiro_role                     | Role FINANCEIRO                    |
| 21| 20260129020000   | add_financeiro_test_user                | Usuario de teste financeiro        |
| 22| 20260129030000   | create_password_reset_tokens            | Tokens de reset de senha           |
| 23| 20260129040000   | fix_financeiro_password                 | Correcao de senha                  |

### 11.2 Aplicar Migrations em Producao

```bash
# Via psql diretamente (recomendado em producao)
cd /home/deploy/sistema-financeiro

for f in server/migrations/*.up.sql; do
    echo "Aplicando: $f"
    psql -U sistema_financeiro -d financial_system -h 127.0.0.1 -f "$f"
done
```

### 11.3 Reverter Migrations (cuidado!)

```bash
# Reverter todas (ordem reversa)
cd /home/deploy/sistema-financeiro

for f in $(ls -r server/migrations/*.down.sql); do
    echo "Revertendo: $f"
    psql -U sistema_financeiro -d financial_system -h 127.0.0.1 -f "$f"
done
```

### 11.4 Aplicar Uma Migration Especifica

```bash
psql -U sistema_financeiro -d financial_system -h 127.0.0.1 \
  -f server/migrations/20260129010000_add_financeiro_role.up.sql
```

> **NOTA**: O projeto nao usa uma ferramenta de migration tracking (como golang-migrate ou goose). As migrations sao scripts SQL puros executados sequencialmente. Em producao, e recomendado manter um registro manual ou adotar uma ferramenta de migration.

---

## 12. CI/CD com GitHub Actions

### 12.1 Estrutura de Arquivos

```
.github/
└── workflows/
    ├── ci.yml          # Build + Test + Lint (em todo push/PR)
    └── deploy.yml      # Deploy automatico (push na main)
```

### 12.2 Workflow de CI (Build + Lint)

Criar `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, master, develop]
  pull_request:
    branches: [main, master]

jobs:
  # ============================================
  # Backend - Go
  # ============================================
  backend-lint:
    name: Backend Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: '1.24'
          cache-dependency-path: server/go.sum

      - name: Run go vet
        working-directory: server
        run: go vet ./...

      - name: Check formatting
        working-directory: server
        run: |
          if [ -n "$(gofmt -l .)" ]; then
            echo "Os seguintes arquivos precisam de formatacao:"
            gofmt -l .
            exit 1
          fi

  backend-build:
    name: Backend Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: '1.24'
          cache-dependency-path: server/go.sum

      - name: Download dependencies
        working-directory: server
        run: go mod download

      - name: Build
        working-directory: server
        run: |
          CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
          go build -ldflags="-s -w" -o api ./cmd/api/main.go

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: backend-binary
          path: server/api
          retention-days: 1

  # ============================================
  # Frontend - React/TypeScript
  # ============================================
  frontend-lint:
    name: Frontend Lint & Typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: client/package-lock.json

      - name: Install dependencies
        working-directory: client
        run: npm ci

      - name: TypeScript check
        working-directory: client
        run: npx tsc -b --noEmit

      - name: ESLint
        working-directory: client
        run: npm run lint

  frontend-build:
    name: Frontend Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: client/package-lock.json

      - name: Install dependencies
        working-directory: client
        run: npm ci

      - name: Build
        working-directory: client
        env:
          VITE_API_URL: ${{ vars.VITE_API_URL || '' }}
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: frontend-dist
          path: client/dist
          retention-days: 1
```

### 12.3 Workflow de Deploy

Criar `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main, master]
  workflow_dispatch:  # Permite deploy manual

concurrency:
  group: deploy-production
  cancel-in-progress: false

jobs:
  # ============================================
  # Build
  # ============================================
  build-backend:
    name: Build Backend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: '1.24'
          cache-dependency-path: server/go.sum

      - name: Build binary
        working-directory: server
        run: |
          CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
          go build -ldflags="-s -w" -o api ./cmd/api/main.go

      - uses: actions/upload-artifact@v4
        with:
          name: backend-binary
          path: server/api

  build-frontend:
    name: Build Frontend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: client/package-lock.json

      - name: Install & Build
        working-directory: client
        env:
          VITE_API_URL: ${{ vars.VITE_API_URL || '' }}
        run: |
          npm ci
          npm run build

      - uses: actions/upload-artifact@v4
        with:
          name: frontend-dist
          path: client/dist

  # ============================================
  # Deploy
  # ============================================
  deploy:
    name: Deploy to VPS
    needs: [build-backend, build-frontend]
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Download backend artifact
        uses: actions/download-artifact@v4
        with:
          name: backend-binary
          path: ./artifacts/server

      - name: Download frontend artifact
        uses: actions/download-artifact@v4
        with:
          name: frontend-dist
          path: ./artifacts/client/dist

      - name: Make binary executable
        run: chmod +x ./artifacts/server/api

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.VPS_SSH_PORT }}
          script: |
            echo "==> Preparando deploy..."
            mkdir -p /home/deploy/sistema-financeiro/server
            mkdir -p /home/deploy/sistema-financeiro/client
            mkdir -p /home/deploy/sistema-financeiro/server/uploads
            mkdir -p /home/deploy/sistema-financeiro/backups

      - name: Copy files via SCP
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.VPS_SSH_PORT }}
          source: "artifacts/server/api"
          target: "/home/deploy/sistema-financeiro/server/"
          strip_components: 2

      - name: Copy frontend files
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.VPS_SSH_PORT }}
          source: "artifacts/client/dist/*"
          target: "/home/deploy/sistema-financeiro/client/dist/"
          strip_components: 3

      - name: Copy migrations
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.VPS_SSH_PORT }}
          source: "server/migrations/*"
          target: "/home/deploy/sistema-financeiro/"

      - name: Restart services
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.VPS_SSH_PORT }}
          script: |
            echo "==> Tornando binario executavel..."
            chmod +x /home/deploy/sistema-financeiro/server/api

            echo "==> Reiniciando backend..."
            sudo systemctl restart sistema-financeiro-api

            echo "==> Aguardando backend iniciar..."
            sleep 3

            echo "==> Verificando health check..."
            for i in 1 2 3 4 5; do
              if curl -sf http://127.0.0.1:8080/health > /dev/null 2>&1; then
                echo "Backend esta saudavel!"
                break
              fi
              echo "Tentativa $i/5 - aguardando..."
              sleep 2
            done

            # Verificar se o servico esta rodando
            if ! systemctl is-active --quiet sistema-financeiro-api; then
              echo "ERRO: Backend nao iniciou!"
              journalctl -u sistema-financeiro-api -n 50
              exit 1
            fi

            echo "==> Deploy concluido com sucesso!"
```

### 12.4 Secrets do GitHub

Configurar em **Settings > Secrets and variables > Actions**:

#### Secrets (obrigatorios)

| Secret          | Valor                                    |
|-----------------|------------------------------------------|
| `VPS_HOST`      | IP ou dominio da VPS                     |
| `VPS_USER`      | `deploy`                                 |
| `VPS_SSH_KEY`   | Chave SSH privada (conteudo completo)    |
| `VPS_SSH_PORT`  | `2222` (ou a porta SSH configurada)      |

#### Variables (opcionais)

| Variable        | Valor                                     |
|-----------------|-------------------------------------------|
| `VITE_API_URL`  | `https://seudominio.com.br` (se usar proxy Nginx) deixar vazio |

### 12.5 Gerar Chave SSH para o CI/CD

Na sua maquina local:

```bash
# Gerar par de chaves dedicado para deploy
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/deploy_key -N ""

# Copiar a chave publica para a VPS
ssh-copy-id -i ~/.ssh/deploy_key.pub -p 2222 deploy@<IP_DA_VPS>

# A chave privada (~/.ssh/deploy_key) sera usada como VPS_SSH_KEY no GitHub
cat ~/.ssh/deploy_key
# Copiar TODO o conteudo (incluindo BEGIN e END) para o secret
```

### 12.6 Permissao de sudo sem senha para o deploy (apenas restart de servico)

Na VPS, executar `visudo` e adicionar:

```
deploy ALL=(ALL) NOPASSWD: /bin/systemctl restart sistema-financeiro-api
deploy ALL=(ALL) NOPASSWD: /bin/systemctl status sistema-financeiro-api
deploy ALL=(ALL) NOPASSWD: /bin/systemctl stop sistema-financeiro-api
deploy ALL=(ALL) NOPASSWD: /bin/systemctl start sistema-financeiro-api
```

### 12.7 Fluxo do CI/CD

```
Push na main/master
       |
       v
  [CI Workflow]
  ├── Backend Lint (go vet, gofmt)
  ├── Backend Build (binario estatico)
  ├── Frontend Lint (tsc, eslint)
  └── Frontend Build (vite build)
       |
       v (se CI passou)
  [Deploy Workflow]
  ├── Build Backend (binario Linux amd64)
  ├── Build Frontend (npm run build)
  └── Deploy to VPS
      ├── SCP: binario → /home/deploy/sistema-financeiro/server/api
      ├── SCP: dist/ → /home/deploy/sistema-financeiro/client/dist/
      ├── SCP: migrations/ → /home/deploy/sistema-financeiro/server/migrations/
      ├── systemctl restart sistema-financeiro-api
      └── Health check verification
```

---

## 13. Monitoramento e Logs

### 13.1 Logs do Backend (journald)

```bash
# Logs em tempo real
journalctl -u sistema-financeiro-api -f

# Logs das ultimas 2 horas
journalctl -u sistema-financeiro-api --since "2 hours ago"

# Apenas erros
journalctl -u sistema-financeiro-api -p err

# Exportar logs para arquivo
journalctl -u sistema-financeiro-api --since today > /tmp/api-logs.txt
```

### 13.2 Logs do Nginx

```bash
# Access logs
tail -f /var/log/nginx/sistema-financeiro-access.log

# Error logs
tail -f /var/log/nginx/sistema-financeiro-error.log
```

### 13.3 Logs do PostgreSQL

```bash
tail -f /var/log/postgresql/postgresql-15-main.log
```

### 13.4 Health Check Script

Criar `/home/deploy/scripts/healthcheck.sh`:

```bash
#!/bin/bash

API_URL="http://127.0.0.1:8080/health"
NOTIFY_EMAIL="seu-email@gmail.com"

response=$(curl -sf -o /dev/null -w "%{http_code}" "$API_URL" 2>/dev/null)

if [ "$response" != "200" ]; then
    echo "[$(date)] ALERTA: Backend retornou HTTP $response" >> /home/deploy/logs/healthcheck.log

    # Tentar reiniciar automaticamente
    sudo systemctl restart sistema-financeiro-api
    sleep 5

    # Verificar novamente
    response=$(curl -sf -o /dev/null -w "%{http_code}" "$API_URL" 2>/dev/null)
    if [ "$response" != "200" ]; then
        echo "[$(date)] CRITICO: Backend nao recuperou apos restart" >> /home/deploy/logs/healthcheck.log
    else
        echo "[$(date)] OK: Backend recuperado apos restart" >> /home/deploy/logs/healthcheck.log
    fi
fi
```

```bash
chmod +x /home/deploy/scripts/healthcheck.sh
mkdir -p /home/deploy/logs

# Agendar a cada 5 minutos
crontab -e
# Adicionar:
*/5 * * * * /home/deploy/scripts/healthcheck.sh
```

### 13.5 Monitoramento de Disco e Memoria

```bash
# Script de monitoramento basico
cat > /home/deploy/scripts/monitor.sh << 'SCRIPT'
#!/bin/bash

DISK_THRESHOLD=85
MEM_THRESHOLD=90
LOG="/home/deploy/logs/monitor.log"

# Disco
disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$disk_usage" -gt "$DISK_THRESHOLD" ]; then
    echo "[$(date)] ALERTA: Disco em ${disk_usage}%" >> "$LOG"
fi

# Memoria
mem_usage=$(free | awk '/Mem:/ {printf "%.0f", $3/$2*100}')
if [ "$mem_usage" -gt "$MEM_THRESHOLD" ]; then
    echo "[$(date)] ALERTA: Memoria em ${mem_usage}%" >> "$LOG"
fi

# PostgreSQL
if ! systemctl is-active --quiet postgresql; then
    echo "[$(date)] CRITICO: PostgreSQL esta parado!" >> "$LOG"
fi

# Backend
if ! systemctl is-active --quiet sistema-financeiro-api; then
    echo "[$(date)] CRITICO: Backend esta parado!" >> "$LOG"
fi

# Nginx
if ! systemctl is-active --quiet nginx; then
    echo "[$(date)] CRITICO: Nginx esta parado!" >> "$LOG"
fi
SCRIPT

chmod +x /home/deploy/scripts/monitor.sh

# Agendar a cada 10 minutos
# Adicionar ao crontab:
*/10 * * * * /home/deploy/scripts/monitor.sh
```

---

## 14. Backups

### 14.1 Backup do Banco de Dados

Criar `/home/deploy/scripts/backup-db.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/home/deploy/backups/postgres"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="financial_system"
DB_USER="sistema_financeiro"

mkdir -p "$BACKUP_DIR"

# Dump comprimido
pg_dump -U "$DB_USER" -h 127.0.0.1 "$DB_NAME" \
  --format=custom \
  --compress=9 \
  --file="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.dump"

# Verificar se o backup foi criado
if [ $? -eq 0 ]; then
    SIZE=$(ls -lh "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.dump" | awk '{print $5}')
    echo "[$(date)] Backup criado: ${DB_NAME}_${TIMESTAMP}.dump ($SIZE)" >> /home/deploy/logs/backup.log
else
    echo "[$(date)] ERRO: Falha ao criar backup!" >> /home/deploy/logs/backup.log
    exit 1
fi

# Remover backups antigos
find "$BACKUP_DIR" -name "*.dump" -mtime +$RETENTION_DAYS -delete
echo "[$(date)] Backups com mais de $RETENTION_DAYS dias removidos" >> /home/deploy/logs/backup.log
```

```bash
chmod +x /home/deploy/scripts/backup-db.sh

# Agendar backup diario as 3h da manha
crontab -e
# Adicionar:
0 3 * * * /home/deploy/scripts/backup-db.sh
```

### 14.2 Backup dos Uploads

```bash
#!/bin/bash
# /home/deploy/scripts/backup-uploads.sh

BACKUP_DIR="/home/deploy/backups/uploads"
UPLOADS_DIR="/home/deploy/sistema-financeiro/server/uploads"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

tar -czf "$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz" -C "$(dirname $UPLOADS_DIR)" "$(basename $UPLOADS_DIR)"

find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +$RETENTION_DAYS -delete
```

### 14.3 Restaurar Backup

```bash
# Restaurar banco de dados
pg_restore -U sistema_financeiro -h 127.0.0.1 -d financial_system \
  --clean --if-exists \
  /home/deploy/backups/postgres/financial_system_XXXXXXXX_XXXXXX.dump

# Restaurar uploads
tar -xzf /home/deploy/backups/uploads/uploads_XXXXXXXX_XXXXXX.tar.gz \
  -C /home/deploy/sistema-financeiro/server/
```

### 14.4 Backup Externo (opcional, recomendado)

Enviar backups para armazenamento externo (S3, Backblaze B2, etc.):

```bash
# Exemplo com rclone (configurar rclone primeiro)
rclone copy /home/deploy/backups remote:sistema-financeiro-backups/ --max-age 7d
```

---

## 15. Rollback e Recovery

### 15.1 Rollback do Backend

Se o deploy falhar ou causar problemas:

```bash
# 1. Parar o servico
sudo systemctl stop sistema-financeiro-api

# 2. Restaurar binario anterior (manter backup antes de cada deploy)
cp /home/deploy/sistema-financeiro/server/api.bak \
   /home/deploy/sistema-financeiro/server/api

# 3. Reiniciar
sudo systemctl start sistema-financeiro-api
```

### 15.2 Script de Deploy com Backup Automatico

Criar `/home/deploy/scripts/deploy.sh`:

```bash
#!/bin/bash
set -euo pipefail

APP_DIR="/home/deploy/sistema-financeiro"
BACKUP_DIR="/home/deploy/backups/releases"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "==> Criando backup da versao atual..."
mkdir -p "$BACKUP_DIR/$TIMESTAMP"
cp "$APP_DIR/server/api" "$BACKUP_DIR/$TIMESTAMP/api" 2>/dev/null || true
cp -r "$APP_DIR/client/dist" "$BACKUP_DIR/$TIMESTAMP/dist" 2>/dev/null || true

echo "==> Mantendo apenas os 5 ultimos backups..."
ls -dt "$BACKUP_DIR"/*/ | tail -n +6 | xargs rm -rf 2>/dev/null || true

echo "==> Aplicando nova versao..."
# Os arquivos ja foram copiados pelo CI/CD

echo "==> Reiniciando backend..."
sudo systemctl restart sistema-financeiro-api
sleep 3

echo "==> Health check..."
for i in $(seq 1 10); do
    if curl -sf http://127.0.0.1:8080/health > /dev/null; then
        echo "Backend saudavel!"
        exit 0
    fi
    echo "Tentativa $i/10..."
    sleep 2
done

echo "ERRO: Backend nao respondeu! Fazendo rollback..."
cp "$BACKUP_DIR/$TIMESTAMP/api" "$APP_DIR/server/api"
cp -r "$BACKUP_DIR/$TIMESTAMP/dist" "$APP_DIR/client/dist"
sudo systemctl restart sistema-financeiro-api
echo "Rollback aplicado."
exit 1
```

### 15.3 Rollback de Migration

```bash
# Reverter a ultima migration
psql -U sistema_financeiro -d financial_system -h 127.0.0.1 \
  -f server/migrations/20260129040000_fix_financeiro_password.down.sql
```

---

## 16. Checklist de Seguranca em Producao

### Antes do Deploy

- [ ] `JWT_SECRET` gerado com `openssl rand -base64 64` (minimo 256 bits)
- [ ] Senha do PostgreSQL forte (minimo 32 caracteres alfanumericos)
- [ ] `CORS_ALLOWED_ORIGINS` aponta apenas para o dominio real (nao usar `*`)
- [ ] Arquivo `.env` com permissao `600` (legivel apenas pelo dono)
- [ ] SSH configurado apenas com chave (sem password auth)
- [ ] Porta SSH alterada (nao usar 22)
- [ ] Fail2Ban ativo
- [ ] Firewall (UFW) configurado - apenas 80, 443 e porta SSH

### Apos o Deploy

- [ ] HTTPS funcionando com certificado valido
- [ ] Renovacao automatica do certificado (certbot renew --dry-run)
- [ ] Headers de seguranca presentes (verificar em securityheaders.com)
- [ ] PostgreSQL escutando apenas em localhost
- [ ] Backend nao exposto diretamente (apenas via Nginx)
- [ ] Health check respondendo em `/health`
- [ ] Backup diario do banco configurado e testado
- [ ] Logs sendo gerados corretamente
- [ ] Rate limiting ativo nas rotas de autenticacao
- [ ] Usuarios de teste removidos ou senhas alteradas em producao

### Usuarios de Teste

O banco vem com usuarios de teste criados pelas migrations. **Em producao, altere TODAS as senhas ou remova esses usuarios**:

| Role         | Email                    | Senha Padrao   |
|--------------|--------------------------|----------------|
| Admin        | admin@test.com           | password123    |
| Student      | student@test.com         | password123    |
| Collaborator | collaborator@test.com    | password123    |
| Financeiro   | financeiro@test.com      | password123    |

```sql
-- Remover usuarios de teste em producao
DELETE FROM users WHERE email IN (
  'admin@test.com',
  'student@test.com',
  'collaborator@test.com',
  'financeiro@test.com'
);
```

---

## 17. Troubleshooting

### Backend nao inicia

```bash
# Verificar logs
journalctl -u sistema-financeiro-api -n 100

# Causas comuns:
# 1. DB_URL incorreta ou PostgreSQL parado
systemctl status postgresql
psql -U sistema_financeiro -d financial_system -h 127.0.0.1 -c "SELECT 1;"

# 2. JWT_SECRET nao definido
grep JWT_SECRET /home/deploy/sistema-financeiro/.env

# 3. Porta 8080 ja em uso
ss -tlnp | grep 8080

# 4. Permissao do binario
ls -la /home/deploy/sistema-financeiro/server/api
# Deve ter permissao de execucao (-rwx...)
```

### Frontend mostra pagina em branco

```bash
# Verificar se os arquivos existem
ls -la /home/deploy/sistema-financeiro/client/dist/

# Verificar configuracao do Nginx
nginx -t
cat /etc/nginx/sites-enabled/sistema-financeiro

# Verificar logs do Nginx
tail -20 /var/log/nginx/sistema-financeiro-error.log
```

### CORS bloqueando requisicoes

```bash
# Verificar a variavel no .env
grep CORS /home/deploy/sistema-financeiro/.env

# A origem deve ser exatamente a URL do frontend, sem barra no final
# Correto: https://seudominio.com.br
# Errado:  https://seudominio.com.br/

# Testar CORS manualmente
curl -I -X OPTIONS \
  -H "Origin: https://seudominio.com.br" \
  -H "Access-Control-Request-Method: GET" \
  http://127.0.0.1:8080/health
```

### Migrations falhando

```bash
# Verificar qual migration falhou
psql -U sistema_financeiro -d financial_system -h 127.0.0.1

# Listar tabelas existentes
\dt

# Verificar se um tipo enum ja existe (causa comum de falha)
SELECT typname FROM pg_type WHERE typname LIKE '%status%';
```

### SSL nao funciona

```bash
# Verificar certificado
certbot certificates

# Renovar manualmente
certbot renew

# Verificar configuracao Nginx
nginx -t

# Verificar se a porta 443 esta aberta
ufw status | grep 443
```

### Memoria alta / OOM Kill

```bash
# Ver processos por memoria
ps aux --sort=-%mem | head -20

# Verificar se houve OOM
dmesg | grep -i "out of memory"
journalctl -k | grep -i "oom"

# Limites do servico systemd
systemctl show sistema-financeiro-api | grep Memory
```

### Conexoes de banco esgotadas

```bash
# Ver conexoes ativas
psql -U sistema_financeiro -d financial_system -h 127.0.0.1 \
  -c "SELECT count(*) FROM pg_stat_activity WHERE datname='financial_system';"

# Ver detalhes das conexoes
psql -U sistema_financeiro -d financial_system -h 127.0.0.1 \
  -c "SELECT pid, usename, state, query_start, query FROM pg_stat_activity WHERE datname='financial_system';"

# Matar conexoes ociosas antigas
psql -U sistema_financeiro -d financial_system -h 127.0.0.1 \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='financial_system' AND state='idle' AND query_start < now() - interval '1 hour';"
```

### Webhook ASAAS nao chega

```bash
# Verificar se a rota esta acessivel externamente
curl -X POST https://seudominio.com.br/webhook/payment/asaas \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Verificar logs do backend para erros de webhook
journalctl -u sistema-financeiro-api | grep -i webhook

# Verificar se o ASAAS_WEBHOOK_TOKEN esta configurado
grep ASAAS /home/deploy/sistema-financeiro/.env
```

---

## Resumo dos Comandos Frequentes

```bash
# === Servicos ===
sudo systemctl start sistema-financeiro-api
sudo systemctl stop sistema-financeiro-api
sudo systemctl restart sistema-financeiro-api
sudo systemctl status sistema-financeiro-api

# === Logs ===
journalctl -u sistema-financeiro-api -f              # Tempo real
journalctl -u sistema-financeiro-api --since "1h ago" # Ultima hora
tail -f /var/log/nginx/sistema-financeiro-error.log   # Nginx erros

# === Nginx ===
nginx -t                    # Testar config
systemctl reload nginx      # Recarregar config
systemctl restart nginx     # Reiniciar

# === PostgreSQL ===
sudo systemctl status postgresql
psql -U sistema_financeiro -d financial_system -h 127.0.0.1

# === SSL ===
certbot certificates        # Ver certificados
certbot renew --dry-run     # Testar renovacao

# === Backup ===
/home/deploy/scripts/backup-db.sh    # Backup manual

# === Firewall ===
ufw status verbose
```
