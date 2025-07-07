import { useEffect, useRef, useState, useCallback } from "react";
import { RiSidebarFoldLine, RiSidebarUnfoldLine, RiHistoryLine, RiTerminalLine, RiLogoutBoxLine, RiCalendarLine, RiSettingsLine, RiTranslate, RiMenuLine, RiCloseLine } from "react-icons/ri";
import { 
  Select, 
  SelectItem, 
  Button, 
  Textarea, 
  Chip,
  Tabs,
  Tab,
  useDisclosure
} from "@heroui/react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { useLoggerStore } from "../../lib/store-logger";
import { useConversationStore } from "../../lib/store-conversation";
import { useCalendarStore } from "../../lib/store-calendar";
import { useUserSession } from "../../hooks/use-user-session";
import Logger, { LoggerFilterType } from "../logger/Logger";
import ConversationListWithAppFilter from "./ConversationListWithAppFilter";
import CleanConversationMessages from "./CleanConversationMessages";
import Calendar from "./Calendar";
import { UserSettingsDialogFull } from "../settings-dialog/UserSettingsDialogFull";
import { pluginRegistry } from "../../lib/plugin-registry";
import { languageLearningPlugin } from "../../plugins/language-learning";
import { PluginDefinition } from "../../types";

const filterOptions = [
  { value: "conversations", label: "Conversations" },
  { value: "tools", label: "Tool Use" },
  { value: "none", label: "All" },
];

