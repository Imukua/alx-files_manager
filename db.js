import { MongoClient, ObjectId } from 'mongodb';
import sha1 from 'sha1';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 27017;
const DB_DATABASE = process.env.DB_DATABASE || 'files_manager';

class DBClient {
  constructor() {
    this.client = new MongoClient(
      `mongodb://${DB_HOST}:${DB_PORT}/${DB_DATABASE}`,
    );
    this.connected = false;
    this.db = null;
    this.client.connect((err) => {
      if (!err) {
        this.connected = true;
        this.db = this.client.db(DB_DATABASE);
      }
    });
  }

  isAlive() {
    return this.connected;
  }

  async nbUsers() {
    return this.db.collection('users').countDocuments();
  }

  async nbFiles() {
    return this.db.collection('files').countDocuments();
  }

  filesCollection() {
    return this.db.collection('files');
  }

  findUserByEmail(email) {
    return this.db.collection('users').findOne({ email });
  }

  findUserById(userId) {
    return this.db.collection('users').findOne({ _id: ObjectId(userId) });
  }

  async addUser(email, password) {
    const hPassword = sha1(password);
    const res = await this.db.collection('users').insertOne(
      {
        email,
        password: hPassword,
      },
    );
    return {
      email: res.ops[0].email,
      id: res.ops[0]._id,
    };
  }
}

const dBClient = new DBClient();
export default dBClient;
