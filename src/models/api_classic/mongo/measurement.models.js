import mongoose from 'mongoose';

const measurementSchema = mongoose.Schema({
  timestamp: Date,
  x: Number,
  y: Number,
  stymulusId: Number,
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'experimentSessions' },
  isCalibration: Boolean,
});

function getMeasurementModel(db) {
  const Measurement = db.model('measurements', measurementSchema);
  return Measurement;
}

export default getMeasurementModel;
