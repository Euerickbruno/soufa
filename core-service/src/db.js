const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(254) UNIQUE,
  senha VARCHAR(60),
  perfil VARCHAR(10) NOT NULL CHECK (perfil IN ('artista', 'fa'))
);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email VARCHAR(254);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha VARCHAR(60);
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_uq ON usuarios (LOWER(email)) WHERE email IS NOT NULL;
CREATE TABLE IF NOT EXISTS artistas (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  genero VARCHAR(60),
  bio TEXT,
  foto_url TEXT,
  musicbrainz_id TEXT
);
ALTER TABLE artistas ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE artistas ADD COLUMN IF NOT EXISTS musicbrainz_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS artistas_musicbrainz_id_uq ON artistas (musicbrainz_id) WHERE musicbrainz_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS albuns (
  id SERIAL PRIMARY KEY,
  artista_id INTEGER NOT NULL REFERENCES artistas(id) ON DELETE CASCADE,
  titulo VARCHAR(120) NOT NULL,
  ano INTEGER NOT NULL,
  capa_url TEXT,
  clipe_url TEXT,
  faixas TEXT[] NOT NULL DEFAULT '{}',
  musicbrainz_id TEXT
);
ALTER TABLE albuns ADD COLUMN IF NOT EXISTS faixas TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE albuns ADD COLUMN IF NOT EXISTS musicbrainz_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS albuns_musicbrainz_id_uq ON albuns (musicbrainz_id) WHERE musicbrainz_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS musicas (
  id SERIAL PRIMARY KEY,
  album_id INTEGER NOT NULL REFERENCES albuns(id) ON DELETE CASCADE,
  titulo VARCHAR(200) NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  musicbrainz_id TEXT,
  UNIQUE (album_id, titulo)
);
ALTER TABLE musicas ADD COLUMN IF NOT EXISTS musicbrainz_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS musicas_musicbrainz_id_uq ON musicas (album_id, musicbrainz_id) WHERE musicbrainz_id IS NOT NULL;
INSERT INTO musicas (album_id, titulo, ordem)
SELECT a.id, BTRIM(faixa.titulo), faixa.ordem::int
  FROM albuns a
 CROSS JOIN LATERAL UNNEST(a.faixas) WITH ORDINALITY AS faixa(titulo, ordem)
 WHERE BTRIM(faixa.titulo) <> ''
ON CONFLICT (album_id, titulo) DO NOTHING;
CREATE TABLE IF NOT EXISTS avaliacoes (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  album_id INTEGER NOT NULL REFERENCES albuns(id) ON DELETE CASCADE,
  criada_em TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id, album_id)
);
CREATE TABLE IF NOT EXISTS avaliacao_versoes (
  id SERIAL PRIMARY KEY,
  avaliacao_id INTEGER NOT NULL REFERENCES avaliacoes(id) ON DELETE CASCADE,
  letra INTEGER NOT NULL CHECK (letra BETWEEN 0 AND 10),
  producao INTEGER NOT NULL CHECK (producao BETWEEN 0 AND 10),
  vocal INTEGER NOT NULL CHECK (vocal BETWEEN 0 AND 10),
  nostalgia INTEGER NOT NULL CHECK (nostalgia BETWEEN 0 AND 10),
  nota_geral NUMERIC(4,2) NOT NULL,
  resenha TEXT,
  criada_em TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS album_estatistica (
  album_id INTEGER PRIMARY KEY REFERENCES albuns(id) ON DELETE CASCADE,
  qtd INTEGER NOT NULL DEFAULT 0,
  soma_letra INTEGER NOT NULL DEFAULT 0,
  soma_producao INTEGER NOT NULL DEFAULT 0,
  soma_vocal INTEGER NOT NULL DEFAULT 0,
  soma_nostalgia INTEGER NOT NULL DEFAULT 0
);
`;

// O Postgres pode demorar alguns segundos para aceitar conexões na primeira subida.
async function iniciar() {
  for (let tentativa = 1; tentativa <= 15; tentativa++) {
    try {
      await pool.query(ESQUEMA);
      console.log('[core] Banco PostgreSQL pronto');
      return;
    } catch (e) {
      console.log(`[core] Aguardando PostgreSQL (${tentativa}/15): ${e.message}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw new Error('Não foi possível conectar ao PostgreSQL');
}

module.exports = { pool, iniciar };
