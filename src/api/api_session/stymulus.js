import { status } from '../../constants';
import { url } from '../../routes/sessionDB';

export default ({ api, DAL }) => {

  const baseUrl = `/${url}/stymulus`;

  api.post(`${baseUrl}/images`, async (req, res) => {
    const imagesStymulus = req.body;
    const { dbType } = req.params;
    const result = await DAL.saveImagesToDisk(dbType, imagesStymulus);
    return res.json(result);
  });
};