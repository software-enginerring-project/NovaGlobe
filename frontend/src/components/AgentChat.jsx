import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../assets/css/agent.css';

const getSessionId = () => {
  let sid = localStorage.getItem('agent_session_id');
  if (!sid) {
    sid = 'session_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('agent_session_id', sid);
  }
  return sid;
};

export default function AgentChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  const sessionId = getSessionId();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/agent/history?session_id=${sessionId}`, { withCredentials: true });
        if (res.data && res.data.history) {
          setMessages(res.data.history);
        }
      } catch (err) {
        console.error("Failed to fetch agent history:", err);
      }
    };
    if (isOpen && messages.length === 0) {
      fetchHistory();
    }
  }, [isOpen]);

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
    if (!inputValue.trim()) return;

    const userMessage = { role: 'user', content: inputValue.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/agent/chat', {
        message: userMessage.content,
        session_id: sessionId
      }, { withCredentials: true });

      const data = res.data;
      
      const agentMessage = { role: 'agent', content: data.reply };
      setMessages(prev => [...prev, agentMessage]);

      if (data.action && data.action.lat !== undefined && data.action.lng !== undefined) {
        window.dispatchEvent(new CustomEvent('globe:flyto', {
          detail: { lat: data.action.lat, lng: data.action.lng }
        }));
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessages(prev => [...prev, { role: 'agent', content: "Sorry, I am experiencing a temporary glitch..." }]);
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
