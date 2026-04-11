import * as dotenv from 'dotenv';
// Specifically NOT loading .env here to simulate missing variables

async function test() {
  console.log('Testing auth.middleware.ts load...');
  try {
    await import('./src/core/middlewares/auth.middleware.js'); // Assuming compiled path or use ts-node
    console.error('FAIL: auth.middleware.ts loaded without JWT_SECRET!');
  } catch (err) {
    console.log('SUCCESS: auth.middleware.ts threw error as expected:', err.message);
  }

  console.log('\nTesting auth.service.ts load...');
  try {
    await import('./src/domain/auth/auth.service.js');
    console.error('FAIL: auth.service.ts loaded without secrets!');
  } catch (err) {
    console.log('SUCCESS: auth.service.ts threw error as expected:', err.message);
  }
}

test();
