import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { SerialPort } from 'serialport';

const app = express();
const port = 8000;

app.use(cors());
app.use(bodyParser.json());

console.log(`👋 Server initializing...`);

// ✅ Use your actual COM port
const arduinoPort = new SerialPort({
  path: 'COM15',
  baudRate: 9600,
  autoOpen: false,
});

// Open the serial port
arduinoPort.open((err) => {
  if (err) {
    return console.error('❌ Failed to open serial port:', err.message);
  }
  console.log('✅ Serial port opened');
});

// ✅ API to receive dispatch data and send to Arduino
app.post('/api/dispatch', (req, res) => {
  const { lane, type } = req.body;

  if (!lane || !type) {
    return res.status(400).json({ success: false, message: 'Missing lane or type' });
  }

  // ✅ Format as "L2:GREEN\n" so the Arduino script parses it correctly
  const message = `${lane.trim().toUpperCase()}:GREEN\n`;

  console.log(`🚨 Dispatching ${type} to ${lane} → Sending: "${message.trim()}"`);

  arduinoPort.write(message, (err) => {
    if (err) {
      console.error('❌ Error sending to Arduino:', err.message);
      return res.status(500).json({ success: false, message: 'Failed to send to Arduino' });
    }
    return res.json({ success: true, message: `Dispatched ${type} to ${lane}` });
  });
});
// Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
