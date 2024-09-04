import fs from 'fs';
import path from 'path';
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
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
      const result = await dbClient.db.collection('files').insertOne(fileDocument);
      return res.status(201).json({
        id: result.insertedId,
        ...fileDocument,
        parentId: parentId === '0' ? 0 : parentId,
      });
    }
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const localPath = path.join(folderPath, uuidv4());
    const fileBuffer = Buffer.from(data, 'base64');
    await fs.promises.writeFile(localPath, fileBuffer);

    fileDocument.localPath = localPath;
    const result = await dbClient.db.collection('files').insertOne(fileDocument);
    return res.status(201).json({
      id: result.insertedId,
      userId: fileDocument.userId,
      name: fileDocument.name,
      type: fileDocument.type,
      isPublic: fileDocument.isPublic,
      parentId: parentId === '0' ? 0 : parentId,
    });
  }

  static async getShow(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });

    // if (!user) {
    //   return res.status(401).json({ error: 'Unauthorized' });
    // }

    const fileId = req.params.id;
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json({
      id: file._id.toString(),
      userId: file.userId.toString(),
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId.toString(),
    });
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });

    // if (!user) {
    //   return res.status(401).json({ error: 'Unauthorized' });
    // }

    const parentId = req.query.parentId || '0';
    const page = parseInt(req.query.page, 10) || 0;

    const filesQuery = {
      userId: ObjectId(userId),
    };

    if (parentId !== '0') {
      filesQuery.parentId = ObjectId(parentId);
    } else {
      filesQuery.parentId = '0';
    }

    const files = await dbClient.db.collection('files')
      .find(filesQuery)
      .skip(page * 20)
      .limit(20)
      .toArray();

    return res.status(200).json(files.map((file) => ({
      id: file._id.toString(),
      userId: file.userId.toString(),
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId.toString(),
    })));
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const fileId = req.params.id;
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    await dbClient.db.collection('files').updateOne(
      { _id: ObjectId(fileId) },
      { $set: { isPublic: true } },
    );
    const updatedFile = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId) });
    return res.status(200).json({
      id: updatedFile._id,
      userId: updatedFile.userId,
      name: updatedFile.name,
      type: updatedFile.type,
      isPublic: updatedFile.isPublic,
      parentId: updatedFile.parentId,
    });
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const fileId = req.params.id;
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    await dbClient.db.collection('files').updateOne(
      { _id: ObjectId(fileId) },
      { $set: { isPublic: false } },
    );
    const updatedFile = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId) });
    return res.status(200).json({
      id: updatedFile._id,
      userId: updatedFile.userId,
      name: updatedFile.name,
      type: updatedFile.type,
      isPublic: updatedFile.isPublic,
      parentId: updatedFile.parentId,
    });
  }

  static async getFile(req, res) {
    const token = req.headers['x-token'];
    const { id } = req.params;

    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(id) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    if (!file.isPublic) {
      if (!token) {
        return res.status(404).json({ error: 'Not found' });
      }
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId || userId !== file.userId.toString()) {
        return res.status(404).json({ error: 'Not found' });
      }
    }
    if (!fs.existsSync(file.localPath)) {
      return res.status(404).json({ error: 'Not found' });
    }
    const mimeType = mime.lookup(file.name);
    res.setHeader('Content-Type', mimeType);

    // const fileContent = fs.readFileSync(file.localPath);
    // return res.status(200).send(fileContent);
    const fileStream = fs.createReadStream(file.localPath);
    return fileStream.pipe(res);
  }
}

export default FilesController;
