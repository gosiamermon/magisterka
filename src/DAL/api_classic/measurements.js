// @ts-check
import mongoose from 'mongoose';
import chunk from 'lodash.chunk';
import moment from 'moment';
import { MSSQL_DB, CLASSIC_CASSANDRA_DB, CLASSIC_MONGO_DB } from '../../constants';
import { mssql, cassandra, mongo } from '../../routes/shared';
import { getMeasurementModel } from '../../models/api_classic/mongo';

let Measurement;

class MeasurementDAL {
  constructor(db) {
    this.cassandraDB = db[CLASSIC_CASSANDRA_DB];
    this.mssqlDB = db[MSSQL_DB];
    Measurement = getMeasurementModel(db[CLASSIC_MONGO_DB]);

    this.dateFormat = 'YYYY-MM-DD HH:mm:ss.SSS';
  }

  async getMeasurementsFromCassandra(sessionId) {
    let query = `SELECT * FROM measurement WHERE sessionId=${sessionId};`;
    let measurementsResult = await this.cassandraDB.execute(query);
    const measurements = measurementsResult.rows.map(m => {
      m.x = Number(m.x);
      m.y = Number(m.y);
      m.timestamp = moment(m.timestamp).valueOf();
      return m;
    });
    return measurements;
  };

  async getMeasurementsFromMssql(sessionId) {
    let query = `SELECT * FROM Measurement WHERE SessionId=${sessionId};`

    const measurementsResult = await this.mssqlDB.request().query(query);
    const measurements = measurementsResult.recordset.map(m => {
      m.Timestamp = moment(m.Timestamp).valueOf();
      return m;
    });
    return measurements;
  };

  async getMeasurementsFromMongo(sessionId) {
    return await Measurement.find({ session: sessionId });
  };

  async saveMeasurementsToMssql(measurements) {
    const measurementsDivided = chunk(measurements, 1000)
    let query = `BEGIN TRAN T1;`;

    for (let i = 0; i < measurementsDivided.length; i++) {
      query += `INSERT INTO Measurement VALUES`
      const measurementsChunk = measurementsDivided[i];
      measurementsChunk.forEach((m, index) => {
        const timestamp = moment(m.timestamp).format(this.dateFormat);
        query += `('${timestamp}', ${m.x}, ${m.y}, ${m.sessionId}, ${m.stymulusId}, ${m.isCalibration})`
        if (index < measurementsChunk.length - 1) {
          query += ',';
        } else {
          query += ';';
        }
      });
    }
    query += 'COMMIT TRAN T1;'
    await this.mssqlDB.request().query(query);
    return;
  };

  async saveMeasurementsToCassandra(measurements) {
    let query = 'BEGIN BATCH '
    measurements.forEach((m, index) => {
      query += `INSERT INTO measurement (id, sessionId, x, y, timestamp, stymulusId, isCalibration)
      VALUES (now(), ${m.sessionId}, ${m.x}, ${m.y}, '${m.timestamp}', ${m.stymulusId}, ${!!m.isCalibration}); `
    })

    query += 'APPLY BATCH'
    await this.cassandraDB.execute(query);

    query = `SELECT * FROM measurement
              WHERE sessionId=${measurements[0].sessionId};`
    const result = await this.cassandraDB.execute(query);
    return result.rows;
  };

  async saveMeasurementsToMongo(measurements) {
    measurements = measurements.map(m => {
      m.session = mongoose.Types.ObjectId(m.sessionId);
      delete m.sessionId;
      return m;
    });
    return await Measurement.collection.insertMany(measurements);
  };

  async editMeasurementInMssql(measurement) {
    const timestamp = moment(measurement.timestamp).format(this.dateFormat);
    let query = `UPDATE Measurement SET 
    TimeStamp='${timestamp}', 
    X=${measurement.x},
    Y=${measurement.y},
    StymulusId=${measurement.stymulusId},
    IsCalibration=${measurement.isCalibration}
    WHERE id=${measurement.id};`;

    await this.mssqlDB.request().query(query);

    query = `SELECT * FROM Measurement WHERE Id=${measurement.id}`;
    return await this.mssqlDB.request().query(query);
  }

  async editMeasurementInCassandra(measurement) {
    let query = `BEGIN BATCH 
      UPDATE measurement SET 
      x=${measurement.x},
      y=${measurement.y},
      timestamp=${measurement.timestamp},
      stymulusId=${measurement.stymulusId},
      isCalibration=${!!measurement.isCalibration}
      WHERE sessionId=${measurement.sessionId} AND id=${measurement.id};
      APPLY BATCH;`;
    await this.cassandraDB.execute(query);

    query = `SELECT * FROM measurement 
      WHERE sessionId=${measurement.sessionId} AND id=${measurement.id};`

    const updated = await this.cassandraDB.execute(query);
    return updated.rows;
  }

  async editMeasurementInMongo(measurement) {
    return await Measurement.updateMany(
      { _id: measurement.id },
      { $set: measurement },
    );
  };

  async deleteMeasurementsFromMssql(sessionId) {
    let query = `DELETE FROM Measurement WHERE SessionId=${sessionId}`;
    await this.mssqlDB.request().query(query);
    return;
  }

  async deleteMeasurementsFromMongo(sessionId) {
    return await Measurement.remove({ sessionId });
  }

  async deleteMeasurementsFromCassandra(sessionId) {
    const query = `DELETE FROM measurement WHERE sessionId=${sessionId}`;
    await this.cassandraDB.execute(query);
    return;
  };

  async getMeasurements(dbType, sessionId) {
    switch (dbType) {
      case mssql: {
        return await this.getMeasurementsFromMssql(sessionId);
      }
      case cassandra: {
        return await this.getMeasurementsFromCassandra(sessionId);
      }
      case mongo: {
        return await this.getMeasurementsFromMongo(sessionId);
      }
      default:
        return;
    };
  };

  async saveMeasurements(dbType, measurements) {
    switch (dbType) {
      case mssql: {
        return await this.saveMeasurementsToMssql(measurements);
      }
      case cassandra: {
        return await this.saveMeasurementsToCassandra(measurements);
      }
      case mongo: {
        return await this.saveMeasurementsToMongo(measurements);
      }
      default:
        return;
    };
  };

  async editMeasurement(dbType, measurement) {
    switch (dbType) {
      case mssql: {
        return await this.editMeasurementInMssql(measurement);
      }
      case cassandra: {
        return await this.editMeasurementInCassandra(measurement);
      }
      case mongo: {
        return await this.editMeasurementInMongo(measurement);
      }
      default:
        return;
    };
  };

  async deleteMeasurements(dbType, sessionId) {
    switch (dbType) {
      case mssql: {
        return await this.deleteMeasurementsFromMssql(sessionId);
      }
      case cassandra: {
        return await this.deleteMeasurementsFromCassandra(sessionId);
      }
      case mongo: {
        return await this.deleteMeasurementsFromMongo(sessionId);
      }
      default:
        return;
    };
  };

};

export default MeasurementDAL;

