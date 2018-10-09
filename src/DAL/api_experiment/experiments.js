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
    const experiments = await this.cassandraDB.execute('SELECT * FROM experiment');
    return experiments.rows;
  }

  async getExperimentsFromMongo() {
    const experiments = await Experiment.find();
    return experiments;
  }

  async getExperimentFromCassandra(id) {
    const experiment = await this.cassandraDB.execute(
      `SELECT * FROM experiment
      WHERE id=${id}`);
    return experiment.rows[0];
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

  async saveExperimentToCassandra(experiment) {
    let query = 'INSERT INTO experiment (id, startDate, endDate, sessions)';
    const sessions = this.prepareSessions(experiment);

    query += `VALUES (now(), '${experiment.startDate}', '${experiment.endDate}', {${sessions}});`
    await this.cassandraDB.execute(query);
    return;
  }

  async saveExperimentToMongo(experiment) {
    const newExperiment = new Experiment(experiment);
    await newExperiment.save();
    return newExperiment;
  }

  async editExperimentInCassandra(experiment) {
    const sessions = this.prepareSessions(experiment);
    let query = `UPDATE experiment SET 
                startDate='${experiment.startDate}',
                endDate='${experiment.endDate}' ,
                sessions={${sessions}}
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