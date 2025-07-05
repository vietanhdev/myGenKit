import { useCallback, useState } from "react";
import { Select, SelectItem } from "@heroui/react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { Modality } from "@google/genai";

const responseOptions = [
  { value: "audio", label: "Audio" },
  { value: "text", label: "Text" },
];

export default function ResponseModalitySelector() {
  const { config, setConfig } = useLiveAPIContext();

  const [selectedValue, setSelectedValue] = useState<string>("audio");

  const updateConfig = useCallback(
    (modality: "audio" | "text") => {
      setConfig({
        ...config,
        responseModalities: [
          modality === "audio" ? Modality.AUDIO : Modality.TEXT,
        ],
      });
    },
    [config, setConfig]
  );

  return (
    <Select
      label="Response"
      placeholder="Select response"
      selectedKeys={[selectedValue]}
      onSelectionChange={(keys) => {
        const selected = Array.from(keys)[0] as string;
        setSelectedValue(selected);
        if (selected === "audio" || selected === "text") {
          updateConfig(selected);
        }
      }}
      variant="bordered"
      size="sm"
      className="w-36"
    >
      {responseOptions.map((option) => (
        <SelectItem key={option.value}>
          {option.label}
        </SelectItem>
      ))}
    </Select>
  );
}
