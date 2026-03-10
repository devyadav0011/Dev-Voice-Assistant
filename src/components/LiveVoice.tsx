import { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { floatTo16BitPCM, arrayBufferToBase64, base64ToArrayBuffer } from '../lib/audioUtils';
import { VoiceName } from '../App';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const controlPcFunctionDeclaration: FunctionDeclaration = {
  name: "controlPc",
  parameters: {
    type: Type.OBJECT,
    description: "Control the user's PC by opening websites, playing music, or changing the theme color.",
    properties: {
      action: {
        type: Type.STRING,
        description: "The action to perform. Can be 'open_youtube', 'play_music', or 'change_color'.",
      },
      color: {
        type: Type.STRING,
        description: "The color to change to, if action is 'change_color'. Can be 'green' or 'red'.",
      },
    },
    required: ["action"],
  },
};

interface LiveVoiceProps {
  selectedVoice: VoiceName;
  volume: number;
}

const AVATARS = [
  'https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?q=80&w=800&auto=format&fit=crop'
];

export default function LiveVoice({ selectedVoice, volume }: LiveVoiceProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarImage] = useState(() => AVATARS[Math.floor(Math.random() * AVATARS.length)]);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setValueAtTime(volume, audioContextRef.current.currentTime);
    }
  }, [volume]);

  const startSession = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = volume;
      gainNodeRef.current.connect(audioContextRef.current.destination);
      nextPlayTimeRef.current = audioContextRef.current.currentTime;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
          },
          systemInstruction: 'You are a friendly, human-like AI assistant who is an expert in software development and coding. You MUST speak in natural, conversational Hinglish (a mix of Hindi and English). Keep your answers concise, helpful, and sound like a real person chatting. You can help the user with programming, debugging, and general tech questions. You can also control the PC using the controlPc tool when the user asks to open youtube, play music, or change the color to red or green.',
          tools: [{ functionDeclarations: [controlPcFunctionDeclaration] }],
        },
        callbacks: {
          onopen: async () => {
            setIsConnecting(false);
            setIsRecording(true);
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = audioContextRef.current!.createMediaStreamSource(streamRef.current);
            processorRef.current = audioContextRef.current!.createScriptProcessor(4096, 1, 1);

            processorRef.current.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcm16 = floatTo16BitPCM(inputData);
              const base64 = arrayBufferToBase64(pcm16);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({
                  media: { data: base64, mimeType: 'audio/pcm;rate=16000' },
                });
              });
            };

            source.connect(processorRef.current);
            processorRef.current.connect(audioContextRef.current!.destination);
          },
          onmessage: (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
              playAudio(base64Audio);
            }
            if (message.serverContent?.interrupted) {
              nextPlayTimeRef.current = audioContextRef.current!.currentTime;
            }
            
            const toolCalls = message.toolCall?.functionCalls;
            if (toolCalls) {
              toolCalls.forEach(call => {
                if (call.name === 'controlPc') {
                  const args = call.args as any;
                  let result = "Action completed successfully.";
                  
                  if (args.action === 'open_youtube') {
                    window.open('https://www.youtube.com', '_blank');
                  } else if (args.action === 'play_music') {
                    window.open('https://music.youtube.com', '_blank');
                  } else if (args.action === 'change_color') {
                    if (args.color === 'red') {
                      document.documentElement.style.setProperty('--emerald-500', '#ef4444');
                      document.documentElement.style.setProperty('--emerald-400', '#f87171');
                      window.dispatchEvent(new CustomEvent('theme-change', { detail: 'red' }));
                    } else if (args.color === 'green') {
                      document.documentElement.style.removeProperty('--emerald-500');
                      document.documentElement.style.removeProperty('--emerald-400');
                      window.dispatchEvent(new CustomEvent('theme-change', { detail: 'green' }));
                    }
                  }
                  
                  sessionPromise.then(session => {
                    session.sendToolResponse({
                      functionResponses: [{
                        id: call.id,
                        name: call.name,
                        response: { result }
                      }]
                    });
                  });
                }
              });
            }
          },
          onclose: () => {
            stopSession();
          },
          onerror: (err) => {
            console.error('Live API Error:', err);
            setError(err instanceof Error ? err.message : 'The service is currently unavailable. Please try again later.');
            stopSession();
          }
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error('Failed to start session:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to the service. Please try again later.');
      setIsConnecting(false);
      stopSession();
    }
  };

  const playAudio = (base64: string) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const arrayBuffer = base64ToArrayBuffer(base64);
    const int16Array = new Int16Array(arrayBuffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }
    const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    if (gainNodeRef.current) {
      source.connect(gainNodeRef.current);
    } else {
      source.connect(ctx.destination);
    }

    const startTime = Math.max(nextPlayTimeRef.current, ctx.currentTime);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + audioBuffer.duration;
  };

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsRecording(false);
    setIsConnecting(false);
  };

  useEffect(() => {
    const handleStart = () => {
      if (!isRecording && !isConnecting) {
        startSession();
      }
    };
    const handleStop = () => {
      if (isRecording) {
        stopSession();
      }
    };

    window.addEventListener('voice-command-start-recording', handleStart);
    window.addEventListener('voice-command-stop-recording', handleStop);

    return () => {
      window.removeEventListener('voice-command-start-recording', handleStart);
      window.removeEventListener('voice-command-stop-recording', handleStop);
    };
  }, [isRecording, isConnecting]);

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  const [themeColor, setThemeColor] = useState<'emerald' | 'red'>('emerald');

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail === 'red' || customEvent.detail === 'green') {
        setThemeColor(customEvent.detail === 'red' ? 'red' : 'emerald');
      }
    };
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-light tracking-tight text-white">Live Voice Assistant</h2>
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={isRecording ? stopSession : startSession}
        disabled={isConnecting}
        className={`relative group flex items-center justify-center w-48 h-48 rounded-full transition-all duration-500 overflow-hidden border-4 focus:outline-none focus-visible:ring-4 focus-visible:ring-${themeColor}-500 focus-visible:ring-offset-4 focus-visible:ring-offset-black ${
          isRecording
            ? `border-${themeColor}-400 shadow-[0_0_40px_rgba(${themeColor === 'red' ? '239,68,68' : '16,185,129'},0.6)] scale-105`
            : 'border-zinc-800 hover:border-zinc-600'
        }`}
        aria-label={isConnecting ? "Connecting to voice assistant" : isRecording ? "Stop voice assistant" : "Start voice assistant"}
        aria-pressed={isRecording}
      >
        <img 
          src={avatarImage} 
          alt=""
          className={`w-full h-full object-cover transition-transform duration-700 ${isRecording ? 'scale-110' : 'scale-100'}`}
          aria-hidden="true"
        />
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${isRecording ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`} aria-hidden="true">
          {isConnecting ? (
            <Loader2 className="w-12 h-12 animate-spin text-white" />
          ) : isRecording ? (
            <MicOff className="w-12 h-12 text-white drop-shadow-lg" />
          ) : (
            <Mic className="w-12 h-12 text-white drop-shadow-lg" />
          )}
        </div>
        {isRecording && (
          <div className={`absolute inset-0 rounded-full border-4 border-${themeColor}-400 animate-ping opacity-30 pointer-events-none`} aria-hidden="true" />
        )}
      </motion.button>

      <div className="text-sm font-mono text-zinc-500 uppercase tracking-widest" aria-live="polite">
        {isConnecting ? 'Connecting...' : isRecording ? 'Listening & Speaking' : 'Tap to Start'}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm max-w-md text-center" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
