import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GenAILiveClient } from "../lib/genai-live-client";
import { LiveClientOptions } from "../types";
import { AudioStreamer } from "../lib/audio-streamer";
import { audioContext } from "../lib/utils";
import VolMeterWorket from "../lib/worklets/vol-meter";
import { LiveConnectConfig } from "@google/genai";
import { useConversationStore } from "../lib/store-conversation";
import { useSecureSettings } from "./use-secure-settings";
import { pluginRegistry } from "../lib/plugin-registry";

export type UseLiveAPIResults = {
  client: GenAILiveClient;
  setConfig: (config: LiveConnectConfig) => void;
  config: LiveConnectConfig;
  model: string;
  setModel: (model: string) => void;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  volume: number;
  audioStreamer: AudioStreamer | null;
};

export function useLiveAPI(options: LiveClientOptions): UseLiveAPIResults {
  const client = useMemo(() => new GenAILiveClient(options), [options]);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const { addMessageToCurrentConversation, currentConversation } = useConversationStore();
  const secureSettings = useSecureSettings();

  const [model, setModel] = useState<string>("models/gemini-2.0-flash-exp");
  const [config, setConfig] = useState<LiveConnectConfig>({});
  const [connected, setConnected] = useState(false);
  const [volume, setVolume] = useState(0);
  
  // Get effective system prompt - conversation-specific or fallback to default
  const effectiveSystemPrompt = useMemo(() => {
    // First priority: conversation-specific system prompt
    if (currentConversation?.systemPrompt) {
      return currentConversation.systemPrompt;
    }
    
    // Second priority: default system prompt from settings
    if (secureSettings.currentSettings?.config?.systemInstruction) {
      const systemInstruction = secureSettings.currentSettings.config.systemInstruction;
      if (typeof systemInstruction === "string") {
        return systemInstruction;
      }
      if (Array.isArray(systemInstruction)) {
        return systemInstruction
          .map((p) => (typeof p === "string" ? p : p.text))
          .join("\n");
      }
      if (typeof systemInstruction === "object" && "parts" in systemInstruction) {
        return systemInstruction.parts?.map((p) => p.text).join("\n") || "";
      }
    }
    
    // Fallback to default
    return "You are a helpful assistant and answer in a friendly tone.";
  }, [currentConversation?.systemPrompt, secureSettings.currentSettings?.config?.systemInstruction]);

  // register audio for streaming server -> speakers
  useEffect(() => {
    if (!audioStreamerRef.current) {
      audioContext({ id: "audio-out" }).then((audioCtx: AudioContext) => {
        audioStreamerRef.current = new AudioStreamer(audioCtx);
        audioStreamerRef.current
          .addWorklet<any>("vumeter-out", VolMeterWorket, (ev: any) => {
            setVolume(ev.data.volume);
          })
          .then(() => {
            // Successfully added worklet
          });
      });
    }
  }, [audioStreamerRef]);

  useEffect(() => {
    const onOpen = () => {
      setConnected(true);
    };

    const onClose = () => {
      setConnected(false);
    };

    const onError = (error: ErrorEvent) => {
      console.error("error", error);
    };

    const stopAudioStreamer = () => audioStreamerRef.current?.stop();

    const onAudio = (data: ArrayBuffer) =>
      audioStreamerRef.current?.addPCM16(new Uint8Array(data));

    // Add conversation message handlers
    const onConversationUserMessage = (message: any) => {
      addMessageToCurrentConversation(message);
    };

    const onConversationModelMessage = (message: any) => {
      addMessageToCurrentConversation(message);
    };

    // Handle plugin tool calls
    const onToolCall = async (toolCall: any) => {
      if (!toolCall.functionCalls) {
        return;
      }

      // Process each function call
      const functionResponses: Array<{
        response: { output: any };
        id: string;
        name: string;
      }> = [];
      
      for (const fc of toolCall.functionCalls) {
        try {
          // Check if this is a plugin tool
          const result = await pluginRegistry.handleToolCall(fc.name, fc.args);
          
          functionResponses.push({
            response: { output: result },
            id: fc.id,
            name: fc.name,
          });
        } catch (error) {
          // If not a plugin tool or if there's an error, return error response
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Tool call error for ${fc.name}:`, error);
          functionResponses.push({
            response: { output: { success: false, error: errorMessage } },
            id: fc.id,
            name: fc.name,
          });
        }
      }

      // Send tool responses back
      if (functionResponses.length > 0) {
        setTimeout(() => {
          client.sendToolResponse({ functionResponses });
        }, 200);
      }
    };

    client
      .on("error", onError)
      .on("open", onOpen)
      .on("close", onClose)
      .on("interrupted", stopAudioStreamer)
      .on("audio", onAudio)
      .on("conversationUserMessage", onConversationUserMessage)
      .on("conversationModelMessage", onConversationModelMessage)
      .on("toolcall", onToolCall);

    return () => {
      client
        .off("error", onError)
        .off("open", onOpen)
        .off("close", onClose)
        .off("interrupted", stopAudioStreamer)
        .off("audio", onAudio)
        .off("conversationUserMessage", onConversationUserMessage)
        .off("conversationModelMessage", onConversationModelMessage)
        .off("toolcall", onToolCall)
        .disconnect();
    };
  }, [client, addMessageToCurrentConversation]);

  const connect = useCallback(async () => {
    if (!config) {
      throw new Error("config has not been set");
    }
    client.disconnect();
    
    // Get plugin tools and merge with existing tools
    const pluginTools = pluginRegistry.getPluginTools().map(tool => ({
      functionDeclarations: [tool.declaration]
    }));
    
    // Merge conversation-specific system prompt with config
    const effectiveConfig: LiveConnectConfig = {
      ...config,
      systemInstruction: effectiveSystemPrompt,
      tools: [
        ...(config.tools || []),
        ...pluginTools
      ]
    };
    
    await client.connect(model, effectiveConfig);
  }, [client, config, model, effectiveSystemPrompt]);

  const disconnect = useCallback(async () => {
    client.disconnect();
    setConnected(false);
  }, [setConnected, client]);

  return {
    client,
    config,
    setConfig,
    model,
    setModel,
    connected,
    connect,
    disconnect,
    volume,
    audioStreamer: audioStreamerRef.current,
  };
}
