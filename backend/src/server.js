require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const api = require('./routes/api');

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL?.split(',') || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', api);
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || (err.name === 'ZodError' ? 400 : 500);
  res.status(status).json({ message: err.name === 'ZodError' ? 'Dados inválidos' : 'Erro interno do servidor', ...(process.env.NODE_ENV !== 'production' && err.issues ? { issues: err.issues } : {}) });
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`FERRETTI BARBER API rodando na porta ${port}`));
