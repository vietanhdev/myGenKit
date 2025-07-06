import {
  Content,
  GoogleGenAI,
  LiveCallbacks,
  LiveClientToolResponse,
  LiveConnectConfig,
  LiveServerContent,
  LiveServerMessage,
  LiveServerToolCall,
  LiveServerToolCallCancellation,
  Part,
  Session,
} from "@google/genai";

import { EventEmitter } from "eventemitter3";
import { difference } from "lodash";
import { LiveClientOptions, StreamingLog } from "../types";
import { base64ToArrayBuffer } from "./utils";

/**
 * Event types that can be emitted by the MultimodalLiveClient.
 * Each event corresponds to a specific message from GenAI or client state change.
 */
export interface LiveClientEventTypes {
  // Emitted when audio data is received
  audio: (data: ArrayBuffer) => void;
  // Emitted when the connection closes
  close: (event: CloseEvent) => void;
  // Emitted when content is received from the server
  content: (data: LiveServerContent) => void;
  // Emitted when an error occurs
  error: (error: ErrorEvent) => void;
  // Emitted when the server interrupts the current generation
  interrupted: () => void;
  // Emitted for logging events
  log: (log: StreamingLog) => void;
  // Emitted when the connection opens
  open: () => void;
  // Emitted when the initial setup is complete
  setupcomplete: () => void;
  // Emitted when a tool call is received
  toolcall: (toolCall: LiveServerToolCall) => void;
  // Emitted when a tool call is cancelled
  toolcallcancellation: (
    toolcallCancellation: LiveServerToolCallCancellation
  ) => void;
  // Emitted when the current turn is complete
  turncomplete: () => void;
  // New events for clean conversation messages
  conversationUserMessage: (message: StreamingLog) => void;
  conversationModelMessage: (message: StreamingLog) => void;
}

/**
 * A event-emitting class that manages the connection to the websocket and emits
 * events to the rest of the application.
 * If you dont want to use react you can still use this.
 */
export class GenAILiveClient extends EventEmitter<LiveClientEventTypes> {
  protected client: GoogleGenAI;

  private _status: "connected" | "disconnected" | "connecting" = "disconnected";
  public get status() {
    return this._status;
  }

  private _session: Session | null = null;
  public get session() {
    return this._session;
  }

  private _model: string | null = null;
  public get model() {
    return this._model;
  }

  protected config: LiveConnectConfig | null = null;

  // Message buffering for joining transcription events
  private currentUserMessage: string = "";
  private currentModelMessage: string = "";
  private userMessageStartTime: Date | null = null;
  private modelMessageStartTime: Date | null = null;

  public getConfig() {
    return { ...this.config };
  }

  constructor(options: LiveClientOptions) {
    super();
    
    // Validate API key format
    if (!options.apiKey) {
      throw new Error("API key is required");
    }
    
    if (!options.apiKey.startsWith("AIza") || options.apiKey.length < 30) {
      console.warn("⚠️  API key format seems incorrect. Google AI API keys should start with 'AIza' and be longer than 30 characters.");
      console.warn("   Get your API key from: https://ai.google.dev/");
    }
    
    this.client = new GoogleGenAI(options);
    this.send = this.send.bind(this);
    this.onopen = this.onopen.bind(this);
    this.onerror = this.onerror.bind(this);
    this.onclose = this.onclose.bind(this);
    this.onmessage = this.onmessage.bind(this);
  }

  protected log(type: string, message: StreamingLog["message"]) {
    const log: StreamingLog = {
      date: new Date(),
      type,
      message,
    };
    this.emit("log", log);
  }

  /**
   * Extract text content from message parts
   */
  private extractTextFromParts(parts: Part[]): string {
    return parts
      .filter(part => part.text && part.text.trim().length > 0)
      .map(part => part.text?.trim())
      .join(' ')
      .trim();
  }

