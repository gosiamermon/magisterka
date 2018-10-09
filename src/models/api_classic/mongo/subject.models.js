import mongoose from 'mongoose';

const subjectSchema = mongoose.Schema({
  age: Number,
  sex: String,
  educationLevel: String,
  visionDefect: Boolean,
});

function getSubjectModel(db) {
  const Subject = db.model('subjects', subjectSchema);
  return Subject;
}

export default getSubjectModel;
