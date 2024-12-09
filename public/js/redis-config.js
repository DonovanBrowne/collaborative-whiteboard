const Redis = require('ioredis');

const redis = new Redis({
  host: 'whiteboard-cluster.9ijw48.ng.0001.euw2.cache.amazonaws.com',
  port: 6379,
  retryStrategy: function(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3
});

redis.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redis.on('connect', () => {
  console.log('Redis Client Connected');
});

const pub = redis.duplicate();

pub.on('error', (err) => {
  console.error('Redis Publisher Error:', err);
});

module.exports = { redis, pub };