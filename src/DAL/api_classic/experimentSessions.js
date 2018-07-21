const sql = require('mssql');
import { MSSQL_DB, CASSANDRA_DB, MONGO_DB } from '../../constants';
import { Session } from '../../models/api_classic/mongo';

class SessionDAL {
  constructor(db) {
    this.cassandraDB = db[CASSANDRA_DB];
    this.mssqlDB = db[MSSQL_DB];
  }

  async getSessionsFromCassandra() {
    let sessions = await this.cassandraDB.execute('SELECT * FROM experimentsession');
    let subjects = await this.cassandraDB.execute(`SELECT * FROM subject`);
    sessions = sessions.rows;
    subjects = subjects.rows;

    sessions.forEach(s => {
      const subject = subjects.find(subject => subject.id.Uuid === s.subjectid.Uuid);
      s.subject = subject;
    });

    return sessions;
  };

  async getSessionsFromMssql() {
    const sessionsResult = await this.mssqlDB.request()
      .query(`SELECT ExperimentSession.*, 
           Sex.Value AS SubjectSex, 
           EducationLevel.Value AS SubjectEducationLevel 
           FROM ExperimentSession
           LEFT JOIN Subject ON ExperimentSession.SubjectId = Subject.Id
           LEFT JOIN Sex ON Subject.SexId = Sex.Id
           LEFT JOIN EducationLevel ON Subject.EducationLevelId = EducationLevel.Id`);
    return sessionsResult.recordset;
  };

  async getSessionsFromMongo() {
    const sessions = await Session.find()
      .populate('experiment')
      .populate('subject');
    return sessions;
  };

  async getSessionFromMssql(id) {
    const sessionResult = await this.mssqlDB.request()
      .query(`SELECT ExperimentSession.*, 
           Sex.Value AS SubjectSex, 
           EducationLevel.Value AS SubjectEducationLevel 
           FROM ExperimentSession
           LEFT JOIN Subject ON ExperimentSession.SubjectId = Subject.Id
           LEFT JOIN Sex ON Subject.SexId = Sex.Id
           LEFT JOIN EducationLevel ON Subject.EducationLevelId = EducationLevel.Id
           WHERE ExperimentSession.id=${id}`);
    const session = sessionResult.recordset[0];
    return session;
  };

  async getSessionFromMongo(id) {
    const session = await Session.findOne({ _id: id })
      .populate('experiment')
      .populate('subject');
    return session;
  };

  async getSessionFromCassandra(id) {
    const session = await this.cassandraDB.execute(
      `SELECT * FROM session
        WHERE id=${id}`
    );
    return session.rows[0];
  };

  async getSession(dbType, id) {
    switch (dbType) {
      case MSSQL_DB: {
        return await this.getSessionFromMssql(id);
      }
      case CASSANDRA_DB: {
        return await this.getSessionFromCassandra(id);
      }
      case MONGO_DB: {
        return await this.getSessionFromMongo(id);
      }
      default:
        return;
    };
  };

  async getSessions(dbType) {
    switch (dbType) {
      case MSSQL_DB: {
        return await this.getSessionsFromMssql();
      }
      case CASSANDRA_DB: {
        return await this.getSessionsFromCassandra();
      }
      case MONGO_DB: {
        return await this.getSessionsFromMongo();
      }
      default:
        return;
    };
  };
};

export default SessionDAL;

