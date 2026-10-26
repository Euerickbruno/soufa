const mongoose = require('mongoose');
const Comentario = require('../models/Comentario');

const MAX_PROFUNDIDADE = 2; // níveis 0, 1 e 2 = 3 níveis de conversa
const ALVOS = ['resenha', 'tierlist'];

// Monta a árvore a partir da lista plana (já ordenada por data).
function montarArvore(docs) {
  const mapa = new Map();
  docs.forEach((d) => mapa.set(String(d._id), { ...d, _id: String(d._id), paiId: d.paiId ? String(d.paiId) : null, respostas: [] }));
  const raizes = [];
  mapa.forEach((no) => {
    if (no.paiId && mapa.has(no.paiId)) mapa.get(no.paiId).respostas.push(no);
    else raizes.push(no);
  });
  return raizes;
}

exports.listar = async (req, res) => {
  const { alvoTipo, alvoId } = req.query;
  if (!ALVOS.includes(alvoTipo) || !alvoId) return res.status(400).json({ erro: 'Informe alvoTipo e alvoId válidos' });
  const docs = await Comentario.find({ alvoTipo, alvoId: String(alvoId) }).sort({ criadoEm: 1 }).lean();
  res.json(montarArvore(docs));
};

exports.criar = async (req, res) => {
  const { alvoTipo, alvoId, paiId } = req.body;
  const texto = String(req.body.texto || '').trim();
  const oficial = req.body.oficial === true || req.body.oficial === 'true';
  const destacado = req.body.destacado === true || req.body.destacado === 'true';
  const artistaId = parseInt(req.body.artistaId, 10);
  if (!ALVOS.includes(alvoTipo) || !alvoId) return res.status(400).json({ erro: 'Alvo do comentário inválido' });
  if (texto.length < 1 || texto.length > 1000) return res.status(400).json({ erro: 'O comentário deve ter entre 1 e 1000 caracteres' });
  if (oficial || destacado) {
    if (req.usuario.tipo !== 'ARTISTA') return res.status(403).json({ erro: 'Posts oficiais e destaques são exclusivos do perfil ARTISTA' });
    if (!Number.isInteger(artistaId) || artistaId !== req.usuario.artistaId) return res.status(403).json({ erro: 'O perfil ARTISTA não está vinculado a este artista' });
  }

  const _id = new mongoose.Types.ObjectId();
  let paiFinal = null;
  let raizId = _id;
  let profundidade = 0;

  if (paiId) {
    if (!mongoose.isValidObjectId(paiId)) return res.status(400).json({ erro: 'Comentário respondido inválido' });
    const pai = await Comentario.findById(paiId);
    if (!pai || pai.alvoTipo !== alvoTipo || pai.alvoId !== String(alvoId)) {
      return res.status(400).json({ erro: 'O comentário respondido não pertence a este alvo' });
    }
    raizId = pai.raizId;
    if (pai.profundidade >= MAX_PROFUNDIDADE) {
      // Limite de aninhamento: a resposta vira irmã do comentário, não filha.
      paiFinal = pai.paiId;
      profundidade = pai.profundidade;
    } else {
      paiFinal = pai._id;
      profundidade = pai.profundidade + 1;
    }
  }

  const criado = await Comentario.create({
    _id, alvoTipo, alvoId: String(alvoId), paiId: paiFinal, raizId, profundidade,
    autorId: req.usuario.id, autorNome: req.usuario.nome, artistaId: oficial || destacado ? artistaId : null,
    oficial, destacado, texto
  });
  res.status(201).json(criado);
};

exports.atualizar = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ erro: 'Comentário não encontrado' });
  const c = await Comentario.findById(req.params.id);
  if (!c || c.removido) return res.status(404).json({ erro: 'Comentário não encontrado' });
  if (c.autorId !== req.usuario.id) return res.status(403).json({ erro: 'Só o autor pode editar o comentário' });
  const texto = String(req.body.texto || '').trim();
  if (texto.length < 1 || texto.length > 1000) return res.status(400).json({ erro: 'O comentário deve ter entre 1 e 1000 caracteres' });
  c.texto = texto;
  c.editadoEm = new Date();
  await c.save();
  res.json(c);
};

// Remoção lógica quando há respostas (evita respostas órfãs); física quando não há.
exports.remover = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ erro: 'Comentário não encontrado' });
  const c = await Comentario.findById(req.params.id);
  if (!c) return res.status(404).json({ erro: 'Comentário não encontrado' });
  if (c.autorId !== req.usuario.id) return res.status(403).json({ erro: 'Só o autor pode excluir o comentário' });
  const temRespostas = await Comentario.exists({ paiId: c._id });
  if (temRespostas) {
    c.removido = true;
    c.texto = '[comentário removido]';
    await c.save();
  } else {
    await c.deleteOne();
  }
  res.status(204).end();
};
