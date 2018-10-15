import { status } from '../../constants';
import { url } from '../../routes/classicDB';

export default ({ api, DAL }) => {

  const baseUrl = `/${url}/subjects`;

  api.get(`${baseUrl}`, async (req, res) => {
    const { dbType } = req.params;
    const subject = await DAL.getSubjects(dbType);
    if (subject === undefined) {
      return res.status(status.notFound);
    }

    return res.json(subject);
  });

  api.get(`${baseUrl}/:id([A-z0-9\-]+)`, async (req, res) => {
    const { dbType, id } = req.params;
    const subject = await DAL.getSubject(dbType, id);
    if (subject === undefined) {
      return res.status(status.notFound);
    }
    return res.json(subject);
  });

  api.post(`${baseUrl}`, async (req, res) => {
    const subject = req.body;
    const { dbType } = req.params;
    const result = await DAL.saveSubject(dbType, subject);
    return res.json(result);
  });

  api.put(`${baseUrl}`, async (req, res) => {
    const subject = req.body;
    const { dbType } = req.params;
    const result = await DAL.editSubject(dbType, subject);
    return res.json(result);
  });

  api.delete(`${baseUrl}/:id([A-z0-9\-]+)`, async (req, res) => {
    const { dbType, id } = req.params;
    await DAL.deleteSubject(dbType, id);
    return res.end();
  });
}
