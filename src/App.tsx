import { useState, useEffect } from 'react';
import { Mic, MessageSquare, Volume2, VolumeX, Ear, EarOff, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LiveVoice from './components/LiveVoice';
import ChatBot from './components/ChatBot';
import TextToSpeech from './components/TextToSpeech';
import { useVoiceCommands } from './hooks/useVoiceCommands';
import Background3D from './components/Background3D';

type Tab = 'voice' | 'chat' | 'tts';
export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('voice');
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>(() => {
    return (localStorage.getItem('selectedVoice') as VoiceName) || 'Kore';
  });
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('volume');
    return saved ? parseFloat(saved) : 1;
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    const saved = localStorage.getItem('isMuted');
    return saved ? saved === 'true' : false;
  });
  const [themeColor, setThemeColor] = useState<'emerald' | 'red'>('emerald');
  const [announcement, setAnnouncement] = useState<string>('');

  const announce = (message: string) => {
    setAnnouncement(message);
    // Clear the announcement after a short delay so the same message can be announced again if needed
    setTimeout(() => setAnnouncement(''), 3000);
  };

  useEffect(() => {
    localStorage.setItem('selectedVoice', selectedVoice);
    announce(`Voice changed to ${selectedVoice}`);
  }, [selectedVoice]);

  useEffect(() => {
    localStorage.setItem('volume', volume.toString());
  }, [volume]);

  useEffect(() => {
    localStorage.setItem('isMuted', isMuted.toString());
    announce(isMuted ? 'Audio muted' : 'Audio unmuted');
  }, [isMuted]);

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail === 'red' || customEvent.detail === 'green') {
        const newColor = customEvent.detail === 'red' ? 'red' : 'emerald';
        setThemeColor(newColor);
        announce(`Theme color changed to ${newColor}`);
      }
    };
    const handleVoiceCommandToggle = (e: Event) => {
      const customEvent = e as CustomEvent;
      announce(customEvent.detail ? 'Voice commands enabled' : 'Voice commands disabled');
    };
    window.addEventListener('theme-change', handleThemeChange);
    window.addEventListener('voice-command-toggle', handleVoiceCommandToggle);
    return () => {
      window.removeEventListener('theme-change', handleThemeChange);
      window.removeEventListener('voice-command-toggle', handleVoiceCommandToggle);
    };
  }, []);

  const handleCommand = (command: string) => {
    if (command.includes('switch to chat') || command.includes('open chat')) {
      setActiveTab('chat');
      announce('Switched to Chat tab');
    } else if (command.includes('switch to voice') || command.includes('open voice')) {
      setActiveTab('voice');
      announce('Switched to Live Voice tab');
    } else if (command.includes('switch to text to speech') || command.includes('switch to tts') || command.includes('enable text to speech')) {
      setActiveTab('tts');
      announce('Switched to Text to Speech tab');
    } else if (command.includes('disable text to speech')) {
      setActiveTab('voice');
      announce('Switched to Live Voice tab');
    } else if (command.includes('start recording') || command.includes('hey dev') || command.includes('hey dave') || command.includes('hey deb')) {
      if (activeTab !== 'voice') {
        setActiveTab('voice');
        announce('Switched to Live Voice tab and started recording');
      } else {
        announce('Started recording');
      }
      window.dispatchEvent(new CustomEvent('voice-command-start-recording'));
    } else if (command.includes('stop recording')) {
      announce('Stopped recording');
      window.dispatchEvent(new CustomEvent('voice-command-stop-recording'));
    }
  };

  const { isListening, toggleListening } = useVoiceCommands(handleCommand);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    announce(`Switched to ${tab === 'voice' ? 'Live Voice' : tab === 'chat' ? 'Chat' : 'Text to Speech'} tab`);
  };

  return (
    <div className={`min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-${themeColor}-500/30 relative`}>
      {/* Screen Reader Announcer */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* 3D Background */}
      <Background3D themeColor={themeColor} />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/80 via-black/50 to-black/90 fixed pointer-events-none" />

      {/* Header */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-10"
      >
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full bg-${themeColor}-500/20 flex items-center justify-center text-${themeColor}-400`}>
              <Mic className="w-4 h-4" />
            </div>
            <h1 className="font-medium tracking-wide text-sm uppercase text-zinc-300">Dev Assistant</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value as VoiceName)}
                className={`appearance-none bg-zinc-900/50 border border-white/5 text-zinc-300 text-sm rounded-md px-3 py-1.5 pr-8 focus:outline-none focus:ring-1 focus:ring-${themeColor}-500/50 cursor-pointer hover:bg-zinc-800/50 transition-colors`}
                title="Select Voice"
                aria-label="Select AI Voice"
              >
                <option value="Kore">Kore (Friendly/Energetic)</option>
                <option value="Puck">Puck (Playful)</option>
                <option value="Charon">Charon (Deep/Calm)</option>
                <option value="Fenrir">Fenrir (Strong)</option>
                <option value="Zephyr">Zephyr (Smooth)</option>
                <option value="custom" disabled>Upload Own Voice (Coming Soon)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-400" aria-hidden="true">
                <Settings2 className="w-3 h-3" />
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-zinc-900/50 border border-white/5 rounded-md px-3 py-1.5">
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsMuted(!isMuted)}
                className="text-zinc-400 hover:text-zinc-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
                title={isMuted ? "Unmute" : "Mute"}
                aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                aria-pressed={isMuted}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" aria-hidden="true" /> : <Volume2 className="w-4 h-4" aria-hidden="true" />}
              </motion.button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  if (isMuted && parseFloat(e.target.value) > 0) {
                    setIsMuted(false);
                  }
                }}
                className={`w-24 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-${themeColor}-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-${themeColor}-500`}
                title="Volume"
                aria-label="Volume control"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleListening}
              className={`relative flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm transition-all border focus:outline-none focus-visible:ring-2 focus-visible:ring-${themeColor}-500 ${
                isListening 
                  ? `bg-${themeColor}-500/10 text-${themeColor}-400 border-${themeColor}-500/50 shadow-[0_0_15px_rgba(16,185,129,0.4)]` 
                  : 'bg-zinc-900/50 text-zinc-400 border-white/5 hover:text-zinc-300'
              }`}
              title={isListening ? "Voice commands active. Say 'hey dev', 'switch to chat', etc." : "Click to enable voice commands"}
              aria-label={isListening ? "Disable voice commands" : "Enable voice commands"}
              aria-pressed={isListening}
            >
              {isListening && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3" aria-hidden="true">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-${themeColor}-400 opacity-75`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 bg-${themeColor}-500`}></span>
                </span>
              )}
              {isListening ? <Ear className="w-4 h-4" aria-hidden="true" /> : <EarOff className="w-4 h-4" aria-hidden="true" />}
              <span className="hidden sm:inline">{isListening ? 'Listening for Commands...' : 'Voice Commands Off'}</span>
            </motion.button>

            <nav className="flex space-x-1 bg-zinc-900/50 p-1 rounded-lg border border-white/5" role="tablist" aria-label="Main Navigation">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleTabChange('voice')}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-md text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-${themeColor}-500 ${
                activeTab === 'voice' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Real-time voice conversation with AI"
              role="tab"
              aria-selected={activeTab === 'voice'}
              aria-controls="tabpanel-voice"
            >
              <Mic className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Live Voice</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleTabChange('chat')}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-md text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-${themeColor}-500 ${
                activeTab === 'chat' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Text-based chat with AI"
              role="tab"
              aria-selected={activeTab === 'chat'}
              aria-controls="tabpanel-chat"
            >
              <MessageSquare className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Chat</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleTabChange('tts')}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-md text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-${themeColor}-500 ${
                activeTab === 'tts' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Convert text to speech"
              role="tab"
              aria-selected={activeTab === 'tts'}
              aria-controls="tabpanel-tts"
            >
              <Volume2 className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">TTS</span>
            </motion.button>
          </nav>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="h-[calc(100vh-8rem)] bg-zinc-950/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle background glow */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-${themeColor}-500/10 rounded-full blur-[100px] pointer-events-none`} aria-hidden="true" />
          
          <div className="relative h-full z-10">
            <AnimatePresence mode="wait">
              {activeTab === 'voice' && (
                <motion.div
                  key="voice"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  id="tabpanel-voice"
                  role="tabpanel"
                  aria-labelledby="tab-voice"
                  className="h-full"
                >
                  <LiveVoice selectedVoice={selectedVoice} volume={isMuted ? 0 : volume} />
                </motion.div>
              )}
              {activeTab === 'chat' && (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  id="tabpanel-chat"
                  role="tabpanel"
                  aria-labelledby="tab-chat"
                  className="h-full"
                >
                  <ChatBot />
                </motion.div>
              )}
              {activeTab === 'tts' && (
                <motion.div
                  key="tts"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  id="tabpanel-tts"
                  role="tabpanel"
                  aria-labelledby="tab-tts"
                  className="h-full"
                >
                  <TextToSpeech selectedVoice={selectedVoice} volume={isMuted ? 0 : volume} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
