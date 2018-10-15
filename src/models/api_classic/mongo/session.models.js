import mongoose from 'mongoose';

const sessionSchema = mongoose.Schema({
  startDate: Date,
  endDate: Date,
  experiment: { type: mongoose.Schema.Types.ObjectId, ref: 'experiments' },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'subjects' },
  deviceFrequency: Number,
  deviceProducer: String,
  deviceError: Number,
  deviceType: String,
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
