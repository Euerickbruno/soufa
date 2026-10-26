const TierList = require('./models/TierList');
const Comentario = require('./models/Comentario');
const mongoose = require('mongoose');

// Dados de exemplo. Os ids de álbum e avaliação correspondem ao seed do core-service
// (banco novo): álbuns 1-3 são da Marina Solar; avaliações 1 (Ana) e 2 (Carlos) são do álbum 1.
async function seed() {
  if ((await TierList.countDocuments()) > 0 || (await Comentario.countDocuments()) > 0) return;
  console.log('[community] Banco vazio: criando dados de exemplo...');

  await TierList.create({
    usuarioId: 3, usuarioNome: 'Ana Lima', artistaId: 1, titulo: 'Minha ordem da Marina',
    tiers: { S: [1], A: [3], B: [2], C: [], D: [] }
  });
  await TierList.create({
    usuarioId: 4, usuarioNome: 'Carlos Dias', artistaId: 1, titulo: 'Discografia da Marina',
    tiers: { S: [3], A: [1], B: [], C: [2], D: [] }
  });

  // Conversa aninhada na resenha da Ana (avaliação 1): raiz -> resposta -> resposta da resposta.
  const raiz = new mongoose.Types.ObjectId();
  const resp1 = new mongoose.Types.ObjectId();
  await Comentario.create([
    { _id: raiz, alvoTipo: 'resenha', alvoId: '1', paiId: null, raizId: raiz, profundidade: 0, autorId: 4, autorNome: 'Carlos Dias',
      texto: 'Concordo que a nostalgia pesa muito nesse disco.', criadoEm: new Date(Date.now() - 3600000) },
    { _id: resp1, alvoTipo: 'resenha', alvoId: '1', paiId: raiz, raizId: raiz, profundidade: 1, autorId: 3, autorNome: 'Ana Lima',
      texto: 'Pesa mesmo, mas a produção também envelheceu bem.', criadoEm: new Date(Date.now() - 1800000) },
    { alvoTipo: 'resenha', alvoId: '1', paiId: resp1, raizId: raiz, profundidade: 2, autorId: 4, autorNome: 'Carlos Dias',
      texto: 'Aí a gente discorda. Ouve a faixa de abertura de novo!', criadoEm: new Date(Date.now() - 600000) }
  ]);
  console.log('[community] Dados de exemplo criados');
}

module.exports = seed;