  /**
   * Flush buffered messages when turn is complete
   */
  private flushBufferedMessages() {
    // Flush user message if we have buffered content
    if (this.currentUserMessage.trim() && this.userMessageStartTime) {
      const userMessage: StreamingLog = {
        date: this.userMessageStartTime,
        type: "conversation.user",
        message: {
          turns: [{ text: this.currentUserMessage.trim() }],
          turnComplete: true
        }
      };
      this.emit("conversationUserMessage", userMessage);
      
      // Reset user message buffer
      this.currentUserMessage = "";
      this.userMessageStartTime = null;
    }
    
    // Flush model message if we have buffered content
    if (this.currentModelMessage.trim() && this.modelMessageStartTime) {
      const modelMessage: StreamingLog = {
        date: this.modelMessageStartTime,
        type: "conversation.model",
        message: {
          serverContent: {
            modelTurn: {
              parts: [{ text: this.currentModelMessage.trim() }]
            }
          }
        }
      };
      this.emit("conversationModelMessage", modelMessage);
      
      // Reset model message buffer
      this.currentModelMessage = "";
      this.modelMessageStartTime = null;
    }
  }

  /**
   * Emit clean conversation message for user input (deprecated - now handled by transcription)
   */
  private emitUserMessage(parts: Part[], turnComplete: boolean) {
    // This method is now deprecated as user messages are handled by input transcription
    // which provides more accurate text from speech-to-text processing
  }

  /**
   * Emit clean conversation message for model response
   */
  private emitModelMessage(parts: Part[]) {
    const textContent = this.extractTextFromParts(parts);
    if (textContent) {
      const conversationMessage: StreamingLog = {
        date: new Date(),
        type: "conversation.model",
        message: {
          serverContent: {
            modelTurn: {
              parts: parts.filter(part => part.text && part.text.trim().length > 0)
            }
          }
        }
      };
      this.emit("conversationModelMessage", conversationMessage);
    }
  }

  async connect(model: string, config: LiveConnectConfig): Promise<boolean> {
    if (this._status === "connected" || this._status === "connecting") {
      console.warn("Already connected or connecting, status:", this._status);
      return false;
    }



    this._status = "connecting";
    this.config = config;
    this._model = model;

    const callbacks: LiveCallbacks = {
      onopen: this.onopen.bind(this),
      onmessage: this.onmessage.bind(this),
      onerror: this.onerror.bind(this),
      onclose: this.onclose.bind(this),
    };

    try {
      this._session = await this.client.live.connect({
        model,
        config,
        callbacks,
      });
      // Note: status will be set to "connected" in onopen callback
      return true;
    } catch (e) {
      console.error("Error connecting to GenAI Live:", e);
      
      // Create detailed error information
      let errorMessage = "Failed to connect to Google AI Live API";
      let errorDetails: any = {};
      
      if (e instanceof Error) {
        errorMessage = e.message;
        errorDetails = {
          message: e.message,
          stack: e.stack,
          name: e.name
        };
        
        // Enhanced error analysis
        if (e.message.includes('401') || e.message.includes('unauthorized')) {
          errorMessage = "API key is invalid or unauthorized";
        } else if (e.message.includes('403') || e.message.includes('forbidden')) {
          errorMessage = "API key does not have access to Gemini Live API";
        } else if (e.message.includes('429') || e.message.includes('quota')) {
          errorMessage = "API quota exceeded or rate limit reached";
        } else if (e.message.includes('network') || e.message.includes('fetch')) {
          errorMessage = "Network connectivity issue - check your internet connection";
        }
        
        console.error("Error details:", errorDetails);
      }
      
      // Emit a more detailed error event
      this.emit("error", new ErrorEvent("connection", {
        message: errorMessage,
        error: e,
        filename: "genai-live-client.ts",
        lineno: 0,
        colno: 0
      }));
      
      this._status = "disconnected";
      return false;
    }
  }

