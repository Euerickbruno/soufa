const MusicBrainz = require('../services/musicbrainzService');
const Artista = require('../models/artista');
const Album = require('../models/album');

const normalizar = (texto) => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

function erro(status, mensagem) {
  const resultado = new Error(mensagem);
  resultado.status = status;
  return resultado;
}

function mbidValido(mbid) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(mbid || ''));
}

exports.buscar = async (req, res) => {
  const resultado = await MusicBrainz.buscar(req.query.q);
  res.json(resultado);
};

exports.importarArtista = async (req, res) => {
  const musicbrainzId = req.params.mbid;
  if (!mbidValido(musicbrainzId)) return res.status(400).json({ erro: 'MBID de artista inválido.' });

  const externo = await MusicBrainz.buscarArtista(musicbrainzId);
  let artista = await Artista.buscarPorMusicBrainzId(musicbrainzId);
  if (artista && artista.usuario_id !== req.usuario.id) {
    return res.status(409).json({ erro: 'Este artista MusicBrainz já está vinculado a outro perfil local.' });
  }

  if (!artista) {
    const existente = await Artista.buscarPorNome(externo.name);
    if (existente) {
      if (existente.usuario_id !== req.usuario.id) {
        return res.status(409).json({ erro: 'Já existe um artista local com este nome, vinculado a outro perfil.' });
      }
      artista = await Artista.vincularMusicBrainzId(existente.id, musicbrainzId) || existente;
    } else {
      artista = await Artista.criarImportado({
        usuarioId: req.usuario.id,
        nome: externo.name,
        genero: externo.type || '',
        bio: externo.disambiguation || '',
        musicbrainzId
      });
    }
  }

  const releaseGroups = await MusicBrainz.albunsOficiaisDoArtista(musicbrainzId);
  let importados = 0;
  let existentes = 0;
  let semAno = 0;
  const albunsParaImportar = [];
  for (const grupo of releaseGroups) {
    const ano = Number.parseInt(grupo['first-release-date'] || '', 10);
    if (!Number.isInteger(ano) || ano < 1900) {
      semAno += 1;
      continue;
    }
    let album = await Album.buscarPorMusicBrainzId(grupo.id);
    if (album) {
      if (album.artista_id !== artista.id) continue;
      existentes += 1;
      albunsParaImportar.push({ mbid: grupo.id, titulo: grupo.title, albumId: album.id });
      continue;
    }
    const mesmoTitulo = await Album.buscarPorArtistaETitulo(artista.id, grupo.title);
    if (mesmoTitulo) {
      await Album.vincularMusicBrainzId(mesmoTitulo.id, grupo.id);
      existentes += 1;
      albunsParaImportar.push({ mbid: grupo.id, titulo: grupo.title, albumId: mesmoTitulo.id });
      continue;
    }
    album = await Album.criar({
      artistaId: artista.id,
      titulo: grupo.title,
      ano,
      capaUrl: null,
      clipeUrl: null,
      faixas: [],
      musicbrainzId: grupo.id
    });
    importados += 1;
    albunsParaImportar.push({ mbid: grupo.id, titulo: grupo.title, albumId: album.id });
  }

  res.status(200).json({
    artista: await Artista.buscar(artista.id),
    albunsImportados: importados,
    albunsJaExistentes: existentes,
    albunsSemAno: semAno,
    albunsParaImportar,
    limiteMusicBrainz: releaseGroups.length === 100
  });
};

exports.importarAlbum = async (req, res) => {
  const musicbrainzId = req.params.mbid;
  const artistaId = Number(req.body.artistaId);
  if (!mbidValido(musicbrainzId)) return res.status(400).json({ erro: 'MBID de álbum inválido.' });
  if (!Number.isInteger(artistaId) || artistaId < 1) return res.status(400).json({ erro: 'Artista local inválido.' });

  const artista = await Artista.buscar(artistaId);
  if (!artista) return res.status(404).json({ erro: 'Artista local não encontrado.' });
  if (artista.usuario_id !== req.usuario.id) return res.status(403).json({ erro: 'O perfil ARTISTA não está vinculado a este artista.' });

  const externo = await MusicBrainz.buscarAlbum(musicbrainzId);
  const vinculoPorMbid = artista.musicbrainz_id && externo.artistas.some((credito) => credito.id === artista.musicbrainz_id);
  const vinculoPorNome = externo.artistas.some((credito) => normalizar(credito.nome) === normalizar(artista.nome));
  if (!vinculoPorMbid && !vinculoPorNome) {
    return res.status(409).json({ erro: 'O álbum selecionado não pertence ao artista local.' });
  }
  if (!artista.musicbrainz_id && externo.artistaMbid) {
    await Artista.vincularMusicBrainzId(artista.id, externo.artistaMbid);
  }
  if (!Number.isInteger(externo.ano) || externo.ano < 1900 || externo.ano > new Date().getFullYear() + 1) {
    return res.status(422).json({ erro: 'O lançamento do MusicBrainz não possui um ano válido.' });
  }

  let album = await Album.buscarPorMusicBrainzId(musicbrainzId);
  if (album && album.artista_id !== artista.id) {
    return res.status(409).json({ erro: 'Este álbum MusicBrainz já está vinculado a outro artista local.' });
  }
  if (!album) {
    const mesmoTitulo = await Album.buscarPorArtistaETitulo(artista.id, externo.titulo);
    if (mesmoTitulo) {
      await Album.vincularMusicBrainzId(mesmoTitulo.id, musicbrainzId);
      album = mesmoTitulo;
    }
  }

  if (externo.faixas.length === 0) return res.status(422).json({ erro: 'O MusicBrainz não possui faixas para o lançamento oficial deste álbum.' });
  const albumLocal = album ? await Album.buscar(album.id) : null;
  const faixasExistentes = (albumLocal?.musicas || []).map((faixa) => ({
    titulo: faixa.titulo,
    musicbrainzId: faixa.musicbrainzId || null
  }));
  const titulosExistentes = new Set(faixasExistentes.map((faixa) => normalizar(faixa.titulo)));
  const faixasNovas = externo.faixas.filter((faixa) => !titulosExistentes.has(normalizar(faixa.titulo)));
  const faixasMescladas = faixasExistentes.concat(faixasNovas);
  if (album) {
    await Album.atualizar(album.id, {
      titulo: album.titulo,
      ano: album.ano || externo.ano,
      capaUrl: album.capa_url,
      clipeUrl: album.clipe_url,
      faixas: faixasMescladas
    });
  } else {
    album = await Album.criar({
      artistaId: artista.id,
      titulo: externo.titulo,
      ano: externo.ano,
      capaUrl: null,
      clipeUrl: null,
      faixas: faixasMescladas,
      musicbrainzId
    });
  }

  res.status(200).json({ album: await Album.buscar(album.id), faixasImportadas: faixasNovas.length, totalFaixas: externo.faixas.length });
};
