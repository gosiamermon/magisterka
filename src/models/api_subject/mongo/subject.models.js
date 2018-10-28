import mongoose from 'mongoose';

const stymulusSchema = mongoose.Schema({
  startTime: Number,
  endTime: Number,
  link: String,
  x: Number,
  y: Number,
  stymulusType: String,
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

const experimentSchema = mongoose.Schema({
  id: mongoose.Schema.Types.ObjectId,
  name: String,
  startDate: Date,
  endDate: Date,
  stymulus: Array(stymulusSchema),
  sessions: Array(sessionSchema)
});

const subjectSchema = mongoose.Schema({
  age: Number,
  educationLevel: String,
  sex: String,
  visionDefect: Boolean,
  name: String,
  experiments: Array(experimentSchema),
});

subjectSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

subjectSchema.set('toJSON', {
  virtuals: true
});

function getSubjectModel(db) {
  const Subject = db.model('subjects', subjectSchema);
  return Subject;
}

export default getSubjectModel;