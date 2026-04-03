import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Joyride, STATUS } from 'react-joyride';
import axios from 'axios';
import RobotSVG from './RobotSVG';
import '../assets/css/robot-guide.css';

/* ═══════════════════════════════════════════════════════════
   NovaGlobe Robot Guide
   - Animated SVG robot mascot (idle float, glow)
   - First-visit onboarding tour (React Joyride v3)
   - Chat panel connected to /agent/chat backend
   ═══════════════════════════════════════════════════════════ */

const TOUR_STORAGE_KEY = 'novaglobe_tour_completed';

const getSessionId = () => {
  let sid = localStorage.getItem('agent_session_id');
  if (!sid) {
    sid = 'session_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('agent_session_id', sid);
  }
  return sid;
};

/* ── Tour Steps ── */
const tourSteps = [
  {
    target: '#nova-brand',
    title: 'Welcome to NovaGlobe! 🌍',
    content: "I'm your AI guide! Let me show you around. NovaGlobe lets you explore the entire world in a stunning 3D environment.",
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '#nova-search-bar',
    title: 'Explore Anywhere ✈️',
    content: "Search for any place on Earth — cities, landmarks, natural wonders. I'll fly you there and show you real-time information!",
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '#nova-twin-btn',
    title: 'Digital Twin Simulation 🔬',
    content: 'Run powerful simulations with our Digital Twin engine. Monitor assets, predict maintenance, and optimize performance in real-time.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '#nova-avatar',
    title: 'Your Account 👤',
    content: 'Sign in to save your explorations, access advanced features, and view your exploration history.',
    disableBeacon: true,
    placement: 'bottom-end',
  },
  {
    target: '#nova-robot-guide',
    title: "I'm Always Here! 🤖",
    content: "Click me anytime to chat! Tell me a place and I'll take you there, showing weather, news, and fascinating facts along the way.",
    disableBeacon: true,
    placement: 'top-end',
  },
];

