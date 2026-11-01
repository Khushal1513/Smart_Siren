// check-route-conflicts.js
import fs from 'fs';
import path from 'path';

console.log('🔍 Checking for route conflicts...\n');

const routeFiles = [
  './routes/userRoute.js',
  './routes/trafficSignalRoute.js', 
  './routes/vehicleRoute.js',
  './routes/trigger-route.js',
  './routes/ambulanceRoute.js',
  './routes/ambulanceRoutes.js', // Note: you might have both files
  './routes/verifyroute.js'
];

const allRoutes = {};

for (const filePath of routeFiles) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      continue;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    // Extract route definitions
    const routeMatches = content.match(/router\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`]/g);
    
    if (routeMatches) {
      console.log(`\n📁 ${fileName}:`);
      routeMatches.forEach(match => {
        const [, method, routePath] = match.match(/router\.(\w+)\(['"`]([^'"`]+)['"`]/);
        console.log(`   ${method.toUpperCase()} ${routePath}`);
        
        const key = `${method.toUpperCase()} ${routePath}`;
        if (allRoutes[key]) {
          allRoutes[key].push(fileName);
        } else {
          allRoutes[key] = [fileName];
        }
      });
    }
  } catch (error) {
    console.error(`❌ Error reading ${filePath}:`, error.message);
  }
}

// Check for conflicts
console.log('\n🔍 Looking for conflicts...\n');
let hasConflicts = false;

for (const [route, files] of Object.entries(allRoutes)) {
  if (files.length > 1) {
    console.error(`❌ CONFLICT: ${route}`);
    console.error(`   Found in: ${files.join(', ')}`);
    hasConflicts = true;
  }
}

if (!hasConflicts) {
  console.log('✅ No route conflicts found');
} else {
  console.log('\n💡 To fix conflicts, either:');
  console.log('   1. Remove duplicate routes');
  console.log('   2. Use different route paths');
  console.log('   3. Remove unused route files');
}