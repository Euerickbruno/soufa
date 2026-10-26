const { pool } = require('../db');

exports.listarPorAlbum = async (albumId) =>
  (await pool.query(
    'SELECT id, album_id, titulo, ordem, musicbrainz_id FROM musicas WHERE album_id = $1 ORDER BY ordem, id',
    [albumId]
  )).rows;

exports.substituirComClient = async (client, albumId, titulos) => {
  const atuais = (await client.query(
    'SELECT id, titulo, musicbrainz_id FROM musicas WHERE album_id = $1 ORDER BY ordem, id',
    [albumId]
  )).rows;
  const porTitulo = new Map(atuais.map((musica) => [musica.titulo, musica]));
  const mantidos = new Set();
  for (const [indice, faixa] of titulos.entries()) {
    const titulo = typeof faixa === 'string' ? faixa : faixa.titulo;
    const musicbrainzId = typeof faixa === 'string' ? null : faixa.musicbrainzId || null;
    const existente = porTitulo.get(titulo);
    if (existente) {
      mantidos.add(existente.id);
      await client.query(
        'UPDATE musicas SET ordem = $2, musicbrainz_id = COALESCE($3, musicbrainz_id) WHERE id = $1',
        [existente.id, indice + 1, musicbrainzId]
      );
    } else {
      const inserida = (await client.query(
        'INSERT INTO musicas (album_id, titulo, ordem, musicbrainz_id) VALUES ($1, $2, $3, $4) RETURNING id',
        [albumId, titulo, indice + 1, musicbrainzId]
      )).rows[0];
      mantidos.add(inserida.id);
    }
  }
  const removidas = atuais.filter((musica) => !mantidos.has(musica.id)).map((musica) => musica.id);
  if (removidas.length) await client.query('DELETE FROM musicas WHERE id = ANY($1::int[])', [removidas]);
  return removidas;
};

exports.adicionar = async (albumId, titulo) =>
  (await pool.query(
    `INSERT INTO musicas (album_id, titulo, ordem)
     VALUES ($1, $2, COALESCE((SELECT MAX(ordem) + 1 FROM musicas WHERE album_id = $1), 1))
     ON CONFLICT (album_id, titulo) DO NOTHING
     RETURNING id, album_id, titulo, ordem`,
    [albumId, titulo]
  )).rows[0] || null;

exports.idsPorAlbum = async (albumId) =>
  (await pool.query('SELECT id FROM musicas WHERE album_id = $1', [albumId])).rows.map((musica) => musica.id);

exports.listarPorArtista = async (artistaId) =>
  (await pool.query(
    `SELECT m.id, m.album_id, m.titulo, m.ordem, m.musicbrainz_id, al.titulo AS album_titulo, al.ano
       FROM musicas m JOIN albuns al ON al.id = m.album_id
      WHERE al.artista_id = $1 ORDER BY al.ano, al.titulo, m.ordem, m.id`,
    [artistaId]
  )).rows;