  public disconnect() {
    if (!this.session) {
      return false;
    }
    
    // Flush any buffered messages before disconnecting
    this.flushBufferedMessages();
    
    this.session?.close();
    this._session = null;
    this._status = "disconnected";

    this.log("client.close", `Disconnected`);
    return true;
  }

  protected onopen() {
    this._status = "connected";
    this.log("client.open", "Connected");
    this.emit("open");
  }

  protected onerror(e: ErrorEvent) {
    console.error("WebSocket error occurred:", e);
    console.error("Error message:", e.message);
    console.error("Error type:", e.type);
    this._status = "disconnected";
    this.log("server.error", e.message);
    this.emit("error", e);
  }

  protected onclose(e: CloseEvent) {
    console.warn("WebSocket connection closed:", {
      code: e.code,
      reason: e.reason,
      wasClean: e.wasClean,
      type: e.type
    });
    
    // Common close codes and their meanings
    const closeCodes: { [key: number]: string } = {
      1000: "Normal closure",
      1001: "Going away",
      1002: "Protocol error", 
      1003: "Unsupported data",
      1004: "Reserved",
      1005: "No status received",
      1006: "Abnormal closure",
      1007: "Invalid frame payload data",
      1008: "Policy violation",
      1009: "Message too big",
      1010: "Mandatory extension",
      1011: "Internal server error",
      1012: "Service restart",
      1013: "Try again later",
      1014: "Bad gateway",
      1015: "TLS handshake"
    };
    
    console.warn("Close code meaning:", closeCodes[e.code] || "Unknown");
    
    this._status = "disconnected";
    this.log(
      `server.close`,
      `disconnected ${e.reason ? `with reason: ${e.reason}` : ``} (code: ${e.code})`
    );
    this.emit("close", e);
  }

  protected async onmessage(message: LiveServerMessage) {
    if (message.setupComplete) {
      this.log("server.send", "setupComplete");
      this.emit("setupcomplete");
      return;
    }
    if (message.toolCall) {
      this.log("server.toolCall", message);
      this.emit("toolcall", message.toolCall);
      return;
    }
    if (message.toolCallCancellation) {
      this.log("server.toolCallCancellation", message);
      this.emit("toolcallcancellation", message.toolCallCancellation);
      return;
    }

    // this json also might be `contentUpdate { interrupted: true }`
    // or contentUpdate { end_of_turn: true }
    if (message.serverContent) {
      const { serverContent } = message;
      if ("interrupted" in serverContent) {
        this.log("server.content", "interrupted");
        this.emit("interrupted");
        
        // Flush any buffered messages when interrupted
        this.flushBufferedMessages();
        return;
      }
      if ("turnComplete" in serverContent) {
        this.log("server.content", "turnComplete");
        this.emit("turncomplete");
        
        // Flush buffered messages on turn complete
        this.flushBufferedMessages();
      }

      // Handle input transcription (user speech-to-text) - buffer until turn complete
      if ("inputTranscription" in serverContent && serverContent.inputTranscription?.text) {
        const transcriptionText = serverContent.inputTranscription.text;
        
        // Initialize start time if this is the first chunk
        if (!this.userMessageStartTime) {
          this.userMessageStartTime = new Date();
          this.currentUserMessage = "";
        }
        
        // Add to current message buffer (transcription already includes proper spacing)
        this.currentUserMessage += transcriptionText;
        this.log("server.inputTranscription", transcriptionText);
      }

      // Handle output transcription (model text-to-speech) - buffer until turn complete
      if ("outputTranscription" in serverContent && serverContent.outputTranscription?.text) {
        const transcriptionText = serverContent.outputTranscription.text;
        
        // Initialize start time if this is the first chunk
        if (!this.modelMessageStartTime) {
          this.modelMessageStartTime = new Date();
          this.currentModelMessage = "";
        }
        
        // Add to current message buffer (transcription already includes proper spacing)
        this.currentModelMessage += transcriptionText;
        this.log("server.outputTranscription", transcriptionText);
      }

      if ("modelTurn" in serverContent) {
        let parts: Part[] = serverContent.modelTurn?.parts || [];

        // when its audio that is returned for modelTurn
        const audioParts = parts.filter(
          (p) => p.inlineData && p.inlineData.mimeType?.startsWith("audio/pcm")
        );
        const base64s = audioParts.map((p) => p.inlineData?.data);

        // strip the audio parts out of the modelTurn
        const otherParts = difference(parts, audioParts);
        // console.log("otherParts", otherParts);

        base64s.forEach((b64) => {
          if (b64) {
            const data = base64ToArrayBuffer(b64);
            this.emit("audio", data);
            this.log(`server.audio`, `buffer (${data.byteLength})`);
          }
        });
        if (!otherParts.length) {
          return;
        }

        parts = otherParts;

        const content: { modelTurn: Content } = { modelTurn: { parts } };
        this.emit("content", content);
        this.log(`server.content`, message);
        
        // Emit clean conversation message for model response (text parts only)
        this.emitModelMessage(parts);
      }
    } else {
      // Unmatched message - log it via the logging system instead
      this.log("server.unmatched", message);
    }
  }

