import { SerialPort } from 'serialport';

SerialPort.list().then(ports => {
  console.log('Available ports on this machine:');
  ports.forEach(port => {
    console.log(`- ${port.path} (${port.manufacturer || 'Unknown'})`);
  });
}).catch(err => {
  console.error('Error listing ports:', err);
});