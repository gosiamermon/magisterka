import { status } from '../../constants';
import { classicUrl } from './';
import { stat } from 'fs';

export default ({ api, DAL }) => {

  const baseUrl = `/${classicUrl}/measurements`;

  api.get(`${baseUrl}`, async (req, res) => {
    const { dbType } = req.params;
    const { experimentId, sessionId } = req.query;
    const measurements = await DAL.getMeasurements(dbType, experimentId, sessionId);
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

  api.post(`${baseUrl}/calibration`, async (req, res) => {
    const { measurements } = req.body;
    const { dbType } = req.params;
    const result = await DAL.saveCalibration(dbType, measurements);
    return res.json(result);
  });

  api.put(`${baseUrl}`, async (req, res) => {
    const { fieldsToUpdate, filters } = req.body;
    const { dbType } = req.params;
    const result = await DAL.editMeasurements(dbType, fieldsToUpdate, filters);
    return res.json(result);
  });

  api.delete(`${baseUrl}`, async (req, res) => {
    const { filters } = req.body;
    const { dbType } = req.params;
    await DAL.deleteMeasurements(dbType, filters);
    return res.end();
  });

}
