const Redis = require('ioredis');
const Memjs = require('memjs');

let cacheClient;

function createCacheClient() {
  if (process.env.NODE_ENV === 'production') {
    try {
      // Use memjs with proper error handling and configuration
      const client = Memjs.Client.create(
        `${process.env.ELASTICACHE_ENDPOINT}:${process.env.ELASTICACHE_PORT || 11211}`,
        {
          // Add timeout and retry configurations
          timeout: 5000,
          keepAlive: true,
          retries: 2
        }
      );
      console.log('Using Memcached in production');
      return client;
      
    } catch (error) {
      console.error(`Failed to create Memcached client: ${error.message}`);
      return null;
    }
  } else {
    // Development Redis configuration with more robust options
    return new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: process.env.REDIS_PORT || 6379,
      connectTimeout: 5000,
      retryStrategy: (times) => {
        // Implement exponential backoff
        return Math.min(times * 50, 2000);
      },
      maxRetriesPerRequest: 3
    });
  }
}

// Create client on module load
cacheClient = createCacheClient();

// Add a method to recreate client if needed
function resetCacheClient() {
  cacheClient = createCacheClient();
  return cacheClient;
}

// Enhanced error handling for cache operations
function safeExecute(operation, ...args) {
  if (!cacheClient) {
    console.error('Cache client not initialized');
    return Promise.reject(new Error('Cache client not initialized'));
  }

  try {
    return operation.apply(cacheClient, args);
  } catch (error) {
    console.error(`Cache operation error: ${error.message}`);
    // Attempt to reset client
    resetCacheClient();
    return Promise.reject(error);
  }
}

module.exports = { 
  cacheClient, 
  resetCacheClient,
  safeExecute
};