const mongoose = require('mongoose');

// Um único modelo serve para qualquer alvo (resenha, tier list). O comentário guarda só a
// referência ao alvo (tipo + id) e ao pai, então as respostas formam uma árvore sem
// documentos gigantes. raizId e profundidade são calculados pelo servidor.
const ComentarioSchema = new mongoose.Schema({
  alvoTipo: { type: String, enum: ['resenha', 'tierlist'], required: true },
  alvoId: { type: String, required: true },
  paiId: { type: mongoose.Schema.Types.ObjectId, default: null },
  raizId: { type: mongoose.Schema.Types.ObjectId, required: true },
  profundidade: { type: Number, default: 0 },
  autorId: { type: Number, required: true },
  autorNome: { type: String, required: true },
  artistaId: { type: Number, default: null },
  oficial: { type: Boolean, default: false },
  destacado: { type: Boolean, default: false },
  texto: { type: String, required: true, maxlength: 1000 },
  removido: { type: Boolean, default: false },
  criadoEm: { type: Date, default: Date.now },
  editadoEm: { type: Date, default: null }
});

ComentarioSchema.index({ alvoTipo: 1, alvoId: 1, criadoEm: 1 });
ComentarioSchema.index({ raizId: 1 });
ComentarioSchema.index({ paiId: 1 });

module.exports = mongoose.model('Comentario', ComentarioSchema);
