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
  deviceError: Number,
  deviceFrequency: Number,
  deviceProducer: String,
  startDate: Date,
  endDate: Date,
  subject: subjectSchema,
  measurements: Array(measurementSchema),
  calibration: Array(measurementSchema)
});

const experimentSchema = mongoose.Schema({
  startDate: Date,
  endDate: Date,
  sessions: Array(sessionSchema),
});

function getExperimentModel(db) {
  const Experiment = db.model('experiments', experimentSchema);
  return Experiment;
}

export default getExperimentModel;