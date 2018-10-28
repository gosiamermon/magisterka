// @ts-check
import _ from 'lodash-uuid';
import chunk from 'lodash.chunk';
import moment from 'moment';
import { MSSQL_DB, CLASSIC_CASSANDRA_DB, CLASSIC_MONGO_DB, stymulusTypes } from '../../constants';
import { cassandra, mssql, mongo } from '../../routes/shared';
import { getExperimentModel, getMeasurementModel, getSessionModel, getSubjectModel } from '../../models/api_classic/mongo';
import { sex, educationLevel } from '../../constants';
import timeLogger from '../../helpers/timeLogger';

let Experiment;
let Subject;
let Session;
let Measurement;

class ExperimentDAL {
  constructor(db) {
    this.cassandraDB = db[CLASSIC_CASSANDRA_DB];
    this.mssqlDB = db[MSSQL_DB];

    Experiment = getExperimentModel(db[CLASSIC_MONGO_DB]);
    Subject = getSubjectModel(db[CLASSIC_MONGO_DB]);
    Session = getSessionModel(db[CLASSIC_MONGO_DB]);
    Measurement = getMeasurementModel(db[CLASSIC_MONGO_DB]);

    this.dateFormat = 'YYYY-MM-DD HH:mm:ss.SSS';
  }

  async getExperimentsFromCassandra() {
    const experiments = await this.cassandraDB
      .execute('SELECT id, name, startDate, endDate FROM experiment');
    return experiments.rows;
  };

  async getExperimentsFromMssql() {
    const experiments = await this.mssqlDB.request()
      .query(`SELECT Id, Name, StartDate, EndDate FROM Experiment`);
    return experiments.recordset;
  };

  async getExperimentsFromMongo() {
    let experiments = await Experiment.find({}, ["_id", "name", "startDate", "endDate"]);
    experiments = experiments.map(experiment => {
      return experiment;
    })
    return experiments;
  };

  async getExperimentFromMssql(id) {
    const experimentResult = await this.mssqlDB.request()
      .query(`SELECT * FROM Experiment WHERE id=${id}`);
    const stymulusResult = await this.mssqlDB.request()
      .query(`SELECT Stymulus.*,
      StymulusType.Value AS StymulusType
      FROM Stymulus 
      LEFT JOIN StymulusType ON Stymulus.StymulusTypeId = StymulusType.Id
      WHERE experimentId=${id};`);

    const experiment = experimentResult.recordset[0];
    experiment.stymulus = stymulusResult.recordset;

    return experiment;
  };

  async getExperimentFromMongo(id) {
    const experiment = await Experiment.findOne({ _id: id });
    return experiment;
  };

  async getExperimentFromCassandra(id) {
    const experiment = await this.cassandraDB.execute(
      `SELECT * FROM experiment
      WHERE id=${id}`);
    return experiment.rows[0];
  };

  async saveExperimentToMssql(experiment) {
    const declareInsertValues = `DECLARE @inserted table([Id] int)`;
    let query = `${declareInsertValues}
                INSERT INTO Experiment
                OUTPUT INSERTED.[Id] INTO @inserted
                VALUES ('${experiment.startDate}', '${experiment.endDate}', '${experiment.name}');
                SELECT * FROM @inserted;`
    const experimentResult = await this.mssqlDB.request().query(query);
    return experimentResult.recordset[0];
  };

