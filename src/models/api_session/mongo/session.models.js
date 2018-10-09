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
  stymulusLink: String,
  stymulusStartTime: Date,
  stymulusEndTime: Date,
  stymulusType: String,
  stymulusX: Number,
  stymulusY: Number,
});

const sessionSchema = mongoose.Schema({
  experimentId: mongoose.Schema.Types.ObjectId,
  deviceError: Number,
  deviceFrequency: Number,
  deviceProducer: String,
  startDate: Date,
  endDate: Date,
  subject: subjectSchema,
  measurements: Array(measurementSchema),
  calibration: Array(measurementSchema)
});

function getSessionModel(db) {
  const Session = db.model('sessions', sessionSchema);
  return Session;
}

export default getSessionModel;
