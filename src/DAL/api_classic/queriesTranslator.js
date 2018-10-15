// @ts-check
import _ from 'lodash-uuid';
import { MSSQL_DB, CLASSIC_CASSANDRA_DB, CLASSIC_MONGO_DB, } from '../../constants';
import { cassandra, mssql, mongo } from '../../routes/shared';

let Experiment

class QueriesTranslatorDAL {
  constructor(db) {
    this.cassandraDB = db[CLASSIC_CASSANDRA_DB];
    this.mssqlDB = db[MSSQL_DB];
    this.mongo = db[CLASSIC_MONGO_DB];
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
    } else if (!itemsToSelect.includes('*')) {
      return { message: "Bad request" }
    }

    const getTableName = /(?<=FROM)(.*)(?=WHERE)|(?<=FROM)(.*)/;
    const table = getTableName.exec(query)[0].replace(/\s/g, '');
    console.log(table);
    if (query.includes('WHERE')) {
      const getWhereClause = /(?<=WHERE)(.*)/;
      const whereClause = getWhereClause.exec(query);
      const getFilters = /([^AND]+)/g;
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
      console.log(filters, columns, table)
    }
  };

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
        await this.executeSelect(dbType, query);
      case "INSERT":
        await this.executeInsert(dbType, query);
      case "UPDATE":
        await this.executeUpdate(dbType, query);
      case "DELETE":
        await this.executeDelete(dbType, query);
    };
  };

};

export default QueriesTranslatorDAL;

