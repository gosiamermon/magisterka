import { Router } from 'express';
import { experiments, sessions, subjects, measurements } from './api_classic';

export default ({ DAL }) => {
	let api = Router();
	experiments({ api, DAL: DAL.classic.experiment });
	sessions({ api, DAL: DAL.classic.session });
	subjects({ api, DAL: DAL.classic.subject });
	measurements({ api, DAL: DAL.classic.measurement });
	return api;
}
