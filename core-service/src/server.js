const express = require('express');
const { iniciar } = require('./db');
const eventos = require('./events');
const { identificar } = require('./middlewares/auth');
const routes = require('./routes');
const seed = require('./seed');

async function main() {
  await iniciar();
  await seed();
  eventos.conectar(); 

  const app = express();
  app.use(express.json());
  app.get('/health', (req, res) => res.json({ servico: 'core-service', status: 'ok' }));
  app.use(identificar);
  app.use(routes);
  app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    if (status >= 500) console.error('[core] Erro:', err);
    res.status(status).json({ erro: status === 500 ? 'Erro interno do servidor' : err.message });
  });

  const porta = process.env.PORT || 3002;
  app.listen(porta, () => console.log(`[core] Ouvindo na porta ${porta}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
