const Album = require('../models/album');
const Musica = require('../models/musica');
const Artista = require('../models/artista');
const Avaliacao = require('../models/avaliacao');
const eventos = require('../events');

function validar(corpo) {
  const titulo = String(corpo.titulo || '').trim();
  const ano = parseInt(corpo.ano, 10);
  const capaUrl = String(corpo.capaUrl || '').trim();
  const clipeUrl = String(corpo.clipeUrl || '').trim();
  const faixas = (Array.isArray(corpo.faixas) ? corpo.faixas : String(corpo.faixas || '').split(/\r?\n/))
    .map((faixa) => String(faixa).trim()).filter(Boolean);
  const urlValida = (u) => !u || /^https?:\/\/\S+$/i.test(u);
  if (titulo.length < 1 || titulo.length > 120) return { erro: 'O título deve ter entre 1 e 120 caracteres' };
  if (!Number.isInteger(ano) || ano < 1900 || ano > new Date().getFullYear() + 1) return { erro: 'Informe um ano válido' };
  if (!urlValida(capaUrl)) return { erro: 'A URL da capa deve começar com http:// ou https://' };
  if (!urlValida(clipeUrl)) return { erro: 'A URL do clipe deve começar com http:// ou https://' };
  if (faixas.length > 100 || faixas.some((faixa) => faixa.length > 200)) return { erro: 'A lista de faixas excede o limite permitido' };
  return { dados: { titulo, ano, capaUrl: capaUrl || null, clipeUrl: clipeUrl || null, faixas } };
}

exports.buscar = async (req, res) => {
  const album = await Album.buscar(req.params.id);
  if (!album) return res.status(404).json({ erro: 'Álbum não encontrado' });
  res.json(album);
};

exports.criar = async (req, res) => {
  const artista = await Artista.buscar(parseInt(req.body.artistaId, 10));
  if (!artista) return res.status(404).json({ erro: 'Artista não encontrado' });
  if (req.usuario.tipo !== 'ARTISTA' || artista.usuario_id !== req.usuario.id) return res.status(403).json({ erro: 'Somente o perfil ARTISTA vinculado pode cadastrar álbuns para este artista' });
  const { erro, dados } = validar(req.body);
  if (erro) return res.status(400).json({ erro });
  const novoAlbum = await Album.criar({ ...dados, artistaId: artista.id });
  res.status(201).json(await Album.buscar(novoAlbum.id));
};

exports.atualizar = async (req, res) => {
  const album = await Album.buscar(req.params.id);
  if (!album) return res.status(404).json({ erro: 'Álbum não encontrado' });
  if (req.usuario.tipo !== 'ARTISTA' || album.artista_usuario_id !== req.usuario.id) return res.status(403).json({ erro: 'Somente o perfil ARTISTA vinculado pode editar este álbum' });
  const { erro, dados } = validar(req.body);
  if (erro) return res.status(400).json({ erro });
  const { musicasRemovidas } = await Album.atualizar(album.id, dados);
  if (musicasRemovidas.length) eventos.publicar('musicas.removidas', { musicaIds: musicasRemovidas });
  res.json(await Album.buscar(album.id));
};

exports.adicionarMusica = async (req, res) => {
  const album = await Album.buscar(req.params.id);
  if (!album) return res.status(404).json({ erro: 'Álbum não encontrado' });
  const artista = await Artista.buscar(album.artista_id);
  if (req.usuario.tipo !== 'ARTISTA' || !artista || artista.usuario_id !== req.usuario.id) return res.status(403).json({ erro: 'Somente o perfil ARTISTA vinculado pode adicionar músicas a este álbum' });
  const titulo = String(req.body.titulo || '').trim();
  if (!titulo || titulo.length > 200) return res.status(400).json({ erro: 'Informe o título da música (até 200 caracteres).' });
  const musica = await Musica.adicionar(album.id, titulo);
  if (!musica) return res.status(409).json({ erro: 'Essa música já está cadastrada neste álbum.' });
  res.status(201).json(musica);
};

exports.musicasDoArtista = async (req, res) => {
  const artista = await Artista.buscar(req.params.artistaId);
  if (!artista) return res.status(404).json({ erro: 'Artista não encontrado' });
  res.json(await Musica.listarPorArtista(artista.id));
};

exports.remover = async (req, res) => {
  const album = await Album.buscar(req.params.id);
  if (!album) return res.status(404).json({ erro: 'Álbum não encontrado' });
  if (req.usuario.tipo !== 'ARTISTA' || album.artista_usuario_id !== req.usuario.id) return res.status(403).json({ erro: 'Somente o perfil ARTISTA vinculado pode excluir este álbum' });
  const avaliacaoIds = await Avaliacao.idsPorAlbum(album.id);
  const musicaIds = await Musica.idsPorAlbum(album.id);
  await Album.remover(album.id);
  // Pub/Sub: o community-service (MongoDB) limpa tier lists e comentários ligados ao álbum.
  eventos.publicar('album.removido', { albumId: album.id, musicaIds, avaliacaoIds });
  res.status(204).end();
};
