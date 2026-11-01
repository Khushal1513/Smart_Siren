import React from 'react';

const SignalsList = ({ signals, onSelect }) => (
  <div>
    <h2>Traffic Signals</h2>
    <ul>
      {signals.map((signal, index) => (
        <li key={index}>
          {signal.name} - Status: {signal.status}
          <button onClick={() => onSelect(signal)}>Control</button>
        </li>
      ))}
    </ul>
  </div>
);

export default SignalsList;