  /**
   * send realtimeInput, this is base64 chunks of "audio/pcm" and/or "image/jpg"
   */
  sendRealtimeInput(chunks: Array<{ mimeType: string; data: string }>) {
    // Check if we have an active connection before sending
    if (!this.session || this.status !== "connected") {
      this.log(`client.realtimeInput`, `Cannot send - connection status: ${this.status}`);
      return;
    }

    let hasAudio = false;
    let hasVideo = false;
    for (const ch of chunks) {
      try {
        this.session.sendRealtimeInput({ media: ch });
        if (ch.mimeType.includes("audio")) {
          hasAudio = true;
        }
        if (ch.mimeType.includes("image")) {
          hasVideo = true;
        }
        if (hasAudio && hasVideo) {
          break;
        }
      } catch (error) {
        this.log(`client.realtimeInput`, `Error sending chunk: ${error}`);
        // If sending fails, the connection might have been lost
        this._status = "disconnected";
        break;
      }
    }
    const message =
      hasAudio && hasVideo
        ? "audio + video"
        : hasAudio
        ? "audio"
        : hasVideo
        ? "video"
        : "unknown";
    this.log(`client.realtimeInput`, message);
  }

  /**
   *  send a response to a function call and provide the id of the functions you are responding to
   */
  sendToolResponse(toolResponse: LiveClientToolResponse) {
    if (!this.session || this.status !== "connected") {
      this.log(`client.toolResponse`, `Cannot send - connection status: ${this.status}`);
      return;
    }

    if (
      toolResponse.functionResponses &&
      toolResponse.functionResponses.length
    ) {
      try {
        this.session.sendToolResponse({
          functionResponses: toolResponse.functionResponses,
        });
        this.log(`client.toolResponse`, toolResponse);
      } catch (error) {
        this.log(`client.toolResponse`, `Error sending tool response: ${error}`);
        this._status = "disconnected";
      }
    }
  }

  /**
   * send normal content parts such as { text }
   */
  send(parts: Part | Part[], turnComplete: boolean = true) {
    if (!this.session || this.status !== "connected") {
      this.log(`client.send`, `Cannot send - connection status: ${this.status}`);
      return;
    }

    const partsArray = Array.isArray(parts) ? parts : [parts];
    try {
      this.session.sendClientContent({ turns: partsArray, turnComplete });
      this.log(`client.send`, {
        turns: partsArray,
        turnComplete,
      });
    } catch (error) {
      this.log(`client.send`, `Error sending content: ${error}`);
      this._status = "disconnected";
    }
    
    // Note: User message emission is now handled by inputTranscription
    // to ensure we capture the actual transcribed text from speech
  }
}
