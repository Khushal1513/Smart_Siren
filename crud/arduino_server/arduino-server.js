import express from 'express';
import { SerialPort } from 'serialport';

export const createArduinoRouter = () => {
  const router = express.Router();
  const portPath = process.env.ARDUINO_PORT || '\\\\.\\COM15';
  let arduino;

  try {
    arduino = new SerialPort({ path: portPath, baudRate: 9600 });
    arduino.on('open', () => console.log(`Arduino connected on ${portPath}`));
    arduino.on('error', error => console.error(`Serial port ${portPath} error:`, error.message));
  } catch (error) {
    console.error(`Failed to open serial port ${portPath}:`, error.message);
  }

  router.post('/', (req, res) => {
    const { lane, type } = req.body ?? {};
    const normalizedLane = typeof lane === 'string' ? lane.trim().toUpperCase() : '';
    const normalizedType = typeof type === 'string' ? type.trim().toUpperCase() : '';

    if (!['L1', 'L2', 'L3', 'L4'].includes(normalizedLane) || normalizedType !== 'AMBULANCE') {
      return res.status(400).json({
        success: false,
        message: 'A valid lane (L1-L4) and type (AMBULANCE) are required.',
      });
    }

    if (!arduino?.isOpen) {
      return res.status(503).json({
        success: false,
        message: `Serial port ${portPath} is not connected. Start the Proteus simulation and verify ARDUINO_PORT.`,
      });
    }

    // ✅ Formatted correctly with a colon as expected by Arduino: "L3:GREEN\n"
    const command = `${normalizedLane}:GREEN\n`;
    
    arduino.write(command, error => {
      if (error) {
        console.error('Failed to write dispatch command:', error.message);
        return res.status(500).json({
          success: false,
          message: 'Failed to write the dispatch command to the serial port.',
        });
      }

      console.log(`Dispatch command sent: ${command.trim()}`);
      return res.json({
        success: true,
        message: `Command ${command.trim()} written to ${portPath}.`,
      });
    });
  });

  return router;
};