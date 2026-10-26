const mongoose = require('mongoose');
const TierList = require('../models/TierList');
const Comentario = require('../models/Comentario');

const TIERS = ['S', 'A', 'B', 'C', 'D'];
const TIPOS_ITEM = ['album', 'musica'];
const PONTOS = { S: 5, A: 4, B: 3, C: 2, D: 1 };
const LETRA_POR_PONTO = { 5: 'S', 4: 'A', 3: 'B', 2: 'C', 1: 'D' };

// Valida o corpo e garante que cada álbum aparece uma única vez.
function validar(corpo) {
  const titulo = String(corpo.titulo || '').trim();
  const artistaId = parseInt(corpo.artistaId, 10);
  const itemTipo = String(corpo.itemTipo || 'album');
  const formato = String(corpo.formato || 'tiers');
  if (titulo.length < 1 || titulo.length > 80) return { erro: 'O título deve ter entre 1 e 80 caracteres' };
  if (!Number.isInteger(artistaId)) return { erro: 'Artista inválido' };
  if (!TIPOS_ITEM.includes(itemTipo)) return { erro: 'Tipo de item inválido' };
  if (!['tiers', 'ranking'].includes(formato) || (formato === 'ranking' && itemTipo !== 'musica')) return { erro: 'Formato de lista inválido' };
  const tiers = {};
  const vistos = new Set();
  for (const t of TIERS) {
    const lista = (corpo.tiers && corpo.tiers[t]) || [];
    if (!Array.isArray(lista)) return { erro: `Tier ${t} inválido` };
    tiers[t] = [];
    for (const item of lista) {
      const id = Number(item);
      if (!Number.isInteger(id) || id < 1) return { erro: 'Item inválido na tier list' };
      if (vistos.has(id)) return { erro: 'Um álbum não pode aparecer em dois tiers' };
      vistos.add(id);
      tiers[t].push(id);
    }
  }
  if (formato === 'ranking' && (tiers.A.length || tiers.B.length || tiers.C.length || tiers.D.length)) return { erro: 'Um ranking deve ter uma única ordem de músicas' };
  return { dados: { titulo, artistaId, itemTipo, formato, tiers } };
}

exports.listar = async (req, res) => {
  const filtro = {};
  if (req.query.usuarioId) filtro.usuarioId = Number(req.query.usuarioId);
  if (req.query.artistaId) filtro.artistaId = Number(req.query.artistaId);
  if (req.query.itemTipo && TIPOS_ITEM.includes(req.query.itemTipo)) filtro.itemTipo = req.query.itemTipo;
  res.json(await TierList.find(filtro).sort({ atualizadaEm: -1 }).lean());
};

exports.buscar = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ erro: 'Tier list não encontrada' });
  const t = await TierList.findById(req.params.id).lean();
  if (!t) return res.status(404).json({ erro: 'Tier list não encontrada' });
  res.json(t);
};

exports.criar = async (req, res) => {
  const { erro, dados } = validar(req.body);
  if (erro) return res.status(400).json({ erro });
  res.status(201).json(await TierList.create({ ...dados, usuarioId: req.usuario.id, usuarioNome: req.usuario.nome }));
};

exports.atualizar = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ erro: 'Tier list não encontrada' });
  const t = await TierList.findById(req.params.id);
  if (!t) return res.status(404).json({ erro: 'Tier list não encontrada' });
  if (t.usuarioId !== req.usuario.id) return res.status(403).json({ erro: 'Só o dono pode editar a tier list' });
  const { erro, dados } = validar(req.body);
  if (erro) return res.status(400).json({ erro });
  t.titulo = dados.titulo;
  t.itemTipo = dados.itemTipo;
  t.formato = dados.formato;
  t.tiers = dados.tiers;
  t.atualizadaEm = new Date();
  await t.save();
  res.json(t);
};

exports.remover = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ erro: 'Tier list não encontrada' });
  const t = await TierList.findById(req.params.id);
  if (!t) return res.status(404).json({ erro: 'Tier list não encontrada' });
  if (t.usuarioId !== req.usuario.id) return res.status(403).json({ erro: 'Só o dono pode excluir a tier list' });
  await Comentario.deleteMany({ alvoTipo: 'tierlist', alvoId: String(t._id) });
  await t.deleteOne();
  res.status(204).end();
};

// Consenso: S=5 ... D=1, média por álbum entre todas as tier lists do artista.
// Concordância: % de álbuns da lista do usuário que caem no mesmo tier do consenso.
exports.consenso = async (req, res) => {
  const artistaId = Number(req.params.artistaId);
  const itemTipo = TIPOS_ITEM.includes(req.query.itemTipo) ? req.query.itemTipo : 'album';
  const filtro = itemTipo === 'album'
    ? { artistaId, $or: [{ itemTipo: 'album' }, { itemTipo: { $exists: false } }] }
    : { artistaId, itemTipo };
  const listas = await TierList.find(filtro).lean();
  const acumulado = {};
  listas.forEach((l) => TIERS.forEach((t) => (l.tiers[t] || []).forEach((id) => {
    acumulado[id] = acumulado[id] || { soma: 0, votos: 0 };
    acumulado[id].soma += PONTOS[t];
    acumulado[id].votos += 1;
  })));
  const itens = Object.entries(acumulado)
    .map(([id, a]) => {
      const media = Math.round((a.soma / a.votos) * 100) / 100;
      return { itemId: Number(id), media, votos: a.votos, tier: LETRA_POR_PONTO[Math.round(media)] };
    })
    .sort((x, y) => y.media - x.media);

  let concordancia = null;
  if (req.query.usuarioId) {
    const minha = listas.find((l) => l.usuarioId === Number(req.query.usuarioId));
    if (minha) {
      const consensoPorItem = Object.fromEntries(itens.map((item) => [item.itemId, item.tier]));
      let total = 0;
      let iguais = 0;
      TIERS.forEach((t) => (minha.tiers[t] || []).forEach((id) => {
        total += 1;
        if (consensoPorItem[id] === t) iguais += 1;
      }));
      concordancia = total ? Math.round((iguais / total) * 100) : null;
    }
  }
  res.json({ totalListas: listas.length, itemTipo, itens, concordancia });
};
