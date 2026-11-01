import React, { useState } from 'react';

const VehicleRegistrationForm = () => {
  const [formData, setFormData] = useState({
    driverName: '',
    vehicleNumber: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (message.text) {
      setMessage({ type: '', text: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    if (!formData.driverName.trim() || !formData.vehicleNumber.trim()) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/vehicles/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverName: formData.driverName.trim(),
          vehicleNumber: formData.vehicleNumber.trim()
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: 'Vehicle registered successfully!' });
        setFormData({ driverName: '', vehicleNumber: '' });
      } else {
        setMessage({ type: 'error', text: data.message || 'Registration failed. Please try again.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please check if the server is running.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Vehicle Registration</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="driverName" className="block text-sm font-medium text-gray-700 mb-1">
            Driver Name *
          </label>
          <input
            type="text"
            id="driverName"
            name="driverName"
            value={formData.driverName}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter driver name"
          />
        </div>

        <div>
          <label htmlFor="vehicleNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Vehicle Number *
          </label>
          <input
            type="text"
            id="vehicleNumber"
            name="vehicleNumber"
            value={formData.vehicleNumber}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter vehicle number (e.g., ABC123)"
            style={{ textTransform: 'uppercase' }}
          />
        </div>

        {message.text && (
          <div className={`p-3 rounded-md text-sm ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
            isSubmitting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          } text-white`}
        >
          {isSubmitting ? 'Registering...' : 'Register Vehicle'}
        </button>
      </form>

      <div className="mt-6 p-4 bg-gray-50 rounded-md">
        <h3 className="font-medium text-gray-700 mb-2">Debug Info:</h3>
        <div className="text-xs text-gray-600">
          <p>Server URL: http://localhost:8000/api/vehicles/register</p>
          <p>Current Data: {JSON.stringify(formData)}</p>
        </div>
      </div>
    </div>
  );
};

export default VehicleRegistrationForm;
