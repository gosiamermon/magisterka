const sql = require('mssql');
import { MSSQL_DB, CASSANDRA_DB, MONGO_DB, deviceTypes, producers } from '../../constants';
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
           EducationLevel.Value AS SubjectEducationLevel,
           DeviceType.Value AS DeviceType,
           Device.Error AS DeviceError,
           Producer.Value AS DeviceProducer,
           Device.Frequency AS DeviceFrequency
           FROM ExperimentSession
           LEFT JOIN Subject ON ExperimentSession.SubjectId = Subject.Id
           LEFT JOIN Device ON ExperimentSession.DeviceId = Device.Id
           LEFT JOIN DeviceType ON Device.TypeId = DeviceType.Id
           LEFT JOIN Producer ON Device.ProducerId = Producer.Id
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
      `SELECT * FROM experimentsession
        WHERE id=${id}
        ALLOW FILTERING;`
    );
    return session.rows[0];
  };

  async saveDeviceIfNotSaved(session) {
    const declareInsertValues = `DECLARE @inserted table([Id] int)`;
    let query = `SELECT * FROM Device WHERE 
    TypeId=${deviceTypes[session.deviceType]} 
    AND Error=${session.deviceError}
    AND ProducerId=${producers[session.deviceProducer]}
    AND Frequency=${session.deviceFrequency};`;

    let deviceResult = await this.mssqlDB.request().query(query);
    let device
    if (!deviceResult.recordset.length) {
      query = `${declareInsertValues}
              INSERT INTO Device 
              OUTPUT INSERTED.[Id] INTO @inserted
              VALUES (
                ${deviceTypes[session.deviceType]} , 
                ${session.deviceError}, 
                ${producers[session.deviceProducer]}, 
                ${session.deviceFrequency}
              );
              SELECT * FROM @inserted;`
      deviceResult = await this.mssqlDB.request().query(query);
      device = deviceResult.recordset[0];
    }
    else {
      device = deviceResult.recordset[0];
    }
    return device;
  };

  async saveSessionToMssql(session) {

    const declareInsertValues = `DECLARE @inserted table([Id] int)`;
    const device = await this.saveDeviceIfNotSaved(session);

    const query = `${declareInsertValues}
                INSERT INTO ExperimentSession
                OUTPUT INSERTED.[Id] INTO @inserted
                VALUES (
                  '${session.startDate}', 
                  '${session.endDate}', 
                  ${session.experimentId}, 
                  ${session.subjectId}, 
                  ${device.Id}
                );
                SELECT * FROM @inserted;`
    const sessionResult = await this.mssqlDB.request().query(query);
    return sessionResult.recordset[0];
  }

  async editSessionInMssql(session) {
    const device = await this.saveDeviceIfNotSaved(session);

    let query = `UPDATE ExperimentSession SET 
                StartDate='${session.startDate}', 
                EndDate='${session.endDate}',
                ExperimentId=${session.experimentId},
                SubjectId=${session.subjectId},
                DeviceId=${device.Id}
                WHERE id=${session.id}
                SELECT * FROM ExperimentSession WHERE id=${session.id};`;
    const result = await this.mssqlDB.request().query(query);
    return result.recordset[0];
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

  async deleteSession(dbType, id) {
    switch (dbType) {
      case MSSQL_DB: {
        return await this.deleteSessionFromMssql(id);
      }
      case CASSANDRA_DB: {
        return await this.deleteSessionFromCassandra(id);
      }
      case MONGO_DB: {
        return await this.deleteSessionFromMongo(id);
      }
      default:
        return;
    };
  };

  async saveSession(dbType, session) {
    switch (dbType) {
      case MSSQL_DB: {
        return await this.saveSessionToMssql(session);
      }
      case CASSANDRA_DB: {
        return await this.saveSessionToCassandra(session);
      }
      case MONGO_DB: {
        return await this.saveSessionToMongo(session);
      }
      default:
        return;
    };
  };

  async editSession(dbType, session) {
    console.log('edit')
    switch (dbType) {
      case MSSQL_DB: {
        return await this.editSessionInMssql(session);
      }
      case CASSANDRA_DB: {
        return await this.editSessionInCassandra(session);
      }
      case MONGO_DB: {
        return await this.editSessionInMongo(session);
      }
      default:
        return;
    };
  };

};

export default SessionDAL;

