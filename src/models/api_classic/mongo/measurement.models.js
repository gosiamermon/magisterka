import mongoose from 'mongoose';

const measurementSchema = mongoose.Schema({
  timestamp: Date,
  x: Number,
  y: Number,
  stymulusId: Number,
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'sessions' },
  isCalibration: Boolean,
});

measurementSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

measurementSchema.set('toJSON', {
  virtuals: true
});

function getMeasurementModel(db) {
  const Measurement = db.model('measurements', measurementSchema);
  return Measurement;
}

export default getMeasurementModel;
