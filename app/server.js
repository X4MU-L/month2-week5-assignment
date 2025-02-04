// app.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const SessionStoreFactory = require('./session-factory');
const { rateLimiter, getData, acquireLock, releaseLock, trackActiveUsers , setCache, getCache} = require('./utils');
const { cacheClient, safeExecute } = require('./cache-config');
const app = express();

// Middleware
app.use(express.json());
SessionStoreFactory.configureSession(app, { cookie: {
  maxAge: 48 * 60 * 60 * 1000  // 48 hours if needed
}});

// Middleware Application
app.use("/api", rateLimiter);
app.use("/api", trackActiveUsers);

// Login Route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const userId = uuidv4();

  try {
    req.session.userId = userId;
    await setCache(
      `session:${userId}`, 
      { username, loginTime: new Date().toISOString() }, 
      3600
    );

    res.json({ message: 'Logged in successfully', userId });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Products Route
app.get('/api/products', async (req, res) => {
  try {
    const products = await getData(
      'products',
      300,
      async () => [
        { id: 1, name: 'Savings Account', rate: '2.5%' },
        { id: 2, name: 'Checking Account', fee: '$0' }
      ]
    );

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Transfer Route
app.post('/api/transfer', async (req, res) => {
  const { fromAccount, toAccount, amount } = req.body;
  const transactionId = uuidv4();

  try {
    const lockKey = `transaction:${fromAccount}-${toAccount}`;
    const lock = await acquireLock(lockKey);

    if (!lock) {
      return res.status(409).json({ error: 'Transaction in progress' });
    }

    // Simulate transaction logic here
    await releaseLock(lockKey);
    res.json({ message: 'Transfer successful', transactionId });
  } catch (error) {
    res.status(500).json({ error: 'Transfer failed' });
  }
});

// Analytics Route
app.get('/api/analytics', async (req, res) => {
  try {
    const activeUsers = await getCache('active_users') || 0
    const totalRequests = await getCache('total_requests') || 0;
    res.json({
      activeUsers,
      totalRequests: parseInt(totalRequests)
    });
  } catch (error) {
    res.status(500).json({ error: 'Analytics retrieval failed' });
  }
});

// Health Check
app.get('/health', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      await safeExecute(cacheClient.get, "ping");
    } else {
      await safeExecute(cacheClient.ping);
    }

    res.status(200).json({ 
      status: 'healthy',
      cache: 'connected'
    });
  } catch (error) {
    console.error(`Health check failed: ${error.message}`);
    res.status(500).json({ 
      status: 'unhealthy',
      cache: 'disconnected'
    });
  }
});


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.message
  });
});
// Rest of your existing routes...

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;