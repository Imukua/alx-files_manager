const Redis = require('redis');

class RedisClient {
  constructor(options) {
    this.client = Redis.createClient(options);
    this.client.on_connect('error', (err) => {
      console.error('Redis Client Error:', err);
    });
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    try {
      const val = await this.client.get(key);
      return val;
    } catch (err) {
      console.error('Redis got error:', err);
      throw err;
    }
  }

  async set(key, value, duration) {
    try {
      await this.client.set(key, value, 'EX', duration);
    } catch (err) {
      console.error('Redis set error:', err);
      throw err;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
    } catch (err) {
      console.error('Redis del error:', err);
      throw err;
    }
  }
}

const redisClient = new RedisClient();

module.exports = redisClient;
