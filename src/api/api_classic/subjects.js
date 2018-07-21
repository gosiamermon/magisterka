import { status } from '../../constants';
import { classicUrl } from './';

export default ({ api, DAL }) => {

  const baseUrl = `/${classicUrl}/subjects`;

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
}
