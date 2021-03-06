import mongoose from 'mongoose';
import { sessionSchema } from './session.models';

const subjectSchema = mongoose.Schema({
  age: Number,
  sex: String,
  educationLevel: String,
  visionDefect: Boolean,
  name: String,
  sessions: Array(sessionSchema),
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
