import mongoose from 'mongoose';

const experimentSchema = mongoose.Schema({
  startDate: Date,
  endDate: Date,
});

function getExperimentModel(db) {
  const Experiment = db.model('experiments', experimentSchema);
  return Experiment;
}

export default getExperimentModel;