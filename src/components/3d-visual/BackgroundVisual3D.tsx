import React, { useEffect, useState } from 'react';
import FullVisual3D from './FullVisual3D';
import CSSVisualizer from './CSSVisualizer';
import { VisualizationConfig } from '../settings-dialog/VisualizationSettings';
import { useSidebarWidth } from '../../hooks/use-sidebar-width';
import './visualization-container.scss';

interface BackgroundVisual3DProps {
  config: VisualizationConfig;
}

const BackgroundVisual3D: React.FC<BackgroundVisual3DProps> = ({ config }) => {
  // Use a key to force remount when visualization type changes
  const [visualizationKey, setVisualizationKey] = useState(0);
  const [previousType, setPreviousType] = useState(config.type);
  const { sidebarWidth } = useSidebarWidth();

  // Reinitialize when visualization type changes
  useEffect(() => {
    if (config.type !== previousType) {
      setVisualizationKey(prev => prev + 1);
      setPreviousType(config.type);
    }
  }, [config.type, previousType]);

  // Don't render anything if disabled
  if (config.type === 'none') {
    return null;
  }

  // Render based on visualization type with key for forced remount
  const renderVisualization = () => {
    switch (config.type) {
      case 'css':
        return <CSSVisualizer key={`css-${visualizationKey}`} />;
        
      case '3d-sphere':
        return <FullVisual3D key={`3d-sphere-${visualizationKey}`} />;
        
      default:
        return <FullVisual3D key={`fallback-${visualizationKey}`} />;
    }
  };

  return (
    <div 
      className={`background-visualization-container ${config.type === '3d-sphere' ? 'right-side-container' : ''}`}
      style={{
        // For 3DSphere visualization, position to the right of the sidebar
        ...(config.type === '3d-sphere' && {
          left: `${sidebarWidth}px`,
          width: `calc(100% - ${sidebarWidth}px)`
        })
      }}
    >
      {renderVisualization()}
    </div>
  );
};

export default BackgroundVisual3D; 