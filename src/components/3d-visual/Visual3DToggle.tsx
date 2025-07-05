import React, { useState } from 'react';
import { FaCube, FaTimes } from 'react-icons/fa';
import Visual3D from './Visual3D';
import './visual-3d-toggle.scss';

const Visual3DToggle: React.FC = () => {
  const [is3DActive, setIs3DActive] = useState(false);

  const toggle3D = () => {
    setIs3DActive(!is3DActive);
  };

  return (
    <>
      <button 
        className={`visual-3d-toggle ${is3DActive ? 'active' : ''}`}
        onClick={toggle3D}
        title={is3DActive ? 'Disable 3D Visualization' : 'Enable 3D Visualization'}
      >
        {is3DActive ? <FaTimes /> : <FaCube />}
      </button>
      
      <Visual3D />
      
      {is3DActive && (
        <div className="visual-3d-overlay">
          <div className="visual-3d-info">
            <h3>3D Audio Visualization</h3>
            <p>Visual responds to your voice and AI audio</p>
          </div>
        </div>
      )}
    </>
  );
};

export default Visual3DToggle; 