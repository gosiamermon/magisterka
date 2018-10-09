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

function getSessionModel(db) {
  const Session = db.model('sessions', sessionSchema);
  return Session;
}

export default getSessionModel;
