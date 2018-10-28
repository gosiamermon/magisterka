// @ts-check
import fs from 'fs';
import mkdirp from 'mkdirp';
import _ from 'lodash-uuid';

class StymulusDAL {

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

}

export default StymulusDAL;
