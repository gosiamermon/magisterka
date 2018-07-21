const sql = require('mssql');
import moment from 'moment';
const mongoose = require('mongoose');
import { MSSQL_DB, CASSANDRA_DB, MONGO_DB } from '../../constants';
import { Measurement } from '../../models/api_classic/mongo';

class MeasurementDAL {
  constructor(db) {
    this.cassandraDB = db[CASSANDRA_DB];
    this.mssqlDB = db[MSSQL_DB];
    this.dateFormat = 'YYYY-MM-DD HH:mm:ss.SSS';
  }

  async getMeasurementsFromCassandra(experimentId, experimentSessionId) {
    let query = 'SELECT * FROM measurement';
    if (experimentId) {
      query += ` WHERE ExperimentId=${experimentId};`;
    }
    else if (experimentSessionId) {
      query += ` WHERE ExperimentSessionId=${experimentSessionId};`
    }
    let measurements = await this.cassandraDB
      .execute(query);
    measurements = measurements.rows;
    return measurements;
  };

  async getMeasurementsFromMssql(experimentId, experimentSessionId) {
    let query = `SELECT Measurement.*, MeasurementType.Value AS Type
                FROM Measurement
                LEFT JOIN MeasurementType ON Measurement.TypeId = MeasurementType.Id `;
    if (experimentId) {
      query += ` WHERE ExperimentId=${experimentId};`;
    }
    else if (experimentSessionId) {
      query += ` WHERE ExperimentSessionId=${experimentSessionId};`
    }

    const measurementsResult = await this.mssqlDB.request().query(query);
    return measurementsResult.recordset;
  };

  async getMeasurementsFromMongo(experimentId, experimentSessionId) {
    let filter = {};
    if (experimentId) {
      filter.experimentId = experimentId;
    }
    else if (experimentSessionId) {
      filter.sessionId = experimentSessionId;
    }
    return await Measurement.find(filter);
  };

  async saveMeasurementsToMssql(measurements) {
    const declareInsertValues = `DECLARE @inserted table([Id] int)`
    let query = `${declareInsertValues}
                INSERT INTO Measurement
                OUTPUT INSERTED.[Id] INTO @inserted
                VALUES`
    measurements.forEach((m, index) => {
      const timestamp = moment(m.timestamp).format(this.dateFormat);
      query += `(${m.type}, '${timestamp}', ${m.x}, ${m.y}, ${m.experimentSessionId}, ${m.experimentId})`
      if (index < measurements.length - 1) {
        query += ',';
      }
    })
    query += 'SELECT * FROM @inserted;';
    const insertResult = await this.mssqlDB.request().query(query);
    return insertResult.recordset;
  };

  async saveMeasurementsToCassandra(measurements) {
    let query = `INSERT INTO measurement (id, type, x, y, timestamp, "experimentSessionId")
                VALUES `
    measurements.forEach((m, index) => {
      query += `(now(), '${m.type}', ${m.x}, ${m.y}, ${m.timestamp}, ${m.experimentSessionId})`
      if (index === measurements.length - 1) {
        query += ';';
      }
      else {
        query += ',';
      }
    })
    await this.cassandraDB.execute(query);
    query = `SELECT * FROM measurement
              WHERE "experimentSessionId"=${measurements[0].experimentSessionId};`
    return await this.cassandraDB.execute(query);
  };

  async saveMeasurementsToMongo(measurements) {
    return await Measurement.collection.insertMany(measurements); s
  };

  async editMeasurementsInMssql(fieldsToUpdate, filters) {
    let query = `UPDATE Measurement SET `;

    let i = 1;
    for (let key in fieldsToUpdate) {
      query += `${key}=${fieldsToUpdate[key]}`
      if (i < fieldsToUpdate.length - 1) {
        query += ',';
      }
      i += 1;
    }

    let where = ` WHERE `;

    i = 1;
    for (let key in filters) {
      where += `${key}=${filters[key]}`
      if (i < filters.length - 1) {
        where += ' AND ';
      }
      i += 1;
    }
    query += where;
    query += ` SELECT * FROM Measurement ${where}`;

    return await this.mssqlDB.request().query(query);
  }

  async editMeasurementsInMongo(fieldsToUpdate, filters) {
    return await Measurement.updateMany(
      filters,
      { $set: fieldsToUpdate },
      { collation: { locale: "fr", strength: 1 } }
    );
  };

  async deleteMeasurementsFromMssql(filters) {
    let query = `DELETE FROM Measurement WHERE `;
    let i = 1;
    for (let key in filters) {
      query += `${key}=${filters[key]}`
      if (i < filters.length - 1) {
        query += 'AND';
      }
      else {
        query += ';';
      }
      i += 1;
    }
    await this.mssqlDB.request().query(query);
    return;
  }

  async deleteMeasurementsFromMongo(filters) {
    return await Measurement.deleteMany(filters);
  }

  async getMeasurements(dbType, experimentId, experimentSessionId) {
    switch (dbType) {
      case MSSQL_DB: {
        return await this.getMeasurementsFromMssql(experimentId, experimentSessionId);
      }
      case CASSANDRA_DB: {
        return await this.getMeasurementsFromCassandra(experimentId, experimentSessionId);
      }
      case MONGO_DB: {
        return await this.getMeasurementsFromMongo(experimentId, experimentSessionId);
      }
      default:
        return;
    };
  };

  async saveMeasurements(dbType, measurements) {
    switch (dbType) {
      case MSSQL_DB: {
        return await this.saveMeasurementsToMssql(measurements);
      }
      case CASSANDRA_DB: {
        return await this.saveMeasurementsToCassandra(measurements);
      }
      case MONGO_DB: {
        return await this.saveMeasurementsToMongo(measurements);
      }
      default:
        return;
    };
  };

  async editMeasurements(dbType, fieldsToUpdate, filter) {
    switch (dbType) {
      case MSSQL_DB: {
        return await this.editMeasurementsInMssql(fieldsToUpdate, filter);
      }
      case CASSANDRA_DB: {
      }
      case MONGO_DB: {
        return await this.editMeasurementsInMongo(fieldsToUpdate, filter);
      }
      default:
        return;
    };
  };

  async deleteMeasurements(dbType, filters) {
    switch (dbType) {
      case MSSQL_DB: {
        return await this.deleteMeasurementsFromMssql(filters);
      }
      case CASSANDRA_DB: {

      }
      case MONGO_DB: {
        return await this.deleteMeasurementsFromMongo(filters);
      }
      default:
        return;
    };
  };

};

export default MeasurementDAL;

