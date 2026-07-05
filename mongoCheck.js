import { isMongoConnected } from '../db/mongo.js';

// Middleware to check if MongoDB is connected before allowing database operations
export function requireMongo(req, res, next) {
  if (!isMongoConnected()) {
    return res.status(503).json({ 
      error: 'Database unavailable',
      message: 'MongoDB is not connected. Please use localStorage or try again later.',
      useLocalStorage: true
    });
  }
  next();
}

// Optional middleware - warns but allows request to continue
export function warnIfNoMongo(req, res, next) {
  if (!isMongoConnected()) {
    console.warn('⚠️  MongoDB not connected - operation may fail');
  }
  next();
}
