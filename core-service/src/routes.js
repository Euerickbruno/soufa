const router = require('express').Router();
const { exigirLogin, exigirPerfil, exigirVinculoArtista } = require('./middlewares/auth');
const usuarios = require('./controllers/usuarioController');
const artistas = require('./controllers/artistaController');
const albuns = require('./controllers/albumController');
const avaliacoes = require('./controllers/avaliacaoController');
const catalogo = require('./controllers/catalogoController');
const Album = require('./models/album');
const musicbrainz = require('./controllers/musicbrainzController');


const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/usuarios', ah(usuarios.listar));
router.post('/usuarios/cadastro', ah(usuarios.cadastrar));
router.post('/usuarios/entrar', ah(usuarios.entrar));
router.get('/usuarios/:id', ah(usuarios.buscar));

router.get('/artistas', ah(artistas.listar));
router.get('/artistas/:id', ah(artistas.buscar));
router.post('/artistas', exigirLogin, ah(artistas.criar));
router.put('/artistas/:id', exigirVinculoArtista((req) => req.params.id), ah(artistas.atualizar));
router.delete('/artistas/:id', exigirVinculoArtista((req) => req.params.id), ah(artistas.remover));

router.get('/albuns/:id', ah(albuns.buscar));
router.get('/artistas/:artistaId/musicas', ah(albuns.musicasDoArtista));
router.post('/albuns', exigirVinculoArtista((req) => req.body.artistaId), ah(albuns.criar));
router.post('/albuns/:id/musicas', exigirVinculoArtista(async (req) => (await Album.buscar(req.params.id))?.artista_id), ah(albuns.adicionarMusica));
router.put('/albuns/:id', exigirVinculoArtista(async (req) => (await Album.buscar(req.params.id))?.artista_id), ah(albuns.atualizar));
router.delete('/albuns/:id', exigirVinculoArtista(async (req) => (await Album.buscar(req.params.id))?.artista_id), ah(albuns.remover));

router.get('/external/search', exigirLogin, ah(musicbrainz.buscar));
router.post('/external/import/artist/:mbid', exigirPerfil('ARTISTA'), ah(musicbrainz.importarArtista));
router.post('/external/import/album/:mbid', exigirVinculoArtista((req) => req.body.artistaId), ah(musicbrainz.importarAlbum));

router.get('/integracoes/youtube/busca', exigirPerfil('artista'), ah(catalogo.buscarYoutube));

router.get('/albuns/:id/resenhas', ah(avaliacoes.resenhasDoAlbum));
router.get('/albuns/:id/minha-avaliacao', exigirLogin, ah(avaliacoes.minhaDoAlbum));

router.post('/avaliacoes', exigirPerfil('fa'), ah(avaliacoes.salvar));
router.get('/avaliacoes/minhas', exigirLogin, ah(avaliacoes.minhas));
router.delete('/avaliacoes/:id', exigirLogin, ah(avaliacoes.remover));

module.exports = router;
