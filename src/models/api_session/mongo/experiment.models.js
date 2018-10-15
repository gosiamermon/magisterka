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

const experimentSchema = mongoose.Schema({
  name: String,
  startDate: Date,
  endDate: Date,
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