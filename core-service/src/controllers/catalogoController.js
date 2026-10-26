function falha(status, mensagem) {
  const erro = new Error(mensagem);
  erro.status = status;
  return erro;
}

exports.buscarYoutube = async (req, res) => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw falha(503, 'Configure YOUTUBE_API_KEY para pesquisar vídeos no YouTube.');

  const termo = String(req.query.q || '').trim();
  if (!termo || termo.length > 120) return res.status(400).json({ erro: 'Informe um termo de busca com até 120 caracteres.' });

  const query = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: '6',
    q: termo,
    key: apiKey
  });
  const resposta = await fetch(`https://www.googleapis.com/youtube/v3/search?${query}`, {
    signal: AbortSignal.timeout(8000)
  });
  if (resposta.status === 403) throw falha(429, 'A cota ou a chave do YouTube Data API está indisponível. Verifique o Google Cloud Console.');
  if (!resposta.ok) throw falha(502, 'A consulta ao YouTube falhou.');

  const dados = await resposta.json();
  res.json(dados.items.map((item) => ({
    id: item.id.videoId,
    titulo: item.snippet.title,
    canal: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || null,
    url: `https://www.youtube.com/watch?v=${encodeURIComponent(item.id.videoId)}`
  })));
};
