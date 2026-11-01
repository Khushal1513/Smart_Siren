import React from 'react';

const TrafficSignalControls = ({ signal, onChangeStatus }) => {
  return (
    <div>
      <h3>Control Signal: {signal.name}</h3>
      <button onClick={() => onChangeStatus(signal, 'green')}>Green</button>
      <button onClick={() => onChangeStatus(signal, 'red')}>Red</button>
    </div>
  );
};

export default TrafficSignalControls;