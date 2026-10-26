const { pool, iniciar } = require('./db');

const artistas = [
  {
    nome: 'Liniker', genero: 'MPB / Soul',
    bio: 'Cantora, compositora e atriz brasileira, conhecida por sua mistura de soul, MPB e pop.',
    fotoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Liniker_at_Montreux_Jazz_Festival_2026_06.jpg',
    albuns: [
      { titulo: 'CAJU', ano: 2024, capaUrl: 'https://cdn.dooca.store/101284/products/01-capa-site-caju-1000x1000-copiar_640x640%2Bfill_ffffff.jpg?v=1730922465&webp=0', faixas: [['CAJU', '04:27'], ['Tudo Que Noite Apavora', '03:34'], ['Feixe', '04:12']] },
      { titulo: 'Indigo Borboleta Anil', ano: 2021, capaUrl: null, faixas: [['Antes de Tudo', '03:30'], ['Psiu', '03:45'], ['Baby 95', '04:12']] }
    ]
  },
  {
    nome: 'Priscila Senna', genero: 'Brega / Forr\u00f3',
    bio: 'Cantora pernambucana conhecida como a Musa do Brega.',
    fotoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Priscilasenna.photo.jpg',
    albuns: [
      { titulo: 'Priscila Senna Ao Vivo', ano: 2024, capaUrl: 'https://i.audiomack.com/priscila-senna/4641c8a641.webp', faixas: [['Labirinto', '03:42'], ['Alvejante', '03:31'], ['Segredo', '03:48']] },
      { titulo: 'MUSA', ano: 2025, capaUrl: null, faixas: [['Alvejante', '03:31'], ['Sorte', '03:20'], ['Novo Namorado', '03:28']] }
    ]
  },
  {
    nome: 'Caike Souza', genero: 'MPB / Pop ac\u00fastico',
    bio: 'Cantor e compositor pernambucano de Arcoverde, conhecido por suas cancoes autorais e interpretacoes acusticas.',
    fotoUrl: 'https://imagens.ne10.uol.com.br/veiculos/_midias/png/2025/10/10/caike_souza__1_-35802874.png',
    albuns: [
      { titulo: 'Entre Flores e Dores', ano: 2025, capaUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/d4/02/77/d402773c-32ec-4ae1-f584-6ca7278d9b0e/198704649738_Cover.jpg/1200x1200bb.jpg', faixas: [['Sem Pisar no Ch\u00e3o', '03:21'], ['Balançar Com Voc\u00ea', '03:26'], ['H\u00e1 de Ser Pra Sempre', '03:34']] }
    ]
  },
  {
    nome: 'Caetano Veloso', genero: 'MPB / Tropicalismo',
    bio: 'Cantor e compositor brasileiro, uma das figuras centrais da musica popular brasileira.',
    fotoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Caetano_Veloso.jpg',
    albuns: [
      { titulo: 'Meu Coco', ano: 2021, capaUrl: null, faixas: [['Anjos Tronchos', '03:52'], ['Meu Coco', '03:09'], ['Noite de Cristal', '03:02']] },
      { titulo: 'Transa', ano: 1972, capaUrl: 'https://d30k6iate490n1.cloudfront.net/record_covers/639/caetano-veloso-transa_front.jpg', faixas: [['You Don\u2019t Know Me', '03:46'], ['Nine Out of Ten', '04:36'], ['Mora na Filosofia', '06:14']] },
      { titulo: 'C\u00ea', ano: 2006, capaUrl: null, faixas: [['Outro', '03:58'], ['Rocks', '03:51'], ['Odeio', '03:12']] }
    ]
  },
  {
    nome: 'J' + String.fromCharCode(227) + 'o', genero: 'Pop / MPB',
    bio: 'Cantor e compositor brasileiro conhecido por albuns conceituais de pop.',
    fotoUrl: 'https://i.pinimg.com/originals/b3/94/76/b394765ab5ef31d9688e7aadf2cdf8d9.jpg',
    albuns: [
      { titulo: 'SUPER', ano: 2023, capaUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/ab/0f/f6/ab0ff604-6b3f-490c-faaf-5ad97324ef41/23UMGIM90082.rgb.jpg/1200x1200bb.jpg', faixas: [['Escorpi\u00e3o', '03:20'], ['Me Lambe', '02:54'], ['Gameboy', '02:49'], ['Alinhamento Milenar', '03:33'], ['Locadora', '02:56'], ['Super', '03:49']] },
      { titulo: 'Pirata', ano: 2021, capaUrl: null, faixas: [['Clar\u00e3o', '03:43'], ['Idiota', '03:25'], ['Santo', '03:07']] },
      { titulo: 'Anti-Her\u00f3i', ano: 2019, capaUrl: null, faixas: [['Vou Morrer Sozinho', '03:18'], ['Me Beija com Raiva', '03:16'], ['Enquanto Me Beija', '03:37']] }
    ]
  },
  {
    nome: 'Joyce Alane', genero: 'Nova MPB / Pop',
    bio: 'Cantora e compositora pernambucana, destaque da nova MPB.',
    fotoUrl: 'https://www.tvguararapes.com.br/files/news/17659986465491-oficial11.jpg',
    albuns: [
      { titulo: 'Tudo \u00e9 Minha Culpa', ano: 2024, capaUrl: null, faixas: [['Eu n\u00e3o t\u00f4 bem', '02:25'], ['S\u00f3 n\u00e3o fale', '02:36'], ['Pra variar', '03:12'], ['Migalhas', '02:52'], ['Apartamento 204', '03:10']] }
    ]
  },
  {
    nome: 'Anitta', genero: 'Pop / Funk / Reggaeton',
    bio: 'Artista brasileira de projecao internacional e expoente do funk carioca.',
    fotoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/MC_Anitta.jpg',
    albuns: [
      { titulo: 'Funk Generation', ano: 2024, capaUrl: 'https://ondarock.it/images/cover/anittafunk500_1716035842.jpg', faixas: [['Lose Ya Breath', '02:48'], ['Funk Rave', '02:44'], ['Grip', '02:31']] },
      { titulo: 'Versions of Me', ano: 2022, capaUrl: null, faixas: [['Envolver', '03:13'], ['Gata', '02:58'], ['Boys Don\u2019t Cry', '02:15']] },
      { titulo: 'Bang!', ano: 2015, capaUrl: null, faixas: [['Bang', '03:09'], ['Deixa Ele Sofrer', '03:06'], ['Cravo e Canela', '03:09']] }
    ]
  }
];

async function limparArtistasDeTeste() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const padraoTeste = "LOWER(BTRIM(nome)) ~ '^(artista|cantor|cantora)?[[:space:]-]*(teste|test|demo|exemplo|generico)([[:space:]-]*[0-9]+)?$'";
    const fantasmas = `(${padraoTeste}) OR ((foto_url IS NULL OR BTRIM(foto_url) = '') AND NOT EXISTS (SELECT 1 FROM albuns al WHERE al.artista_id = artistas.id))`;

    await client.query(`DELETE FROM musicas m USING albuns al, artistas ar WHERE m.album_id = al.id AND al.artista_id = ar.id AND (${padraoTeste})`);
    await client.query(`DELETE FROM albuns al USING artistas ar WHERE al.artista_id = ar.id AND (${padraoTeste})`);
    const removidos = await client.query(`DELETE FROM artistas WHERE ${fantasmas} RETURNING id`);
    if (removidos.rowCount) console.log(`[core] Removidos ${removidos.rowCount} artista(s) generico(s) de teste.`);
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }
}

