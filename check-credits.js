#!/usr/bin/env node
// Operational tool: prints the OpenRouter account credit balance.
// Reads OPENROUTER_API_KEY from the environment — do NOT commit the key.
//   Usage:  OPENROUTER_API_KEY=sk-or-... node check-credits.js

const https = require('https');

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error('OPENROUTER_API_KEY is not set. Export it before running this script.');
  process.exit(1);
}

const options = {
  hostname: 'openrouter.ai',
  path: '/api/v1/auth/key',
  method: 'GET',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (response.data && response.data.credit_balance !== undefined) {
        console.log('\n✓ OpenRouter Account Info:');
        console.log('========================');
        console.log(`Credits Remaining: $${response.data.credit_balance}`);

        if (response.data.credit_balance > 5) {
          console.log('✓ Status: SUFFICIENT — you can run course generation');
        } else if (response.data.credit_balance > 0) {
          console.log('⚠ Status: LOW — limited credits remaining');
        } else {
          console.log('✗ Status: OUT OF CREDITS');
        }
      } else {
        console.log('Response:', JSON.stringify(response, null, 2));
      }
    } catch (e) {
      console.log('Error parsing response:', e.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.end();
