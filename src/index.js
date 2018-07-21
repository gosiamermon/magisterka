import http from 'http';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import initializeDb from './db';
import middleware from './middleware';
import api from './api';
import config from './config.json';
import ExperimentDAL from './DAL/api_classic/experiments';
import SessionDAL from './DAL/api_classic/experimentSessions';
import SubjectDAL from './DAL/api_classic/subjects';
import MeasurementDAL from './DAL/api_classic/measurements';

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

// connect to db
initializeDb(db => {

	// internal middleware
	app.use(middleware({ config, db }));

	const DAL = {
		classic: {
			experiment: new ExperimentDAL(db),
			session: new SessionDAL(db),
			subject: new SubjectDAL(db),
			measurement: new MeasurementDAL(db),
		}
	}
	// api router
	app.use('/api', api({ DAL }));

	app.server.listen(process.env.PORT || config.port, () => {
		console.log(`Started on port ${app.server.address().port}`);
	});
});

export default app;
