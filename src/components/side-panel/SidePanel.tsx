import { useEffect, useRef, useState } from "react";
import { RiSidebarFoldLine, RiSidebarUnfoldLine } from "react-icons/ri";
import { 
  Select, 
  SelectItem, 
  Button, 
  Textarea, 
  Chip, 
} from "@heroui/react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { useLoggerStore } from "../../lib/store-logger";
import Logger, { LoggerFilterType } from "../logger/Logger";

const filterOptions = [
  { value: "conversations", label: "Conversations" },
  { value: "tools", label: "Tool Use" },
  { value: "none", label: "All" },
];

export default function SidePanel() {
  const { connected, client } = useLiveAPIContext();
  const [open, setOpen] = useState(true);
  const loggerRef = useRef<HTMLDivElement>(null);
  const loggerLastHeightRef = useRef<number>(-1);
  const { log, logs } = useLoggerStore();

  const [textInput, setTextInput] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("none");

  //scroll the log to the bottom when new logs come in
  useEffect(() => {
    if (loggerRef.current) {
      const el = loggerRef.current;
      const scrollHeight = el.scrollHeight;
      if (scrollHeight !== loggerLastHeightRef.current) {
        el.scrollTop = scrollHeight;
        loggerLastHeightRef.current = scrollHeight;
      }
    }
  }, [logs]);

  // listen for log events and store them
  useEffect(() => {
    client.on("log", log);
    return () => {
      client.off("log", log);
    };
  }, [client, log]);

  const handleSubmit = () => {
    if (textInput.trim()) {
      client.send([{ text: textInput }]);
      setTextInput("");
    }
  };

  return (
    <div 
      className={`h-screen transition-all duration-300 border-r-1 border-divider bg-background flex flex-col ${
        open ? "w-96" : "w-16"
      }`}
    >
      {/* Header - Fixed height */}
      <div className="flex justify-between items-center px-4 py-3 border-b-1 border-divider bg-content1 flex-shrink-0">
        {open && (
          <h2 className="text-lg font-semibold text-foreground">MyGenKit</h2>
        )}
        <Button
          isIconOnly
          variant="light"
          onPress={() => setOpen(!open)}
          size="sm"
          className="ml-auto"
        >
          {open ? (
            <RiSidebarFoldLine size={18} />
          ) : (
            <RiSidebarUnfoldLine size={18} />
          )}
        </Button>
      </div>

      {open && (
        <>
          {/* Controls - Fixed height */}
          <div className="px-4 py-3 border-b-1 border-divider bg-content1 flex-shrink-0">
            <div className="flex gap-2 items-center">
              <Select
                placeholder="Filter logs..."
                selectedKeys={[selectedFilter]}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string;
                  setSelectedFilter(selected);
                }}
                size="sm"
                variant="bordered"
                className="flex-1"
              >
                {filterOptions.map((option) => (
                  <SelectItem key={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
              
              <Chip
                color={connected ? "success" : "warning"}
                variant="flat"
                size="sm"
              >
                {connected ? "🔵 Live" : "⏸️ Paused"}
              </Chip>
            </div>
          </div>

          {/* Logger - Expandable section */}
          <div 
            ref={loggerRef}
            className="flex-1 overflow-y-auto px-4 py-2 min-h-0"
          >
            <Logger
              filter={(selectedFilter as LoggerFilterType) || "none"}
            />
          </div>

          {/* Input - Fixed height */}
          <div className="px-4 py-3 border-t-1 border-divider bg-content1 flex-shrink-0">
            <div className="flex gap-2 items-end">
              <Textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSubmit();
                  }
                }}
                placeholder="Send a message..."
                minRows={1}
                maxRows={3}
                isDisabled={!connected}
                variant="bordered"
                className="flex-1"
              />
              <Button
                isIconOnly
                color="primary"
                onPress={handleSubmit}
                isDisabled={!connected || !textInput.trim()}
                size="md"
              >
                <span className="material-symbols-outlined">send</span>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
