// import mongoose from 'mongoose';
import { status } from '../../constants';
import { classicUrl } from './';

export default ({ api, DAL }) => {

  const baseUrl = `/${classicUrl}/experiments`;

  api.get(`${baseUrl}/:id([A-z0-9\-]+)`, async (req, res) => {
    const { dbType, id } = req.params;
    const device = await DAL.getDevice(dbType, id);
    if (device === undefined) {
      return res.status(status.notFound);
    }
    return res.json(device);
  });

  api.post(`${baseUrl}`, async (req, res) => {
    const { device } = req.body;
    const { dbType } = req.params;
    const result = await DAL.saveDevice(dbType, device);
    return res.json(result);
  });

  api.put(`${baseUrl}`, async (req, res) => {
    const { device } = req.body;
    const { dbType } = req.params;
    const result = await DAL.editDevice(dbType, device);
    return res.json(result);
  });

};