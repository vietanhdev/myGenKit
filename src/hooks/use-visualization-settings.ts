import { useState, useEffect, useCallback } from 'react';
import { VisualizationConfig } from '../components/settings-dialog/VisualizationSettings';

const STORAGE_KEY = 'mygenkit-visualization-settings';

const defaultConfig: VisualizationConfig = {
  type: 'css',
  intensity: 'medium',
  opacity: 0.3,
  color: 'blue',
  enabled: true
};

export function useVisualizationSettings() {
  const [config, setConfig] = useState<VisualizationConfig>(defaultConfig);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedConfig = JSON.parse(saved);
        // Merge with defaults to handle missing properties
        setConfig({ ...defaultConfig, ...parsedConfig });
      }
    } catch (error) {
      console.warn('Failed to load visualization settings:', error);
      // Keep default config
    } finally {
      setIsLoaded(true);
    }
  }, []);



  // Save settings to localStorage whenever config changes
  useEffect(() => {
    if (!isLoaded) return; // Don't save until we've loaded

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.warn('Failed to save visualization settings:', error);
    }
  }, [config, isLoaded]);

  const updateConfig = useCallback((newConfig: VisualizationConfig) => {
    setConfig(newConfig);
  }, []);

  const resetToDefaults = useCallback(() => {
    setConfig(defaultConfig);
  }, []);

  return {
    config,
    updateConfig,
    resetToDefaults,
    isLoaded
  };
} 