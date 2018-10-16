// @ts-check
import _ from 'lodash-uuid';
import { MSSQL_DB, CLASSIC_CASSANDRA_DB, CLASSIC_MONGO_DB, } from '../../constants';
import { cassandra, mssql, mongo } from '../../routes/shared';
import { getExperimentModel, getMeasurementModel, getSessionModel, getSubjectModel } from '../../models/api_classic/mongo';

let Experiment
let Measurement;
let Session;
let Subject;

class QueriesTranslatorDAL {
  constructor(db) {
    this.cassandraDB = db[CLASSIC_CASSANDRA_DB];
    this.mssqlDB = db[MSSQL_DB];
    Experiment = getExperimentModel(db[CLASSIC_MONGO_DB]);
    Measurement = getMeasurementModel(db[CLASSIC_MONGO_DB]);
    Session = getSessionModel(db[CLASSIC_MONGO_DB]);
    Subject = getSubjectModel(db[CLASSIC_MONGO_DB]);
    this.mongo = {
      measurements: Measurement,
      experiments: Experiment,
      sessions: Session,
      subjects: Subject,
    };
  }

  async executeSelect(dbType, query) {
    const getItemsToSelect = /(?<=SELECT)(.*)(?=FROM)/
    const itemsToSelect = getItemsToSelect.exec(query)[0];

    const columns = [];
    if (itemsToSelect.includes(',')) {
      let column;
      const getColumnNames = /([^,]+)/g;
      while ((column = getColumnNames.exec(itemsToSelect)) !== null) {
        columns.push(column[0].replace(/\s/g, ''));
      }
    } else {
      columns.push(itemsToSelect.replace(/\s/g, ''));
    }

    const getTableName = /(?<=FROM)(.*)(?=WHERE)|(?<=FROM)(.*)/;
    const table = getTableName.exec(query)[0].replace(/\s/g, '');

    if (query.includes('WHERE')) {
      const getWhereClause = /(?<=WHERE)(.*)/;
      const whereClause = getWhereClause.exec(query);

      const getFilters = /(?!AND\b)\b[A-Za-z0-9'-=]+/g;
      const filters = [];
      let filter;
      while ((filter = getFilters.exec(whereClause[0])) !== null) {
        const getFilterKeyAndValue = /([^=]+)/g;
        const key = getFilterKeyAndValue.exec(filter[0])[0].replace(/\s/g, '');
        const value = getFilterKeyAndValue.exec(filter[0])[0].replace(/\s/g, '');
        filters.push({
          key,
          value,
        });
      }

      switch (dbType) {
        case mssql: {
          return await this.selectFromMssql(table, columns, filters);
        }
        case cassandra: {
          return await this.selectFromCassandra(table, columns, filters);
        }
        case mongo: {
          return await this.selectFromMongo(table, columns, filters);
        }
        default:
          return;
      };
    }
  };

  async selectFromMssql(table, columns, filters) {
    let query = 'SELECT';
    if (columns && columns.length) {
      for (let i = 0; i < columns.length; i++) {
        const column = columns[i];
        if (i < columns.length - 1) {
          query += ` ${column},`;
        } else {
          query += ` ${column}`
        }
      }
    }
    query += ` FROM ${table}`;

    if (filters && filters.length) {
      query += ` WHERE`;
      for (let i = 0; i < filters.length; i++) {
        const filter = filters[i];
        if (i < filters.length - 1) {
          query += ` ${filter.key}=${filter.value} AND`;
        } else {
          query += ` ${filter.key}=${filter.value};`
        }
      }
    }
    const result = await this.mssqlDB.request().query(query);
    return result.recordset;
  }

  async selectFromCassandra(table, columns, filters) {
    let query = 'SELECT';
    if (columns && columns.length) {
      for (let i = 0; i < columns.length; i++) {
        const column = columns[i];
        if (i < columns.length - 1) {
          query += ` ${column},`;
        } else {
          query += ` ${column}`
        }
      }
    }
    query += ` FROM ${table}`;

    if (filters && filters.length) {
      query += ` WHERE`;
      for (let i = 0; i < filters.length; i++) {
        const filter = filters[i];
        if (i < filters.length - 1) {
          query += ` ${filter.key}=${filter.value} AND`;
        } else {
          query += ` ${filter.key}=${filter.value}`
        }
      }
      query += ' ALLOW FILTERING;'
    }
    const result = await this.cassandraDB.execute(query);
    return result.rows;
  }

  async selectFromMongo(table, columns, filters) {
    let columnsObj = {};
    columns.forEach(column => {
      columnsObj[column] = 1;
    });
    const filter = {};
    filters.forEach(f => {
      filter[f.key] = /([^']+)/.exec(f.value)[0];
    });
    return await this.mongo[table].find(filter, columnsObj);
  }

  async executeInsert(dbType, query) {

  };

  async executeUpdate(dbType, query) {

  };

  async executeDelete(dbType, query) {

  };

  async executeQuery(dbType, query) {
    const firstWord = /^([\w\-]+)/.exec(query)[0];
    switch (firstWord) {
      case "SELECT":
        return await this.executeSelect(dbType, query);
      case "INSERT":
        return await this.executeInsert(dbType, query);
      case "UPDATE":
        return await this.executeUpdate(dbType, query);
      case "DELETE":
        return await this.executeDelete(dbType, query);
    };
  };

};

export default QueriesTranslatorDAL;

