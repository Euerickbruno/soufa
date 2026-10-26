const express = require('express');
const mongoose = require('mongoose');
const { identificar } = require('./middlewares/auth');
const routes = require('./routes');
const { consumir } = require('./events');
const seed = require('./seed');

async function main() {
  await mongoose.connect(process.env.MONGO_URL, { serverSelectionTimeoutMS: 30000 });
  console.log('[community] MongoDB conectado');
  await seed();
  consumir(); // consumidor do RabbitMQ; reconecta sozinho

  const app = express();
  app.use(express.json());
  app.get('/health', (req, res) => res.json({ servico: 'community-service', status: 'ok' }));
  app.use(identificar);
  app.use(routes);
  app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));
  app.use((err, req, res, next) => {
    console.error('[community] Erro:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  });

  const porta = process.env.PORT || 3003;
  app.listen(porta, () => console.log(`[community] Ouvindo na porta ${porta}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
