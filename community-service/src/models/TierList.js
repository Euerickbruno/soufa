const mongoose = require('mongoose');

const TierListSchema = new mongoose.Schema({
  usuarioId: { type: Number, required: true },
  usuarioNome: { type: String, required: true },
  artistaId: { type: Number, required: true },
  itemTipo: { type: String, enum: ['album', 'musica'], default: 'album' },
  formato: { type: String, enum: ['tiers', 'ranking'], default: 'tiers' },
  titulo: { type: String, required: true, maxlength: 80 },
  tiers: {
    S: { type: [Number], default: [] },
    A: { type: [Number], default: [] },
    B: { type: [Number], default: [] },
    C: { type: [Number], default: [] },
    D: { type: [Number], default: [] }
  },
  criadaEm: { type: Date, default: Date.now },
  atualizadaEm: { type: Date, default: Date.now }
});

TierListSchema.index({ usuarioId: 1, artistaId: 1 });

module.exports = mongoose.model('TierList', TierListSchema);
