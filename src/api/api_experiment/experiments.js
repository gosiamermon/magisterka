import { status } from '../../constants';
import { url } from '../../routes/experimentDB';

export default ({ api, DAL }) => {

  const baseUrl = `/${url}/experiments`;

  api.get(`${baseUrl}`, async (req, res) => {
    const { dbType } = req.params;
    const experiments = await DAL.getExperiments(dbType);
    return res.json(experiments);
  });

  api.get(`${baseUrl}/:id([A-z0-9\-]+)`, async (req, res) => {
    const { dbType, id } = req.params;
    const experiment = await DAL.getExperiment(dbType, id);
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