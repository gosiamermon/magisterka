import { url } from '../../routes/subjectDB';

export default ({ api, DAL }) => {

  const baseUrl = `/${url}/subjects`;

  api.get(`${baseUrl}`, async (req, res) => {
    const { dbType, subjectName } = req.params;
    const experiment = await DAL.getSubjects(dbType, subjectName);
    return res.json(experiment);
  });

  api.get(`${baseUrl}/OneQuery/bySubject/:subjectName([A-z0-9\-]+)`, async (req, res) => {
    const { dbType, subjectName } = req.params;
    const experiment = await DAL.getSubjectExperiments(dbType, subjectName);
    return res.json(experiment);
  });

  api.get(`${baseUrl}/OneQuery/byExperiment/:experimentId([A-z0-9\-]+)`, async (req, res) => {
    const { dbType, experimentId } = req.params;
    const experiment = await DAL.getExperiment(dbType, experimentId);
    return res.json(experiment);
  });

  api.post(`${baseUrl}`, async (req, res) => {
    const experiment = req.body;
    const { dbType } = req.params;
    const result = await DAL.saveExperiment(dbType, experiment);
    return res.json(result);
  });
};