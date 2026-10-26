const Avaliacao = require('../models/avaliacao');
const Album = require('../models/album');
const eventos = require('../events');

const DIMENSOES = ['letra', 'producao', 'vocal', 'nostalgia'];

// A validação das notas (inteiros de 0 a 10) é feita aqui, e não só no formulário.
function validar(corpo) {
  const notas = {};
  for (const d of DIMENSOES) {
    const v = Number(corpo[d]);
    if (corpo[d] === '' || corpo[d] === undefined || !Number.isInteger(v) || v < 0 || v > 10) {
      return { erro: `A nota de ${d} deve ser um número inteiro de 0 a 10` };
    }
    notas[d] = v;
  }
  const resenha = String(corpo.resenha || '').trim();
  if (resenha.length > 2000) return { erro: 'A resenha deve ter até 2000 caracteres' };
  return { notas, resenha: resenha || null };
}

exports.salvar = async (req, res) => {
  const album = await Album.buscar(parseInt(req.body.albumId, 10));
  if (!album) return res.status(404).json({ erro: 'Álbum não encontrado' });
  const { erro, notas, resenha } = validar(req.body);
  if (erro) return res.status(400).json({ erro });
  const r = await Avaliacao.salvar(req.usuario.id, album.id, notas, resenha);
  res.status(r.nova ? 201 : 200).json(r);
};

exports.minhaDoAlbum = async (req, res) => res.json(await Avaliacao.minhaDoAlbum(req.usuario.id, req.params.id));

exports.resenhasDoAlbum = async (req, res) => res.json(await Avaliacao.resenhasDoAlbum(req.params.id));

exports.minhas = async (req, res) => res.json(await Avaliacao.minhas(req.usuario.id));

exports.remover = async (req, res) => {
  const av = await Avaliacao.buscar(req.params.id);
  if (!av) return res.status(404).json({ erro: 'Avaliação não encontrada' });
  if (av.usuario_id !== req.usuario.id) return res.status(403).json({ erro: 'Só o autor pode excluir a avaliação' });
  await Avaliacao.remover(av.id);
  // Pub/Sub: o community-service apaga os comentários feitos na resenha.
  eventos.publicar('avaliacao.removida', { avaliacaoId: av.id, albumId: av.album_id });
  res.status(204).end();
};
