// @ts-check
const sql = require('mssql');
import mongoose from 'mongoose';
import { SESSION_CASSANDRA_DB, SESSION_MONGO_DB } from '../../constants';
import { getSessionModel } from '../../models/api_session/mongo/';
import { cassandra, mongo } from '../../routes/shared';

let Session;

class SessionDAL {
  constructor(db) {
    this.cassandraDB = db[SESSION_CASSANDRA_DB];
    Session = getSessionModel(db[SESSION_MONGO_DB]);
  }

  async getSessionsFromCassandra() {
    const sessions = await this.cassandraDB.execute('SELECT * FROM session');
    return sessions.rows;
  }

  async getSessionsFromMongo() {
    const sessions = await Session.find();
    return sessions;
  }

  async getSessionFromCassandra(id) {
    const session = await this.cassandraDB.execute(
      `SELECT * FROM session
      WHERE id=${id}`);
    return session.rows[0];
  }

  async getSessionFromMongo(id) {
    const session = await Session.findOne({ _id: id });
    return session;
  }

  prepareSubject(subject) {
    const subjectString = `{
      age: ${subject.age},
      educationLevel: '${subject.educationLevel}',
      sex: '${subject.sex}',
      visionDefect: ${subject.visionDefect}
    }`
    return subjectString;
  }

  prepareMeasurements(measurements) {
    let measurementsSet = '{';

    measurements.forEach((measurement, index) => {
      measurementsSet += `{
        timestamp: ${measurement.timestamp},
        x: ${measurement.x},
        y: ${measurement.y},
        stymulusLink: '${measurement.stymulusLink}',
        stymulusStartTime: ${measurement.stymulusStartTime},
        stymulusEndTime: ${measurement.stymulusEndTime},
        stymulusType: '${measurement.stymulusType}',
        stymulusX: ${measurement.stymulusX},
        stymulusY: ${measurement.stymulusY}
      }`

      if (index < measurements.length - 1) {
        measurementsSet += ',';
      }
    });

    measurementsSet += '}'

    return measurementsSet;
  }

  async saveSessionToCassandra(session) {
    const subject = this.prepareSubject(session.subject);
    const measurements = this.prepareMeasurements(session.measurements);
    const calibration = this.prepareMeasurements(session.calibration);

    let query = `INSERT INTO session (
      id, 
      experimentId, 
      deviceError, 
      deviceFrequency, 
      deviceProducer,
      startDate,
      endDate,
      subject,
      measurements,
      calibration
    )
      VALUES (now(), 
      ${session.experimentId},
      ${session.deviceError},
      ${session.deviceFrequency},
      '${session.deviceProducer}',
      '${session.startDate}',
      '${session.endDate}',
      ${subject},
      ${measurements},
      ${calibration}
    );`

    await this.cassandraDB.execute(query);
    return;
  }

  async saveSessionToMongo(session) {
    const newSession = new Session(session);
    await newSession.save();
    return newSession;
  }

  async editSessionInCassandra(session) {
    const subject = this.prepareSubject(session.subject);
    const measurements = this.prepareMeasurements(session.measurements);
    const calibration = this.prepareMeasurements(session.calibration);

    let query = `UPDATE session SET 
      deviceError=${session.deviceError}, 
      deviceFrequency=${session.deviceFrequency}, 
      deviceProducer='${session.deviceProducer}',
      startDate='${session.startDate}',
      endDate='${session.endDate}',
      subject=${subject},
      measurements=${measurements},
      calibration=${calibration}
      WHERE id=${session.id} AND experimentId=${session.experimentId};`

    await this.cassandraDB.execute(query);

    query = `SELECT * FROM session 
      WHERE id=${session.id} AND experimentId=${session.experimentId};`;

    const result = await this.cassandraDB.execute(query);
    return result.rows[0];
  }

  async editSessionInMongo(session) {
    const updated = await Session.findByIdAndUpdate(
      { _id: session.id },
      session,
      { new: true }
    );
    return updated;
  }

  async deleteSessionFromCassandra(id, experimentId) {
    const query = `DELETE FROM session WHERE id=${id} AND experimentId=${experimentId}`;
    return await this.cassandraDB.execute(query);
  }

  async deleteSessionFromMongo(id) {
    console.log(id);
    return await Session.deleteOne({ _id: id });
  }

  async getSession(dbType, id) {
    switch (dbType) {
      case cassandra: {
        return await this.getSessionFromCassandra(id);
      }
      case mongo: {
        return await this.getSessionFromMongo(id);
      }
      default:
        return;
    };
  };

  async getSessions(dbType) {
    switch (dbType) {
      case cassandra: {
        return await this.getSessionsFromCassandra();
      }
      case mongo: {
        return await this.getSessionsFromMongo();
      }
      default:
        return;
    };
  };

  async deleteSession(dbType, id, experimentId) {
    console.log(dbType, id)
    switch (dbType) {
      case cassandra: {
        return await this.deleteSessionFromCassandra(id, experimentId);
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

}

export default SessionDAL;