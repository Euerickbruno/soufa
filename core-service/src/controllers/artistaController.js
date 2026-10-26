const Artista = require('../models/artista');
const Album = require('../models/album');
const Musica = require('../models/musica');
const Avaliacao = require('../models/avaliacao');
const eventos = require('../events');

function validar(corpo) {
  const nome = String(corpo.nome || '').trim();
  const genero = String(corpo.genero || '').trim();
  const bio = String(corpo.bio || '').trim();
  const fotoUrl = String(corpo.foto_url || '').trim();
  const urlValida = /^https?:\/\/\S+$/i.test(fotoUrl);
  if (nome.length < 2 || nome.length > 100) return { erro: 'O nome do artista deve ter entre 2 e 100 caracteres' };
  if (genero.length > 60) return { erro: 'O gênero deve ter até 60 caracteres' };
  if (bio.length > 1000) return { erro: 'A bio deve ter até 1000 caracteres' };
  if (!urlValida) return { erro: 'Informe uma URL válida para a foto do artista' };
  return { dados: { nome, genero, bio, fotoUrl } };
}

exports.listar = async (req, res) => res.json(await Artista.listar());

exports.buscar = async (req, res) => {
  const artista = await Artista.buscar(req.params.id);
  if (!artista) return res.status(404).json({ erro: 'Artista não encontrado' });
  const albuns = await Album.listarPorArtista(artista.id);
  const musicas = await Musica.listarPorArtista(artista.id);
  res.json({ ...artista, albuns: Array.isArray(albuns) ? albuns : [], musicas: Array.isArray(musicas) ? musicas : [] });
};

exports.criar = async (req, res) => {
  if (!req.usuario) return res.status(401).json({ erro: 'Autenticação necessária' });
  const { erro, dados } = validar(req.body);
  if (erro) return res.status(400).json({ erro });
  res.status(201).json(await Artista.criar({ ...dados, usuarioId: req.usuario.id }));
};

exports.atualizar = async (req, res) => {
  const artista = await Artista.buscar(req.params.id);
  if (!artista) return res.status(404).json({ erro: 'Artista não encontrado' });
  if (req.usuario.tipo !== 'ARTISTA' || artista.usuario_id !== req.usuario.id) return res.status(403).json({ erro: 'Somente o perfil ARTISTA vinculado pode editar este artista' });
  const { erro, dados } = validar(req.body);
  if (erro) return res.status(400).json({ erro });
  res.json(await Artista.atualizar(artista.id, dados));
};

exports.remover = async (req, res) => {
  const artista = await Artista.buscar(req.params.id);
  if (!artista) return res.status(404).json({ erro: 'Artista não encontrado' });
  if (req.usuario.tipo !== 'ARTISTA' || artista.usuario_id !== req.usuario.id) return res.status(403).json({ erro: 'Somente o perfil ARTISTA vinculado pode excluir este artista' });
  // Coleta os ids antes de apagar para avisar os outros serviços (Pub/Sub).
  const albuns = await Album.listarPorArtista(artista.id);
  const avisos = [];
  for (const a of albuns) avisos.push({ albumId: a.id, avaliacaoIds: await Avaliacao.idsPorAlbum(a.id) });
  await Artista.remover(artista.id);
  avisos.forEach((dados) => eventos.publicar('album.removido', dados));
  res.status(204).end();
};
