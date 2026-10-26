const BASE_URL = 'https://musicbrainz.org/ws/2';
const USER_AGENT = process.env.MUSICBRAINZ_USER_AGENT || 'Soufa/1.0.0 ( contato@soufa.local )';
const INTERVALO_MINIMO_MS = 1000;

let ultimaRequisicao = 0;
let filaRequisicoes = Promise.resolve();

function erroApi(status, mensagem) {
  const erro = new Error(mensagem);
  erro.status = status;
  return erro;
}

function requisitar(caminho) {
  const proxima = filaRequisicoes.then(async () => {
    const espera = Math.max(0, ultimaRequisicao + INTERVALO_MINIMO_MS - Date.now());
    if (espera) await new Promise((resolver) => setTimeout(resolver, espera));
    ultimaRequisicao = Date.now();

    let resposta;
    try {
      resposta = await fetch(`${BASE_URL}${caminho}`, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(15000)
      });
    } catch (erro) {
      if (erro.name === 'TimeoutError' || erro.name === 'AbortError') {
        throw erroApi(504, 'O MusicBrainz demorou demais para responder. Tente novamente.');
      }
      throw erroApi(502, 'Não foi possível conectar ao MusicBrainz. Verifique a internet do serviço.');
    }
    if (resposta.status === 404) throw erroApi(404, 'Registro não encontrado no MusicBrainz.');
    if (resposta.status === 503) throw erroApi(503, 'MusicBrainz está limitando ou indisponível. Tente novamente em instantes.');
    if (!resposta.ok) throw erroApi(502, 'Não foi possível consultar o MusicBrainz.');
    return resposta.json();
  });

  filaRequisicoes = proxima.catch(() => {});
  return proxima;
}

function validarMbid(mbid) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(mbid || ''))) {
    throw erroApi(400, 'Identificador MusicBrainz inválido.');
  }
}

exports.buscar = async (termo) => {
  const busca = String(termo || '').trim();
  if (!busca || busca.length > 120) throw erroApi(400, 'Informe um termo de busca com até 120 caracteres.');

  const queryArtista = new URLSearchParams({ query: busca, limit: '10', fmt: 'json' });
  const artistas = await requisitar(`/artist?${queryArtista}`);
  const queryAlbum = new URLSearchParams({ query: busca, limit: '10', fmt: 'json' });
  const albuns = await requisitar(`/release-group?${queryAlbum}`);

  return {
    artistas: (artistas.artists || []).map((artista) => ({
      mbid: artista.id,
      nome: artista.name,
      disambiguation: artista.disambiguation || '',
      area: artista.area?.name || artista['begin-area']?.name || '',
      score: Number(artista.score || 0)
    })),
    albuns: (albuns['release-groups'] || []).map((album) => ({
      mbid: album.id,
      titulo: album.title,
      ano: Number.parseInt(album['first-release-date'] || '', 10) || null,
      tipo: album['primary-type'] || '',
      artista: (album['artist-credit'] || []).map((credito) => credito.name || credito.artist?.name).filter(Boolean).join(' '),
      artistaMbid: album['artist-credit']?.find((credito) => credito.artist)?.artist.id || null,
      score: Number(album.score || 0)
    }))
  };
};

exports.buscarArtista = async (mbid) => {
  validarMbid(mbid);
  return requisitar(`/artist/${mbid}?fmt=json`);
};

exports.albunsOficiaisDoArtista = async (mbid) => {
  validarMbid(mbid);
  const query = new URLSearchParams({
    artist: mbid,
    type: 'album',
    'release-group-status': 'website-default',
    limit: '100',
    fmt: 'json'
  });
  const dados = await requisitar(`/release-group?${query}`);
  return dados['release-groups'] || [];
};

exports.buscarAlbum = async (mbid) => {
  validarMbid(mbid);
  const grupo = await requisitar(`/release-group/${mbid}?inc=artist-credits+releases&fmt=json`);
  const artistas = (grupo['artist-credit'] || []).map((credito) => credito.artist).filter(Boolean);
  const releasesOficiais = (grupo.releases || []).filter((release) => release.status === 'Official');
  if (releasesOficiais.length === 0) throw erroApi(404, 'O release group não possui lançamento oficial disponível.');

  releasesOficiais.sort((a, b) => Number(b.country === 'BR') - Number(a.country === 'BR'));
  const lancamento = await requisitar(`/release/${releasesOficiais[0].id}?inc=recordings&fmt=json`);
  const faixas = (lancamento.media || []).flatMap((midia) => (midia.tracks || []).map((faixa) => ({
    titulo: faixa.title,
    musicbrainzId: faixa.id || faixa.recording?.id || null
  }))).filter((faixa) => faixa.titulo);

  return {
    mbid: grupo.id,
    titulo: grupo.title,
    ano: Number.parseInt(grupo['first-release-date'] || lancamento.date || '', 10) || 0,
    artistaMbid: artistas[0]?.id || null,
    artista: artistas.map((artista) => artista.name).join(' '),
    artistas: artistas.map((artista) => ({ id: artista.id, nome: artista.name })),
    releaseMbid: lancamento.id,
    faixas
  };
};
