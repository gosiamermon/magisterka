// import mongoose from 'mongoose';
import { status } from '../../constants';
import { classicUrl } from './';

export default ({ api, DAL }) => {

	const baseUrl = `/${classicUrl}/experiments`;

	api.get(`${baseUrl}`, async (req, res) => {
		const { dbType } = req.params;
		const experiments = await DAL.getExperiments(dbType);
		if (experiments === undefined) {
			return res.status(status.notFound);
		}

		return res.json(experiments);
		//pozniej mozna zrobic filtrowanie po dacie lub po typie stymulusa
	});

	api.get(`${baseUrl}/:id([A-z0-9\-]+)`, async (req, res) => {
		const { dbType, id } = req.params;
		const experiment = await DAL.getExperiment(dbType, id);
		if (experiment === undefined) {
			return res.status(status.notFound);
		}
		return res.json(experiment);
		//pozniej mozna zrobic filtrowanie po dacie lub po typie stymulusa
	});

	api.post(`${baseUrl}`, async (req, res) => {
		const { experiment } = req.body;
		const { dbType } = req.params;
		const result = await DAL.saveExperiment(dbType, experiment);
		return res.json(result);
	});

	api.put(`${baseUrl}`, async (req, res) => {
		const { experiment } = req.body;
		const { dbType } = req.params;
		const result = await DAL.editExperiment(dbType, experiment);
		return res.json(result);
	});

	api.delete(`${baseUrl}/:id([A-z0-9\-]+)`, async (req, res) => {
		const { dbType, id } = req.params;
		await DAL.deleteExperiment(dbType, id);
		return res.end();
	});
};