  async saveAllExperimentToMssql(experiment) {
    let query =
      `
      BEGIN TRANSACTION;
      DECLARE @experimentId int
      INSERT INTO Experiment
      VALUES ('${experiment.startDate}', '${experiment.endDate}', '${experiment.name}');
      SELECT @experimentId = SCOPE_IDENTITY();
      DECLARE @subjectId int
      DECLARE @oldSubjectId int
      DECLARE @sessionId int
      DECLARE @stymulusId int
      DECLARE @oldStymulusId int
      `
    for (const subject of experiment.subjects) {
      query += `SELECT @oldSubjectId = @subjectId; 
      SELECT @subjectId = Id FROM Subject WHERE Subject.Name = '${subject.name}';
      IF (@subjectId is null or @subjectId = @oldSubjectId) 
          BEGIN
          INSERT INTO Subject
          VALUES (${subject.age}, 
          ${sex[subject.sex]}, 
          ${educationLevel[subject.educationLevel]},
          ${subject.visionDefect},
          '${subject.name}')
          SELECT @subjectId = SCOPE_IDENTITY();
          END
      `
      const subjectSessions = experiment.sessions.filter(s => s.subjectName === subject.name);
      for (const session of subjectSessions) {
        query += `INSERT INTO ExperimentSession
        VALUES ('${session.startDate}', 
                '${session.endDate}', 
                @experimentId, 
                @subjectId, 
                2);
        SELECT @sessionId = SCOPE_IDENTITY();`
        query += this.prepareDataPerStymulusInMssql(session.calibrationPerStymulus);
        query += this.prepareDataPerStymulusInMssql(session.measurementsPerStymulus);
      }
    }
    query += 'COMMIT;';
    const start = moment().valueOf();
    await this.mssqlDB.request().query(query);
    const end = moment().valueOf();
    timeLogger(start, end, 'mssql_classic', 'write');
    return;
  };

  prepareDataPerStymulusInMssql(dataPerStymulus) {
    let query = '';
    for (const data of dataPerStymulus) {
      const stymulus = data.stymulus;
      query += `
        SELECT @oldStymulusId = @stymulusId;
        SELECT @stymulusId = Id FROM Stymulus 
        WHERE ExperimentId = @experimentId AND Link='${stymulus.link}'
        AND X=${stymulus.x ? stymulus.x : null} AND Y=${stymulus.y ? stymulus.y : null};
        IF (@stymulusId is null or @stymulusId = @oldStymulusId)
            BEGIN
            INSERT INTO Stymulus 
            VALUES (
              '${stymulus.link ? stymulus.link : ""}',
              ${stymulus.startTime},${stymulus.endTime},
              @experimentId,
              ${stymulusTypes[stymulus.stymulusType]},
              ${stymulus.x ? stymulus.x : null},
              ${stymulus.y ? stymulus.y : null})
            SELECT @stymulusId = SCOPE_IDENTITY();
            END
        `;
      const measurementsDivided = chunk(data.measurements, 1000)

      for (let i = 0; i < measurementsDivided.length; i++) {
        query += `INSERT INTO Measurement VALUES`
        const measurementsChunk = measurementsDivided[i];
        for (let j = 0; j < measurementsChunk.length; j++) {
          const m = measurementsChunk[j];
          const timestamp = moment(m.timestamp).format(this.dateFormat);
          query += `('${timestamp}', ${m.x}, ${m.y}, @sessionId, @stymulusId, ${m.isCalibration})`
          if (j < measurementsChunk.length - 1) {
            query += ',';
          } else {
            query += ';';
          }
        };
      }
    }
    return query;
  }

