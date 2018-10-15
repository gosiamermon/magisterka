import mongoose from 'mongoose';

const subjectSchema = mongoose.Schema({
  age: Number,
  educationLevel: String,
  sex: String,
  visionDefect: Boolean,
});

const measurementSchema = mongoose.Schema({
  timestamp: Date,
  x: Number,
  y: Number,
  stymulusId: Number,
});

const sessionSchema = mongoose.Schema({
  experiment: mongoose.Schema.Types.ObjectId,
  deviceError: Number,
  deviceFrequency: Number,
  deviceProducer: String,
  deviceType: String,
  startDate: Date,
  endDate: Date,
  subject: subjectSchema,
  measurements: Array(measurementSchema),
  calibration: Array(measurementSchema)
});

sessionSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

sessionSchema.set('toJSON', {
  virtuals: true
});

function getSessionModel(db) {
  const Session = db.model('sessions', sessionSchema);
  return Session;
}

export default getSessionModel;
