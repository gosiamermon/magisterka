// import mongoose from 'mongoose';
import { status } from '../../constants';
import { url } from '../../routes/classicDB';

export default ({ api, DAL }) => {

	const baseUrl = `/${url}/experiments`;

	api.get(`${baseUrl}`, async (req, res) => {
		const { dbType } = req.params;
		const experiments = await DAL.getExperiments(dbType);
		if (experiments === undefined) {
			return res.status(status.notFound);
		}

		return res.json(experiments);
	});

	api.get(`${baseUrl}/OneQuery/ByExperiment/:id([A-z0-9\-]+)`, async (req, res) => {
		const { dbType, id } = req.params;
		const experiment = await DAL.getExperimentInOneQuery(dbType, id);
		return res.json(experiment);
	});

	api.get(`${baseUrl}/OneQuery/BySubject/:subjectName([A-z0-9\-]+)`, async (req, res) => {
		const { dbType, subjectName } = req.params;
		const subjectExperiments = await DAL.getSubjectExperimentsInOneQuery(dbType, subjectName);
		return res.json(subjectExperiments);
	});

	api.get(`${baseUrl}/:id([A-z0-9\-]+)`, async (req, res) => {
		const { dbType, id } = req.params;
		const experiment = await DAL.getExperiment(dbType, id);
		if (experiment === undefined) {
			return res.status(status.notFound);
		}
		return res.json(experiment);
	});


	api.post(`${baseUrl}`, async (req, res) => {
		const experiment = req.body;
		const { dbType } = req.params;
		const result = await DAL.saveExperiment(dbType, experiment);
		return res.json(result);
	});

	api.put(`${baseUrl}`, async (req, res) => {
		const experiment = req.body;
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