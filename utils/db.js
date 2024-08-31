import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const DB_HOST = process.env.DB_HOST || 'localhost';
    const DB_PORT = process.env.DB_PORT || '27017';
    const DB_DATABASE = process.env.DB_DATABASE || 'file_manager';
    this.url = `mongodb://${DB_HOST}:${DB_PORT}`;
    this.dbName = DB_DATABASE;
    this.client = new MongoClient(this.url, { useNewUrlParser: true, useUnifiedTopology: true });
    this.db = null;

    this.client.connect()
      .then(() => {
        console.log('Connection to DB established');
        this.db = this.client.db(this.dbName);
      })
      .catch((error) => {
        console.error('Error connecting to DB:', error);
      });
  }

  isAlive() {
    return this.db !== null;
  }

  async nbUsers() {
    if (this.isAlive()) {
      try {
        const fileCollection = this.db.collection('users');
        return await fileCollection.countDocuments();
      } catch (error) {
        console.error('Error getting number of users:', error);
        return 0;
      }
    }
    return 0;
  }

  async nbFiles() {
    if (this.isAlive()) {
      try {
        const fileCollection = this.db.collection('files');
        return await fileCollection.countDocuments();
      } catch (error) {
        console.error('Error getting number of files:', error);
        return 0;
      }
    }
    return 0;
  }
}

const dbClient = new DBClient();
export default dbClient;
