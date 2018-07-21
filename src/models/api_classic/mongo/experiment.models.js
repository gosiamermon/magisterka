import mongoose from 'mongoose';

const stimulusSchema = mongoose.Schema({
  startTime: Number,
  endTime: Number,
  link: String,
  type: String,
});
const experimentSchema = mongoose.Schema({
  startDate: Date,
  endDate: Date,
  stymulus: Array(stimulusSchema),
});

const Experiment = mongoose.model('experiments', experimentSchema);

export default Experiment;

    // const newExperiment = new Experiment({ name: 'Exp 1', surname: 'Exp 1' });
    // await newExperiment.save();
    // const experiments = await Experiment.find();
    // res.json(experiments);