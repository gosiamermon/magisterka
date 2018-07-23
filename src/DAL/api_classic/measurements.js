const sql = require('mssql');
import moment from 'moment';
const mongoose = require('mongoose');
import { MSSQL_DB, CASSANDRA_DB, MONGO_DB } from '../../constants';
import { Measurement } from '../../models/api_classic/mongo';
import { stringFields } from '../../constants';

class MeasurementDAL {
  constructor(db) {
    this.cassandraDB = db[CASSANDRA_DB];
    this.mssqlDB = db[MSSQL_DB];
    this.dateFormat = 'YYYY-MM-DD HH:mm:ss.SSS';
  }

  async getMeasurementsFromCassandra(experimentId, sessionId) {
    let query = 'SELECT * FROM measurement';
    if (experimentId) {
      query += ` WHERE ExperimentId=${experimentId};`;
    }
    else if (sessionId) {
      query += ` WHERE sessionId=${sessionId};`
    }
    let measurements = await this.cassandraDB
      .execute(query);
    measurements = measurements.rows;
    return measurements;
  };

  async getMeasurementsFromMssql(experimentId, sessionId) {
    let query = `SELECT Measurement.*, MeasurementType.Value AS Type
                FROM Measurement
                LEFT JOIN MeasurementType ON Measurement.TypeId = MeasurementType.Id `;
    if (experimentId) {
      query += ` WHERE ExperimentId=${experimentId};`;
    }
    else if (sessionId) {
      query += ` WHERE ExperimentSessionId=${sessionId};`
    }

    const measurementsResult = await this.mssqlDB.request().query(query);
    return measurementsResult.recordset;
  };

  async getMeasurementsFromMongo(experimentId, sessionId) {
    let filter = {};
    if (experimentId) {
      filter.experimentId = experimentId;
    }
    else if (sessionId) {
      filter.sessionId = sessionId;
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
      query += `(${m.type}, '${timestamp}', ${m.x}, ${m.y}, ${m.sessionId}, ${m.experimentId})`
      if (index < measurements.length - 1) {
        query += ',';
      }
    })
    query += 'SELECT * FROM @inserted;';
    const insertResult = await this.mssqlDB.request().query(query);
    return insertResult.recordset;
  };

  async saveToCassandra(measurements, idType, table) {
    let query = `INSERT INTO ${table} (id, type, x, y, timestamp, ${idType})
                VALUES `
    measurements.forEach((m, index) => {
      query += `(now(), '${m.type}', ${m.x}, ${m.y}, ${m.timestamp}, ${m[idType]})`
      if (index === measurements.length - 1) {
        query += ';';
      }
      else {
        query += ',';
      }
    })
    await this.cassandraDB.execute(query);
    query = `SELECT * FROM ${table}
              WHERE ${idType}=${measurements[0][idType]};`
    return await this.cassandraDB.execute(query);
  };

  async saveMeasurementsToCassandra(measurements) {
    return await this.saveToCassandra(
      measurements,
      "sessionId",
      "measurement"
    );
  };

  async saveCalibrationToCassandra(measurements) {
    return await this.saveToCassandra(
      measurements,
      "experimentId",
      "calibration"
    );
  };

  async saveMeasurementsToMongo(measurements) {
    return await Measurement.collection.insertMany(measurements); s
  };

  async editMeasurementsInMssql(fieldsToUpdate, filters) {
    let query = `UPDATE Measurement SET `;

    let i = 1;
    for (let key in fieldsToUpdate) {
      query += ` ${key}=${fieldsToUpdate[key]}`
      if (i < fieldsToUpdate.length) {
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

  async editMeasurementsInCassandra(fieldsToUpdate, filters) {
    let query = 'SELECT * FROM measurement';
    let where = ` WHERE `;

    let i = 1;
    for (let key in filters) {
      const filterValue = stringFields.some(f => f === key)
        ? `'${filters[key]}'` : filters[key];
      where += `${key}=${filterValue}`
      if (i < filters.length - 1) {
        where += ' AND ';
      }
      i += 1;
    }
    query += where;
    const result = await this.cassandraDB.execute(query);
    const measurements = result.rows;

    query = `BEGIN BATCH `
    measurements.forEach(m => {
      query += `UPDATE measurement SET `;
      let i = 1;
      for (let key in fieldsToUpdate) {
        const updateValue = stringFields.some(f => f === key)
          ? `'${fieldsToUpdate[key]}'` : fieldsToUpdate[key];
        query += ` ${key}=${updateValue} `
        if (i < fieldsToUpdate.length) {
          query += ',';
        }
        i += 1;
      }
      where = ` WHERE experimentSessionId=${m.sessionid} AND id=${m.id};`;
      query += where;
    });
    query += `APPLY BATCH;`;
    await this.cassandraDB.execute(query);
    query = `SELECT * FROM measurement WHERE id IN (`
    measurements.forEach((m, index) => {
      if (index < measurements.length - 1) {
        query += `${m.id}, `
      }
      else {
        query += `${m.id}) ALLOW FILTERING;`
      }
    })
    const updated = await this.cassandraDB.execute(query);
    return updated.rows;
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

  async getMeasurements(dbType, experimentId, sessionId) {
    switch (dbType) {
      case MSSQL_DB: {
        return await this.getMeasurementsFromMssql(experimentId, sessionId);
      }
      case CASSANDRA_DB: {
        return await this.getMeasurementsFromCassandra(experimentId, sessionId);
      }
      case MONGO_DB: {
        return await this.getMeasurementsFromMongo(experimentId, sessionId);
      }
      default:
        return;
    };
  };

  async deleteMeasurementsFromCassandra(filters) {
    let query = `DELETE FROM measurement WHERE `;
    let i = 1;
    for (let key in filters) {
      const filterValue = stringFields.some(f => f === key)
        ? `'${filters[key]}'` : filters[key];
      query += `${key}=${filterValue}`
      if (i < filters.length - 1) {
        query += ' AND ';
      }
      else {
        query += ';';
      }
      i += 1;
    }
    return await this.cassandraDB.execute(query);
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

  async editMeasurements(dbType, fieldsToUpdate, filters) {
    switch (dbType) {
      case MSSQL_DB: {
        return await this.editMeasurementsInMssql(fieldsToUpdate, filters);
      }
      case CASSANDRA_DB: {
        return await this.editMeasurementsInCassandra(fieldsToUpdate, filters);
      }
      case MONGO_DB: {
        return await this.editMeasurementsInMongo(fieldsToUpdate, filters);
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
        return await this.deleteMeasurementsFromCassandra(filters);
      }
      case MONGO_DB: {
        return await this.deleteMeasurementsFromMongo(filters);
      }
      default:
        return;
    };
  };

  async saveCalibration(dbType, measurements) {
    switch (dbType) {
      case CASSANDRA_DB: {
        return await this.saveCalibrationToCassandra(measurements);
      }
    };
  };

};

export default MeasurementDAL;