export default function SidePanel() {
  const { connected, client } = useLiveAPIContext();
  const [open, setOpen] = useState(true);
  const [isMobileOverlay, setIsMobileOverlay] = useState(false);
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const loggerRef = useRef<HTMLDivElement>(null);
  const loggerLastHeightRef = useRef<number>(-1);
  const { log, logs } = useLoggerStore();
  const { currentUser, isLoggedIn, logout } = useUserSession();
  
  const {
    initializeStore,
    clearStore,
    error: conversationError,
    createNewConversation,
    addMessageToCurrentConversation,
    currentConversation
  } = useConversationStore();
  
  const {
    initializeStore: initializeCalendarStore,
    clearStore: clearCalendarStore,
    error: calendarError
  } = useCalendarStore();

  const [textInput, setTextInput] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("none");
  const [activeTab, setActiveTab] = useState<string>("conversations");
  const { isOpen: isSettingsOpen, onOpen: onSettingsOpen, onClose: onSettingsClose } = useDisclosure();
  const [plugins, setPlugins] = useState<PluginDefinition[]>([]);
  const [pluginsInitialized, setPluginsInitialized] = useState(false);

  // Responsive breakpoint detection
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const previousScreenSize = screenSize;
      
      if (width < 768) {
        setScreenSize('mobile');
        setIsMobileOverlay(false);
        // Only set to closed if transitioning TO mobile for the first time
        if (previousScreenSize !== 'mobile') {
          setOpen(false);
        }
      } else if (width < 1024) {
        setScreenSize('tablet');
        setIsMobileOverlay(false);
        // Only set to open if transitioning FROM mobile
        if (previousScreenSize === 'mobile') {
          setOpen(true);
        }
      } else {
        setScreenSize('desktop');
        setIsMobileOverlay(false);
        // Only set to open if transitioning FROM mobile
        if (previousScreenSize === 'mobile') {
          setOpen(true);
        }
      }
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [screenSize]);

  // Ensure activeTab is valid in production environment
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' && activeTab === 'logs') {
      setActiveTab('conversations');
    }
  }, [activeTab]);
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
  const getMaxWidth = useCallback(() => Math.floor(window.innerWidth * 0.8), []); // Maximum width (80% of viewport)

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent) => {
    if (screenSize === 'mobile') return;
    e.preventDefault();
    setIsResizing(true);
    setDragStartX(e.clientX);
    setDragStartWidth(sidebarWidth);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  // Handle resize drag
  const handleResizeDrag = useCallback((e: MouseEvent) => {
    if (!isResizing || screenSize === 'mobile') return;
    
    const deltaX = e.clientX - dragStartX;
    const newWidth = Math.min(Math.max(dragStartWidth + deltaX, MIN_WIDTH), getMaxWidth());
    setSidebarWidth(newWidth);
  }, [isResizing, dragStartX, dragStartWidth, getMaxWidth, screenSize]);

  // Save sidebar width to localStorage and emit events
  useEffect(() => {
    localStorage.setItem('sidebar-width', sidebarWidth.toString());
    
    // Emit custom event for width changes
    window.dispatchEvent(new CustomEvent('sidebar-width-change', {
      detail: { width: sidebarWidth, isOpen: open }
    }));
  }, [sidebarWidth, open]);

  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

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
  }, [isResizing, handleResizeDrag, handleResizeEnd]);

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
  }, [sidebarWidth, getMaxWidth]);

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

  // Initialize conversation and calendar stores when user logs in
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      // We need the password to initialize the stores
      const sessionPassword = localStorage.getItem('genkit_session_password');
      if (sessionPassword) {
        try {
          const sessionData = JSON.parse(sessionPassword);
          initializeStore(currentUser.id, sessionData.password);
          initializeCalendarStore(currentUser.id, sessionData.password);
        } catch (error) {
          console.error('Failed to initialize stores:', error);
        }
      }
    } else if (!isLoggedIn) {
      clearStore();
      clearCalendarStore();
    }
  }, [isLoggedIn, currentUser, initializeStore, clearStore, initializeCalendarStore, clearCalendarStore]);

  // Initialize plugins when user logs in
  useEffect(() => {
    if (isLoggedIn && currentUser && !pluginsInitialized) {
      const initPlugins = async () => {
        try {
          // Register the Language Learning plugin
          pluginRegistry.register(languageLearningPlugin);
          
          // Initialize plugin with context
          const sessionPassword = localStorage.getItem('genkit_session_password');
          if (sessionPassword) {
            const sessionData = JSON.parse(sessionPassword);
            
            await pluginRegistry.initializePlugin(
              'language-learning',
              currentUser.id,
              sessionData.password,
              addMessageToCurrentConversation,
              createNewConversation,
              currentConversation
            );
            
            setPlugins(pluginRegistry.getAllPlugins());
            setPluginsInitialized(true);
          }
        } catch (error) {
          console.error('Failed to initialize plugins:', error);
        }
      };
      
      initPlugins();
    } else if (!isLoggedIn) {
      setPlugins([]);
      setPluginsInitialized(false);
    }
  }, [isLoggedIn, currentUser, pluginsInitialized, addMessageToCurrentConversation, createNewConversation, currentConversation]);

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

  // Handle mobile overlay toggle
  const handleToggle = () => {
    if (screenSize === 'mobile') {
      setIsMobileOverlay(!isMobileOverlay);
    } else {
      const newOpenState = !open;
      setOpen(newOpenState);
      
      // Emit custom event for sidebar toggle
      window.dispatchEvent(new CustomEvent('sidebar-toggle', {
        detail: { isOpen: newOpenState }
      }));
    }
  };

  return (
    <>
      {/* Mobile Overlay Background */}
      {screenSize === 'mobile' && isMobileOverlay && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOverlay(false)}
        />
      )}
      
      {/* Mobile Menu Button - Only visible when sidebar is closed on mobile */}
      {screenSize === 'mobile' && !isMobileOverlay && (
        <Button
          isIconOnly
          variant="shadow"
          color="primary"
          className="fixed top-4 left-4 z-50"
          onPress={() => setIsMobileOverlay(true)}
          size="sm"
        >
          <RiMenuLine size={18} />
        </Button>
      )}
      
      <div 
        className={`
          h-screen border-r-1 border-divider bg-background flex flex-col relative
          ${screenSize === 'mobile' 
            ? isMobileOverlay 
              ? 'fixed left-0 top-0 z-50 w-full shadow-2xl transform translate-x-0 transition-transform duration-300 ease-in-out'
              : 'fixed left-0 top-0 z-50 w-full shadow-2xl transform -translate-x-full transition-transform duration-300 ease-in-out'
            : open 
              ? "" 
              : "w-16"
          }
        `}
        style={{
          width: screenSize === 'mobile' 
            ? '100%' 
            : open 
              ? `${sidebarWidth}px` 
              : '4rem',
          transition: screenSize === 'mobile' 
            ? 'transform 0.3s ease-in-out' 
            : open 
              ? 'none' 
              : 'width 0.3s ease'
        }}
      >
      {/* Header - Fixed height */}
      <div className="flex justify-between items-center px-4 py-3 border-b-1 border-divider bg-content1 flex-shrink-0">
        {(open || (screenSize === 'mobile' && isMobileOverlay)) && (
          <div className="flex items-center gap-3">
            <img 
              src="/logo.svg" 
              alt="myGenKit Logo" 
              className="w-8 h-8 shrink-0"
              onError={(e) => {
                // Fallback to PNG if SVG fails to load
                e.currentTarget.src = "/logo.png";
              }}
            />
            <h2 className={`font-semibold text-foreground truncate ${
              screenSize === 'mobile' ? 'text-base' : 'text-lg'
            }`}>myGenKit</h2>
          </div>
        )}
        <div className="flex items-center gap-2">
          {(open || (screenSize === 'mobile' && isMobileOverlay)) && (
            <>
              <Button
                isIconOnly
                variant="light"
                onPress={onSettingsOpen}
                size="sm"
                className={`text-default-500 ${screenSize === 'mobile' ? 'min-w-0' : 'w-[80px]'}`}
                aria-label="Settings"
              >
                <RiSettingsLine size={18} />
                {screenSize !== 'mobile' && <span>Settings</span>}
              </Button>
              <Button
                isIconOnly
                variant="light"
                onPress={() => logout()}
                size="sm"
                className={`text-danger ${screenSize === 'mobile' ? 'min-w-0' : 'w-[80px]'}`}
                aria-label="Logout"
              >
                <RiLogoutBoxLine size={18} />
                {screenSize !== 'mobile' && <span>Logout</span>}
              </Button>
            </>
          )}
          <Button
            isIconOnly
            variant="light"
            onPress={handleToggle}
            size="sm"
            aria-label={
              screenSize === 'mobile' 
                ? isMobileOverlay ? "Close sidebar" : "Open sidebar"
                : open ? "Collapse sidebar" : "Expand sidebar"
            }
          >
            {screenSize === 'mobile' ? (
              isMobileOverlay ? <RiCloseLine size={18} /> : <RiMenuLine size={18} />
            ) : (
              open ? <RiSidebarFoldLine size={18} /> : <RiSidebarUnfoldLine size={18} />
            )}
          </Button>
        </div>
      </div>

      {(open || (screenSize === 'mobile' && isMobileOverlay)) && (
        <>
          {/* Tab Controls - Fixed height */}
          <div className={`border-b-1 border-divider bg-content1 flex-shrink-0 ${
            screenSize === 'mobile' ? 'px-3 py-2' : 'px-4 py-3'
          }`}>
            {(conversationError || calendarError) && (
              <div className="flex gap-2 items-center mb-3">
                {conversationError && (
                  <Chip
                    color="danger"
                    variant="flat"
                    size="sm"
                  >
                    Conv Error
                  </Chip>
                )}
                
                {calendarError && (
                  <Chip
                    color="danger"
                    variant="flat"
                    size="sm"
                  >
                    Cal Error
                  </Chip>
                )}
              </div>
            )}
            
            <Tabs
              selectedKey={activeTab}
              onSelectionChange={(key) => setActiveTab(key as string)}
              size={screenSize === 'mobile' ? 'sm' : 'sm'}
              variant="underlined"
              className="w-full"
              classNames={{
                tabList: screenSize === 'mobile' ? "gap-4" : "gap-6",
                tab: screenSize === 'mobile' ? "h-8" : "h-10",
              }}
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
                key="calendar"
                title={
                  <div className="flex items-center gap-2">
                    <RiCalendarLine size={16} />
                    <span>Calendar</span>
                  </div>
                }
              />
              {/* Plugin Tabs */}
              {plugins.map((plugin) => (
                <Tab
                  key={plugin.id}
                  title={
                    <div className="flex items-center gap-2">
                      <RiTranslate size={16} />
                      <span>{plugin.name}</span>
                    </div>
                  }
                />
              ))}
              {process.env.NODE_ENV === 'development' && (
                <Tab
                  key="logs"
                  title={
                    <div className="flex items-center gap-2">
                      <RiTerminalLine size={16} />
                      <span>Debug</span>
                    </div>
                  }
                />
              )}
            </Tabs>
          </div>

          {/* Content - Expandable section */}
          <div 
            ref={loggerRef}
            className="flex-1 overflow-y-auto min-h-0"
          >
            {activeTab === "conversations" ? (
              <div className="flex h-full">
                {/* Conversation List - Responsive width */}
                <div className={`border-r-1 border-divider bg-content1 overflow-y-auto ${
                  screenSize === 'mobile' ? 'w-2/5' : 'w-1/3'
                }`}>
                  <div className={screenSize === 'mobile' ? 'p-2' : 'p-4'}>
                    <ConversationListWithAppFilter />
                  </div>
                </div>
                
                {/* Conversation Messages - Expandable */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Message Content */}
                  <div className="flex-1 overflow-y-auto">
                    <CleanConversationMessages />
                  </div>
                </div>
              </div>
            ) : activeTab === "calendar" ? (
              <div className={screenSize === 'mobile' ? 'p-2' : 'p-4'}>
                <Calendar />
              </div>
            ) : plugins.find(p => p.id === activeTab) ? (
              <div className="flex h-full">
                {/* Plugin Conversation List - Responsive width */}
                <div className={`border-r-1 border-divider bg-content1 overflow-y-auto ${
                  screenSize === 'mobile' ? 'w-2/5' : 'w-1/3'
                }`}>
                  <div className={screenSize === 'mobile' ? 'p-2' : 'p-4'}>
                    <ConversationListWithAppFilter 
                      currentAppId={activeTab}
                      onCreateAppConversation={(appId) => {
                        const plugin = plugins.find(p => p.id === appId);
                        if (plugin && plugin.systemPrompt) {
                          createNewConversation(plugin.systemPrompt, appId);
                        } else {
                          createNewConversation(undefined, appId);
                        }
                      }}
                    />
                  </div>
                </div>
                
                {/* Plugin Component - Expandable */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {(() => {
                    const plugin = plugins.find(p => p.id === activeTab);
                    if (plugin) {
                      const PluginComponent = plugin.tabComponent;
                      return (
                        <PluginComponent 
                          isActive={true}
                          context={pluginRegistry.getPluginContext(plugin.id)}
                        />
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            ) : (
              <div className={screenSize === 'mobile' ? 'px-2 py-1' : 'px-4 py-2'}>
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
          <div className={`border-t-1 border-divider bg-content1 flex-shrink-0 ${
            screenSize === 'mobile' ? 'px-3 py-2' : 'px-4 py-3'
          }`}>
            <div className={`flex items-end ${screenSize === 'mobile' ? 'gap-1' : 'gap-2'}`}>
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
                maxRows={screenSize === 'mobile' ? 2 : 3}
                isDisabled={!connected}
                variant="bordered"
                className="flex-1"
                size={screenSize === 'mobile' ? 'sm' : 'md'}
              />
              <Button
                isIconOnly
                color="primary"
                onPress={handleSubmit}
                isDisabled={!connected || !textInput.trim()}
                size={screenSize === 'mobile' ? 'sm' : 'md'}
              >
                <span className="material-symbols-outlined">send</span>
              </Button>
            </div>
          </div>
        </>
      )}
      
      {/* Resize Handle - Only show on desktop/tablet */}
      {open && screenSize !== 'mobile' && (
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
      
      {/* Settings Dialog */}
      <UserSettingsDialogFull
        isOpen={isSettingsOpen}
        onClose={onSettingsClose}
        forceApiKey={false}
      />
        </>
  );
}
