import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { Send, Sparkles, Zap, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type Message = { role: 'user' | 'model'; text: string };

const initialMessage: Message = {
  role: 'model',
  text: "Namaste! 👋 Main aapka personal Dev Assistant hoon. Main aapko coding, debugging, aur tech related questions mein help kar sakti hoon. Aap mujhse kisi bhi programming language ya framework ke baare mein pooch sakte hain. Kaise madad karun aaj aapki?"
};

export default function ChatBot() {
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'fast' | 'think'>('fast');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const modelName = mode === 'fast' ? 'gemini-2.5-flash-lite' : 'gemini-3.1-pro-preview';
      const config: any = {
        systemInstruction: 'You are a friendly, human-like AI assistant who is an expert in software development and coding. You MUST speak in natural, conversational Hinglish (a mix of Hindi and English). Keep your answers concise, helpful, and sound like a real person chatting. You can help the user with programming, debugging, and general tech questions.'
      };
      if (mode === 'think') {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: userMsg,
        config
      });

      setMessages(prev => [...prev, { role: 'model', text: response.text || '' }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-light text-white">AI Chatbot</h2>
          <p className="text-sm text-zinc-400">Text-based assistance</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800" role="group" aria-label="Chat Mode Selection">
            <button
              onClick={() => setMode('fast')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                mode === 'fast' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              aria-pressed={mode === 'fast'}
              title="Fast Mode"
            >
              <Zap className="w-4 h-4" aria-hidden="true" />
              <span>Fast</span>
            </button>
            <button
              onClick={() => setMode('think')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                mode === 'think' ? 'bg-zinc-800 text-violet-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              aria-pressed={mode === 'think'}
              title="Deep Think Mode"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>Deep Think</span>
            </button>
          </div>
          {messages.length > 1 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMessages([initialMessage])}
              className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              title="Clear Chat"
              aria-label="Clear Chat"
            >
              <Trash2 className="w-5 h-5" aria-hidden="true" />
            </motion.button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 mb-6 pr-2 custom-scrollbar" aria-live="polite" aria-atomic="false">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] rounded-2xl px-5 py-3 ${
                msg.role === 'user'
                  ? 'bg-emerald-600/20 text-emerald-50 border border-emerald-500/20'
                  : 'bg-zinc-800/50 text-zinc-200 border border-zinc-700/50'
              }`}>
                {msg.role === 'model' ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                )}
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start" 
              aria-label="AI is typing..."
            >
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-2xl px-5 py-4 flex space-x-2">
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" aria-hidden="true" />
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} aria-hidden="true" />
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} aria-hidden="true" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={mode === 'fast' ? "Ask anything quickly..." : "Ask a complex question..."}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-4 pr-12 py-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          aria-label="Type your message"
        />
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-emerald-400 disabled:opacity-50 disabled:hover:text-zinc-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
          aria-label="Send message"
        >
          <Send className="w-5 h-5" aria-hidden="true" />
        </motion.button>
      </div>
    </div>
  );
}
