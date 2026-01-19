import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Home, Minus, Bot, User, Calendar, Ticket } from 'lucide-react';
import { chatbotData, answers } from './chatbotData';
import { validateTicket, validateMeeting, validateTicketId } from './validation';

const EDCSChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentMenu, setCurrentMenu] = useState('main');
  const [currentView, setCurrentView] = useState('chat');
  const [isTyping, setIsTyping] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const [ticketData, setTicketData] = useState({ priority: 'Normal' });
  const [meetingData, setMeetingData] = useState({});
  const [checkTicketId, setCheckTicketId] = useState('');

  const [ticketErrors, setTicketErrors] = useState({});
  const [meetingErrors, setMeetingErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // track which submenu options were already answered
  const [answeredOptions, setAnsweredOptions] = useState([]);

  const messagesEndRef = useRef(null);

  // HYBRID SCROLL 
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest',
      });
    }
  };

  useEffect(() => {
    if (!messages.length) return;

    const timer = setTimeout(() => {
      scrollToBottom();
    }, 150);

    return () => clearTimeout(timer);
  }, [messages]);

  const welcomeMessages = [
    "Hello! Welcome to EDCS (Expora Database Consulting Pvt. Ltd India). How can I help you today?",
    "Hi there! Welcome to EDCS! What can I assist you with today?",
    "Greetings! EDCS here, ready to help you. What would you like to know?",
    "Welcome to EDCS! We're excited to help you today. What brings you here?",
  ];

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning! ☀️";
    if (hour < 17) return "Good afternoon! 🌤️";
    return "Good evening! 🌙";
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = getTimeBasedGreeting();
      const randomWelcome = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
      addBotMessage(`${greeting} ${randomWelcome}`, 'main');
    }
  }, [isOpen]);

  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
    setTimeout(() => {
      setMessages([]);
      setCurrentMenu('main');
      setCurrentView('chat');
      setTicketData({ priority: 'Normal' });
      setMeetingData({});
      setTicketErrors({});
      setMeetingErrors({});
      setFormError('');
      setAnsweredOptions([]);
    }, 300);
  };

  const handleMinimize = () => setIsMinimized(true);
  const handleRestore = () => setIsMinimized(false);

  const addBotMessage = (text, menu = null) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { type: 'bot', text, menu, timestamp: new Date() }]);
    }, 250 + Math.random() * 200);
  };

  const addUserMessage = (text) => {
    setMessages(prev => [...prev, { type: 'user', text, timestamp: new Date() }]);
  };

  const handleBackToMain = () => {
    addUserMessage("🏠 Back to Main Menu");
    setTimeout(() => {
      setCurrentMenu('main');
      setCurrentView('chat');
      addBotMessage("Back to main menu. How can I help?", 'main');
      setTicketErrors({});
      setMeetingErrors({});
      setFormError('');
      setAnsweredOptions([]);
    }, 300);
  };

  // ---------- OPTION CLICK ----------
  const handleOptionClick = (option) => {
    addUserMessage(option.text);

    if (option.action === 'ticket') {
      setTimeout(() => setCurrentView('ticket'), 300);
    } else if (option.action === 'meeting') {
      setTimeout(() => setCurrentView('meeting'), 300);
    } else if (option.action === 'checkStatus') {
      setTimeout(() => setCurrentView('checkStatus'), 300);
    } else if (option.action === 'menu') {
      setTimeout(() => {
        setCurrentMenu(option.id);
        addBotMessage(chatbotData[option.id].message, option.id);
      }, 300);
    } else if (option.action === 'answer') {
      const isMainMenuAnswer = currentMenu === 'main';
      setAnsweredOptions(prev =>
        prev.includes(option.id) ? prev : [...prev, option.id]
      );
      setTimeout(() => {
        addBotMessage(answers[option.id], isMainMenuAnswer ? 'answered' : currentMenu);
      }, 300);
    }
  };

  // ---------- TICKET / MEETING / STATUS ----------
  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    const errors = validateTicket(ticketData);
    setTicketErrors(errors);
    setFormError('');
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:5000/api/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData),
      });
      if (!response.ok) throw new Error('Network error');
      const result = await response.json();

      if (result.success) {
        setTicketData(prev => ({ ...prev, ticketId: result.ticket_id }));
        setCurrentView('ticketSuccess');
        triggerConfetti();
        setTicketErrors({});
      } else {
        setFormError('Error submitting ticket. Please try again.');
      }
    } catch (err) {
      setFormError('Could not connect to server. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMeetingSubmit = async (e) => {
    e.preventDefault();
    const errors = validateMeeting(meetingData);
    setMeetingErrors(errors);
    setFormError('');
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:5000/api/meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meetingData),
      });
      if (!response.ok) throw new Error('Network error');
      const result = await response.json();

      if (result.success) {
        setMeetingData(prev => ({ ...prev, meetingId: result.meeting_id }));
        setCurrentView('meetingSuccess');
        triggerConfetti();
        setMeetingErrors({});
      } else {
        setFormError('Error requesting meeting. Please try again.');
      }
    } catch (err) {
      setFormError('Could not connect to server. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckStatus = async () => {
    const error = validateTicketId(checkTicketId);
    if (error) {
      alert(error);
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/ticket/${checkTicketId}`);
      const result = await response.json();
      if (result.success) {
        const ticket = result.ticket;
        alert(
          `Ticket Status: ${ticket.status}\n\nYour Query: ${ticket.description}\n\nHR Response: ${ticket.response || 'Pending response'
          }\n\nCreated: ${new Date(ticket.created_at).toLocaleString()}`
        );
      } else {
        alert('Ticket not found. Please check your ticket ID.');
      }
    } catch (err) {
      alert('Error checking status. Please try again.');
      console.error(err);
    }
  };

  // ---------- UI HELPERS ----------
  const TypingIndicator = () => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '12px', backgroundColor: 'white', borderRadius: '8px',
      maxWidth: '80px', boxShadow: '0 2px 4px rgba(30,58,95,0.1)',
      border: '1px solid #e2e8f0'
    }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: '8px', height: '8px', backgroundColor: '#ef5b6c',
          borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both',
          animationDelay: `${-0.32 + i * 0.16}s`
        }} />
      ))}
    </div>
  );

  const Confetti = () => {
    if (!showConfetti) return null;
    return (
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none', overflow: 'hidden', zIndex: 9999
      }}>
        {[...Array(30)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute', top: '-10px', left: `${Math.random() * 100}%`,
            width: '10px', height: '10px',
            backgroundColor: ['#ef5b6c', '#1e3a5f', '#ffd700', '#00ff00'][Math.floor(Math.random() * 4)],
            animation: `confettiFall ${2 + Math.random() * 2}s linear forwards`,
            animationDelay: `${Math.random() * 0.5}s`,
            transform: `rotate(${Math.random() * 360}deg)`
          }} />
        ))}
      </div>
    );
  };

  const inputStyle = {
    width: '100%', padding: '10px', borderRadius: '6px',
    border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box'
  };
  const buttonStyle = {
    flex: 1, padding: '12px', borderRadius: '8px', border: 'none',
    cursor: 'pointer', fontSize: '14px', fontWeight: '500'
  };

  // ---------- OPTIONS (menus) ----------
  const renderOptions = () => {
    if (!currentMenu || !chatbotData[currentMenu] || isTyping || currentMenu === 'answered') return null;

    const currentData = chatbotData[currentMenu];
    const showTicketPrompt = currentMenu === 'main_with_ticket';

    if (showTicketPrompt) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
          <button
            onClick={() =>
              handleOptionClick({ id: 'ticket', text: '🎫 Submit Query', action: 'ticket' })
            }
            style={{
              backgroundColor: '#ef5b6c', color: 'white', padding: '12px',
              borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '14px', fontWeight: '500'
            }}
          >
            🎫 Submit Query
          </button>
          <button
            onClick={handleBackToMain}
            style={{
              backgroundColor: '#1e3a5f', color: 'white', padding: '12px',
              borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '14px', fontWeight: '500'
            }}
          >
            🔄 Try Another
          </button>
        </div>
      );
    }

    // show only unanswered submenu options (but keep main menu intact if you want)
    const visibleOptions =
      currentMenu === 'main'
        ? currentData.options
        : currentData.options.filter(opt => !answeredOptions.includes(opt.id));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
        {visibleOptions.map((option, index) => (
          <button
            key={option.id}
            onClick={() => handleOptionClick(option)}
            style={{
              backgroundColor: '#ef5b6c',
              color: 'white',
              textAlign: 'left',
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.3s ease',
              fontWeight: '500',
              opacity: 0,
              animation: `slideIn 0.3s ease forwards ${index * 0.1}s`,
            }}
          >
            {option.text}
          </button>
        ))}
        {currentMenu !== 'main' && (
          <button
            onClick={handleBackToMain}
            style={{
              backgroundColor: '#1e3a5f',
              color: 'white',
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '8px',
              fontWeight: '500',
            }}
          >
            <Home size={16} /> Back
          </button>
        )}
      </div>
    );
  };

  // ---------- MAIN VIEW (chat + forms) ----------
  const renderView = () => {
    if (currentView === 'ticket') {
      return (
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
          <h3 style={{ marginTop: 0, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Ticket size={20} /> Submit Your Query
          </h3>
          {formError && <p style={{ color: 'red', fontSize: 14 }}>{formError}</p>}
          <form onSubmit={handleTicketSubmit} noValidate>
            {/* name */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Your Name *
              </label>
              <input
                type="text"
                style={inputStyle}
                value={ticketData.name || ''}
                onChange={(e) => setTicketData(prev => ({ ...prev, name: e.target.value }))}
              />
              {ticketErrors.name && <p style={{ color: 'red', fontSize: 12 }}>{ticketErrors.name}</p>}
            </div>
            {/* email */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Your Email *
              </label>
              <input
                type="email"
                style={inputStyle}
                value={ticketData.email || ''}
                onChange={(e) => setTicketData(prev => ({ ...prev, email: e.target.value }))}
              />
              {ticketErrors.email && <p style={{ color: 'red', fontSize: 12 }}>{ticketErrors.email}</p>}
            </div>
            {/* phone */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Phone (Optional)
              </label>
              <input
                type="tel"
                style={inputStyle}
                value={ticketData.phone || ''}
                onChange={(e) => setTicketData(prev => ({ ...prev, phone: e.target.value }))}
              />
              {ticketErrors.phone && <p style={{ color: 'red', fontSize: 12 }}>{ticketErrors.phone}</p>}
            </div>
            {/* category */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Category *
              </label>
              <select
                style={inputStyle}
                value={ticketData.category || ''}
                onChange={(e) => setTicketData(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="">Select</option>
                <option value="General">General</option>
                <option value="Company">Company</option>
                <option value="Recruitment">Recruitment</option>
                <option value="Technical">Technical</option>
                <option value="Other">Other</option>
              </select>
              {ticketErrors.category && <p style={{ color: 'red', fontSize: 12 }}>{ticketErrors.category}</p>}
            </div>
            {/* priority */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Priority *
              </label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="radio"
                    name="priority"
                    value="Normal"
                    checked={ticketData.priority === 'Normal'}
                    onChange={(e) => setTicketData(prev => ({ ...prev, priority: e.target.value }))}
                  />
                  Normal
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="radio"
                    name="priority"
                    value="Urgent"
                    checked={ticketData.priority === 'Urgent'}
                    onChange={(e) => setTicketData(prev => ({ ...prev, priority: e.target.value }))}
                  />
                  Urgent
                </label>
              </div>
            </div>
            {/* description */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Your Question *
              </label>
              <textarea
                rows="4"
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                value={ticketData.description || ''}
                onChange={(e) => setTicketData(prev => ({ ...prev, description: e.target.value }))}
              />
              {ticketErrors.description && <p style={{ color: 'red', fontSize: 12 }}>{ticketErrors.description}</p>}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  ...buttonStyle,
                  backgroundColor: '#ef5b6c',
                  color: 'white',
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                {isSubmitting ? 'Submitting…' : 'Submit'}
              </button>
              <button
                type="button"
                onClick={handleBackToMain}
                style={{
                  ...buttonStyle,
                  backgroundColor: '#6b7280',
                  color: 'white',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      );
    }

    if (currentView === 'ticketSuccess') {
      return (
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h3 style={{ color: '#1e3a5f', marginBottom: '8px' }}>Query Submitted!</h3>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
            Ticket ID: <strong>{ticketData.ticketId}</strong>
          </p>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
            Our team will respond to
            <br />
            <strong>{ticketData.email}</strong>
            <br />
            within 24 hours.
          </p>
          <p style={{ fontSize: '12px', color: '#ef5b6c', fontWeight: '500' }}>
            ⚠️ Please check your email for our response
          </p>
          <button
            onClick={handleBackToMain}
            style={{
              ...buttonStyle,
              backgroundColor: '#1e3a5f',
              color: 'white',
              marginTop: '24px',
            }}
          >
            Back to Main Menu
          </button>
        </div>
      );
    }

    if (currentView === 'meeting') {
      return (
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
          <h3 style={{ marginTop: 0, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} /> Request a Meeting
          </h3>
          {formError && <p style={{ color: 'red', fontSize: 14 }}>{formError}</p>}
          <form onSubmit={handleMeetingSubmit} noValidate>
            {/* name */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Your Name *
              </label>
              <input
                type="text"
                style={inputStyle}
                value={meetingData.name || ''}
                onChange={(e) => setMeetingData(prev => ({ ...prev, name: e.target.value }))}
              />
              {meetingErrors.name && <p style={{ color: 'red', fontSize: 12 }}>{meetingErrors.name}</p>}
            </div>
            {/* email */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Your Email *
              </label>
              <input
                type="email"
                style={inputStyle}
                value={meetingData.email || ''}
                onChange={(e) => setMeetingData(prev => ({ ...prev, email: e.target.value }))}
              />
              {meetingErrors.email && <p style={{ color: 'red', fontSize: 12 }}>{meetingErrors.email}</p>}
            </div>
            {/* phone */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Phone *
              </label>
              <input
                type="tel"
                style={inputStyle}
                value={meetingData.phone || ''}
                onChange={(e) => setMeetingData(prev => ({ ...prev, phone: e.target.value }))}
              />
              {meetingErrors.phone && <p style={{ color: 'red', fontSize: 12 }}>{meetingErrors.phone}</p>}
            </div>
            {/* purpose */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Meeting Purpose *
              </label>
              <select
                style={inputStyle}
                value={meetingData.purpose || ''}
                onChange={(e) => setMeetingData(prev => ({ ...prev, purpose: e.target.value }))}
              >
                <option value="">Select</option>
                <option value="Career">Career Discussion</option>
                <option value="Project">Project Inquiry</option>
                <option value="Consultation">Technical Consultation</option>
                <option value="General">General Meeting</option>
              </select>
              {meetingErrors.purpose && <p style={{ color: 'red', fontSize: 12 }}>{meetingErrors.purpose}</p>}
            </div>
            {/* date */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Preferred Date *
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                style={inputStyle}
                value={meetingData.date || ''}
                onChange={(e) => setMeetingData(prev => ({ ...prev, date: e.target.value }))}
              />
              {meetingErrors.date && <p style={{ color: 'red', fontSize: 12 }}>{meetingErrors.date}</p>}
            </div>
            {/* time */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Preferred Time *
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="radio"
                    name="meetingTime"
                    value="Morning"
                    checked={meetingData.time === 'Morning'}
                    onChange={(e) => setMeetingData(prev => ({ ...prev, time: e.target.value }))}
                  />
                  Morning (9 AM - 12 PM)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="radio"
                    name="meetingTime"
                    value="Afternoon"
                    checked={meetingData.time === 'Afternoon'}
                    onChange={(e) => setMeetingData(prev => ({ ...prev, time: e.target.value }))}
                  />
                  Afternoon (2 PM - 5 PM)
                </label>
              </div>
              {meetingErrors.time && <p style={{ color: 'red', fontSize: 12 }}>{meetingErrors.time}</p>}
            </div>
            {/* notes */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Additional Notes
              </label>
              <textarea
                rows="3"
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                value={meetingData.notes || ''}
                onChange={(e) => setMeetingData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  ...buttonStyle,
                  backgroundColor: '#ef5b6c',
                  color: 'white',
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                {isSubmitting ? 'Requesting…' : 'Request'}
              </button>
              <button
                type="button"
                onClick={handleBackToMain}
                style={{
                  ...buttonStyle,
                  backgroundColor: '#6b7280',
                  color: 'white',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      );
    }

    if (currentView === 'meetingSuccess') {
      return (
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h3 style={{ color: '#1e3a5f', marginBottom: '8px' }}>Meeting Requested!</h3>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
            Reference: <strong>{meetingData.meetingId}</strong>
          </p>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
            Our team will send a calendar invite to
            <br />
            <strong>{meetingData.email}</strong>
            <br />
            within 4 business hours.
          </p>
          <p style={{ fontSize: '12px', color: '#ef5b6c', fontWeight: '500' }}>
            📅 Meeting will be with EDCS Team
          </p>
          <button
            onClick={handleBackToMain}
            style={{
              ...buttonStyle,
              backgroundColor: '#1e3a5f',
              color: 'white',
              marginTop: '24px',
            }}
          >
            Back to Main Menu
          </button>
        </div>
      );
    }

    if (currentView === 'checkStatus') {
      return (
        <div style={{ padding: '24px', flex: 1 }}>
          <h3 style={{ marginTop: 0, color: '#1e3a5f' }}>🔍 Check Query Status</h3>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
            Enter your ticket ID to check status:
          </p>
          <input
            type="text"
            placeholder="EDCS-20241118-1234"
            value={checkTicketId}
            onChange={(e) => setCheckTicketId(e.target.value)}
            style={{ ...inputStyle, marginBottom: '16px' }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCheckStatus}
              style={{
                ...buttonStyle,
                backgroundColor: '#ef5b6c',
                color: 'white',
              }}
            >
              Check Status
            </button>
            <button
              onClick={handleBackToMain}
              style={{
                ...buttonStyle,
                backgroundColor: '#6b7280',
                color: 'white',
              }}
            >
              Back
            </button>
          </div>
          <div
            style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              fontSize: '13px',
            }}
          >
          </div>
        </div>
      );
    }

    // default: chat view
    return (
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          backgroundColor: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-end',
              justifyContent:
                message.type === 'user' ? 'flex-end' : 'flex-start',
              animation: 'fadeIn 0.3s ease',
            }}
          >
            {message.type === 'bot' && (
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#ef5b6c',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Bot size={18} />
              </div>
            )}
            <div
              style={{
                maxWidth: '70%',
                padding: '12px',
                borderRadius: '12px',
                whiteSpace: 'pre-line',
                fontSize: '14px',
                lineHeight: '1.5',
                ...(message.type === 'user'
                  ? {
                    background:
                      'linear-gradient(135deg, #ef5b6c 0%, #d94456 100%)',
                    color: 'white',
                    borderBottomRightRadius: '4px',
                    fontWeight: '500',
                  }
                  : {
                    backgroundColor: 'white',
                    color: '#1f2937',
                    boxShadow: '0 2px 4px rgba(30, 58, 95, 0.1)',
                    borderBottomLeftRadius: '4px',
                    border: '1px solid #e2e8f0',
                  }),
              }}
            >
              {message.text}
            </div>
            {message.type === 'user' && (
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#1e3a5f',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <User size={18} />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#ef5b6c',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bot size={18} />
            </div>
            <TypingIndicator />
          </div>
        )}

        {messages.length > 0 &&
          messages[messages.length - 1].type === 'bot' &&
          renderOptions()}

        <div ref={messagesEndRef} />
      </div>
    );
  };

  const styles = {
    floatingButton: {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'linear-gradient(135deg, #ef5b6c 0%, #d94456 100%)',
      color: 'white',
      borderRadius: '50%',
      padding: '16px',
      border: 'none',
      cursor: 'pointer',
      boxShadow: '0 10px 25px rgba(239, 91, 108, 0.4)',
      zIndex: 1000,
      transition: 'all 0.3s ease',
      display: isOpen && !isMinimized ? 'none' : 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    minimizedBar: {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%)',
      color: 'white',
      borderRadius: '25px',
      padding: '12px 20px',
      display: isMinimized ? 'flex' : 'none',
      alignItems: 'center',
      gap: '12px',
      cursor: 'pointer',
      boxShadow: '0 10px 25px rgba(30, 58, 95, 0.4)',
      zIndex: 1000,
      transition: 'all 0.3s ease',
    },
    chatWindow: {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: 'white',
      borderRadius: '16px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
      width: '384px',
      height: '600px',
      display: isOpen && !isMinimized ? 'flex' : 'none',
      flexDirection: 'column',
      zIndex: 1000,
      border: '2px solid #ef5b6c',
      animation: 'slideUp 0.3s ease',
      overflow: 'hidden',
    },
  };

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(-20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        @keyframes confettiFall {
          to { transform: translateY(600px) rotate(720deg); opacity: 0; }
        }
      `}</style>

      <button onClick={() => setIsOpen(true)} style={styles.floatingButton}>
        <MessageCircle size={28} />
      </button>

      <div onClick={handleRestore} style={styles.minimizedBar}>
        <MessageCircle size={20} />
        <span style={{ fontSize: '14px', fontWeight: '500' }}>EDCS Assistant</span>
      </div>

      <div style={styles.chatWindow}>
        <Confetti />

        <div
          style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%)',
            color: 'white',
            padding: '16px',
            borderTopLeftRadius: '14px',
            borderTopRightRadius: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>EVA</h3>
            <p style={{ margin: 0, fontSize: '12px', opacity: 0.95 }}>
              EDCS Assistant
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleMinimize}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Minus size={20} />
            </button>
            <button
              onClick={handleClose}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {renderView()}

        <div
          style={{
            padding: '12px',
            borderTop: '2px solid #e2e8f0',
            backgroundColor: 'white',
            borderBottomLeftRadius: '14px',
            borderBottomRightRadius: '14px',
          }}
        >
          <p
            style={{
              fontSize: '12px',
              color: '#1e3a5f',
              textAlign: 'center',
              margin: 0,
              fontWeight: '500',
            }}
          >
            Powered by EDCS | {currentView === 'chat' ? 'Select options above' : 'Privacy Protected'}
          </p>
        </div>
      </div>
    </>
  );
};

export default EDCSChatbot;
