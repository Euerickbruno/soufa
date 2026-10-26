// Nesta entrega não há login: o gateway informa o perfil escolhido pelo usuário (seed)
// em cabeçalhos HTTP. Na 2ª unidade isto será trocado por autenticação real (JWT).
function identificar(req, res, next) {
  const id = parseInt(req.header('x-usuario-id'), 10);
  const papel = String(req.header('x-usuario-tipo') || req.header('x-usuario-perfil') || '').toUpperCase();
  const tipo = ['ARTISTA', 'FA'].includes(papel) ? papel : null;
  req.usuario = id
    ? {
      id,
      tipo,
      artistaId: Number(req.header('x-usuario-artista-id')) || null,
      perfil: tipo === 'ARTISTA' ? 'artista' : tipo === 'FA' ? 'fa' : null,
      nome: decodeURIComponent(req.header('x-usuario-nome') || '')
    }
    : null;
  next();
}

function exigirLogin(req, res, next) {
  if (!req.usuario) return res.status(401).json({ erro: 'Escolha um perfil para continuar' });
  next();
}

function exigirPerfil(perfil) {
  const tipoEsperado = String(perfil).toUpperCase();
  return (req, res, next) => {
    if (!req.usuario) return res.status(401).json({ erro: 'Escolha um perfil para continuar' });
    if (req.usuario.tipo !== tipoEsperado) return res.status(403).json({ erro: `Ação permitida apenas para perfil ${tipoEsperado}` });
    next();
  };
}

function exigirVinculoArtista(obterArtistaId) {
  return (req, res, next) => {
    if (!req.usuario) return res.status(401).json({ erro: 'Autenticação necessária' });
    if (req.usuario.tipo !== 'ARTISTA') return res.status(403).json({ erro: 'Ação permitida apenas para perfil ARTISTA' });
    const artistaId = Number(obterArtistaId(req));
    if (!Number.isInteger(artistaId) || artistaId < 1) return res.status(400).json({ erro: 'Artista inválido' });
    if (req.usuario.artistaId !== artistaId) return res.status(403).json({ erro: 'O perfil ARTISTA não está vinculado a este artista' });
    next();
  };
}

module.exports = { identificar, exigirLogin, exigirPerfil, exigirVinculoArtista };
