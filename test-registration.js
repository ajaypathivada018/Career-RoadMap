import http from 'http';
import logger from './utils/logger.js';

const testEmail = `test${Math.floor(Math.random() * 100000)}@example.com`;

const postData = JSON.stringify({
  email: testEmail,
  password: 'TestPassword123',
  name: 'Test User',
  phone: '1234567890'
});

logger.info(`\n🧪 Testing user registration...`);
logger.info(`📧 Test Email: ${testEmail}`);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (res.statusCode === 200) {
        logger.info('\n✅ REGISTRATION SUCCESSFUL!');
        logger.info('User ID:', response.user.id);
        logger.info('User Email:', response.user.email);
        logger.info('User Name:', response.user.name);
        logger.info('\n✅ DATABASE IS WORKING - User saved successfully!\n');
      } else {
        logger.warn('\n❌ REGISTRATION FAILED!');
        logger.warn('Status Code:', res.statusCode);
        logger.warn('Error:', response.error);
        logger.warn('\n');
      }
    } catch (error) {
      logger.error('\n❌ Failed to parse response:', error.message);
      logger.debug('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  logger.error('\n❌ TEST FAILED:', error.message);
  logger.info('Make sure the backend is running on port 5000\n');
});

req.write(postData);
req.end();
