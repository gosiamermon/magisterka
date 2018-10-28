import mongoose from 'mongoose';

const stymulusSchema = mongoose.Schema({
  startTime: Number,
  endTime: Number,
  link: String,
  x: Number,
  y: Number,
  type: String,
  id: Number,
});

const measurementSchema = mongoose.Schema({
  timestamp: Date,
  x: Number,
  y: Number,
  stymulusId: Number,
});

const sessionSchema = mongoose.Schema({
  deviceError: Number,
  deviceFrequency: Number,
  deviceProducer: String,
  deviceType: String,
  startDate: Date,
  endDate: Date,
  measurements: Array(measurementSchema),
  calibration: Array(measurementSchema)
});

const subjectSchema = mongoose.Schema({
  age: Number,
  educationLevel: String,
  sex: String,
  visionDefect: Boolean,
  name: String,
  sessions: Array(sessionSchema)
});

const experimentSchema = mongoose.Schema({
  name: String,
  startDate: Date,
  endDate: Date,
  subjects: Array(subjectSchema),
  stymulus: Array(stymulusSchema),
});

experimentSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

experimentSchema.set('toJSON', {
  virtuals: true
});

function getExperimentModel(db) {
  const Experiment = db.model('experiments', experimentSchema);
  return Experiment;
}

export default getExperimentModel;