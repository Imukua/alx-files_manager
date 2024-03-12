import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('error', (err) => {
      console.log('Redis Client Error', err);
    });

    this.connected = false;

    this.client.on('connect', () => {
      this.connected = true;
    });

    this.aSetX = promisify(this.client.setex).bind(this.client);
    this.aGet = promisify(this.client.get).bind(this.client);
    this.aDel = promisify(this.client.del).bind(this.client);
  }

  isAlive() {
    return this.connected;
  }

  set(key, value, expiry) {
    this.aSetX(key, expiry, value);
  }

  get(key) {
    return this.aGet(key);
  }

  del(key) {
    return this.aDel(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
