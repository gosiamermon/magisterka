// @ts-check
import http from 'http';
import express from 'express';
import inflector from 'json-inflector';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import initializeDb from './db';
import middleware from './middleware';
import api from './api';
import config from './config.json';
import DBClassic_ExperimentDAL from './DAL/api_classic/experiments';
import DBClassic_SessionDAL from './DAL/api_classic/experimentSessions';
import DBClassic_ClassicSubjectDAL from './DAL/api_classic/subjects';
import DBClassic_MeasurementDAL from './DAL/api_classic/measurements';
import DBClassic_StymulusDAL from './DAL/api_classic/stymulus';
import DBClassic_QueriesTranslatorDAL from './DAL/api_classic/queriesTranslator';

import DBExperiment_ExperimentDAL from './DAL/api_experiment/experiments';
import DBExperiment_StymulusDAL from './DAL/api_experiment/stymulus';

import DBSession_ExperimentDAL from './DAL/api_session/experiments';
import DBSession_SessionDAL from './DAL/api_session/sessions';
import DBSession_StymulusDAL from './DAL/api_session/stymulus';

import DBSubject_SubjectDAL from './DAL/api_subject/subjects';
import DBSubject_StymulusDAL from './DAL/api_subject/stymulus';

let app = express();
app.server = http.createServer(app);

// logger
app.use(morgan('dev'));

// 3rd party middleware
app.use(cors({
	exposedHeaders: config.corsHeaders
}));

app.use(bodyParser.json({
	limit: config.bodyLimit
}));
app.use(inflector({
	request: 'camelizeLower',
	response: 'camelizeLower',
}));
// connect to db
initializeDb(db => {
	// internal middleware
	app.use(middleware({ config, db }));

	const DAL = {
		classic: {
			experiment: new DBClassic_ExperimentDAL(db),
			session: new DBClassic_SessionDAL(db),
			subject: new DBClassic_ClassicSubjectDAL(db),
			measurement: new DBClassic_MeasurementDAL(db),
			stymulus: new DBClassic_StymulusDAL(db),
			queriesTranslator: new DBClassic_QueriesTranslatorDAL(db),
		},
		experiment: {
			experiment: new DBExperiment_ExperimentDAL(db),
			stymulus: new DBExperiment_StymulusDAL(),
		},
		session: {
			session: new DBSession_SessionDAL(db),
			experiment: new DBSession_ExperimentDAL(db),
			stymulus: new DBSession_StymulusDAL(),
		},
		subject: {
			subject: new DBSubject_SubjectDAL(db),
			stymulus: new DBSubject_StymulusDAL(),
		}
	}
	// api router
	app.use('/api', api({ DAL }));

	app.server.listen(process.env.PORT || config.port, () => {
		console.log(`Started on port ${app.server.address().port}`);
	});
});

export default app;
