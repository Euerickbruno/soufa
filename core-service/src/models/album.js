const { pool } = require('../db');
const Musica = require('./musica');

const ESTATISTICA = `
  COALESCE(e.qtd, 0) AS qtd,
  CASE WHEN COALESCE(e.qtd, 0) = 0 THEN 0 ELSE ROUND(e.soma_letra::numeric / e.qtd, 1) END AS media_letra,
  CASE WHEN COALESCE(e.qtd, 0) = 0 THEN 0 ELSE ROUND(e.soma_producao::numeric / e.qtd, 1) END AS media_producao,
  CASE WHEN COALESCE(e.qtd, 0) = 0 THEN 0 ELSE ROUND(e.soma_vocal::numeric / e.qtd, 1) END AS media_vocal,
  CASE WHEN COALESCE(e.qtd, 0) = 0 THEN 0 ELSE ROUND(e.soma_nostalgia::numeric / e.qtd, 1) END AS media_nostalgia,
  CASE WHEN COALESCE(e.qtd, 0) = 0 THEN 0
       ELSE ROUND((e.soma_letra + e.soma_producao + e.soma_vocal + e.soma_nostalgia)::numeric / (4 * e.qtd), 1) END AS media_geral`;

function formatar(l) {
  const musicas = l.musicas || [];
  return {
    id: l.id, titulo: l.titulo, ano: l.ano, capa_url: l.capa_url, clipe_url: l.clipe_url,
    musicbrainz_id: l.musicbrainz_id,
    musicas,
    faixas: musicas.length ? musicas.map((musica) => musica.titulo) : (l.faixas || []),
    artista_id: l.artista_id, artista_nome: l.artista_nome, artista_usuario_id: l.artista_usuario_id,
    estatistica: {
      qtd: l.qtd,
      letra: Number(l.media_letra), producao: Number(l.media_producao),
      vocal: Number(l.media_vocal), nostalgia: Number(l.media_nostalgia), geral: Number(l.media_geral)
    }
  };
}

const LISTAR_MUSICAS = `COALESCE((
  SELECT JSON_AGG(JSON_BUILD_OBJECT('id', m.id, 'titulo', m.titulo, 'ordem', m.ordem, 'musicbrainzId', m.musicbrainz_id) ORDER BY m.ordem)
    FROM musicas m WHERE m.album_id = al.id
), '[]'::json) AS musicas`;

exports.buscar = async (id) => {
  const r = await pool.query(
    `SELECT al.*, ${LISTAR_MUSICAS}, ar.nome AS artista_nome, ar.usuario_id AS artista_usuario_id, ${ESTATISTICA}
       FROM albuns al JOIN artistas ar ON ar.id = al.artista_id
       LEFT JOIN album_estatistica e ON e.album_id = al.id
      WHERE al.id = $1`, [id]);
  return r.rows[0] ? formatar(r.rows[0]) : null;
};

exports.buscarPorMusicBrainzId = async (musicbrainzId) =>
  (await pool.query('SELECT * FROM albuns WHERE musicbrainz_id = $1', [musicbrainzId])).rows[0];

exports.buscarPorArtistaETitulo = async (artistaId, titulo) =>
  (await pool.query('SELECT * FROM albuns WHERE artista_id = $1 AND LOWER(titulo) = LOWER($2) ORDER BY id LIMIT 1', [artistaId, titulo])).rows[0];

exports.vincularMusicBrainzId = async (id, musicbrainzId) =>
  (await pool.query('UPDATE albuns SET musicbrainz_id = $2 WHERE id = $1 AND musicbrainz_id IS NULL RETURNING *', [id, musicbrainzId])).rows[0];

exports.criarImportado = async ({ artistaId, titulo, ano, musicbrainzId }) =>
  (await pool.query(
    `INSERT INTO albuns (artista_id, titulo, ano, musicbrainz_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (musicbrainz_id) WHERE musicbrainz_id IS NOT NULL DO NOTHING
     RETURNING *`,
    [artistaId, titulo, ano, musicbrainzId]
  )).rows[0] || exports.buscarPorMusicBrainzId(musicbrainzId);

exports.listarPorArtista = async (artistaId) =>
  (await pool.query(
    `SELECT al.*, ${LISTAR_MUSICAS}, ar.nome AS artista_nome, ar.usuario_id AS artista_usuario_id, ${ESTATISTICA}
       FROM albuns al JOIN artistas ar ON ar.id = al.artista_id
       LEFT JOIN album_estatistica e ON e.album_id = al.id
      WHERE al.artista_id = $1 ORDER BY al.ano, al.titulo`, [artistaId])).rows.map(formatar);

exports.criar = async ({ artistaId, titulo, ano, capaUrl, clipeUrl, faixas = [], musicbrainzId = null }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const album = (await client.query(
      'INSERT INTO albuns (artista_id, titulo, ano, capa_url, clipe_url, faixas, musicbrainz_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [artistaId, titulo, ano, capaUrl, clipeUrl, faixas.map((faixa) => typeof faixa === 'string' ? faixa : faixa.titulo), musicbrainzId])).rows[0];
    await Musica.substituirComClient(client, album.id, faixas);
    await client.query('COMMIT');
    return album;
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }
};

exports.atualizar = async (id, { titulo, ano, capaUrl, clipeUrl, faixas = [] }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const album = (await client.query(
      'UPDATE albuns SET titulo = $2, ano = $3, capa_url = $4, clipe_url = $5, faixas = $6 WHERE id = $1 RETURNING *',
      [id, titulo, ano, capaUrl, clipeUrl, faixas.map((faixa) => typeof faixa === 'string' ? faixa : faixa.titulo)])).rows[0];
    if (!album) {
      await client.query('ROLLBACK');
      return null;
    }
    const musicasRemovidas = await Musica.substituirComClient(client, album.id, faixas);
    await client.query('COMMIT');
    return { album, musicasRemovidas };
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }
};

exports.remover = async (id) => pool.query('DELETE FROM albuns WHERE id = $1', [id]);
