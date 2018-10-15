import { status } from '../../constants';
import { url } from '../../routes/classicDB';

export default ({ api, DAL }) => {

  const baseUrl = `/${url}/stymulus`;

  api.get(`${baseUrl}/:experimentId([A-z0-9\-]+)`, async (req, res) => {
    const { dbType, experimentId } = req.params;
    const stymulus = await DAL.getStymulus(dbType, experimentId);
    return res.json(stymulus);
  });

  api.post(`${baseUrl}`, async (req, res) => {
    const point2DStymulus = req.body;
    const { dbType } = req.params;
    const result = await DAL.saveStymulus(dbType, point2DStymulus);
    return res.json(result);
  });

  api.post(`${baseUrl}/images`, async (req, res) => {
    const imagesStymulus = req.body;
    const { dbType } = req.params;
    const result = await DAL.saveImagesToDisk(dbType, imagesStymulus);
    return res.json(result);
  });

  api.delete(`${baseUrl}/:experimentId([A-z0-9\-]+)`, async (req, res) => {
    const { dbType, experimentId } = req.params;
    await DAL.deleteStymulus(dbType, experimentId);
    return res.end();
  });
};