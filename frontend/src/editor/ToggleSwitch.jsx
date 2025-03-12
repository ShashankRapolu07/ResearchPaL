import React from 'react';
import './ToggleSwitch.css';

const ToggleSwitch = ({ isOn, onToggle }) => {
  return (
    <label className="toggle-switch">
      <input
        type="checkbox"
        checked={isOn}
        onChange={() => onToggle(!isOn)}
      />
      <span className="slider" />
    </label>
  );
};

export default ToggleSwitch;