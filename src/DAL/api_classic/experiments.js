// @ts-check
const sql = require('mssql');
import { MSSQL_DB, CLASSIC_CASSANDRA_DB, CLASSIC_MONGO_DB, stymulusTypes } from '../../constants';
import { cassandra, mssql, mongo } from '../../routes/shared';
import { getExperimentModel } from '../../models/api_classic/mongo';

let Experiment

class ExperimentDAL {
  constructor(db) {
    this.cassandraDB = db[CLASSIC_CASSANDRA_DB];
    this.mssqlDB = db[MSSQL_DB];
    Experiment = getExperimentModel(db[CLASSIC_MONGO_DB]);
  }

  async getExperimentsFromCassandra() {
    const experiments = await this.cassandraDB.execute('SELECT * FROM experiment');
    return experiments.rows;
  };

  async getExperimentsFromMssql() {
    const experimentsResult = await this.mssqlDB.request()
      .query(`SELECT * FROM Experiment`);
    const stymulusResult = await this.mssqlDB.request()
      .query(`SELECT Stymulus.*, StymulusType.Value AS Type FROM Stymulus
        LEFT JOIN StymulusType ON Stymulus.StymulusTypeId = StymulusType.Id`);

    const experiments = experimentsResult.recordset;
    const stymulus = stymulusResult.recordset;

    experiments.forEach(e => {
      const relatedStymulus = stymulus.filter(s => s.ExperimentId === e.Id);
      e.stymulus = relatedStymulus;
    });
    return experiments;
  };

  async getExperimentsFromMongo() {
    const experiments = await Experiment.find();
    return experiments;
  };

  async getExperimentFromMssql(id) {
    const experimentResult = await this.mssqlDB.request()
      .query(`SELECT * FROM Experiment WHERE id=${id}`);
    const stymulusResult = await this.mssqlDB.request()
      .query(`SELECT Stymulus.*, StymulusType.Value AS Type FROM Stymulus
      LEFT JOIN StymulusType ON Stymulus.StymulusTypeId = StymulusType.Id`);
    const experiment = experimentResult.recordset[0];
    const stymulus = stymulusResult.recordset;
    experiment.stymulus = stymulus;

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
                VALUES ('${experiment.startDate}', '${experiment.endDate}');
                SELECT * FROM @inserted;`
    const experimentResult = await this.mssqlDB.request().query(query);
    const savedExperiment = experimentResult.recordset[0];

    experiment.id = savedExperiment.Id;
    const stymulus = await this.saveStymulusInMssql(experiment);

    savedExperiment.stymulus = stymulus;
    return savedExperiment;
  };

  async saveExperimentToCassandra(experiment) {
    const stymulus = this.createStymulusToSaveInCassandra(experiment);
    let query = `INSERT INTO experiment (id, startDate, endDate, stymulus)
    VALUES (now(), '${experiment.startDate}', '${experiment.endDate}', {${stymulus}});`
    await this.cassandraDB.execute(query);
    return;
  };

  async saveExperimentToMongo(experiment) {
    const newExperiment = new Experiment(experiment);
    await newExperiment.save();
    return newExperiment;
  };

  async editExperimentInMssql(experiment) {
    let query = `UPDATE Experiment SET 
                StartDate='${experiment.startDate}', 
                EndDate='${experiment.endDate}' 
                WHERE id=${experiment.id}
                SELECT * FROM Experiment WHERE id=${experiment.id};`;
    const result = await this.mssqlDB.request().query(query);
    const savedExperiment = result.recordset[0];

    await this.deleteStymulusFromMssql(experiment);
    const stymulus = await this.saveStymulusInMssql(experiment);

    savedExperiment.stymulus = stymulus;
    return savedExperiment;
  };

  async editExperimentInCassandra(experiment) {
    const stymulus = this.createStymulusToSaveInCassandra(experiment);
    let query = `UPDATE experiment SET 
                startDate='${experiment.startDate}',
                endDate='${experiment.endDate}' ,
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

  async getStymulusFromMssql(id) {
    const stymulusResult = await this.mssqlDB.request()
      .query(`SELECT Stymulus.*, StymulusType.Value AS Type FROM Stymulus
        LEFT JOIN StymulusType ON Stymulus.StymulusTypeId = StymulusType.Id
        WHERE Stymulus.ExperimentId=${id}`);
    return stymulusResult.recordset;
  };

  async deleteStymulusFromMssql(experiment) {
    let query = `DELETE FROM Stymulus WHERE experimentId=${experiment.id}`;
    await this.mssqlDB.request().query(query);
    return;
  };

  async saveStymulusInMssql(experiment) {
    let query = `INSERT INTO Stymulus VALUES `;
    experiment.stymulus.forEach((s, index) => {
      query += `(
         ${s.id}
        '${s.link}',
         ${s.startTime},
         ${s.endTime},
         ${experiment.id},
         ${stymulusTypes[s.stymulusType]},
         ${s.x},
         ${s.y}
      )`
      if (index < experiment.stymulus.length - 1) {
        query += ',';
      }
    })
    await this.mssqlDB.request().query(query);
    return await this.getStymulusFromMssql(experiment.id);
  };

  createStymulusToSaveInCassandra(experiment) {
    let stymulus = ``
    experiment.stymulus.forEach((s, index) => {
      stymulus += `{
        startTime:${s.startTime},
        endTime:${s.endTime},
        stymulusType:'${s.stymulusType}',
        link:'${s.link}',
        x: ${s.x},
        y: ${s.y},
        id: ${s.id}
      }`
      if (index < experiment.stymulus.length - 1) {
        stymulus += ',';
      }
    });
    return stymulus;
  }

  async getExperiment(dbType, id) {
    switch (dbType) {
      case mssql: {
        return await this.getExperimentFromMssql(id);
      }
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
        return await this.saveExperimentToMssql(experiment);
      }
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

