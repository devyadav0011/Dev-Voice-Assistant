import { useState, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { Play, Square, Loader2, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base64ToArrayBuffer } from '../lib/audioUtils';
import { VoiceName } from '../App';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface TextToSpeechProps {
  selectedVoice: VoiceName;
  volume: number;
}

export default function TextToSpeech({ selectedVoice, volume }: TextToSpeechProps) {
  const [text, setText] = useState('Namaste! Main aapka AI voice assistant hoon. Aaj main aapki kaise madad kar sakta hoon?');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [currentSource, setCurrentSource] = useState<AudioBufferSourceNode | null>(null);
  const [gainNode, setGainNode] = useState<GainNode | null>(null);

  useEffect(() => {
    if (gainNode && audioContext) {
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    }
  }, [volume, gainNode, audioContext]);

  const handleGenerateAndPlay = async () => {
    if (!text.trim()) return;

    setIsGenerating(true);
    stopAudio();

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        playAudio(base64Audio);
      }
    } catch (error) {
      console.error('TTS Error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const playAudio = async (base64: string) => {
    const ctx = audioContext || new AudioContext({ sampleRate: 24000 });
    if (!audioContext) setAudioContext(ctx);

    let currentGainNode = gainNode;
    if (!currentGainNode) {
      currentGainNode = ctx.createGain();
      currentGainNode.connect(ctx.destination);
      setGainNode(currentGainNode);
    }
    currentGainNode.gain.value = volume;

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
    source.connect(currentGainNode);
    
    source.onended = () => setIsPlaying(false);
    
    setCurrentSource(source);
    setIsPlaying(true);
    source.start(0);
  };

  const stopAudio = () => {
    if (currentSource) {
      currentSource.stop();
      currentSource.disconnect();
      setCurrentSource(null);
    }
    setIsPlaying(false);
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto w-full justify-center space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/20 text-blue-400 mb-2">
          <Volume2 className="w-8 h-8" />
        </div>
        <h2 className="text-4xl font-light tracking-tight text-white">Text to Speech</h2>
        <p className="text-zinc-400">Convert any text into natural-sounding speech.</p>
      </div>

      <div className="space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to speak..."
          className="w-full h-48 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
          aria-label="Text to speak"
        />
        
        <div className="flex justify-end space-x-4">
          <AnimatePresence>
            {isPlaying && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={stopAudio}
                className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
                aria-label="Stop audio"
              >
                <Square className="w-4 h-4" aria-hidden="true" />
                <span>Stop</span>
              </motion.button>
            )}
          </AnimatePresence>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleGenerateAndPlay}
            disabled={isGenerating || !text.trim()}
            className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={isGenerating ? "Generating audio" : "Generate and play audio"}
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{isGenerating ? 'Generating...' : 'Generate & Play'}</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
