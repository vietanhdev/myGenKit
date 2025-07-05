import React, { useEffect, useState } from 'react';
import Visual3D from './Visual3D';
import CSSVisualizer from './CSSVisualizer';
import JarvisVisualizer from './JarvisVisualizer';
import { VisualizationConfig } from '../settings-dialog/VisualizationSettings';
import './visualization-container.scss';

interface BackgroundVisual3DProps {
  config: VisualizationConfig;
}

const BackgroundVisual3D: React.FC<BackgroundVisual3DProps> = ({ config }) => {
  // Use a key to force remount when visualization type changes
  const [visualizationKey, setVisualizationKey] = useState(0);
  const [previousType, setPreviousType] = useState(config.type);

  // Reinitialize when visualization type changes
  useEffect(() => {
    if (config.type !== previousType) {
      console.log(`Switching visualization from ${previousType} to ${config.type}`);
      setVisualizationKey(prev => prev + 1);
      setPreviousType(config.type);
    }
  }, [config.type, previousType]);

  // Don't render anything if disabled
  if (!config.enabled) {
    return null;
  }

  // Render based on visualization type with key for forced remount
  const renderVisualization = () => {
    switch (config.type) {
      case 'none':
        return null;
        
      case 'css':
        return (
          <CSSVisualizer 
            key={`css-${visualizationKey}`}
            opacity={config.opacity} 
          />
        );
        
      case '3d-light':
        return (
          <Visual3D 
            key={`3d-light-${visualizationKey}`}
            opacity={config.opacity} 
            blur={false} // Disable blur for better performance
          />
        );
        
      case 'jarvis':
        return (
          <JarvisVisualizer 
            key={`jarvis-${visualizationKey}`}
            opacity={config.opacity}
            intensity={config.intensity}
            color={config.color}
          />
        );
        
      default:
        // Fallback to CSS visualizer
        return (
          <CSSVisualizer 
            key={`fallback-${visualizationKey}`}
            opacity={config.opacity} 
          />
        );
    }
  };

  return (
    <div className="background-visualization-container">
      {renderVisualization()}
    </div>
  );
};

export default BackgroundVisual3D; 