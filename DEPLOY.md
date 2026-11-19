# Publicação FERRETTI BARBER

## Arquitetura

- Frontend: Vercel
- API: Render
- Banco PostgreSQL: Render

## API no Render

1. Conecte o repositório GitHub no Render.
2. Use `render.yaml` como Blueprint.
3. Informe `FRONTEND_URL` com a URL final da Vercel.
4. Informe `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`.
5. Após o banco iniciar, execute uma vez no Shell do Render:

```sh
npm run db:deploy
npm run db:seed
```

O banco já receberá `DATABASE_URL` automaticamente pelo Blueprint.

## Frontend na Vercel

1. Importe o repositório GitHub na Vercel.
2. Selecione o diretório `frontend` como Root Directory.
3. Configure:

```env
VITE_API_URL=https://SUA-API.onrender.com/api
```

4. Faça o deploy.

## Domínio

O domínio final pode ser configurado na Vercel e replicado em `FRONTEND_URL` no Render.

## Observações

- Mantenha `.env` fora do Git.
- O primeiro administrador é criado pelas variáveis `SEED_ADMIN_*`.
- Configure o número do WhatsApp pela API/painel antes do uso público.
