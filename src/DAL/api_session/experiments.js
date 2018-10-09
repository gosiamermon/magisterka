// @ts-check
const sql = require('mssql');
import { SESSION_CASSANDRA_DB, SESSION_MONGO_DB } from '../../constants';
import { getExperimentModel } from '../../models/api_session/mongo';
import { cassandra, mongo } from '../../routes/shared';

let Experiment;

class ExperimentDAL {
  constructor(db) {
    this.cassandraDB = db[SESSION_CASSANDRA_DB];
    Experiment = getExperimentModel(db[SESSION_MONGO_DB]);
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

  async saveExperimentToCassandra(experiment) {
    const query = `INSERT INTO experiment (id, startDate, endDate)
      VALUES (now(), '${experiment.startDate}', '${experiment.endDate}');`
    await this.cassandraDB.execute(query);
    return;
  }

  async saveExperimentToMongo(experiment) {
    const newExperiment = new Experiment(experiment);
    await newExperiment.save();
    return newExperiment;
  }

  async editExperimentInCassandra(experiment) {
    let query = `UPDATE experiment SET 
                startDate='${experiment.startDate}',
                endDate='${experiment.endDate}' 
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