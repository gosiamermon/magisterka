const sql = require('mssql');
import { MSSQL_DB, CASSANDRA_DB, MONGO_DB, stymulusTypes } from '../../constants';
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

  async getStymulusFromMssql(id) {
    const stymulusResult = await this.mssqlDB.request()
      .query(`SELECT Stymulus.*, StymulusType.Value AS Type FROM Stymulus
        LEFT JOIN StymulusType ON Stymulus.StymulusTypeId = StymulusType.Id
        WHERE Stymulus.ExperimentId=${id}`);
    return stymulusResult.recordset;
  };

  async getExperimentFromMssql(id) {
    const experimentResult = await this.mssqlDB.request()
      .query(`SELECT * FROM Experiment WHERE id=${id}`);
    const experiment = experimentResult.recordset[0];
    experiment.stymulus = await this.getStymulusFromMssql(id);

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

  async deleteStymulusFromMssql(experiment) {
    let query = `DELETE FROM Stymulus WHERE experimentId=${experiment.id}`;
    await this.mssqlDB.request().query(query);
    return;
  };

  async saveStymulusInMssql(experiment) {
    let query = `INSERT INTO Stymulus VALUES `;
    experiment.stymulus.forEach((s, index) => {
      query += `('${s.link}', ${s.startTime}, ${s.endTime}, ${experiment.id}, ${stymulusTypes[s.stymulusType]})`
      if (index < experiment.stymulus.length - 1) {
        query += ',';
      }
    })
    await this.mssqlDB.request().query(query);
    return await this.getStymulusFromMssql(experiment.id);
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

  createStymulusToSaveInCassandra(experiment) {
    let stymulus = ``
    experiment.stymulus.forEach((s, index) => {
      stymulus += `{
        startTime:${s.startTime},
        endTime:${s.endTime},
        stymulusType:'${s.stymulusType}',
        link:'${s.link}'
      }`
      if (index < experiment.stymulus.length - 1) {
        stymulus += ',';
      }
    });
    return stymulus;
  }

  async saveExperimentToCassandra(experiment) {
    const stymulus = this.createStymulusToSaveInCassandra(experiment);
    let query = `INSERT INTO experiment (id, startDate, endDate, stymulus)
    VALUES (now(), '${experiment.startDate}', '${experiment.endDate}', {${stymulus}});`
    await this.cassandraDB.execute(query);
    return;
  };

  async saveExperimentToMongo(experiment) {
    const newExperiment = new Experiment({
      startDate: experiment.startDate,
      endDate: experiment.endDate,
      stymulus: experiment.stymulus,
    })
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
      { _id: experiment._id },
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

  async deleteExperiment(dbType, id) {
    switch (dbType) {
      case MSSQL_DB: {
        return await this.deleteExperimentFromMssql(id);
      }
      case CASSANDRA_DB: {
        return await this.deleteExperimentFromCassandra(id);
      }
      case MONGO_DB: {
        return await this.deleteExperimentFromMongo(id);
      }
      default:
        return;
    };
  };

  async saveExperiment(dbType, experiment) {
    switch (dbType) {
      case MSSQL_DB: {
        return await this.saveExperimentToMssql(experiment);
      }
      case CASSANDRA_DB: {
        return await this.saveExperimentToCassandra(experiment);
      }
      case MONGO_DB: {
        return await this.saveExperimentToMongo(experiment);
      }
      default:
        return;
    };
  };

  async editExperiment(dbType, experiment) {
    switch (dbType) {
      case MSSQL_DB: {
        return await this.editExperimentInMssql(experiment);
      }
      case CASSANDRA_DB: {
        return await this.editExperimentInCassandra(experiment);
      }
      case MONGO_DB: {
        return await this.editExperimentInMongo(experiment);
      }
      default:
        return;
    };
  };

};

export default ExperimentDAL;

