const session = require('express-session');
const RedisStore = require('connect-redis').default;
const MemcachedStore = require('connect-memjs')(session);
const { cacheClient } = require('./cache-config');

class SessionStoreFactory {
    static createStore(options = {}) {
        const defaultConfig = {
          secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
          resave: false,
          saveUninitialized: false,
          cookie: { 
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
          },
          // Rolling session expiration on each request
          rolling: true 
        };
      
        const storeConfig = {
          production: {
            store: new MemcachedStore({
              servers: [`${process.env.ELASTICACHE_ENDPOINT}:${process.env.ELASTICACHE_PORT || 11211}`],
              prefix: 'sess:',
              ttl: 24 * 60 * 60
            })
          },
          development: {
            store: new RedisStore({ 
              client: cacheClient,
              prefix: 'sess:',
              ttl: 24 * 60 * 60
            })
          }
        };

      
        const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';
        
        return {
          ...defaultConfig,
          ...storeConfig[env],
          ...options,
          cookie: {
            ...defaultConfig.cookie,
            ...(options.cookie || {})
          }
        };
      }

    static configureSession(app, options = {}) {
        const sessionConfig = this.createStore(options);
        app.use(session(sessionConfig));
    }
}

module.exports = SessionStoreFactory;