// @ts-check
import mongoose from 'mongoose';
import _ from 'lodash-uuid';
import {
  MSSQL_DB,
  CLASSIC_CASSANDRA_DB,
  CLASSIC_MONGO_DB,
  deviceTypes,
  producers
} from '../../constants';
import { mssql, cassandra, mongo } from '../../routes/shared';
import { getSessionModel } from '../../models/api_classic/mongo';

let Session;

class SessionDAL {
  constructor(db) {
    this.cassandraDB = db[CLASSIC_CASSANDRA_DB];
    this.mssqlDB = db[MSSQL_DB];
    Session = getSessionModel(db[CLASSIC_MONGO_DB]);
  }

  async getSessionsFromCassandra(experimentId) {
    let sessions = await this.cassandraDB.execute(`SELECT * FROM experimentSession WHERE experimentId=${experimentId}`);
    let subjects = await this.cassandraDB.execute(`SELECT * FROM subject`);
    sessions = sessions.rows;
    subjects = subjects.rows;

    sessions.forEach(s => {
      const subject = subjects.find(subject => subject.id.Uuid === s.subjectid.Uuid);
      s.subject = subject;
    });

    return sessions;
  };

  async getSessionsFromMssql(experimentId) {
    const sessionsResult = await this.mssqlDB.request()
      .query(`SELECT ExperimentSession.*, 
           Sex.Value AS SubjectSex, 
           EducationLevel.Value AS SubjectEducationLevel,
           Subject.VisionDefect AS SubjectVisionDefect,
           Subject.Age AS SubjectAge,
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
           LEFT JOIN EducationLevel ON Subject.EducationLevelId = EducationLevel.Id
           WHERE ExperimentId=${experimentId}`);
    return sessionsResult.recordset;
  };

  async getSessionsFromMongo(experimentId) {
    const sessions = await Session.find({ experiment: experimentId })
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

  async getSessionFromCassandra(id, experimentId) {
    const session = await this.cassandraDB.execute(
      `SELECT * FROM experimentsession
        WHERE experimentId=${experimentId} AND id=${id};`
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

  async saveSessionToMongo(session) {
    session.experiment = session.experimentId;
    delete session.experimentId;
    session.subject = session.subjectId;
    delete session.subjectId;

    const newSession = new Session(session)
    await newSession.save();
    return newSession;
  };

  async saveSessionToCassandra(session) {
    const id = _.uuid();
    let query = `INSERT INTO experimentSession 
                (id, startDate, endDate, experimentId, subjectId,
                  deviceFrequency, deviceProducer, deviceError, deviceType)
    VALUES (${id}, 
      '${session.startDate}', 
      '${session.endDate}', 
      ${session.experimentId},
      ${session.subjectId},
      ${session.deviceFrequency},
      '${session.deviceProducer}',
      ${session.deviceError},
      '${session.deviceType}'
    );`
    await this.cassandraDB.execute(query);
    return { id };
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

  async editSessionInMongo(session) {
    const updated = await Session.findByIdAndUpdate(
      { _id: session.id },
      session,
      { new: true }
    ).populate('experiment').populate('subject');
    return updated;
  }

  async editSessionInCassandra(session) {
    let query = `UPDATE experimentSession SET 
                subjectId=${session.subjectId},
                deviceType='${session.deviceType}',
                deviceError=${session.deviceError},
                deviceProducer='${session.deviceProducer}',
                deviceFrequency=${session.deviceFrequency}
                WHERE id=${session.id} 
                AND startDate='${session.startDate}'
                AND experimentId=${session.experimentId};`;
    await this.cassandraDB.execute(query);
    query = `SELECT * FROM experimentSession 
            WHERE id=${session.id}
            AND startDate='${session.startDate}'
            AND experimentId=${session.experimentId};`;
    const result = await this.cassandraDB.execute(query);
    return result.rows[0];
  }

  async deleteSessionFromMssql(id) {
    const query = `DELETE FROM ExperimentSession WHERE id=${id};`;
    await this.mssqlDB.request().query(query);
  }

  async deleteSessionFromCassandra(id) {
    let query = `SELECT * FROM experimentSession WHERE id=${id}
                ALLOW FILTERING;`// NEEDS TO BE CHECKED WHAT HAPPENS IF WE SEND ALL THE KEY
    const sessions = await this.cassandraDB.execute(query);
    const session = sessions.rows[0];

    query = `DELETE FROM experimentSession 
    WHERE id=${id} AND experimentId=${session.experimentid} AND startDate='${session.startdate}';`;

    return await this.cassandraDB.execute(query);
  }

  async deleteSessionFromMongo(id) {
    return await Session.deleteOne({ _id: id });
  }

  async getSession(dbType, id, experimentId) {
    switch (dbType) {
      case mssql: {
        return await this.getSessionFromMssql(id);
      }
      case cassandra: {
        return await this.getSessionFromCassandra(id, experimentId);
      }
      case mongo: {
        return await this.getSessionFromMongo(id);
      }
      default:
        return;
    };
  };

  async getSessions(dbType, experimentId) {
    switch (dbType) {
      case mssql: {
        return await this.getSessionsFromMssql(experimentId);
      }
      case cassandra: {
        return await this.getSessionsFromCassandra(experimentId);
      }
      case mongo: {
        return await this.getSessionsFromMongo(experimentId);
      }
      default:
        return;
    };
  };

  async deleteSession(dbType, id) {
    switch (dbType) {
      case mssql: {
        return await this.deleteSessionFromMssql(id);
      }
      case cassandra: {
        return await this.deleteSessionFromCassandra(id);
      }
      case mongo: {
        return await this.deleteSessionFromMongo(id);
      }
      default:
        return;
    };
  };

  async saveSession(dbType, session) {
    switch (dbType) {
      case mssql: {
        return await this.saveSessionToMssql(session);
      }
      case cassandra: {
        return await this.saveSessionToCassandra(session);
      }
      case mongo: {
        return await this.saveSessionToMongo(session);
      }
      default:
        return;
    };
  };

  async editSession(dbType, session) {
    switch (dbType) {
      case mssql: {
        return await this.editSessionInMssql(session);
      }
      case cassandra: {
        return await this.editSessionInCassandra(session);
      }
      case mongo: {
        return await this.editSessionInMongo(session);
      }
      default:
        return;
    };
  };

};

export default SessionDAL;

