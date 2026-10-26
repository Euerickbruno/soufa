const { pool } = require('../db');

exports.criar = async ({ nome, email, senha, perfil }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'INSERT INTO usuarios (nome, email, senha, perfil) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, perfil',
      [nome, email, senha, perfil]
    );
    const usuario = result.rows[0];
    if (perfil === 'artista') {
      const artista = await client.query(
        'INSERT INTO artistas (usuario_id, nome) VALUES ($1, $2) RETURNING id',
        [usuario.id, nome]
      );
      usuario.artista_id = artista.rows[0].id;
    }
    await client.query('COMMIT');
    return usuario;
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }
};

exports.buscarPorEmail = async (email) => (await pool.query(
  `SELECT u.id, u.nome, u.email, u.senha, u.perfil,
          (SELECT a.id FROM artistas a WHERE a.usuario_id = u.id ORDER BY a.id LIMIT 1) AS artista_id
     FROM usuarios u WHERE LOWER(u.email) = LOWER($1)`, [email]
)).rows[0];

exports.listar = async () =>
	(await pool.query(
		`SELECT u.id, u.nome, u.perfil,
						(SELECT a.id FROM artistas a WHERE a.usuario_id = u.id ORDER BY a.id LIMIT 1) AS artista_id
			 FROM usuarios u ORDER BY u.id`
	)).rows;

exports.buscar = async (id) =>
	(await pool.query(
		`SELECT u.id, u.nome, u.perfil,
						(SELECT a.id FROM artistas a WHERE a.usuario_id = u.id ORDER BY a.id LIMIT 1) AS artista_id
			 FROM usuarios u WHERE u.id = $1`, [id]
	)).rows[0];
