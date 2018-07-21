const sql = require('mssql');
import { MSSQL_DB, CASSANDRA_DB, MONGO_DB } from '../../constants';
import { Experiment } from '../../models/api_classic/mongo';

class ExperimentDAL {
  constructor(db) {
    this.cassandraDB = db[CASSANDRA_DB];
    this.mssqlDB = db[MSSQL_DB];
  }

  async getExperimentsFromCassandra() {
    const experiments = await this.cassandraDB.execute('SELECT * FROM experiment');
    return experiments.rows;
  };

  async getExperimentsFromMssql() {
    const experimentsResult = await this.mssqlDB.request()
      .query(`SELECT * FROM Experiment`);
    const stimulusResult = await this.mssqlDB.request()
      .query(`SELECT Stymulus.*, StymulusType.Value AS Type FROM Stymulus
        LEFT JOIN StymulusType ON Stymulus.StymulusTypeId = StymulusType.Id`);

    const experiments = experimentsResult.recordset;
    const stimulus = stimulusResult.recordset;

    experiments.forEach(e => {
      const relatedStimulus = stimulus.filter(s => s.ExperimentId === e.Id);
      e.stimulus = relatedStimulus;
    });
    return experiments;
  };

  async getExperimentsFromMongo() {
    const experiments = await Experiment.find();
    return experiments;
  };

  async getExperimentFromMssql(id) {
    const experimentResult = await this.mssqlDB.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM Experiment WHERE id=@id');
    const stimulusResult = await this.mssqlDB.request()
      .input('id', sql.Int, id)
      .query(`SELECT Stymulus.*, StymulusType.Value AS Type FROM Stymulus
        LEFT JOIN StymulusType ON Stymulus.StymulusTypeId = StymulusType.Id
        WHERE Stymulus.ExperimentId=@id`);
    const experiment = experimentResult.recordset[0];
    const stimulus = stimulusResult.recordset;
    experiment.stimulus = stimulus;

    return experiment;
  };

  async getExperimentFromMongo(id) {
    const experiment = await Experiment.findOne({ _id: id });
    return experiment;
  };

  async getExperimentFromCassandra(id) {
    const experiment = await this.cassandraDB.execute(
      `SELECT * FROM experiment
      WHERE id=${id}
      `
    );
    return experiment.rows[0];
  };

  async getExperiment(dbType, id) {
    switch (dbType) {
      case MSSQL_DB: {
        return await this.getExperimentFromMssql(id);
      }
      case CASSANDRA_DB: {
        return await this.getExperimentFromCassandra(id);
      }
      case MONGO_DB: {
        return await this.getExperimentFromMongo(id);
      }
      default:
        return;
    };
  };

  async getExperiments(dbType) {
    switch (dbType) {
      case MSSQL_DB: {
        return await this.getExperimentsFromMssql();
      }
      case CASSANDRA_DB: {
        return await this.getExperimentsFromCassandra();
      }
      case MONGO_DB: {
        return await this.getExperimentsFromMongo();
      }
      default:
        return;
    };
  };
};

export default ExperimentDAL;

