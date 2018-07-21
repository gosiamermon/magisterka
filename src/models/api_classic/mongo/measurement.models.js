import mongoose from 'mongoose';

const measurementSchema = mongoose.Schema({
  timestamp: Date,
  x: Number,
  y: Number,
  type: String,
  experiment: { type: mongoose.Schema.Types.ObjectId, ref: 'experiments' },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'experimentSessions' },
});

const Measurement = mongoose.model('measurements', measurementSchema);

export default Measurement;
