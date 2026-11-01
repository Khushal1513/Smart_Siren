// debug-routes.js
import express from 'express';

console.log('🔍 Starting route debugging...\n');

const testRoutes = async () => {
  const routeFiles = [
    { name: 'userRoute', path: './routes/userRoute.js' },
    { name: 'trafficSignalRoute', path: './routes/trafficSignalRoute.js' },
    { name: 'vehicleRoute', path: './routes/vehicleRoute.js' },
    { name: 'triggerRoute', path: './routes/trigger-route.js' },
    { name: 'ambulanceRoute', path: './routes/ambulanceRoute.js' },
    { name: 'verifyRoute', path: './routes/verifyroute.js' }
  ];

  for (const routeFile of routeFiles) {
    console.log(`Testing ${routeFile.name}...`);
    try {
      const app = express();
      const route = await import(routeFile.path);
      
      // This line will fail if there's a route problem
      app.use('/test', route.default);
      console.log(`✅ ${routeFile.name} - OK`);
    } catch (error) {
      console.error(`❌ ${routeFile.name} - ERROR:`);
      console.error(`   ${error.message}`);
      
      if (error.message.includes('Missing parameter name')) {
        console.error(`\n🎯 FOUND THE PROBLEM IN: ${routeFile.name}`);
        console.error('   This file has a malformed route parameter!');
        return; // Stop here
      }
    }
  }
  console.log('\n✅ All routes tested successfully!');
};

testRoutes().catch(console.error);