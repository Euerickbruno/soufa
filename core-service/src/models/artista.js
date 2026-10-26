const { pool } = require('../db');

exports.listar = async () =>
  (await pool.query(
    `SELECT a.id, a.nome, a.genero, a.bio, a.foto_url, a.musicbrainz_id, a.usuario_id, COUNT(al.id)::int AS total_albuns
       FROM artistas a LEFT JOIN albuns al ON al.artista_id = a.id
      GROUP BY a.id ORDER BY a.nome`
  )).rows;

exports.buscar = async (id) => (await pool.query('SELECT * FROM artistas WHERE id = $1', [id])).rows[0];

exports.buscarPorMusicBrainzId = async (musicbrainzId) =>
  (await pool.query('SELECT * FROM artistas WHERE musicbrainz_id = $1', [musicbrainzId])).rows[0];

exports.buscarPorNome = async (nome) =>
  (await pool.query('SELECT * FROM artistas WHERE LOWER(nome) = LOWER($1) ORDER BY id LIMIT 1', [nome])).rows[0];

exports.vincularMusicBrainzId = async (id, musicbrainzId) =>
  (await pool.query('UPDATE artistas SET musicbrainz_id = $2 WHERE id = $1 AND musicbrainz_id IS NULL RETURNING *', [id, musicbrainzId])).rows[0];

exports.criarImportado = async ({ usuarioId, nome, genero, bio, musicbrainzId }) =>
  (await pool.query(
    'INSERT INTO artistas (usuario_id, nome, genero, bio, musicbrainz_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [usuarioId, nome, genero || null, bio || null, musicbrainzId]
  )).rows[0];

exports.criar = async ({ usuarioId, nome, genero, bio, fotoUrl }) =>
  (await pool.query(
    'INSERT INTO artistas (usuario_id, nome, genero, bio, foto_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [usuarioId, nome, genero, bio, fotoUrl]
  )).rows[0];

exports.atualizar = async (id, { nome, genero, bio, fotoUrl }) =>
  (await pool.query('UPDATE artistas SET nome = $2, genero = $3, bio = $4, foto_url = $5 WHERE id = $1 RETURNING *', [id, nome, genero, bio, fotoUrl])).rows[0];

exports.remover = async (id) => pool.query('DELETE FROM artistas WHERE id = $1', [id]);
