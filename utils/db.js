import { MongoClient } from 'mongodb';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '27017';
const DB_DATABASE = process.env.DB_DATABASE || 'file_manager';

class DBClient {
  constructor() {
    this.url = `mongodb://${DB_HOST}:${DB_PORT}`;
    this.dbName = DB_DATABASE;
    this.client = new MongoClient(this.url);
    this.db = null;

    this.client.connect()
      .then(() => {
        this.db = this.client.db(this.dbName);
      })
      .catch((error) => {
        console.error('Error connecting to DB:', error);
      });
  }

  isAlive() {
    return this.client && this.client.isconnected();
  }

  async nbUsers() {
    try {
      if (!this.isAlive()) return 0;
      const fileCollection = this.db.collection('users');
      return await userCollection.countDocuments();
    } catch (error) {
      console.error('Error getting number of users:', error);
      return 0;
    }
  }

  async nbFiles() {
    try {
      if (!this.isAlive()) return 0;
      const fileCollection = this.db.collection('files');
      return await fileCollection.countDocuments();
    } catch (error) {
      console.error('Error getting number of files:', error);
      return 0;
    }
  }
}

const dbClient = new DBClient();
export default dbClient;
