import { useEffect, useRef, useState } from "react";
import { RiSidebarFoldLine, RiSidebarUnfoldLine, RiHistoryLine, RiTerminalLine, RiChatSmile3Line, RiCodeLine } from "react-icons/ri";
import { 
  Select, 
  SelectItem, 
  Button, 
  Textarea, 
  Chip,
  Tabs,
  Tab
} from "@heroui/react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { useLoggerStore } from "../../lib/store-logger";
import { useConversationStore } from "../../lib/store-conversation";
import { useUserSession } from "../../hooks/use-user-session";
import Logger, { LoggerFilterType } from "../logger/Logger";
import ConversationList from "./ConversationList";
import ConversationMessages from "./ConversationMessages";
import CleanConversationMessages from "./CleanConversationMessages";

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
  const { currentUser, isLoggedIn } = useUserSession();
  
  const {
    initializeStore,
    clearStore,
    error: conversationError
  } = useConversationStore();

  const [textInput, setTextInput] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("none");
  const [activeTab, setActiveTab] = useState<string>("conversations");
  const [showCleanMessages, setShowCleanMessages] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    // Load saved width from localStorage or default to 50% of viewport width
    const savedWidth = localStorage.getItem('sidebar-width');
    return savedWidth ? parseInt(savedWidth, 10) : Math.floor(window.innerWidth * 0.5);
  });
  const [isResizing, setIsResizing] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartWidth, setDragStartWidth] = useState(0);

  // Sidebar resize constraints
  const MIN_WIDTH = 240; // Minimum width in pixels
  const getMaxWidth = () => Math.floor(window.innerWidth * 0.8); // Maximum width (80% of viewport)

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setDragStartX(e.clientX);
    setDragStartWidth(sidebarWidth);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  // Handle resize drag
  const handleResizeDrag = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - dragStartX;
    const newWidth = Math.min(Math.max(dragStartWidth + deltaX, MIN_WIDTH), getMaxWidth());
    setSidebarWidth(newWidth);
  };

  // Save sidebar width to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-width', sidebarWidth.toString());
  }, [sidebarWidth]);

  // Handle resize end
  const handleResizeEnd = () => {
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  // Add global mouse event listeners for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeDrag);
      document.addEventListener('mouseup', handleResizeEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleResizeDrag);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, dragStartX, dragStartWidth, sidebarWidth, handleResizeDrag, handleResizeEnd]);

  // Handle window resize to adjust sidebar constraints
  useEffect(() => {
    const handleWindowResize = () => {
      const maxWidth = getMaxWidth();
      if (sidebarWidth > maxWidth) {
        setSidebarWidth(maxWidth);
      }
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [sidebarWidth]);

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

  // Initialize conversation store when user logs in
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      // We need the password to initialize the store
      const sessionPassword = localStorage.getItem('genkit_session_password');
      if (sessionPassword) {
        try {
          const sessionData = JSON.parse(sessionPassword);
          initializeStore(currentUser.id, sessionData.password);
        } catch (error) {
          console.error('Failed to initialize conversation store:', error);
        }
      }
    } else if (!isLoggedIn) {
      clearStore();
    }
  }, [isLoggedIn, currentUser, initializeStore, clearStore]);

  // listen for log events (technical logs only)
  useEffect(() => {
    const handleLog = (logEntry: any) => {
      log(logEntry);
    };
    
    client.on("log", handleLog);
    return () => {
      client.off("log", handleLog);
    };
  }, [client, log]);

  // Note: conversation message listeners are now handled in useLiveAPI hook

  const handleSubmit = () => {
    if (textInput.trim()) {
      client.send([{ text: textInput }]);
      setTextInput("");
    }
  };

  return (
    <div 
      className={`h-screen border-r-1 border-divider bg-background flex flex-col relative ${
        open ? "" : "w-16"
      }`}
      style={{
        width: open ? `${sidebarWidth}px` : '4rem',
        transition: open ? 'none' : 'width 0.3s ease'
      }}
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
          {/* Tab Controls - Fixed height */}
          <div className="px-4 py-3 border-b-1 border-divider bg-content1 flex-shrink-0">
            <div className="flex gap-2 items-center mb-3">
              <Chip
                color={connected ? "success" : "warning"}
                variant="flat"
                size="sm"
              >
                {connected ? "🔵 Live" : "⏸️ Paused"}
              </Chip>
              
              {conversationError && (
                <Chip
                  color="danger"
                  variant="flat"
                  size="sm"
                >
                  Error
                </Chip>
              )}
            </div>
            
            <Tabs
              selectedKey={activeTab}
              onSelectionChange={(key) => setActiveTab(key as string)}
              size="sm"
              variant="underlined"
              className="w-full"
            >
              <Tab
                key="conversations"
                title={
                  <div className="flex items-center gap-2">
                    <RiHistoryLine size={16} />
                    <span>Conversations</span>
                  </div>
                }
              />
              <Tab
                key="logs"
                title={
                  <div className="flex items-center gap-2">
                    <RiTerminalLine size={16} />
                    <span>Logs</span>
                  </div>
                }
              />
            </Tabs>
          </div>

          {/* Content - Expandable section */}
          <div 
            ref={loggerRef}
            className="flex-1 overflow-y-auto min-h-0"
          >
            {activeTab === "conversations" ? (
              <div className="flex h-full">
                {/* Conversation List - Fixed width */}
                <div className="w-1/3 border-r-1 border-divider bg-content1 overflow-y-auto">
                  <div className="p-4">
                    <ConversationList />
                  </div>
                </div>
                
                {/* Conversation Messages - Expandable */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Message View Toggle */}
                  <div className="px-4 py-2 border-b-1 border-divider bg-content1 flex-shrink-0">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={showCleanMessages ? "solid" : "light"}
                        color={showCleanMessages ? "primary" : "default"}
                        onPress={() => setShowCleanMessages(true)}
                        startContent={<RiChatSmile3Line size={14} />}
                      >
                        Chat
                      </Button>
                      <Button
                        size="sm"
                        variant={!showCleanMessages ? "solid" : "light"}
                        color={!showCleanMessages ? "primary" : "default"}
                        onPress={() => setShowCleanMessages(false)}
                        startContent={<RiCodeLine size={14} />}
                      >
                        Technical
                      </Button>
                    </div>
                  </div>
                  
                  {/* Message Content */}
                  <div className="flex-1 overflow-y-auto">
                    {showCleanMessages ? (
                      <CleanConversationMessages />
                    ) : (
                      <div className="p-4">
                        <ConversationMessages
                          filter={(selectedFilter as LoggerFilterType) || "conversations"}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-4 py-2">
                {/* Filter Controls for Logs */}
                <div className="mb-4">
                  <Select
                    placeholder="Filter logs..."
                    selectedKeys={[selectedFilter]}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;
                      setSelectedFilter(selected);
                    }}
                    size="sm"
                    variant="bordered"
                    className="max-w-xs"
                  >
                    {filterOptions.map((option) => (
                      <SelectItem key={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
                
                <Logger
                  filter={(selectedFilter as LoggerFilterType) || "none"}
                />
              </div>
            )}
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
      
      {/* Resize Handle */}
      {open && (
        <div
          className={`absolute top-0 right-0 w-2 h-full cursor-ew-resize bg-transparent hover:bg-primary-100 transition-colors duration-200 group ${
            isResizing ? 'bg-primary-200' : ''
          }`}
          onMouseDown={handleResizeStart}
          style={{
            zIndex: 10,
            transform: 'translateX(50%)',
            right: '-4px'
          }}
        >
          {/* Visual indicator */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-0.5 h-12 bg-default-400 rounded-full opacity-0 group-hover:opacity-60 transition-opacity duration-200" />
          
          {/* Resize grip dots */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-40 transition-opacity duration-200">
            <div className="w-0.5 h-0.5 bg-default-500 rounded-full"></div>
            <div className="w-0.5 h-0.5 bg-default-500 rounded-full"></div>
            <div className="w-0.5 h-0.5 bg-default-500 rounded-full"></div>
          </div>
        </div>
      )}
    </div>
  );
}
