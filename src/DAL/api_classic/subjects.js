const sql = require('mssql');
import { MSSQL_DB, CASSANDRA_DB, MONGO_DB } from '../../constants';
import { Subject } from '../../models/api_classic/mongo';

class SubjectDAL {
  constructor(db) {
    this.cassandraDB = db[CASSANDRA_DB];
    this.mssqlDB = db[MSSQL_DB];
  }

  async getSubjectsFromCassandra() {
    let subjects = await this.cassandraDB.execute('SELECT * FROM subject');
    subjects = subjects.rows;
    return subjects;
  };

  async getSubjectsFromMssql() {
    const subjectsResult = await this.mssqlDB.request()
      .query(`SELECT Subject.*, 
           Sex.Value AS Sex, 
           EducationLevel.Value AS EducationLevel 
           FROM Subject
           LEFT JOIN Sex ON Subject.SexId = Sex.Id
           LEFT JOIN EducationLevel ON Subject.EducationLevelId = EducationLevel.Id`);
    return subjectsResult.recordset;
  };

  async getSubjectsFromMongo() {
    return await Subject.find();
  };

  async getSubjectFromMssql(id) {
    const subjectResult = await this.mssqlDB.request()
      .input('id', sql.Int, id)
      .query(`SELECT Subject.*, 
           Sex.Value AS Sex, 
           EducationLevel.Value AS EducationLevel 
           FROM Subject
           LEFT JOIN Sex ON Subject.SexId = Sex.Id
           LEFT JOIN EducationLevel ON Subject.EducationLevelId = EducationLevel.Id
           WHERE Subject.id=@id`);
    const subject = subjectResult.recordset[0];
    return subject;
  };

  async getSubjectFromMongo(id) {
    return await Subject.findOne({ _id: id });
  };

  async getSubjectFromCassandra(id) {
    const subject = await this.cassandraDB.execute(
      `SELECT * FROM subject
        WHERE id=${id}`
    );
    return subject.rows[0];
  };

  async getSubject(dbType, id) {
    switch (dbType) {
      case MSSQL_DB: {
        return await this.getSubjectFromMssql(id);
      }
      case CASSANDRA_DB: {
        return await this.getSubjectFromCassandra(id);
      }
      case MONGO_DB: {
        return await this.getSubjectFromMongo(id);
      }
      default:
        return;
    };
  };

  async getSubjects(dbType) {
    switch (dbType) {
      case MSSQL_DB: {
        return await this.getSubjectsFromMssql();
      }
      case CASSANDRA_DB: {
        return await this.getSubjectsFromCassandra();
      }
      case MONGO_DB: {
        return await this.getSubjectsFromMongo();
      }
      default:
        return;
    };
  };
};

export default SubjectDAL;

