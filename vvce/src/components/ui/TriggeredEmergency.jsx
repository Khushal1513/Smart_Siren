import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TriggeredEmergency = () => {
  const [engineNumber, setEngineNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleVerify = () => {
    setError('');
    setSuccess('');

    if (!engineNumber.trim() || !vehicleNumber.trim()) {
      setError('Please fill in both Engine Number and Vehicle Number.');
      return;
    }

    // Simulate verification (replace with real API check if needed)
    if (engineNumber.trim().length >= 6 && vehicleNumber.trim().length >= 6) {
      setVerified(true);
      setSuccess('Vehicle verified successfully.');
    } else {
      setError('Invalid vehicle details.');
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    if (!verified) {
      setError('Please verify the vehicle details first.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Simulate async API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate successful activation response
      const ambulanceId = 'AMB-' + Math.random().toString(36).substr(2, 6).toUpperCase();
      const timestamp = new Date().toISOString();

      setSuccess(`Ambulance ${ambulanceId} successfully marked active.`);

      // Reset form
      setEngineNumber('');
      setVehicleNumber('');
      setVerified(false);

      // Navigate to AmbulancesPage after a brief delay
      setTimeout(() => {
        navigate('/ambulances');
      }, 1000);
    } catch (err) {
      console.error('Activation Error:', err);
      setError('Failed to activate ambulance. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Trigger Emergency</h2>

      <div style={{ marginBottom: '1rem' }}>
        <label>Engine Number:</label>
        <input
          type="text"
          value={engineNumber}
          onChange={e => setEngineNumber(e.target.value)}
          disabled={verified}
          style={{ width: '100%', padding: '0.5rem' }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label>Vehicle Number:</label>
        <input
          type="text"
          value={vehicleNumber}
          onChange={e => setVehicleNumber(e.target.value)}
          disabled={verified}
          style={{ width: '100%', padding: '0.5rem' }}
        />
      </div>

      {!verified && (
        <button onClick={handleVerify} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem' }}>
          Verify Vehicle
        </button>
      )}

      {verified && (
        <button
          onClick={handleSubmit}
          style={{ width: '100%', padding: '0.75rem' }}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Activating...' : 'Activate Ambulance'}
        </button>
      )}

      {success && <p style={{ color: 'green', marginTop: '1rem' }}>{success}</p>}
      {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}
    </div>
  );
};

export default TriggeredEmergency;
