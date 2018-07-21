import cassandra from 'cassandra-driver';
import mongoose from 'mongoose';
const sql = require('mssql');
import { MSSQL_DB, CASSANDRA_DB } from './constants'

export default async callback => {

	// MSSQL
	const sqlDB = new sql.ConnectionPool({
		server: 'localhost',
		database: 'Eyetracking',
		port: 1434,
		user: "eyetracking-app",
		password: "Test1234",
		options: {
			encrypt: false
		}
	})
	await sqlDB.connect();

	// MongoDB
	mongoose.connect('mongodb://localhost/eyetracking_classic');

	// Cassandra
	const cassandraDB = new cassandra.Client({ contactPoints: ['127.0.0.1'], keyspace: 'eyetracking_classic' });
	cassandraDB.connect(function (err) {
		if (err) return console.error(err);
		console.log('Connected to cluster with %d host(s): %j', cassandraDB.hosts.length, cassandraDB.hosts.keys());
	});

	callback({ [MSSQL_DB]: sqlDB, [CASSANDRA_DB]: cassandraDB });
}
