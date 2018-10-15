// @ts-check
import { MSSQL_DB, stymulusTypes } from '../../constants';
import { mssql } from '../../routes/shared';
import fs from 'fs';
import mkdirp from 'mkdirp';
import _ from 'lodash-uuid';

class StymulusDAL {
  constructor(db) {
    this.mssqlDB = db[MSSQL_DB];
  }

  async getStymulusFromMssql(experimentId) {
    const stymulus = await this.mssqlDB.request()
      .query(`SELECT Stymulus.*, StymulusType.Value AS Type FROM Stymulus
      LEFT JOIN StymulusType ON Stymulus.StymulusTypeId = StymulusType.Id
      WHERE Stymulus.ExperimentId=${experimentId};`);
    return stymulus.recordset;
  };

  async getOneStymulusFromMssql(id) {
    const stymulus = await this.mssqlDB.request()
      .query(`SELECT Stymulus.*, StymulusType.Value AS Type FROM Stymulus
    LEFT JOIN StymulusType ON Stymulus.StymulusTypeId = StymulusType.Id
    WHERE Stymulus.Id=${id};`);
    return stymulus.recordset;
  }

  async deleteStymulusFromMssql(experimentId) {
    let query = `DELETE FROM Stymulus WHERE experimentId=${experimentId}`;
    await this.mssqlDB.request().query(query);
    return;
  };

  async saveStymulusToMssql(stymulus) {
    let query =
      `DECLARE @inserted table([Id] int)
      INSERT INTO Stymulus (Link, StartTime, EndTime, ExperimentId, StymulusTypeId, X, Y)
      OUTPUT INSERTED.[Id] INTO @inserted
      VALUES (
          '${stymulus.link ? stymulus.link : ""}',
          ${stymulus.startTime},
          ${stymulus.endTime},
          ${stymulus.experimentId},
          ${stymulusTypes[stymulus.stymulusType]},
          ${stymulus.x ? stymulus.x : null},
          ${stymulus.y ? stymulus.y : null}
        )
      SELECT * FROM @inserted;`
    const result = await this.mssqlDB.request().query(query);
    return result.recordset[0];
  };

  saveImagesToDisk(dbType, images) {
    const savedImages = [];
    const folderId = _.uuid();
    for (const image of images) {
      const directory = `images/${dbType}/${folderId}`;
      const link = `${directory}/${image.fileName}`;
      savedImages.push({ fileName: image.fileName, link });
      mkdirp(directory, function (err) {
        if (err) console.error(err)
        else {
          fs.writeFile(
            link,
            image.binaryString,
            'binary',
            function (err) {
              if (err) throw err
              console.log('File saved.');
            });
        }
      });
    }
    return savedImages;
  }

  async getStymulus(dbType, experimentId) {
    switch (dbType) {
      case mssql: {
        return await this.getStymulusFromMssql(experimentId);
      }
      default:
        return;
    };
  };

  async saveStymulus(dbType, stymulus) {
    switch (dbType) {
      case mssql: {
        return await this.saveStymulusToMssql(stymulus);
      }
      default:
        return;
    };
  };

  async deleteStymulus(dbType, experimentId) {
    switch (dbType) {
      case mssql: {
        return await this.deleteStymulusFromMssql(experimentId);
      }
      default:
        return;
    };
  };

}

export default StymulusDAL;
