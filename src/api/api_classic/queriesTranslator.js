// @ts-check
import { status } from '../../constants';
import { url } from '../../routes/classicDB';

export default ({ api, DAL }) => {

  const baseUrl = `/${url}/queriesTranslator/`;

  api.post(`${baseUrl}`, async (req, res) => {
    const { query } = req.body;
    const { dbType } = req.params;
    const result = await DAL.executeQuery(dbType, query);
    console.log(result)
    return res.json(result);
  });
}
