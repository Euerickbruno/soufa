const amqp = require('amqplib');

const EXCHANGE = 'soufa.eventos';
let canal = null;

async function conectar() {
  for (;;) {
    try {
      const conexao = await amqp.connect(process.env.RABBITMQ_URL);
      conexao.on('error', () => {});
      conexao.on('close', () => {
        canal = null;
        console.log('[core] RabbitMQ desconectou; reconectando...');
        setTimeout(conectar, 3000);
      });
      canal = await conexao.createChannel();
      await canal.assertExchange(EXCHANGE, 'topic', { durable: true });
      console.log('[core] RabbitMQ conectado');
      return;
    } catch (e) {
      console.log('[core] Aguardando RabbitMQ...');
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

function publicar(chave, dados) {
  if (!canal) {
    console.warn(`[core] Evento ${chave} não publicado: RabbitMQ indisponível`);
    return false;
  }
  const evento = { eventoId: `${Date.now()}-${Math.random().toString(16).slice(2)}`, tipo: chave, ocorridoEm: new Date().toISOString(), ...dados };
  canal.publish(EXCHANGE, chave, Buffer.from(JSON.stringify(evento)), { persistent: true, contentType: 'application/json' });
  console.log(`[core] Evento publicado: ${chave}`, dados);
  return true;
}

module.exports = { conectar, publicar };
