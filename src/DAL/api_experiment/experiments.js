// @ts-check
const sql = require('mssql');
import { EXPERIMENT_CASSANDRA_DB, EXPERIMENT_MONGO_DB } from '../../constants';
import { getExperimentModel } from '../../models/api_experiment/mongo/';
import { cassandra, mongo } from '../../routes/shared';

let Experiment;

class ExperimentDAL {
  constructor(db) {
    this.cassandraDB = db[EXPERIMENT_CASSANDRA_DB];
    Experiment = getExperimentModel(db[EXPERIMENT_MONGO_DB]);
  }

  async getExperimentsFromCassandra() {
    const experiments = await this.cassandraDB
      .execute('SELECT id, name, startDate, endDate FROM experiment');
    return experiments.rows;
  }

  async getExperimentsFromMongo() {
    const experiments = await Experiment.find({}, ["_id", "name", "startDate", "endDate"]);
    return experiments;
  }

  async getExperimentFromCassandra(id) {
    const experimentResult = await this.cassandraDB.execute(
      `SELECT * FROM experiment
      WHERE id=${id}`);
    const experiment = experimentResult.rows[0];
    experiment.sessions.map(session => {
      session.measurements = session.measurements.map(m => {
        m.x = Number(m.x);
        m.y = Number(m.y);
        return m;
      });
      session.calibration = session.calibration.map(m => {
        m.x = Number(m.x);
        m.y = Number(m.y);
        return m;
      });
      return session;
    });
    return experimentResult.rows[0];
  }

  async getExperimentFromMongo(id) {
    const experiment = await Experiment.findOne({ _id: id });
    return experiment;
  }

  prepareSubject(subject) {
    const subjectString = `{
      age: ${subject.age},
      educationLevel: '${subject.educationLevel}',
      profession: '${subject.profession}',
      sex: '${subject.sex}',
      visionDefect: ${!!subject.visionDefect}
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
        stymulusId: ${measurement.stymulusId}
      }`

      if (index < measurements.length - 1) {
        measurementsSet += ',';
      }
    });

    measurementsSet += '}'

    return measurementsSet;
  }

  prepareSessions(experiment) {
    let sessions = '';
    experiment.sessions.forEach((session, index) => {
      const subject = this.prepareSubject(session.subject);
      const measurements = this.prepareMeasurements(session.measurements);
      const calibration = this.prepareMeasurements(session.calibration);

      sessions += `{
        deviceError: ${session.deviceError},
        deviceFrequency: ${session.deviceFrequency},
        deviceProducer: '${session.deviceProducer}',
        startDate: '${session.startDate}',
        endDate: '${session.endDate}',
        subject: ${subject},
        measurements: ${measurements},
        calibration: ${calibration}
      }`
      if (index < experiment.sessions.length - 1) {
        sessions += ',';
      }
    });
    return sessions;
  }

  createStymulusToSaveInCassandra(experiment) {
    let stymulus = ``
    experiment.stymulus.forEach((s, index) => {
      stymulus += `{
        startTime:${s.startTime},
        endTime:${s.endTime},
        stymulusType:'${s.stymulusType}',
        link:'${s.link}',
        x: ${s.x ? s.x : null},
        y: ${s.y ? s.y : null},
        id: ${s.id}
      }`
      if (index < experiment.stymulus.length - 1) {
        stymulus += ',';
      }
    });
    return stymulus;
  }

  async saveExperimentToCassandra(experiment) {
    const stymulus = this.createStymulusToSaveInCassandra(experiment);
    let query = 'INSERT INTO experiment (id, startDate, endDate, sessions, name, stymulus)';
    const sessions = this.prepareSessions(experiment);

    query += `VALUES (
      now(), 
      '${experiment.startDate}', 
      '${experiment.endDate}', 
      {${sessions}}, 
      '${experiment.name}', 
      {${stymulus}});`
    await this.cassandraDB.execute(query);
    return;
  }

  async saveExperimentToMongo(experiment) {
    const newExperiment = new Experiment(experiment);
    await newExperiment.save();
    return newExperiment;
  }

  async editExperimentInCassandra(experiment) {
    const stymulus = this.createStymulusToSaveInCassandra(experiment);
    const sessions = this.prepareSessions(experiment);
    let query = `UPDATE experiment SET 
                startDate='${experiment.startDate}',
                endDate='${experiment.endDate}' ,
                name='${experiment.name}',
                sessions={${sessions}},
                stymulus={${stymulus}}
                WHERE id=${experiment.id};`;

    await this.cassandraDB.execute(query);
    query = `SELECT * FROM experiment WHERE id=${experiment.id};`;
    const result = await this.cassandraDB.execute(query);
    return result.rows[0];
  }

  async editExperimentInMongo(experiment) {
    const updated = await Experiment.findByIdAndUpdate(
      { _id: experiment.id },
      experiment,
      { new: true }
    );
    return updated;
  }

  async deleteExperimentFromCassandra(id) {
    const query = `DELETE FROM experiment WHERE id=${id}`;
    return await this.cassandraDB.execute(query);
  }

  async deleteExperimentFromMongo(id) {
    return await Experiment.deleteOne({ _id: id });
  }

  async getExperiment(dbType, id) {
    switch (dbType) {
      case cassandra: {
        return await this.getExperimentFromCassandra(id);
      }
      case mongo: {
        return await this.getExperimentFromMongo(id);
      }
      default:
        return;
    };
  };

  async getExperiments(dbType) {
    switch (dbType) {
      case cassandra: {
        return await this.getExperimentsFromCassandra();
      }
      case mongo: {
        return await this.getExperimentsFromMongo();
      }
      default:
        return;
    };
  };

  async deleteExperiment(dbType, id) {
    switch (dbType) {
      case cassandra: {
        return await this.deleteExperimentFromCassandra(id);
      }
      case mongo: {
        return await this.deleteExperimentFromMongo(id);
      }
      default:
        return;
    };
  };

  async saveExperiment(dbType, experiment) {
    switch (dbType) {
      case cassandra: {
        return await this.saveExperimentToCassandra(experiment);
      }
      case mongo: {
        return await this.saveExperimentToMongo(experiment);
      }
      default:
        return;
    };
  };

  async editExperiment(dbType, experiment) {
    switch (dbType) {
      case cassandra: {
        return await this.editExperimentInCassandra(experiment);
      }
      case mongo: {
        return await this.editExperimentInMongo(experiment);
      }
      default:
        return;
    };
  };

}

export default ExperimentDAL;