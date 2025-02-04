const { cacheClient, safeExecute } = require('./cache-config');

async function setCache(key, value, ttl = 3600) {
  if (!key || value === undefined) {
    throw new Error('Key and value are required for caching');
  }

  try {
    const data = JSON.stringify(value);
    
    if (process.env.NODE_ENV === 'production') {
      // Memcached specific set with expiration
      await safeExecute(cacheClient.set, key, data, { expires: ttl });
    } else {
      // Redis SETEX
      await safeExecute(cacheClient.setex, key, ttl, data);
    }
  } catch (error) {
    console.error(`Cache set error for key "${key}": ${error.message}`);
  }
}

async function getCache(key) {
  if (!key) {
    throw new Error('Key is required to retrieve cache');
  }

  try {
    let result;
    if (process.env.NODE_ENV === 'production') {
      // Memcached get
      result = await safeExecute(cacheClient.get, key);
      return result ? JSON.parse(result.toString()) : null;
    } else {
      // Redis get
      result = await safeExecute(cacheClient.get, key);
      return result ? JSON.parse(result) : null;
    }
  } catch (error) {
    console.error(`Cache get error for key "${key}": ${error.message}`);
    return null;
  }
}

async function getData(key, ttl, dataFn) {
  if (!key || typeof dataFn !== 'function') {
    throw new Error('Key and dataFn function are required');
  }

  try {
    const cachedData = await getCache(key);
    if (cachedData) return cachedData;

    const data = await dataFn();
    await setCache(key, data, ttl);
    return data;
  } catch (error) {
    console.error(`Data retrieval error for key "${key}": ${error.message}`);
    // Fallback to direct data fetch if cache fails
    return dataFn();
  }
}

async function acquireLock(resourceId, ttl = 10) {
  if (!resourceId) throw new Error('Resource ID is required');

  const lockKey = `lock:${resourceId}`;
  const validTTL = Math.max(1, Math.min(ttl, 300));

  try {
    if (process.env.NODE_ENV === 'production') {
      // Memcached locking strategy
      const lockValue = Date.now().toString();
      const result = await new Promise((resolve, reject) => {
        cacheClient.add(lockKey, lockValue, validTTL, (err, result) => {
          if (err) reject(err);
          resolve(result);
        });
      });
      return result === true; // Successfully added lock
    } else {
      // Redis locking (existing implementation)
      const locked = await safeExecute(
        cacheClient.set,
        lockKey,
        Date.now().toString(),
        'NX',
        'EX',
        validTTL
      );
      return !!locked;
    }
  } catch (error) {
    console.error(`Lock acquisition failed for "${resourceId}": ${error.message}`);
    return false;
  }
}

async function releaseLock(resourceId) {
  if (!resourceId) throw new Error('Resource ID is required');

  const lockKey = `lock:${resourceId}`;

  try {
    if (process.env.NODE_ENV === 'production') {
      // Memcached unlock strategy
      const result = await new Promise((resolve, reject) => {
        cacheClient.delete(lockKey, (err, result) => {
          if (err) reject(err);
          resolve(result);
        });
      });
      return result === true;
    } else {
      // Redis unlock (existing implementation)
      const result = await safeExecute(cacheClient.del, lockKey);
      return result === 1;
    }
  } catch (error) {
    console.error(`Lock release failed for "${resourceId}": ${error.message}`);
    return false;
  }
}

// Active User Tracking Middleware
async function trackActiveUsers(req, res, next) {
  if (req.session?.userId) {
    const userId = req.session.userId;
    const key = `active:${userId}`;
    const ttl = 900; // 15 minutes

    try {
      if (process.env.NODE_ENV === 'production') {
        await safeExecute(cacheClient.set, key, 'active', { expires: ttl });
      } else {
        await safeExecute(cacheClient.sadd, 'active_users', userId);
        await safeExecute(cacheClient.expire, key, ttl);
      }
    } catch (error) {
      console.error(`Error tracking active user: ${error.message}`);
    }
  }
  next();
}


// Simplified rate limiter for both environments
async function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const key = `ratelimit:${ip}`;
  const limit = parseInt(process.env.RATE_LIMIT, 10) || 10;
  const window = parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 3600;

  try {
    if (process.env.NODE_ENV === 'production') {
      // Basic rate limiting for Memcached
      const currentCount = await getCache(key) || 0;
      
      if (currentCount >= limit) {
        return res.status(429).json({
          error: 'Too Many Requests',
          retryAfter: window,
        });
      }

      await setCache(key, currentCount + 1, window);
    } else {
      // Redis multi-command rate limiter
      const multi = cacheClient.multi();
      multi.incr(key);
      multi.expire(key, window);
      const [requests] = await multi.exec();

      const requestCount = requests[1];
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - requestCount));

      if (requestCount > limit) {
        return res.status(429).json({
          error: 'Too Many Requests',
          retryAfter: window,
        });
      }
    }
    next();
  } catch (error) {
    console.error(`Rate limiter error for IP ${ip}: ${error.message}`);
    next(); // Allow request if cache fails
  }
}

module.exports = {
  getData,
  acquireLock,
  releaseLock,
  rateLimiter,
  setCache,
  getCache,
  trackActiveUsers
};