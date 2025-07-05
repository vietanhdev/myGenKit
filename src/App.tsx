import { useRef, useState } from "react";
import "./App.scss";
import { UserAPIProvider } from "./components/providers/user-api-provider";
import SidePanel from "./components/side-panel/SidePanel";
import { Altair } from "./components/altair/Altair";
import ControlTray from "./components/control-tray/ControlTray";
import BackgroundVisual3D from "./components/3d-visual/BackgroundVisual3D";
import { useVisualizationSettings } from "./hooks/use-visualization-settings";
import cn from "classnames";
import { HeroUIProviderWrapper } from "./components/providers/hero-ui-provider";

function App() {
  // this video reference is used for displaying the active stream, whether that is the webcam or screen capture
  // feel free to style as you see fit
  const videoRef = useRef<HTMLVideoElement>(null);
  // either the screen capture, the video or null, if null we hide it
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  
  // Visualization settings
  const { config: visualizationConfig, isLoaded } = useVisualizationSettings();

  return (
    <HeroUIProviderWrapper>
      <div className="App">
        <UserAPIProvider>
          {/* Background Audio Visualization */}
          {isLoaded && <BackgroundVisual3D config={visualizationConfig} />}
          
          <div className="app-container">
            <div className="bg-background">
              <SidePanel />
            </div>
            <main>
              <div className="main-app-area">
                {/* APP goes here */}
                <Altair />
                <video
                  className={cn("stream", {
                    hidden: !videoRef.current || !videoStream,
                  })}
                  ref={videoRef}
                  autoPlay
                  playsInline
                />
              </div>

              <ControlTray
                videoRef={videoRef}
                supportsVideo={true}
                onVideoStreamChange={setVideoStream}
                enableEditingSettings={true}
              >
                {/* put your own buttons here */}
              </ControlTray>
            </main>
          </div>
        </UserAPIProvider>
      </div>
    </HeroUIProviderWrapper>
  );
}

export default App;