  async saveAllExperimentToCassandra(experiment) {
    const stymulus = this.createStymulusToSaveInCassandra(experiment);
    const experimentId = _.uuid();

    const start = moment().valueOf();

    let query = ` INSERT INTO experiment (id, startDate, endDate, stymulus, name)
    VALUES (${experimentId}, '${experiment.startDate}', '${experiment.endDate}', {${stymulus}}, '${experiment.name}')`
    await this.cassandraDB.execute(query);

    for (const subject of experiment.subjects) {
      query = ` INSERT INTO subject(age, educationLevel, name, sex, visionDefect) 
      VALUES(${subject.age}, '${subject.educationLevel}', '${subject.name}', '${subject.sex}', ${!!subject.visionDefect});`
      await this.cassandraDB.execute(query);

      const subjectSessions = experiment.sessions.filter(s => s.subjectName === subject.name);

      for (const session of subjectSessions) {
        const sessionId = _.uuid();
        query = ` INSERT INTO experimentSession 
          (id, startDate, endDate, experimentId, subjectName,
          deviceFrequency, deviceProducer, deviceError, deviceType)
          VALUES (${sessionId}, 
          '${session.startDate}', 
          '${session.endDate}', 
          ${experimentId},
          '${subject.name}',
          ${session.deviceFrequency},
          '${session.deviceProducer}',
          ${session.deviceError},
          '${session.deviceType}'
        ); `
        await this.cassandraDB.execute(query);
        query = 'BEGIN BATCH '
        for (const m of session.measurements) {
          query += `INSERT INTO measurement (id, sessionId, x, y, timestamp, stymulusId, isCalibration)
            VALUES (now(), ${sessionId}, ${m.x}, ${m.y}, '${m.timestamp}', ${m.stymulusId}, ${!!m.isCalibration}); `
        }
        query += 'APPLY BATCH; ';
        await this.cassandraDB.execute(query);

        query = 'BEGIN BATCH '
        for (const m of session.calibration) {
          query += `INSERT INTO measurement (id, sessionId, x, y, timestamp, stymulusId, isCalibration)
          VALUES (now(), ${sessionId}, ${m.x}, ${m.y}, '${m.timestamp}', ${m.stymulusId}, ${!!m.isCalibration}); `
        }
        query += 'APPLY BATCH;'
        await this.cassandraDB.execute(query);
      }
    }
    const end = moment().valueOf();
    timeLogger(start, end, 'cassandra_classic', 'write');
    return;
  }

  async saveAllExperimentToMongo(experiment) {
    const newExperiment = new Experiment({
      name: experiment.name,
      startDate: experiment.startDate,
      endDate: experiment.endDate,
      stymulus: experiment.stymulus
    });

    const start = moment().valueOf();
    await newExperiment.save();

    for (const subject of experiment.subjects) {
      const savedSubject = await Subject.findOne({ name: subject.name });
      let subjectId;
      if (savedSubject) {
        subjectId = savedSubject._id;
      } else {
        const newSubject = new Subject(subject);
        await newSubject.save();
        subjectId = newSubject._id;
      }
      const subjectSessions = experiment.sessions.filter(s => s.subjectName === subject.name);
      for (const session of subjectSessions) {
        session.experiment = newExperiment._id;
        session.subject = subjectId;

        let measurements = session.measurements;
        let calibration = session.calibration;
        delete session.measurements;
        delete session.calibration;

        const newSession = new Session(session)
        await newSession.save();

        measurements = measurements.map(m => {
          m.session = newSession._id;
          return m;
        });
        await Measurement.collection.insertMany(measurements);

        calibration = calibration.map(m => {
          m.session = newSession._id;
          return m;
        });
        await Measurement.collection.insertMany(calibration);
      }
    }
    const end = moment().valueOf();
    timeLogger(start, end, 'mongo_classic', 'write');
    return;
  }

  async saveExperimentToCassandra(experiment) {
    const stymulus = this.createStymulusToSaveInCassandra(experiment);
    const id = _.uuid();
    let query = `INSERT INTO experiment (id, startDate, endDate, stymulus, name)
    VALUES (${id}, '${experiment.startDate}', '${experiment.endDate}', {${stymulus}}, '${experiment.name}');`
    await this.cassandraDB.execute(query);
    return { id };
  };

  async saveExperimentToMongo(experiment) {
    const newExperiment = new Experiment(experiment);
    await newExperiment.save();
    return newExperiment;
  };

  async editExperimentInMssql(experiment) {
    let query = `UPDATE Experiment SET 
                StartDate='${experiment.startDate}', 
                EndDate='${experiment.endDate}',
                Name='${experiment.name}'
                WHERE id=${experiment.id}
                SELECT * FROM Experiment WHERE id=${experiment.id};`;
    const result = await this.mssqlDB.request().query(query);
    const savedExperiment = result.recordset[0];
    return savedExperiment.Id;
  };

