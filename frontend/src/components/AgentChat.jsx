import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../assets/css/agent.css';

const SESSION_ID_KEY = 'agent_session_id';
const SESSION_HISTORY_KEY = 'agent_session_history';

const getSessionId = () => {
  let sid = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sid) {
    sid = 'session_' + Math.random().toString(36).substring(2, 10);
    sessionStorage.setItem(SESSION_ID_KEY, sid);
  }
  return sid;
};

const getSessionHistory = (sessionId) => {
  try {
    const raw = sessionStorage.getItem(`${SESSION_HISTORY_KEY}:${sessionId}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const setSessionHistory = (sessionId, messages) => {
  try {
    sessionStorage.setItem(`${SESSION_HISTORY_KEY}:${sessionId}`, JSON.stringify(messages));
  } catch {
    // Ignore session storage errors.
  }
};

export default function AgentChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const messagesEndRef = useRef(null);
  const didReloadRef = useRef(false);
  
  const sessionId = getSessionId();

  useEffect(() => {
    const checkAuth = async ({ clearAnonOnReload = false } = {}) => {
      try {
        await axios.get('/api/profile', { withCredentials: true });
        setIsAuthenticated(true);
      } catch (_) {
        setIsAuthenticated(false);
        if (clearAnonOnReload && didReloadRef.current) {
          try {
            sessionStorage.removeItem(`${SESSION_HISTORY_KEY}:${sessionId}`);
          } catch {
            // Ignore session storage errors.
          }
          setMessages([]);
        }
      } finally {
        setAuthChecked(true);
      }
    };

    const nav = window.performance?.getEntriesByType?.('navigation')?.[0];
    didReloadRef.current = nav?.type === 'reload';
    void checkAuth({ clearAnonOnReload: true });
  }, [sessionId]);

  useEffect(() => {
    if (!isOpen) return;
    const checkAuth = async () => {
      try {
        await axios.get('/api/profile', { withCredentials: true });
        setIsAuthenticated(true);
      } catch (_) {
        setIsAuthenticated(false);
      } finally {
        setAuthChecked(true);
      }
    };
    void checkAuth();
  }, [isOpen]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!isAuthenticated) {
        setMessages(getSessionHistory(sessionId));
        return;
      }
      try {
        const res = await axios.get(`/api/agent/history?session_id=${sessionId}`, { withCredentials: true });
        if (res.data && res.data.history) {
          setMessages(res.data.history);
        }
      } catch (err) {
        console.error("Failed to fetch agent history:", err);
      }
    };
    if (isOpen && messages.length === 0 && authChecked) {
      void fetchHistory();
    }
  }, [isOpen, messages.length, authChecked, isAuthenticated, sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleAgentClose = () => setIsOpen(false);
    window.addEventListener('agent:close', handleAgentClose);
    return () => window.removeEventListener('agent:close', handleAgentClose);
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmedMessage = inputValue.trim();
    if (!trimmedMessage) return;

    const userMessage = { role: 'user', content: trimmedMessage };
    const pendingMessages = [...messages, userMessage];
    setMessages(pendingMessages);
    if (!isAuthenticated) {
      setSessionHistory(sessionId, pendingMessages);
    }
    setInputValue("");
    setIsLoading(true);

    try {
      const payload = {
        message: userMessage.content,
        session_id: sessionId,
      };
      if (!isAuthenticated) {
        payload.history = messages;
      }

      const res = await axios.post('/api/agent/chat', payload, { withCredentials: true });

      const data = res.data;
      
      const agentMessage = { role: 'agent', content: data.reply };
      const nextMessages = [...pendingMessages, agentMessage];
      setMessages(nextMessages);
      if (!isAuthenticated) {
        setSessionHistory(sessionId, nextMessages);
      }

      if (data.action && data.action.lat !== undefined && data.action.lng !== undefined) {
        window.dispatchEvent(new CustomEvent('globe:flyto', {
          detail: { 
            lat: data.action.lat, 
            lng: data.action.lng,
            focusName: data.action.focusName,
            focusInfo: data.action.focusInfo
          }
        }));
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      const fallbackMessage = { role: 'agent', content: "Sorry, I am experiencing a temporary glitch..." };
      const nextMessages = [...pendingMessages, fallbackMessage];
      setMessages(nextMessages);
      if (!isAuthenticated) {
        setSessionHistory(sessionId, nextMessages);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="agent-container">
      {!isOpen && (
        <button className="agent-fab" onClick={() => setIsOpen(true)}>
          <span className="agent-icon">🧭</span>
        </button>
      )}
      
      {isOpen && (
        <div className="agent-chat-window">
          <div className="agent-header">
            <h4>Nova Guide</h4>
            <button className="agent-close" onClick={() => setIsOpen(false)}>&times;</button>
          </div>
          
          <div className="agent-messages">
            {messages.length === 0 && !isLoading && (
              <div className="agent-welcome">
                <p>Hello! I'm your NovaGlobe Guide. Tell me where you want to explore today!</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`message-bubble ${msg.role}`}>
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="message-bubble agent loading-dots">
                <span></span><span></span><span></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <form className="agent-input-form" onSubmit={handleSend}>
            <input 
              type="text" 
              placeholder="Ask me to take you somewhere..." 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !inputValue.trim()}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
