# FERRETTI BARBER

Plataforma full stack para barbearia, com site público, agendamento pelo WhatsApp e painel administrativo protegido.

## Stack

- Frontend: React 19, TypeScript, Vite
- Backend: Node.js, Express 5
- Banco: PostgreSQL + Prisma ORM
- Segurança: JWT, bcrypt, Helmet, CORS e validação Zod

## Estrutura

```text
ferretti.barber/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   └── src/
│       ├── middleware/auth.js
│       ├── routes/api.js
│       └── server.js
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       ├── App.tsx
│       └── index.css
└── README.md
```

## PostgreSQL

1. Instale e inicie PostgreSQL.
2. Crie o banco `ferretti_barber`.
3. Em `backend/.env`, configure:

```env
DATABASE_URL="postgresql://USUARIO:SENHA@localhost:5432/ferretti_barber?schema=public"
PORT=3001
FRONTEND_URL=http://localhost:5173
JWT_SECRET=chave-aleatoria-longa
NODE_ENV=development
SEED_ADMIN_NAME=Administrador
SEED_ADMIN_EMAIL=admin@seudominio.com.br
SEED_ADMIN_PASSWORD=senha-segura
```

4. Execute:

```powershell
cd backend
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

A primeira migração cria as tabelas. O seed cadastra os sete serviços com preço `0`, que deve ser configurado no painel. Opcionalmente, o seed cria o primeiro administrador a partir das três variáveis `SEED_ADMIN_*`.

## Variáveis do frontend

Crie `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001/api
```

## Iniciar

```powershell
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`  
Área administrativa: `http://localhost:5173/#/admin`  
API: `http://localhost:3001/api`

## Backend

```powershell
cd backend
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

## Funcionalidades

- Site público responsivo com identidade visual preta, grafite e dourada.
- Serviços dinâmicos carregados pela API.
- Disponibilidade validada no backend por duração, horário e ocupação.
- Agendamento público com prevenção de conflito.
- Mensagem organizada para WhatsApp e aviso explícito de que não há confirmação automática.
- Login administrativo JWT e senhas bcrypt.
- CRUD de clientes, serviços e agendamentos.
- Desativação de clientes e serviços.
- Dashboard com agenda do dia, clientes ativos, próximos horários, receita concluída e serviços populares.
- Configurações de WhatsApp, endereço, Instagram e funcionamento na API.

## Segurança

- Nunca use o arquivo `.env` em commits.
- Defina um `JWT_SECRET` aleatório em produção.
- Configure `FRONTEND_URL` com o domínio real.
- O número do WhatsApp deve ser preenchido nas configurações do painel; ele não possui valor padrão inventado.
- Serviços concluídos são a única fonte considerada para receita.

## Integrações pendentes

- Conectar painel visual às telas administrativas completas de agenda, clientes, serviços e configurações.
- Configurar domínio, HTTPS e banco PostgreSQL gerenciado.
- Informar dados reais da barbearia e número válido do WhatsApp.
- Adicionar galeria própria e fotos reais.
- Adicionar testes automatizados de integração e E2E.