  async editExperimentInCassandra(experiment) {
    const stymulus = this.createStymulusToSaveInCassandra(experiment);
    let query = `UPDATE experiment SET 
                startDate='${experiment.startDate}',
                endDate='${experiment.endDate}' ,
                name='${experiment.name}',
                stymulus={${stymulus}}
                WHERE id=${experiment.id};`;
    await this.cassandraDB.execute(query);
    query = `SELECT * FROM experiment WHERE id=${experiment.id};`;
    const result = await this.cassandraDB.execute(query);
    return result.rows[0];
  };

  async editExperimentInMongo(experiment) {
    const updated = await Experiment.findByIdAndUpdate(
      { _id: experiment.id },
      experiment,
      { new: true }
    );
    return updated;
  };

  async deleteExperimentFromMssql(id) {
    const query = `DELETE FROM Stymulus WHERE experimentId=${id}
                DELETE FROM Experiment WHERE id=${id};`;
    await this.mssqlDB.request().query(query);
  };

  async deleteExperimentFromCassandra(id) {
    const query = `DELETE FROM experiment WHERE id=${id}`;
    return await this.cassandraDB.execute(query);
  };

  async deleteExperimentFromMongo(id) {
    return await Experiment.deleteOne({ _id: id });
  };

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

  async getExperimentInOneQueryFromMssql(id) {
    const query = `select Experiment.*, ExperimentSession.*, Measurement.*, Stymulus.* from Measurement 
    left join ExperimentSession on Measurement.SessionId = ExperimentSession.Id
    left join Experiment on ExperimentSession.ExperimentId = Experiment.Id 
    left join Stymulus on Measurement.StymulusId = Stymulus.Id
    left join [Subject] on ExperimentSession.SubjectId = [Subject].Id 
    where Experiment.Id = ${id};`

    const start = moment().valueOf();
    const result = await this.mssqlDB.request().query(query);
    const end = moment().valueOf();
    timeLogger(start, end, 'mssql_classic', 'read_by_experiment');

    return result.recordset;
  }

  async getSubjectExperimentsInOneQueryFromMssql(subjectName) {
    const query = `select Experiment.*, ExperimentSession.*, Measurement.*, Stymulus.* from Measurement 
    left join ExperimentSession on Measurement.SessionId = ExperimentSession.Id
    left join Experiment on ExperimentSession.ExperimentId = Experiment.Id 
    left join Stymulus on Measurement.StymulusId = Stymulus.Id
    left join [Subject] on ExperimentSession.SubjectId = [Subject].Id 
    where Subject.Name = '${subjectName}';`

    const start = moment().valueOf();
    const result = await this.mssqlDB.request().query(query);
    const end = moment().valueOf();
    timeLogger(start, end, 'mssql_classic', 'read_by_subject');
    return result.recordset;
  }

  async getExperimentInOneQueryFromCassandra(id) {
    const start = moment().valueOf();
    const experimentResult = await this.cassandraDB
      .execute(`select * from experiment where id=${id};`);
    const experiment = experimentResult.rows[0];
    const sessionsResult = await this.cassandraDB
      .execute(`select * from experimentSession where experimentId=${id};`);
    const sessions = sessionsResult.rows;
    for (const session of sessions) {
      const measurementsResult = await this.cassandraDB
        .execute(`select * from measurement where sessionId=${session.id};`);
      session.measurements = measurementsResult.rows;

      const subjectResult = await this.cassandraDB
        .execute(`select * from subject where name='${session.subjectName}';`)
      session.subject = subjectResult.rows[0];
    }
    experiment.sessions = sessions;
    const end = moment().valueOf();
    timeLogger(start, end, 'cassandra_classic', 'read_by_experiment');
    return experiment;
  }

