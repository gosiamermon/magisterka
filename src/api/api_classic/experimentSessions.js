import { status } from '../../constants';
import { classicUrl } from '.';

export default ({ api, DAL }) => {

  const baseUrl = `/${classicUrl}/sessions`;

  api.get(`${baseUrl}`, async (req, res) => {
    const { dbType } = req.params;
    const sessions = await DAL.getSessions(dbType);
    if (sessions === undefined) {
      return res.status(status.notFound);
    }
    return res.json(sessions);
  });

  api.get(`${baseUrl}/:id([A-z0-9\-]+)`, async (req, res) => {
    const { dbType, id } = req.params;
    const session = await DAL.getSession(dbType, id);
    if (session === undefined) {
      return res.status(status.notFound);
    }
    return res.json(session);
  });
}
