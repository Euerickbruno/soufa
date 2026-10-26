const amqp = require('amqplib');
const mongoose = require('mongoose');
const TierList = require('./models/TierList');
const Comentario = require('./models/Comentario');

const EXCHANGE = 'soufa.eventos';
const FILA = 'community.eventos';
const FILA_MORTA = 'community.eventos.dlq';

// Remove o álbum de todas as tier lists e apaga os comentários das resenhas ligadas a ele.
// Operações idempotentes: receber o mesmo evento duas vezes não causa problema.
async function aoRemoverAlbum({ albumId, musicaIds = [], avaliacaoIds = [] }) {
  for (const t of ['S', 'A', 'B', 'C', 'D']) {
    await TierList.updateMany(
      { [`tiers.${t}`]: albumId, $or: [{ itemTipo: 'album' }, { itemTipo: { $exists: false } }] },
      { $pull: { [`tiers.${t}`]: albumId } }
    );
    if (musicaIds.length) {
      await TierList.updateMany(
        { itemTipo: 'musica', [`tiers.${t}`]: { $in: musicaIds } },
        { $pull: { [`tiers.${t}`]: { $in: musicaIds } } }
      );
    }
  }
  if (avaliacaoIds.length) {
    await Comentario.deleteMany({ alvoTipo: 'resenha', alvoId: { $in: avaliacaoIds.map(String) } });
  }
}

async function aoRemoverAvaliacao({ avaliacaoId }) {
  await Comentario.deleteMany({ alvoTipo: 'resenha', alvoId: String(avaliacaoId) });
}

async function aoRemoverMusicas({ musicaIds = [] }) {
  if (!musicaIds.length) return;
  for (const t of ['S', 'A', 'B', 'C', 'D']) {
    await TierList.updateMany(
      { itemTipo: 'musica', [`tiers.${t}`]: { $in: musicaIds } },
      { $pull: { [`tiers.${t}`]: { $in: musicaIds } } }
    );
  }
}

const TRATADORES = {
  'album.removido': aoRemoverAlbum,
  'musicas.removidas': aoRemoverMusicas,
  'avaliacao.removida': aoRemoverAvaliacao
};

async function consumir() {
  for (;;) {
    try {
      const conexao = await amqp.connect(process.env.RABBITMQ_URL);
      conexao.on('error', () => {});
      conexao.on('close', () => {
        console.log('[community] RabbitMQ desconectou; reconectando...');
        setTimeout(consumir, 3000);
      });
      const canal = await conexao.createChannel();
      await canal.assertExchange(EXCHANGE, 'topic', { durable: true });
      await canal.assertQueue(FILA_MORTA, { durable: true });
      await canal.assertQueue(FILA, {
        durable: true,
        deadLetterExchange: '',
        deadLetterRoutingKey: FILA_MORTA
      });
      for (const chave of Object.keys(TRATADORES)) await canal.bindQueue(FILA, EXCHANGE, chave);
      canal.prefetch(5);

      await canal.consume(FILA, async (msg) => {
        if (!msg) return;
        const chave = msg.fields.routingKey;
        try {
          const evento = JSON.parse(msg.content.toString());
          await TRATADORES[chave](evento);
          console.log(`[community] Evento processado: ${chave}`);
          canal.ack(msg);
        } catch (e) {
          console.error(`[community] Falha ao processar ${chave}:`, e.message);
          canal.nack(msg, false, false); // vai para a fila morta (DLQ) em vez de travar a fila
        }
      });
      console.log('[community] Consumindo eventos do RabbitMQ');
      return;
    } catch (e) {
      console.log('[community] Aguardando RabbitMQ...');
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

module.exports = { consumir };
