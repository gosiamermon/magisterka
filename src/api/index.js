// @ts-check
import { Router } from 'express';
import {
	classic_experiments,
	classic_sessions,
	classic_subjects,
	classic_measurements
} from './api_classic';
import { experiment_experiments } from './api_experiment';
import { session_experiments, session_sessions } from './api_session'

export default ({ DAL }) => {
	let api = Router();
	classic_experiments({ api, DAL: DAL.classic.experiment });
	classic_sessions({ api, DAL: DAL.classic.session });
	classic_subjects({ api, DAL: DAL.classic.subject });
	classic_measurements({ api, DAL: DAL.classic.measurement });
	experiment_experiments({ api, DAL: DAL.experiment.experiment });
	session_experiments({ api, DAL: DAL.session.experiment });
	session_sessions({ api, DAL: DAL.session.session });
	return api;
}
