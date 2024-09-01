import redisClient from '../utils/redis';
import dbClient from '../utils/db';

export async function getStatus(req, res) {
  try {
    const redisStatus = redisClient.isAlive();
    const dbStatus = dbClient.isAlive();
    res.status(200).json({ redis: redisStatus, db: dbStatus });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function getStats(req, res) {
  try {
    if (!dbClient.isAlive()) {
      res.status(500).json({ error: 'DB not connected' });
      return;
    }
    const usersCount = await dbClient.nbUsers();
    const filesCount = await dbClient.nbFiles();
    res.status(200).json({ users: usersCount, files: filesCount });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
