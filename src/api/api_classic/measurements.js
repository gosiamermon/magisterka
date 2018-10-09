// @ts-check
import { status } from '../../constants';
import { url } from '../../routes/classicDB';

export default ({ api, DAL }) => {

  const baseUrl = `/${url}/measurements/`;

  api.get(`${baseUrl}:sessionId([A-z0-9\-]+)`, async (req, res) => {
    const { dbType, sessionId } = req.params;
    const measurements = await DAL.getMeasurements(dbType, sessionId);
    if (measurements === undefined) {
      return res.status(status.notFound);
    }
    return res.json(measurements);
  });

  api.post(`${baseUrl}`, async (req, res) => {
    const { measurements } = req.body;
    const { dbType } = req.params;
    const result = await DAL.saveMeasurements(dbType, measurements);
    return res.json(result);
  });

  api.put(`${baseUrl}`, async (req, res) => { // tutaj zrobic update per 1 pomiar w bazie 
    const { dbType } = req.params;
    const { measurement } = req.body;
    const result = await DAL.editMeasurement(dbType, measurement);
    return res.json(result);
  });

  api.delete(`${baseUrl}:sessionId([A-z0-9\-]+)`, async (req, res) => { // usuwanie per sesja a nie jakies filtry
    const { dbType, sessionId } = req.params;
    await DAL.deleteMeasurements(dbType, sessionId);
    return res.end();
  });

}
