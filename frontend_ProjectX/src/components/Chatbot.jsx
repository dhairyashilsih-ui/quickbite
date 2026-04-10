import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MessageSquare, X, Send, Mic, MicOff, User, Bot, Volume2 } from 'lucide-react';
import './Chatbot.css';

const SYSTEM_PROMPT = `You are a helpful and energetic AI assistant for QuickBite, a food delivery platform. 
Keep your answers brief, friendly, and engaging. Never use more than 2 sentences. 
You exist to help customers find food, give info about the delivery, and help sellers manage their dashboards.`;

export default function Chatbot({ role = 'customer' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi there! I'm your QuickBite AI Assistant. How can I help you today?` }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Voice mode state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceText, setVoiceText] = useState('Listening...');

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Init Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        setVoiceText(`You: "${transcript}"`);
        await handleSendMessage(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        setVoiceText('Voice error. Try clicking the orb again.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [messages]); // messages dependency so handleSendMessage has latest state

  useEffect(() => {
    // Cleanup synth on unmount
    return () => {
      if (synthRef.current) synthRef.current.cancel();
    };
  }, []);

  const toggleVoiceMode = () => {
    if (isVoiceMode) {
      // stopping voice mode
      if (synthRef.current) synthRef.current.cancel();
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsVoiceMode(false);
      setIsListening(false);
      setIsSpeaking(false);
    } else {
      // starting voice mode
      setIsVoiceMode(true);
      setVoiceText('Click the orb to speak');
    }
  };

  const handleOrbClick = () => {
    if (isSpeaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      setVoiceText('Click the orb to speak');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setVoiceText('Click the orb to speak');
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        setVoiceText('Listening...');
      } catch (e) {
        setVoiceText('Error listening. Try again.');
      }
    }
  };

  const speakText = (text) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find a nice voice
    const voices = synthRef.current.getVoices();
    const goodVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha') || v.lang === 'en-US');
    if (goodVoice) utterance.voice = goodVoice;
    
    utterance.rate = 1.05;
    utterance.pitch = 1.1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setVoiceText('Click the orb to speak');
    };
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const callGroqAPI = async (userText, currentMessages) => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
      return "Groq API key is missing. Please add VITE_GROQ_API_KEY to your .env file.";
    }

    const payloadMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...currentMessages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userText }
    ];

    try {
      const res = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.1-instant',
          messages: payloadMessages,
          temperature: 0.7,
          max_tokens: 150,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return res.data.choices[0].message.content;
    } catch (err) {
      console.error("Groq API Error:", err);
      return "Oops, I'm having trouble connecting to my brain right now! Please try again later.";
    }
  };

  const handleSendMessage = async (textOverride = null) => {
    const text = typeof textOverride === 'string' ? textOverride : inputVal;
    if (!text.trim()) return;

    if (!textOverride) setInputVal('');
    
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setIsThinking(true);
    if (isVoiceMode) setVoiceText('AI is thinking...');

    const response = await callGroqAPI(text, messages);

    setMessages([...newMessages, { role: 'assistant', content: response }]);
    setIsThinking(false);

    if (isVoiceMode) {
      setVoiceText('AI is answering...');
      speakText(response);
    }
  };

  return (
    <>
      <div className={`qb-chat-fab ${isOpen ? 'hidden' : ''}`} onClick={() => setIsOpen(true)}>
        <MessageSquare size={24} color="#fff" />
      </div>

      {isOpen && (
        <div className={`qb-chat-window ${isOpen ? 'open' : ''}`}>
          {/* Header */}
          <div className="qb-chat-header">
            <div className="qb-chat-header-info">
              <div className="qb-chat-avatar">
                <Bot size={18} color="#e63946" />
              </div>
              <div className="qb-chat-titles">
                <h4>QuickBite AI</h4>
                <span>{role === 'admin' ? 'Seller Hub' : 'Customer Support'}</span>
              </div>
            </div>
            <button className="qb-chat-close" onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>
          </div>

          {/* Voice Mode View */}
          {isVoiceMode ? (
            <div className="qb-voice-container">
              <button 
                className="qb-voice-orb-small-exit" 
                onClick={toggleVoiceMode}
                title="Exit Voice Mode"
              >
                Typing Mode
              </button>
              
              <div className="qb-voice-status">{voiceText}</div>
              
              {/* BIG ORB */}
              <div 
                className={`qb-voice-orb-big ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''} ${isThinking ? 'thinking' : ''}`}
                onClick={handleOrbClick}
              >
                {isSpeaking ? <Volume2 size={40} color="#fff" /> : 
                 isListening ? <Mic size={40} color="#fff" /> : 
                 <div className="orb-core">AI</div>}
              </div>
              
              <p className="qb-voice-hint">
                {isListening ? 'Listening...' : isSpeaking ? 'Tap to stop speaking' : 'Tap orb to start'}
              </p>
            </div>
          ) : (
            /* Text Chat View */
            <>
              <div className="qb-chat-messages">
                {messages.map((m, idx) => (
                  <div key={idx} className={`qb-chat-msg ${m.role}`}>
                    <div className="qb-chat-bubble">{m.content}</div>
                  </div>
                ))}
                {isThinking && (
                  <div className="qb-chat-msg assistant">
                    <div className="qb-chat-bubble thinking">
                      <span className="dot"></span><span className="dot"></span><span className="dot"></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="qb-chat-input-area">
                {/* SMALL ORB */}
                <button 
                  className="qb-voice-orb-small" 
                  onClick={toggleVoiceMode}
                  title="Switch to Voice Mode"
                >
                  <div className="small-orb-btn">
                    <Mic size={14} color="#fff" />
                  </div>
                </button>
                
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button className="qb-chat-send" onClick={() => handleSendMessage()}>
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
