import { status } from '../../constants';
import { url } from '../../routes/sessionDB';

export default ({ api, DAL }) => {

  const baseUrl = `/${url}/sessions`;

  api.get(`${baseUrl}`, async (req, res) => {
    const { dbType } = req.params;
    const sessions = await DAL.getSessions(dbType);
    return res.json(sessions);
  });

  api.get(`${baseUrl}/:id([A-z0-9\-]+)`, async (req, res) => {
    const { dbType, id } = req.params;
    const session = await DAL.getSession(dbType, id);
    return res.json(session);
  });

  api.post(`${baseUrl}`, async (req, res) => {
    const { session } = req.body;
    const { dbType } = req.params;
    const result = await DAL.saveSession(dbType, session);
    return res.json(result);
  });

  api.put(`${baseUrl}`, async (req, res) => {
    const { session } = req.body;
    const { dbType } = req.params;
    const result = await DAL.editSession(dbType, session);
    return res.json(result);
  });

  api.delete(`${baseUrl}`, async (req, res) => {
    const { dbType } = req.params;
    const { id, experimentId } = req.body;
    await DAL.deleteSession(dbType, id, experimentId);
    return res.end();
  });
};