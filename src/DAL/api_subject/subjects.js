// @ts-check
import _ from 'lodash-uuid';
import mongoose from 'mongoose';
import moment from 'moment';
import { SUBJECT_CASSANDRA_DB, SUBJECT_MONGO_DB } from '../../constants';
import { getSubjectModel } from '../../models/api_subject/mongo';
import { cassandra, mongo } from '../../routes/shared';
import timeLogger from '../../helpers/timeLogger';

let Subject;

class SubjectDAL {
  constructor(db) {
    this.cassandraDB = db[SUBJECT_CASSANDRA_DB];
    Subject = getSubjectModel(db[SUBJECT_MONGO_DB]);
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

  prepareSubject(subject) {
    const subjectString = `{
      age: ${subject.age},
      educationLevel: '${subject.educationLevel}',
      profession: '${subject.profession}',
      sex: '${subject.sex}',
      visionDefect: ${!!subject.visionDefect},
      name: '${subject.name}'
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
      const measurements = this.prepareMeasurements(session.measurements);
      const calibration = this.prepareMeasurements(session.calibration);

      sessions += `{
        deviceError: ${session.deviceError},
        deviceFrequency: ${session.deviceFrequency},
        deviceProducer: '${session.deviceProducer}',
        startDate: '${session.startDate}',
        endDate: '${session.endDate}',
        measurements: ${measurements},
        calibration: ${calibration},
        deviceType: '${session.deviceType}'
      }`
      if (index < experiment.sessions.length - 1) {
        sessions += ',';
      }
    });
    return sessions;
  }

  prepareExperiment(experiment) {
    const stymulus = this.createStymulusToSaveInCassandra(experiment);
    const sessions = this.prepareSessions(experiment);
    const query = `{
      startDate: '${experiment.startDate}',
      endDate: '${experiment.endDate}',
      name: '${experiment.name}',
      stymulus: {${stymulus}},
      sessions: {${sessions}},
      id: ${experiment.id}
    }`
    return query;
  }

  async saveExperimentToCassandra(subjects) {
    const experimentId = _.uuid();
    const start = moment().valueOf();
    for (const subject of subjects) {
      subject.experiment.id = experimentId;
      const experiment = this.prepareExperiment(subject.experiment);
      let query = `INSERT INTO subject 
      (name, age, educationLevel, experiments, experimentsIds, sex, visionDefect)
        VALUES (
          '${subject.name}', 
          ${subject.age}, 
          '${subject.educationLevel}',
          {},
          {},
          '${subject.sex}',
          ${!!subject.visionDefect})
        IF NOT EXISTS;`
      await this.cassandraDB.execute(query);
      query = `UPDATE subject SET 
        experiments = experiments + {${experiment}}, 
        experimentsIds = experimentsIds + {${experimentId}}
        WHERE name = '${subject.name}';`;

      await this.cassandraDB.execute(query);
    }
    const end = moment().valueOf();
    timeLogger(start, end, 'cassandra_subject', 'write');
    return;
  }

  async saveExperimentToMongo(subjects) {

    const id = mongoose.Types.ObjectId();

    const start = moment().valueOf();
    for (const subject of subjects) {
      subject.experiment._id = id;
      await Subject.update({
        name: subject.name,
      },
        {
          age: subject.age,
          educationLevel: subject.educationLevel,
          visionDefect: subject.visionDefect,
          sex: subject.sex,
          $push: {
            experiments: subject.experiment,
          }
        },
        {
          upsert: true,
        });
    }
    const end = moment().valueOf();
    timeLogger(start, end, 'mongo_subject', 'write');
  }

  async getSubjectExperimentsFromCassandra(subjectName) {
    const start = moment().valueOf();
    const subjectsResult = await this.cassandraDB
      .execute(`SELECT * FROM subject WHERE name='${subjectName}'`);
    const end = moment().valueOf();
    timeLogger(start, end, 'cassandra_subject', 'read_by_subject');
    return subjectsResult.rows[0];
  }

  async getSubjectExperimentsFromMongo(subjectName) {

    const start = moment().valueOf();

    const subjectExperiments = await Subject.find({ name: subjectName });

    const end = moment().valueOf();
    timeLogger(start, end, 'mongo_subject', 'read_by_subject');
    return subjectExperiments;
  }

  async getExperimentFromCassandra(id) {
    const start = moment().valueOf();
    const subjectsResult = await this.cassandraDB
      .execute(`SELECT * FROM subject WHERE experimentsIds CONTAINS ${id} ALLOW FILTERING;`);
    const subjects = subjectsResult.rows;
    for (const subject of subjects) {
      subject.experiments = subject.experiments.filter(e => e.id.toString() === id);
    }
    const end = moment().valueOf();
    timeLogger(start, end, 'cassandra_subject', 'read_by_experiment');
    return subjects;
  }

  async getExperimentFromMongo(id) {
    const start = moment().valueOf();
    const subjects = await Subject.find(
      { experiments: { $elemMatch: { _id: id } } },
      {
        name: 1,
        age: 1,
        educationLevel: 1,
        visionDefect: 1,
        sex: 1,
        experiments: { $elemMatch: { _id: id } },
      });
    const end = moment().valueOf();
    timeLogger(start, end, 'mongo_subject', 'read_by_experiment');
    return subjects;
  }

  async getSubjectsFromMongo() {
    const subjects = await Subject.find()
    return subjects.map(s => s.experiments.map(e => e._id));
  }

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


  async getSubjectExperiments(dbType, subjectName) {
    switch (dbType) {
      case cassandra: {
        return await this.getSubjectExperimentsFromCassandra(subjectName);
      }
      case mongo: {
        return await this.getSubjectExperimentsFromMongo(subjectName);
      }
      default:
        return;
    };
  };

  async getSubjects(dbType) {
    switch (dbType) {
      case mongo: {
        return await this.getSubjectsFromMongo();
      }
      default:
        return;
    };
  };

}

export default SubjectDAL;