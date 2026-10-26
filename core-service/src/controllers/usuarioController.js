const Usuario = require('../models/usuario');
const bcrypt = require('bcrypt');

exports.listar = async (req, res) => res.json(await Usuario.listar());

exports.buscar = async (req, res) => {
  const u = await Usuario.buscar(req.params.id);
  if (!u) return res.status(404).json({ erro: 'Usuário não encontrado' });
  res.json(u);
};

exports.cadastrar = async (req, res) => {
  const nome = String(req.body.nome || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const senha = typeof req.body.senha === 'string' ? req.body.senha : '';
  const perfil = String(req.body.perfil || '').trim().toLowerCase();
  if (nome.length < 2 || nome.length > 100) return res.status(400).json({ erro: 'Informe um nome entre 2 e 100 caracteres.' });
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ erro: 'Informe um e-mail válido.' });
  if (senha.length < 8 || senha.length > 72) return res.status(400).json({ erro: 'A senha deve ter entre 8 e 72 caracteres.' });
  if (!['fa', 'artista'].includes(perfil)) return res.status(400).json({ erro: 'Escolha o perfil Fã ou Artista.' });

  const hash = await bcrypt.hash(senha, 10);
  try {
    const usuario = await Usuario.criar({ nome, email, senha: hash, perfil });
    return res.status(201).json(usuario);
  } catch (erro) {
    if (erro.code === '23505') return res.status(409).json({ erro: 'Este e-mail já está cadastrado.' });
    throw erro;
  }
};

exports.entrar = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const senha = typeof req.body.senha === 'string' ? req.body.senha : '';
  const usuario = await Usuario.buscarPorEmail(email);
  if (!usuario || !usuario.senha || !(await bcrypt.compare(senha, usuario.senha))) {
    return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
  }
  const { senha: hash, ...publico } = usuario;
  const perfil = String(publico.perfil || '').toLowerCase();
  return res.json({ ...publico, perfil, tipo: perfil === 'artista' ? 'ARTISTA' : perfil === 'fa' ? 'FA' : null });
};
