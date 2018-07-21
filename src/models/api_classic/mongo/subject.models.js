import mongoose from 'mongoose';

const subjectSchema = mongoose.Schema({
  age: Number,
  sex: String,
  profession: String,
  educationLevel: String,
});

const Subject = mongoose.model('subjects', subjectSchema);

export default Subject;
