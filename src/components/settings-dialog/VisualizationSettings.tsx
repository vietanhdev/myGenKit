import React from 'react';
import { Card, CardBody, RadioGroup, Radio } from '@heroui/react';

export interface VisualizationConfig {
  type: 'none' | 'css' | '3d-sphere';
}

interface VisualizationSettingsProps {
  config: VisualizationConfig;
  onChange: (config: VisualizationConfig) => void;
}

const VisualizationSettings: React.FC<VisualizationSettingsProps> = ({
  config,
  onChange
}) => {
  const handleTypeChange = (type: 'none' | 'css' | '3d-sphere') => {
    const newConfig = { type };
    onChange(newConfig);
  };

  const visualizationTypes = [
    { value: 'none', label: 'Disabled', description: 'No visualization' },
    { value: 'css', label: 'Bars', description: 'Animated frequency bars' },
    { value: '3d-sphere', label: '3DSphere', description: 'Interactive 3D sphere with effects' }
  ];

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold">Visualization Type</h4>
        <RadioGroup
          value={config.type}
          onValueChange={(value) => {
            // Ensure we get the string value, not a Set
            const stringValue = typeof value === 'string' ? value : Array.from(value as Set<string>)[0];
            handleTypeChange(stringValue as 'none' | 'css' | '3d-sphere');
          }}
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

      {config.type === '3d-sphere' && (
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
      )}
    </div>
  );
};

export default VisualizationSettings; 