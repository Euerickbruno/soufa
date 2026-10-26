const Artista = require('../models/artista');

function identificar(req, res, next) {
  const id = parseInt(req.header('x-usuario-id'), 10);
  const tipo = String(req.header('x-usuario-tipo') || req.header('x-usuario-perfil') || '').toUpperCase();
  const tipoNormalizado = tipo === 'ARTISTA' ? 'ARTISTA' : tipo === 'FA' ? 'FA' : null;
  req.usuario = id
    ? {
      id,
      tipo: tipoNormalizado,
      role: tipoNormalizado === 'ARTISTA' ? 'artista' : tipoNormalizado === 'FA' ? 'fa' : null,
      artistaId: Number(req.header('x-usuario-artista-id')) || null,
      perfil: tipoNormalizado === 'ARTISTA' ? 'artista' : tipoNormalizado === 'FA' ? 'fa' : null,
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

function exigirVinculoArtista(resolverArtistaId) {
  return async (req, res, next) => {
    if (!req.usuario) return res.status(401).json({ erro: 'Escolha um perfil para continuar' });
    if (req.usuario.tipo !== 'ARTISTA') return res.status(403).json({ erro: 'Ação permitida apenas para perfil ARTISTA' });

    try {
      const artistaId = await resolverArtistaId(req);
      if (!artistaId) return res.status(404).json({ erro: 'Artista não encontrado' });
      const artista = await Artista.buscar(artistaId);
      if (!artista) return res.status(404).json({ erro: 'Artista não encontrado' });
      if (artista.usuario_id !== req.usuario.id) return res.status(403).json({ erro: 'O perfil ARTISTA não está vinculado a este artista' });
      next();
    } catch (erro) {
      next(erro);
    }
  };
}

module.exports = { identificar, exigirLogin, exigirPerfil, exigirVinculoArtista };
