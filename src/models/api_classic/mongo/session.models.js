import mongoose from 'mongoose';

const sessionSchema = mongoose.Schema({
  startDate: Date,
  endDate: Date,
  experiment: { type: mongoose.Schema.Types.ObjectId, ref: 'experiments' },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'subjects' },
  deviceFrequency: Number,
  deviceProducer: String,
  deviceError: Number,
});

const Session = mongoose.model('sessions', sessionSchema);

export default Session;