/* ── Custom Tooltip for Joyride v3 ── */
const TourTooltip = ({
  continuous,
  index,
  isLastStep,
  step,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
}) => {
  const totalSteps = tourSteps.length;
  return (
    <div {...tooltipProps} className="nova-tour-tooltip">
      <div className="nova-tour-tooltip-header">
        <div className="nova-tour-tooltip-avatar">
          <RobotSVG size={40} speaking={true} blinking={true} />
        </div>
        <div className="nova-tour-tooltip-title">{step.title}</div>
      </div>
      <div className="nova-tour-tooltip-body">{step.content}</div>
      <div className="nova-tour-tooltip-footer">
        <span className="nova-tour-tooltip-counter">{index + 1} / {totalSteps}</span>
        <div className="nova-tour-tooltip-btns">
          {index === 0 && (
            <button {...skipProps} className="nova-tour-btn skip">Skip Tour</button>
          )}
          {index > 0 && (
            <button {...backProps} className="nova-tour-btn back">Back</button>
          )}
          <button {...primaryProps} className="nova-tour-btn next">
            {isLastStep ? "Let's Go!" : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function RobotGuide() {
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);
  const [speechText, setSpeechText] = useState('');
  const [runTour, setRunTour] = useState(false);
  const [tourKey, setTourKey] = useState(0); // force re-mount Joyride
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef(null);
  const sessionId = getSessionId();
  const speechTimerRef = useRef(null);

  /* ── First Visit Detection ── */
  useEffect(() => {
    const tourDone = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!tourDone) {
      const timer = setTimeout(() => {
        setShowSpeechBubble(true);
        setSpeechText('');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  /* ── Close chat on agent:close event ── */
  useEffect(() => {
    const handleClose = () => setChatOpen(false);
    window.addEventListener('agent:close', handleClose);
    return () => window.removeEventListener('agent:close', handleClose);
  }, []);

  /* ── Scroll to bottom ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── Fetch history on open ── */
  useEffect(() => {
    if (!chatOpen || messages.length > 0) return;
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/agent/history?session_id=${sessionId}`, { withCredentials: true });
        if (res.data?.history) {
          setMessages(res.data.history);
        }
      } catch (err) {
        console.error('Failed to fetch agent history:', err);
      }
    };
    fetchHistory();
  }, [chatOpen]);

  /* ── Show greeting speech bubble briefly after load ── */
  useEffect(() => {
    const tourDone = localStorage.getItem(TOUR_STORAGE_KEY);
    if (tourDone) {
      const timer = setTimeout(() => {
        showRobotSpeech("Hey! 👋 Click me to explore the world together!", 5000);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const showRobotSpeech = useCallback((text, duration = 4000) => {
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    setSpeechText(text);
    setShowSpeechBubble(true);
    setIsSpeaking(true);
    speechTimerRef.current = setTimeout(() => {
      setShowSpeechBubble(false);
      setIsSpeaking(false);
    }, duration);
  }, []);

  /* ── Tour Handlers ── */
  const [stepIndex, setStepIndex] = useState(0);

  const handleStartTour = () => {
    setShowSpeechBubble(false);
    setTourKey(k => k + 1);
    setStepIndex(0);
    setTimeout(() => {
      setRunTour(true);
    }, 100);
  };

  const handleSkipTour = () => {
    setShowSpeechBubble(false);
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
  };

  const handleTourCallback = (data) => {
    console.log('[Joyride Debug]', data);
    const { status, action, index, type } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRunTour(false);
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
      showRobotSpeech("You're all set! Click me anytime you need help! 🚀", 4000);
    } else if (action === 'next' || action === 'prev') {
      // Allow next/back buttons to work by syncing state
      setStepIndex(index + (action === 'next' ? 1 : -1));
    } else if (type === 'step:after' || type === 'target:notFound') {
      // Fallback update
      setStepIndex(index + (action === 'next' ? 1 : 0));
    }
  };

  /* ── Chat Send ── */
  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = { role: 'user', content: inputValue.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/agent/chat', {
        message: userMessage.content,
        session_id: sessionId,
      }, { withCredentials: true });

      const data = res.data;
      const agentMessage = { role: 'agent', content: data.reply };
      setMessages(prev => [...prev, agentMessage]);

      if (data.action?.lat !== undefined && data.action?.lng !== undefined) {
        window.dispatchEvent(new CustomEvent('globe:flyto', {
          detail: {
            lat: data.action.lat,
            lng: data.action.lng,
            focusName: data.action.focusName,
            focusInfo: data.action.focusInfo,
          },
        }));
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => [...prev, {
        role: 'agent',
        content: "Sorry, I'm experiencing a temporary glitch. Please try again!",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRobotClick = () => {
    if (showSpeechBubble && !runTour) {
      setShowSpeechBubble(false);
    }
    setChatOpen(true);
  };

  /* ── Render ── */
  return (
    <div className="robot-guide-container">
      {/* ── Joyride Tour ── */}
      <Joyride
        debug={true}
        key={tourKey}
        steps={tourSteps}
        run={runTour}
        stepIndex={stepIndex}
        continuous={true}
        showSkipButton={true}
        showProgress={true}
        disableOverlayClose={true}
        disableScrolling={false}
        spotlightClicks={false}
        callback={handleTourCallback}
        // tooltipComponent={TourTooltip}
        locale={{
          back: 'Back',
          close: 'Close',
          last: "Let's Go!",
          next: 'Next',
          skip: 'Skip',
        }}
        styles={{
          options: {
            arrowColor: 'rgba(8, 14, 22, 0.96)',
            backgroundColor: 'rgba(8, 14, 22, 0.96)',
            overlayColor: 'rgba(2, 6, 12, 0.82)',
            primaryColor: '#08C9C0',
            textColor: '#c9e0de',
            zIndex: 10003,
          },
          spotlight: {
            borderRadius: '16px',
          },
        }}
      />

      {/* ── Chat Panel ── */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            className="robot-chat-panel"
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.92 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
          >
            {/* Header */}
            <div className="robot-chat-header">
              <div className="robot-chat-header-avatar">
                <RobotSVG size={36} speaking={isLoading} />
              </div>
              <div className="robot-chat-header-info">
                <div className="robot-chat-header-name">Nova Guide</div>
                <div className="robot-chat-header-status">Online — ready to explore</div>
              </div>
              <button className="robot-chat-close" onClick={() => setChatOpen(false)}>✕</button>
            </div>

            {/* Messages */}
            <div className="robot-chat-messages">
              {messages.length === 0 && !isLoading && (
                <div className="robot-chat-welcome">
                  <strong>Hello, explorer! 🌍</strong>
                  Tell me where you want to go and I'll fly you there. Try saying "Take me to the Eiffel Tower" or "Show me Tokyo"!
                </div>
              )}
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  className={`robot-msg ${msg.role}`}
                  initial={{ opacity: 0, scale: 0.9, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                >
                  {msg.content}
                </motion.div>
              ))}
              {isLoading && (
                <div className="robot-msg-loading">
                  <span /><span /><span />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form className="robot-chat-input-area" onSubmit={handleSend}>
              <input
                className="robot-chat-input"
                type="text"
                placeholder="Ask me to take you somewhere..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
              <button
                className="robot-chat-send"
                type="submit"
                disabled={isLoading || !inputValue.trim()}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Robot (when chat is closed) ── */}
      <AnimatePresence>
        {!chatOpen && (
          <motion.div
            id="nova-robot-guide"
            className="robot-idle-wrapper"
            initial={{ opacity: 0, scale: 0, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0, y: 40 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            onClick={handleRobotClick}
          >
            {/* Glow ring */}
            <div className="robot-glow-ring" />

            {/* Idle floating animation */}
            <motion.div
              animate={{
                y: [0, -8, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <RobotSVG size={80} speaking={isSpeaking} />
            </motion.div>

            {/* ── Speech Bubble ── */}
            <AnimatePresence>
              {showSpeechBubble && !runTour && (
                <motion.div
                  className="robot-speech-bubble"
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {speechText ? (
                    <p className="robot-speech-text">{speechText}</p>
                  ) : (
                    <>
                      <div className="robot-speech-title">Hey there, explorer! 🌟</div>
                      <p className="robot-speech-text">
                        I'm your NovaGlobe AI guide. Want me to show you around?
                      </p>
                      <div className="robot-speech-actions">
                        <button className="robot-speech-btn primary" onClick={handleStartTour}>
                          Show Me Around!
                        </button>
                        <button className="robot-speech-btn secondary" onClick={handleSkipTour}>
                          Maybe Later
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