  async getSubjectExperimentsInOneQueryFromCassandra(subjectName) {
    const start = moment().valueOf();
    const subjectResult = await this.cassandraDB
      .execute(`select * from subject where name='${subjectName}';`)
    const subject = subjectResult.rows[0];

    const sessionsResult = await this.cassandraDB
      .execute(`select * from experimentSession where subjectName='${subject.name}' allow filtering;`);
    const sessions = sessionsResult.rows;

    for (const session of sessions) {

      const measurementsResult = await this.cassandraDB
        .execute(`select * from measurement where sessionId=${session.id};`);
      session.measurements = measurementsResult.rows;

      const experimentResult = await this.cassandraDB
        .execute(`select * from experiment where id=${session.experimentid};`);
      session.experiment = experimentResult.rows[0];

    }
    subject.sessions = sessions;
    const end = moment().valueOf();
    timeLogger(start, end, 'cassandra_classic', 'read_by_subject');
    return subject;
  }

  async getExperimentInOneQueryFromMongo(id) {

    const start = moment().valueOf();

    const sessions = await Session.find({ experiment: id }).populate('experiment').populate('subject');
    for (const session of sessions) {
      const measurements = await Measurement.find({ session: session._id });
      session.measurements = measurements;
    }

    const end = moment().valueOf();
    timeLogger(start, end, 'mongo_classic', 'read_by_experiment');

    return sessions;
  }

  async getSubjectExperimentsInOneQueryFromMongo(subjectName) {
    const start = moment().valueOf();
    const subject = await Subject.findOne({ name: subjectName });
    const sessions = await Session.find({ subject: subject._id }).populate('experiment');
    for (const session of sessions) {
      const measurements = await Measurement.find({ session: session._id });
      session.measurements = measurements;
    }
    subject.sessions = sessions;

    const end = moment().valueOf();
    timeLogger(start, end, 'mongo_classic', 'read_by_subject');
    return subject;
  }

  async getExperiment(dbType, id) {
    switch (dbType) {
      case mssql: {
        return await this.getExperimentFromMssql(id);
      }
      case cassandra: {
        return await this.getExperimentInOneQueryFromCassandra(id);
      }
      case mongo: {
        return await this.getSubjectExperimentsInOneQueryFromMongo(id);
      }
      default:
        return;
    };
  };

  async getSubjectExperimentsInOneQuery(dbType, subjectName) {
    switch (dbType) {
      case mssql: {
        return await this.getSubjectExperimentsInOneQueryFromMssql(subjectName);
      }
      case cassandra: {
        return await this.getSubjectExperimentsInOneQueryFromCassandra(subjectName);
      }
      case mongo: {
        return await this.getSubjectExperimentsInOneQueryFromMongo(subjectName);
      }
      default:
        return;
    };
  };

  async getExperimentInOneQuery(dbType, id) {
    switch (dbType) {
      case mssql: {
        return await this.getExperimentInOneQueryFromMssql(id);
      }
      case cassandra: {
        return await this.getExperimentInOneQueryFromCassandra(id);
      }
      case mongo: {
        return await this.getExperimentInOneQueryFromMongo(id);
      }
      default:
        return;
    };
  };

  async getExperiments(dbType) {
    switch (dbType) {
      case mssql: {
        return await this.getExperimentsFromMssql();
      }
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
      case mssql: {
        return await this.deleteExperimentFromMssql(id);
      }
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
      case mssql: {
        return await this.saveAllExperimentToMssql(experiment);
      }
      case cassandra: {
        return await this.saveAllExperimentToCassandra(experiment);
      }
      case mongo: {
        return await this.saveAllExperimentToMongo(experiment);
      }
      default:
        return;
    };
  };

  async editExperiment(dbType, experiment) {
    switch (dbType) {
      case mssql: {
        return await this.editExperimentInMssql(experiment);
      }
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

};

export default ExperimentDAL;

