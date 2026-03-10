import { useEffect, useState, useRef } from 'react';

type CommandHandler = (command: string) => void;

export function useVoiceCommands(onCommand: CommandHandler) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition API not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const result = event.results[last][0];
      const command = result.transcript.trim().toLowerCase();
      const confidence = result.confidence;
      
      console.log(`Voice command heard: "${command}" (Confidence: ${confidence})`);
      
      // Filter out ambiguous commands with low confidence
      if (confidence >= 0.7) {
        onCommand(command);
      } else {
        console.log(`Command ignored due to low confidence (${confidence})`);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        // Ignore no-speech errors, they are common and benign when the user is quiet
        return;
      }
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart if it's supposed to be listening
      if (isListening) {
        try {
          recognition.start();
        } catch (e) {
          console.error('Failed to restart recognition', e);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onCommand, isListening]);

  useEffect(() => {
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('Failed to start recognition', e);
      }
    } else if (!isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const toggleListening = () => {
    setIsListening(prev => {
      const newState = !prev;
      // Dispatch a custom event to announce the state change
      window.dispatchEvent(new CustomEvent('voice-command-toggle', { detail: newState }));
      return newState;
    });
  };

  return { isListening, toggleListening };
}