async function salvarArtista(artista) {
  let usuario = (await pool.query(
    "SELECT id FROM usuarios WHERE nome = $1 AND perfil = 'artista' ORDER BY id LIMIT 1",
    [artista.nome]
  )).rows[0];
  if (!usuario) {
    usuario = (await pool.query(
      "INSERT INTO usuarios (nome, perfil) VALUES ($1, 'artista') RETURNING id",
      [artista.nome]
    )).rows[0];
  }

  let artistaDb = (await pool.query(
    'SELECT id FROM artistas WHERE LOWER(nome) = LOWER($1) ORDER BY id LIMIT 1',
    [artista.nome]
  )).rows[0];
  if (!artistaDb) {
    artistaDb = (await pool.query(
      `INSERT INTO artistas (usuario_id, nome, genero, bio, foto_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [usuario.id, artista.nome, artista.genero, artista.bio, artista.fotoUrl]
    )).rows[0];
  } else {
    await pool.query(
      `UPDATE artistas SET genero = $2, bio = $3, foto_url = $4
        WHERE id = $1`,
      [artistaDb.id, artista.genero, artista.bio, artista.fotoUrl]
    );
  }

  console.log(`[core] Artista pronto: ${artista.nome}`);
  for (const album of artista.albuns) {
    let albumDb = (await pool.query(
      'SELECT id FROM albuns WHERE artista_id = $1 AND LOWER(titulo) = LOWER($2) ORDER BY id LIMIT 1',
      [artistaDb.id, album.titulo]
    )).rows[0];
    if (!albumDb) {
      albumDb = (await pool.query(
        `INSERT INTO albuns (artista_id, titulo, ano, capa_url)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [artistaDb.id, album.titulo, album.ano, album.capaUrl || artista.fotoUrl]
      )).rows[0];
    } else {
      await pool.query(
        `UPDATE albuns SET ano = $2, capa_url = COALESCE(NULLIF(capa_url, ''), $3)
          WHERE id = $1`,
        [albumDb.id, album.ano, album.capaUrl || artista.fotoUrl]
      );
    }

    console.log(`[core]   Album: ${album.titulo} (${album.ano})`);
    for (const [indice, [titulo, duracao]] of album.faixas.entries()) {
      const duracaoValida = /^\d{2}:\d{2}$/.test(duracao) ? duracao : '04:36';
      await pool.query(
        `INSERT INTO musicas (album_id, titulo, ordem, duracao)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (album_id, titulo)
         DO UPDATE SET ordem = EXCLUDED.ordem, duracao = EXCLUDED.duracao`,
        [albumDb.id, titulo, indice + 1, duracaoValida]
      );
      console.log(`[core]     Faixa ${indice + 1}: ${titulo} (${duracaoValida})`);
    }
  }
}

async function seed() {
  await pool.query('ALTER TABLE artistas ADD COLUMN IF NOT EXISTS foto_url TEXT');
  await pool.query('ALTER TABLE albuns ADD COLUMN IF NOT EXISTS capa_url TEXT');
  await pool.query("ALTER TABLE musicas ADD COLUMN IF NOT EXISTS duracao VARCHAR(5)");

  for (const artista of artistas) await salvarArtista(artista);
  await limparArtistasDeTeste();
  console.log(`[core] Seed concluido: ${artistas.length} artistas processados.`);
}

module.exports = seed;

if (require.main === module) {
  iniciar()
    .then(seed)
    .catch((erro) => {
      console.error('[core] Falha ao executar seed:', erro);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
