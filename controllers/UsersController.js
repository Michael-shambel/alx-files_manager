import sha1 from 'sha1';
import dbClient from '../utils/db';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    const existUser = await dbClient.db.collection('users').findOne({ email });

    if (existUser) {
      return res.status(400).json({ error: 'Already exist' });
    }

    const passwordHash = sha1(password);

    const result = await dbClient.db.collection('users').insertOne({ email, password: passwordHash });

    return res.status(201).json({ email, password, id: result.insertedId });
  }
}

export default UsersController;
