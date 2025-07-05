import React from 'react';
import { Switch, Card, CardBody, Button, Slider, Chip, Divider, RadioGroup, Radio, ButtonGroup } from '@heroui/react';

export interface VisualizationConfig {
  type: 'none' | 'css' | '3d-light' | '3d-full' | 'jarvis';
  intensity: 'low' | 'medium' | 'high';
  opacity: number;
  color: 'blue' | 'cyan' | 'green' | 'purple' | 'gold';
  enabled: boolean;
}

interface VisualizationSettingsProps {
  config: VisualizationConfig;
  onChange: (config: VisualizationConfig) => void;
}

const VisualizationSettings: React.FC<VisualizationSettingsProps> = ({
  config,
  onChange
}) => {
  const handleChange = (key: keyof VisualizationConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    onChange(newConfig);
  };

  const visualizationTypes = [
    { value: 'none', label: 'None', description: 'No visualization' },
    { value: 'css', label: 'Bars', description: 'CSS bars' },
    { value: '3d-light', label: '3D Light', description: 'Lightweight 3D' },
    { value: '3d-full', label: '3D Full', description: 'Full 3D with effects' },
    { value: 'jarvis', label: 'JARVIS', description: 'HUD style' }
  ];

  const intensityLevels = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' }
  ];

  const colorSchemes = [
    { value: 'blue', label: 'Blue', preview: '#00bfff' },
    { value: 'cyan', label: 'Cyan', preview: '#00ffff' },
    { value: 'green', label: 'Green', preview: '#00ff41' },
    { value: 'purple', label: 'Purple', preview: '#8a2be2' },
    { value: 'gold', label: 'Gold', preview: '#ffd700' }
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Switch
          isSelected={config.enabled}
          onValueChange={(checked) => handleChange('enabled', checked)}
          size="sm"
        >
          <span className="text-sm font-medium">Enable Visualization</span>
        </Switch>
      </div>

      {config.enabled && (
        <>
          <Divider className="my-1" />
          
          {/* Visualization Type */}
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">Type</h4>
            <RadioGroup
              value={config.type}
              onValueChange={(value) => handleChange('type', value)}
              orientation="vertical"
              className="gap-1"
            >
              {visualizationTypes.map((type) => (
                <Radio
                  key={type.value}
                  value={type.value}
                  className="max-w-none"
                  classNames={{
                    base: "flex m-0 bg-content1 hover:bg-content2 items-center justify-between cursor-pointer rounded-lg gap-2 p-1.5 border-2 border-transparent data-[selected=true]:border-primary",
                    label: "text-sm font-medium",
                    labelWrapper: "flex-1"
                  }}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{type.label}</span>
                    <span className="text-xs text-default-500">{type.description}</span>
                  </div>
                </Radio>
              ))}
            </RadioGroup>
          </div>

          {/* Intensity */}
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">Intensity</h4>
            <ButtonGroup size="sm" variant="bordered" className="w-full">
              {intensityLevels.map((level) => (
                <Button
                  key={level.value}
                  variant={config.intensity === level.value ? "solid" : "bordered"}
                  color={config.intensity === level.value ? "primary" : "default"}
                  onPress={() => handleChange('intensity', level.value)}
                  className="flex-1"
                >
                  {level.label}
                </Button>
              ))}
            </ButtonGroup>
          </div>

          {/* Color Scheme (only for JARVIS) */}
          {config.type === 'jarvis' && (
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">Color</h4>
              <div className="flex flex-wrap gap-1">
                {colorSchemes.map((color) => (
                  <Button
                    key={color.value}
                    variant={config.color === color.value ? "solid" : "bordered"}
                    onPress={() => handleChange('color', color.value)}
                    size="sm"
                    className="min-w-14"
                    style={{
                      backgroundColor: config.color === color.value ? color.preview : undefined,
                      borderColor: config.color === color.value ? color.preview : undefined,
                      color: config.color === color.value ? 'white' : undefined
                    }}
                  >
                    {color.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Opacity */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Opacity</h4>
              <Chip variant="flat" color="primary" size="sm">
                {Math.round(config.opacity * 100)}%
              </Chip>
            </div>
            <Slider
              size="sm"
              step={0.1}
              minValue={0.1}
              maxValue={1}
              value={config.opacity}
              onChange={(value) => handleChange('opacity', value)}
              className="w-full"
              color="primary"
              aria-label="Visualization opacity"
            />
          </div>

          {/* Performance Note */}
          <Card className="bg-warning-50 border-warning-200">
            <CardBody className="p-1.5">
              <div className="flex items-start gap-2">
                <span className="text-warning-600 text-sm">⚡</span>
                <div className="flex-1">
                  <p className="text-xs text-warning-700">
                    3D visualizations may impact performance on older devices.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
};

export default VisualizationSettings; 