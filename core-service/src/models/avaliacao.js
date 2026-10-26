const { pool } = require('../db');

const mediaGeral = (n) => Math.round(((n.letra + n.producao + n.vocal + n.nostalgia) / 4) * 100) / 100;

async function inserirVersao(client, avaliacaoId, n, resenha) {
  await client.query(
    `INSERT INTO avaliacao_versoes (avaliacao_id, letra, producao, vocal, nostalgia, nota_geral, resenha)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [avaliacaoId, n.letra, n.producao, n.vocal, n.nostalgia, mediaGeral(n), resenha]
  );
}

exports.salvar = async (usuarioId, albumId, n, resenha) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existente = (await client.query(
      'SELECT id FROM avaliacoes WHERE usuario_id = $1 AND album_id = $2 FOR UPDATE', [usuarioId, albumId])).rows[0];

    if (!existente) {
      const av = (await client.query(
        'INSERT INTO avaliacoes (usuario_id, album_id) VALUES ($1, $2) RETURNING id', [usuarioId, albumId])).rows[0];
      await inserirVersao(client, av.id, n, resenha);
      await client.query(
        `INSERT INTO album_estatistica (album_id, qtd, soma_letra, soma_producao, soma_vocal, soma_nostalgia)
         VALUES ($1, 1, $2, $3, $4, $5)
         ON CONFLICT (album_id) DO UPDATE SET
           qtd = album_estatistica.qtd + 1,
           soma_letra = album_estatistica.soma_letra + EXCLUDED.soma_letra,
           soma_producao = album_estatistica.soma_producao + EXCLUDED.soma_producao,
           soma_vocal = album_estatistica.soma_vocal + EXCLUDED.soma_vocal,
           soma_nostalgia = album_estatistica.soma_nostalgia + EXCLUDED.soma_nostalgia`,
        [albumId, n.letra, n.producao, n.vocal, n.nostalgia]);
      await client.query('COMMIT');
      return { id: av.id, nova: true };
    }

    const antiga = (await client.query(
      'SELECT * FROM avaliacao_versoes WHERE avaliacao_id = $1 ORDER BY id DESC LIMIT 1', [existente.id])).rows[0];
    await inserirVersao(client, existente.id, n, resenha);
    await client.query(
      `UPDATE album_estatistica SET
         soma_letra = soma_letra - $2 + $6,
         soma_producao = soma_producao - $3 + $7,
         soma_vocal = soma_vocal - $4 + $8,
         soma_nostalgia = soma_nostalgia - $5 + $9
       WHERE album_id = $1`,
      [albumId, antiga.letra, antiga.producao, antiga.vocal, antiga.nostalgia, n.letra, n.producao, n.vocal, n.nostalgia]);
    await client.query('COMMIT');
    return { id: existente.id, nova: false };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

exports.buscar = async (id) => (await pool.query('SELECT * FROM avaliacoes WHERE id = $1', [id])).rows[0];

exports.idsPorAlbum = async (albumId) =>
  (await pool.query('SELECT id FROM avaliacoes WHERE album_id = $1', [albumId])).rows.map((r) => r.id);

exports.remover = async (id) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const av = (await client.query('SELECT * FROM avaliacoes WHERE id = $1 FOR UPDATE', [id])).rows[0];
    const ultima = (await client.query(
      'SELECT * FROM avaliacao_versoes WHERE avaliacao_id = $1 ORDER BY id DESC LIMIT 1', [id])).rows[0];
    await client.query('DELETE FROM avaliacoes WHERE id = $1', [id]);
    await client.query(
      `UPDATE album_estatistica SET qtd = qtd - 1,
         soma_letra = soma_letra - $2, soma_producao = soma_producao - $3,
         soma_vocal = soma_vocal - $4, soma_nostalgia = soma_nostalgia - $5
       WHERE album_id = $1`,
      [av.album_id, ultima.letra, ultima.producao, ultima.vocal, ultima.nostalgia]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

exports.minhaDoAlbum = async (usuarioId, albumId) => {
  const av = (await pool.query('SELECT id FROM avaliacoes WHERE usuario_id = $1 AND album_id = $2', [usuarioId, albumId])).rows[0];
  if (!av) return null;
  const versoes = (await pool.query('SELECT * FROM avaliacao_versoes WHERE avaliacao_id = $1 ORDER BY id', [av.id])).rows;
  return { id: av.id, versoes, atual: versoes[versoes.length - 1] };
};

exports.resenhasDoAlbum = async (albumId) =>
  (await pool.query(
    `SELECT DISTINCT ON (a.id) a.id AS avaliacao_id, a.usuario_id, u.nome AS usuario_nome,
            v.letra, v.producao, v.vocal, v.nostalgia, v.nota_geral, v.resenha, v.criada_em
       FROM avaliacoes a
       JOIN usuarios u ON u.id = a.usuario_id
       JOIN avaliacao_versoes v ON v.avaliacao_id = a.id
      WHERE a.album_id = $1
      ORDER BY a.id, v.id DESC`, [albumId])).rows;

exports.minhas = async (usuarioId) => {
  const avs = (await pool.query(
    `SELECT a.id, a.album_id, al.titulo AS album_titulo, ar.nome AS artista_nome
       FROM avaliacoes a JOIN albuns al ON al.id = a.album_id JOIN artistas ar ON ar.id = al.artista_id
      WHERE a.usuario_id = $1 ORDER BY a.id DESC`, [usuarioId])).rows;
  for (const av of avs) {
    av.versoes = (await pool.query('SELECT * FROM avaliacao_versoes WHERE avaliacao_id = $1 ORDER BY id', [av.id])).rows;
  }
  return avs;
};
