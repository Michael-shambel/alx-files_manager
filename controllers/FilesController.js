import fs from 'fs';
import path from 'path';
// import mime from 'mime-types';
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      name, type, parentId = '0', isPublic = false, data,
    } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    let parentFile = null;
    if (parentId !== '0') {
      parentFile = await dbClient.db.collection('files').findOne({ _id: ObjectId(parentId) });

      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const fileDocument = {
      userId: ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: parentId === '0' ? '0' : ObjectId(parentId),
    };

    if (type === 'folder') {
      await dbClient.db.collection('files').insertOne(fileDocument);
      return res.status(201).json(fileDocument);
    }
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const localPath = path.join(folderPath, uuidv4());
    const fileBuffer = Buffer.from(data, 'base64');
    await fs.promises.writeFile(localPath, fileBuffer);

    fileDocument.localPath = localPath;
    await dbClient.db.collection('files').insertOne(fileDocument);
    return res.status(201).json(fileDocument);
  }
}

export default FilesController;
