const router = require('express').Router();
const { exigirLogin, exigirPerfil } = require('./middlewares/auth');
const comentarios = require('./controllers/comentarioController');
const tierlists = require('./controllers/tierListController');

const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/comentarios', ah(comentarios.listar));
router.post('/comentarios', exigirLogin, ah(comentarios.criar));
router.put('/comentarios/:id', exigirLogin, ah(comentarios.atualizar));
router.delete('/comentarios/:id', exigirLogin, ah(comentarios.remover));

router.get('/tierlists', ah(tierlists.listar));
router.get('/tierlists/:id', ah(tierlists.buscar));
router.post('/tierlists', exigirPerfil('fa'), ah(tierlists.criar));
router.put('/tierlists/:id', exigirPerfil('fa'), ah(tierlists.atualizar));
router.delete('/tierlists/:id', exigirPerfil('fa'), ah(tierlists.remover));
router.get('/artistas/:artistaId/consenso', ah(tierlists.consenso));

module.exports = router;
