import { useCallback, useEffect, useState } from "react";
import { Select, SelectItem } from "@heroui/react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";

const voiceOptions = [
  { value: "Puck", label: "Puck" },
  { value: "Charon", label: "Charon" },
  { value: "Kore", label: "Kore" },
  { value: "Fenrir", label: "Fenrir" },
  { value: "Aoede", label: "Aoede" },
];

export default function VoiceSelector() {
  const { config, setConfig } = useLiveAPIContext();

  const [selectedValue, setSelectedValue] = useState<string>("Aoede");

  useEffect(() => {
    const voiceName =
      config.speechConfig?.voiceConfig?.prebuiltVoiceConfig?.voiceName ||
      "Aoede";
    setSelectedValue(voiceName);
  }, [config]);

  const updateConfig = useCallback(
    (voiceName: string) => {
      setConfig({
        ...config,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName,
            },
          },
        },
      });
    },
    [config, setConfig]
  );

  return (
    <Select
      label="Voice"
      placeholder="Select voice"
      selectedKeys={[selectedValue]}
      onSelectionChange={(keys) => {
        const selected = Array.from(keys)[0] as string;
        setSelectedValue(selected);
        updateConfig(selected);
      }}
      variant="bordered"
      size="sm"
      className="w-36"
    >
      {voiceOptions.map((option) => (
        <SelectItem key={option.value}>
          {option.label}
        </SelectItem>
      ))}
    </Select>
  );
}
