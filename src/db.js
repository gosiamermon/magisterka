import cassandra from 'cassandra-driver';
import mongoose from 'mongoose';
const sql = require('mssql');
import {
	MSSQL_DB,
	CLASSIC_CASSANDRA_DB,
	EXPERIMENT_CASSANDRA_DB,
	SESSION_CASSANDRA_DB,
	CLASSIC_MONGO_DB,
	EXPERIMENT_MONGO_DB,
	SESSION_MONGO_DB,
} from './constants'

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
	const classic_mongo = mongoose.createConnection('mongodb://localhost/eyetracking_classic');
	const experiment_mongo = mongoose.createConnection('mongodb://localhost/eyetracking_experiment');
	const session_mongo = mongoose.createConnection('mongodb://localhost/eyetracking_session');
	// Cassandra
	const classic_cassandraDB = new cassandra.Client({ contactPoints: ['127.0.0.1'], keyspace: 'eyetracking_classic' });
	classic_cassandraDB.connect(function (err) {
		if (err) return console.error(err);
		console.log('Connected to cluster with %d host(s): %j', classic_cassandraDB.hosts.length, classic_cassandraDB.hosts.keys());
	});

	const experiment_cassandraDB = new cassandra.Client({ contactPoints: ['127.0.0.1'], keyspace: 'eyetracking_experiment' });
	experiment_cassandraDB.connect(function (err) {
		if (err) return console.error(err);
		console.log('Connected to cluster with %d host(s): %j', experiment_cassandraDB.hosts.length, experiment_cassandraDB.hosts.keys());
	});

	const session_cassandraDB = new cassandra.Client({ contactPoints: ['127.0.0.1'], keyspace: 'eyetracking_session' });
	session_cassandraDB.connect(function (err) {
		if (err) return console.error(err);
		console.log('Connected to cluster with %d host(s): %j', session_cassandraDB.hosts.length, session_cassandraDB.hosts.keys());
	});

	callback({
		[MSSQL_DB]: sqlDB,
		[CLASSIC_CASSANDRA_DB]: classic_cassandraDB,
		[EXPERIMENT_CASSANDRA_DB]: experiment_cassandraDB,
		[SESSION_CASSANDRA_DB]: session_cassandraDB,
		[CLASSIC_MONGO_DB]: classic_mongo,
		[EXPERIMENT_MONGO_DB]: experiment_mongo,
		[SESSION_MONGO_DB]: session_mongo,
	});
}
