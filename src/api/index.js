// @ts-check
import { Router } from 'express';
import {
	classic_experiments,
	classic_sessions,
	classic_subjects,
	classic_measurements,
	classic_stymulus,
	classic_queriesTranslator,
} from './api_classic';
import { experiment_experiments, experiment_stymulus } from './api_experiment';
import { session_experiments, session_sessions, session_stymulus } from './api_session'
import { subject_stymulus, subject_subjects } from './api_subject';

export default ({ DAL }) => {
	let api = Router();
	classic_experiments({ api, DAL: DAL.classic.experiment });
	classic_sessions({ api, DAL: DAL.classic.session });
	classic_subjects({ api, DAL: DAL.classic.subject });
	classic_measurements({ api, DAL: DAL.classic.measurement });
	classic_stymulus({ api, DAL: DAL.classic.stymulus });
	classic_queriesTranslator({ api, DAL: DAL.classic.queriesTranslator });
	experiment_experiments({ api, DAL: DAL.experiment.experiment });
	experiment_stymulus({ api, DAL: DAL.experiment.stymulus });
	session_experiments({ api, DAL: DAL.session.experiment });
	session_sessions({ api, DAL: DAL.session.session });
	session_stymulus({ api, DAL: DAL.session.stymulus });
	subject_stymulus({ api, DAL: DAL.subject.stymulus });
	subject_subjects({ api, DAL: DAL.subject.subject });
	return api;
}
