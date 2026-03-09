import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from './firebase';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('email');
  const [emailConfig, setEmailConfig] = useState([]);
  const [editedEmails, setEditedEmails] = useState({});
  const [saveStatus, setSaveStatus] = useState({});
  const [sessions, setSessions] = useState([]);
  const [queue, setQueue] = useState([]);
  const [cleanupStatus, setCleanupStatus] = useState('');
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [chatbotContent, setChatbotContent] = useState(null);
  const [contentSaving, setContentSaving] = useState(false);
  const [contentSaveMsg, setContentSaveMsg] = useState('');
  const [trafficData, setTrafficData] = useState({
    sessionsByDay: [],
    eventCounts: {},
    peakHours: [],
    totalSessions: 0,
    activeSessions: 0,
    avgSessionsPerDay: 0,
    terminationReasons: []
  });
  const [serviceAvailable, setServiceAvailable] = useState(true);
  const [serviceToggling, setServiceToggling] = useState(false);
  const [showInactiveSessions, setShowInactiveSessions] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'email_config'), (snap) => {
      const data = snap.docs.map(d => d.data());
      setEmailConfig(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'sessions'), (snap) => {
      const data = snap.docs.map(d => d.data());
      setSessions(data.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      ));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'queue'), orderBy('joined_at', 'asc')),
      (snap) => {
        const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setQueue(entries);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    fetch('http://localhost:5000/api/chatbot-content')
      .then(res => res.json())
      .then(data => {
        if (data.success) setChatbotContent(data.content);
      });
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'chatbot_config', 'settings'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setServiceAvailable(data.service_available !== false);
        }
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (sessions.length === 0) return;

    // Sessions by day
    const dayMap = {};
    sessions.forEach(s => {
      if (!s.created_at) return;
      const day = new Date(s.created_at).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short'
      });
      dayMap[day] = (dayMap[day] || 0) + 1;
    });
    const sessionsByDay = Object.entries(dayMap)
      .map(([day, count]) => ({ day, sessions: count }))
      .slice(-14);

    // Event counts (logs removed)
    const eventCounts = {};

    // Peak hours
    const hourMap = {};
    sessions.forEach(s => {
      if (!s.created_at) return;
      const hour = new Date(s.created_at).getHours();
      hourMap[hour] = (hourMap[hour] || 0) + 1;
    });
    const peakHours = Array.from({ length: 24 }, (_, h) => ({
      hour: `${h}:00`,
      sessions: hourMap[h] || 0
    }));

    // Termination reasons
    const reasonMap = {};
    sessions.forEach(s => {
      if (s.terminated_reason) {
        reasonMap[s.terminated_reason] = (reasonMap[s.terminated_reason] || 0) + 1;
      }
    });
    const terminationReasons = Object.entries(reasonMap).map(([name, value]) => ({ name, value }));

    // Stats
    const totalSessions = sessions.length;
    const activeSessions = sessions.filter(s => s.status === 'active').length;
    const days = Object.keys(dayMap).length || 1;
    const avgSessionsPerDay = Math.round(totalSessions / days);

    setTrafficData({
      sessionsByDay,
      eventCounts,
      peakHours,
      totalSessions,
      activeSessions,
      avgSessionsPerDay,
      terminationReasons
    });
  }, [sessions]);

  const handleSaveChatbotContent = async () => {
    setContentSaving(true);
    try {
      const res = await fetch('http://localhost:5000/api/chatbot-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatbotContent)
      });
      const data = await res.json();
      if (data.success) {
        setContentSaveMsg('Saved successfully!');
      } else {
        setContentSaveMsg('Error saving.');
      }
    } catch (err) {
      setContentSaveMsg('Error saving.');
    }
    setContentSaving(false);
    setTimeout(() => setContentSaveMsg(''), 3000);
  };

  const handleSaveEmail = async (department_name) => {
    const newEmail = editedEmails[department_name];
    if (!newEmail) return;
    try {
      await setDoc(doc(db, 'email_config', department_name), {
        department_name,
        email_id: newEmail
      });
      setSaveStatus(prev => ({ ...prev, [department_name]: 'Saved!' }));
      setTimeout(() => setSaveStatus(prev => ({ ...prev, [department_name]: '' })), 2000);
    } catch (err) {
      setSaveStatus(prev => ({ ...prev, [department_name]: 'Error saving' }));
    }
  };

  const handleTerminateSession = async (session_id) => {
    if (!window.confirm('Terminate this session?')) return;
    try {
      const res = await fetch('http://localhost:5000/api/session/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session_id,
          reason: 'terminated_by_admin'
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Session terminated successfully.');
      }
    } catch (err) {
      console.error('Error terminating session:', err);
      alert('Error terminating session.');
    }
  };

  const handleToggleService = async () => {
    setServiceToggling(true);
    try {
      await setDoc(
        doc(db, 'chatbot_config', 'settings'),
        { service_available: !serviceAvailable },
        { merge: true }
      );
    } catch (err) {
      console.error('Error toggling service:', err);
      alert('Error updating service availability.');
    }
    setServiceToggling(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const handleRefreshAll = () => {
    window.location.reload();
  };

  const handleForceCleanup = async () => {
    if (!window.confirm(
      'This will clear ALL active sessions and the entire queue. ' +
      'Any users currently chatting will be disconnected. Continue?'
    )) return;
    setCleanupLoading(true);
    setCleanupStatus('');
    try {
      const res = await fetch('http://localhost:5000/api/admin/force-cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setCleanupStatus(
          `✅ Cleared ${data.sessions_cleared} sessions and ${data.queue_cleared} queue entries.`
        );
      } else {
        setCleanupStatus('❌ Error: ' + data.message);
      }
    } catch (err) {
      setCleanupStatus('❌ Failed to connect to server.');
    }
    setCleanupLoading(false);
  };

  const handleSoftCleanup = async () => {
    setCleanupLoading(true);
    setCleanupStatus('');
    try {
      const res = await fetch('http://localhost:5000/api/admin/cleanup-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear_queue: true })
      });
      const data = await res.json();
      if (data.success) {
        setCleanupStatus(
          `✅ Cleaned ${data.sessions_terminated} stale sessions and ${data.queue_cleared} queue entries.`
        );
      } else {
        setCleanupStatus('❌ Error occurred.');
      }
    } catch (err) {
      setCleanupStatus('❌ Failed to connect to server.');
    }
    setCleanupLoading(false);
  };

  const tabStyle = (tab) => ({
    padding: '10px 20px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    backgroundColor: activeTab === tab ? '#1e3a5f' : '#e2e8f0',
    color: activeTab === tab ? 'white' : '#1e3a5f',
    borderRadius: '8px 8px 0 0',
    marginRight: '4px'
  });

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px'
  };

  const thStyle = {
    backgroundColor: '#1e3a5f',
    color: 'white',
    padding: '10px 12px',
    textAlign: 'left',
    fontWeight: '500'
  };

  const tdStyle = {
    padding: '10px 12px',
    borderBottom: '1px solid #e2e8f0',
    color: '#374151'
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <div style={{
        backgroundColor: '#1e3a5f',
        color: 'white',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
          EDCS Admin Dashboard
        </h1>
        <div>
          <button
            onClick={handleRefreshAll}
            style={{
              backgroundColor: 'transparent',
              color: 'white',
              border: '1px solid white',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              marginRight: '8px'
            }}
          >
            ↻ Refresh
          </button>
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: '#ef5b6c',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '0' }}>
          <button style={tabStyle('email')} onClick={() => setActiveTab('email')}>
            Email Config
          </button>
          <button style={tabStyle('sessions')} onClick={() => setActiveTab('sessions')}>
            Sessions
          </button>
          <button style={tabStyle('queue')} onClick={() => setActiveTab('queue')}>
            Queue
          </button>
          <button style={tabStyle('content')} onClick={() => setActiveTab('content')}>
            Chatbot Content
          </button>
          <button style={tabStyle('traffic')} onClick={() => setActiveTab('traffic')}>
            Traffic Analysis
          </button>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '0 8px 8px 8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          padding: '24px'
        }}>

          {activeTab === 'email' && (
            <div>
              <h2 style={{ color: '#1e3a5f', marginTop: 0 }}>Email Configuration</h2>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
                Update department email IDs. Changes take effect immediately.
              </p>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Department</th>
                    <th style={thStyle}>Current Email</th>
                    <th style={thStyle}>New Email</th>
                    <th style={thStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {emailConfig.map((item) => (
                    <tr key={item.department_name}>
                      <td style={tdStyle}>{item.department_name}</td>
                      <td style={tdStyle}>{item.email_id}</td>
                      <td style={tdStyle}>
                        <input
                          type="email"
                          placeholder="Enter new email"
                          value={editedEmails[item.department_name] || ''}
                          onChange={(e) => setEditedEmails(prev => ({
                            ...prev,
                            [item.department_name]: e.target.value
                          }))}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            fontSize: '13px',
                            width: '220px'
                          }}
                        />
                      </td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => handleSaveEmail(item.department_name)}
                          style={{
                            backgroundColor: '#1e3a5f',
                            color: 'white',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                          Save
                        </button>
                        {saveStatus[item.department_name] && (
                          <span style={{
                            marginLeft: '8px',
                            color: saveStatus[item.department_name] === 'Saved!' 
                              ? 'green' : 'red',
                            fontSize: '12px'
                          }}>
                            {saveStatus[item.department_name]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div>
              <h2 style={{ color: '#1e3a5f', marginTop: 0 }}>
                Active Sessions ({sessions.filter(s => s.status === 'active').length} active)
              </h2>

              {/* Service availability toggle - keep existing */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: serviceAvailable ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${serviceAvailable ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '16px'
              }}>
                <div>
                  <div style={{
                    fontSize: '15px', fontWeight: '600',
                    color: serviceAvailable ? '#16a34a' : '#dc2626'
                  }}>
                    {serviceAvailable ? '🟢 Chatbot is Online' : '🔴 Chatbot is Offline'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                    {serviceAvailable
                      ? 'Users can currently access the chatbot.'
                      : 'Chatbot is disabled. Users will see an offline message.'}
                  </div>
                </div>
                <button
                  onClick={handleToggleService}
                  disabled={serviceToggling}
                  style={{
                    backgroundColor: serviceAvailable ? '#ef4444' : '#16a34a',
                    color: 'white', border: 'none',
                    padding: '10px 24px', borderRadius: '8px',
                    cursor: 'pointer', fontSize: '14px', fontWeight: '600'
                  }}
                >
                  {serviceToggling ? 'Updating...' : serviceAvailable ? 'Take Offline' : 'Bring Online'}
                </button>
              </div>

              {/* Cleanup card */}
              <div style={{
                backgroundColor: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#c2410c', marginBottom: '4px' }}>
                  🧹 Session & Queue Cleanup
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '14px' }}>
                  Use if queue shows wrong numbers or users are stuck. Auto-cleans every 60 seconds.
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button onClick={handleSoftCleanup} disabled={cleanupLoading}
                    style={{ backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                    {cleanupLoading ? 'Cleaning...' : '🧹 Clean Stale Sessions'}
                  </button>
                  <button onClick={handleForceCleanup} disabled={cleanupLoading}
                    style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                    {cleanupLoading ? 'Clearing...' : '⚠️ Force Clear Everything'}
                  </button>
                  {cleanupStatus && (
                    <span style={{ fontSize: '13px', color: cleanupStatus.includes('❌') ? '#ef4444' : '#16a34a', fontWeight: '600' }}>
                      {cleanupStatus}
                    </span>
                  )}
                </div>
              </div>

              {/* Toggle inactive sessions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>
                  🔴 Live — updates automatically
                </span>
                <button
                  onClick={() => setShowInactiveSessions(prev => !prev)}
                  style={{ padding: '6px 14px', backgroundColor: showInactiveSessions ? '#1e3a5f' : '#e2e8f0', color: showInactiveSessions ? 'white' : '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
                >
                  {showInactiveSessions ? 'Hide Inactive' : 'Show Inactive'}
                </button>
              </div>

              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Session ID</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Last Active</th>
                    <th style={thStyle}>Terminated Reason</th>
                    <th style={thStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions
                    .filter(s => showInactiveSessions ? true : s.status === 'active')
                    .length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#6b7280', fontSize: '14px' }}>
                        {showInactiveSessions ? 'No sessions found' : 'No active sessions right now'}
                      </td>
                    </tr>
                  ) : (
                    sessions
                      .filter(s => showInactiveSessions ? true : s.status === 'active')
                      .map((s) => (
                        <tr key={s.session_id}>
                          <td style={tdStyle}>{s.session_id?.substring(0, 8)}...</td>
                          <td style={tdStyle}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '12px', fontSize: '12px',
                              backgroundColor: s.status === 'active' ? '#dcfce7' : '#f3f4f6',
                              color: s.status === 'active' ? '#16a34a' : '#6b7280'
                            }}>
                              {s.status}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            {s.last_active ? new Date(s.last_active).toLocaleString() : '-'}
                          </td>
                          <td style={tdStyle}>{s.terminated_reason || '-'}</td>
                          <td style={tdStyle}>
                            {s.status === 'active' && (
                              <button
                                onClick={() => handleTerminateSession(s.session_id)}
                                style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                              >
                                Terminate
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'queue' && (
            <div>
              <h2 style={{ color: '#1e3a5f', marginTop: 0 }}>
                Queue ({queue.filter(q => q.status === 'waiting').length} waiting)
              </h2>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
                Real-time queue. Updates automatically as users join or are admitted.
              </p>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Position</th>
                    <th style={thStyle}>Queue ID</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Joined At</th>
                    <th style={thStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{
                        textAlign: 'center', padding: '40px',
                        color: '#6b7280', fontSize: '14px'
                      }}>
                        No one in queue
                      </td>
                    </tr>
                  ) : (
                    queue.map((q, index) => (
                      <tr key={q.id}>
                        <td style={tdStyle}>{index + 1}</td>
                        <td style={tdStyle}>{q.queue_id?.substring(0, 8)}...</td>
                        <td style={tdStyle}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            backgroundColor: q.status === 'waiting' ? '#fef3c7' : '#dcfce7',
                            color: q.status === 'waiting' ? '#d97706' : '#16a34a'
                          }}>
                            {q.status}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          {q.joined_at ? new Date(q.joined_at).toLocaleString() : '-'}
                        </td>
                        <td style={tdStyle}>
                          <button
                            onClick={async () => {
                              await deleteDoc(doc(db, 'queue', q.id));
                            }}
                            style={{
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              padding: '4px 12px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'content' && chatbotContent && (
            <div>
              <h2 style={{ color: '#1e3a5f', marginTop: 0 }}>
                Chatbot Content Editor
              </h2>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
                Edit all chatbot text, menus, answers and company details.
                Changes take effect immediately after saving.
              </p>

              {/* General Settings */}
              <h3 style={{ color: '#1e3a5f', marginBottom: '16px',
                paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>
                General Settings
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: '16px', marginBottom: '16px' }}>
                {[
                  { label: 'Bot Name', key: 'botName' },
                  { label: 'Company Name', key: 'companyName' },
                  { label: 'Support Email', key: 'supportEmail' },
                  { label: 'Footer Text', key: 'footerText' },
                ].map(field => (
                  <div key={field.key}>
                    <label style={{ display: 'block', fontSize: '13px',
                      fontWeight: '600', color: '#1e3a5f', marginBottom: '6px' }}>
                      {field.label}
                    </label>
                    <input type="text"
                      value={chatbotContent[field.key] || ''}
                      onChange={e => setChatbotContent(prev => ({
                        ...prev, [field.key]: e.target.value
                      }))}
                      style={{ width: '100%', padding: '10px',
                        borderRadius: '8px', border: '1px solid #e2e8f0',
                        fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px',
                  fontWeight: '600', color: '#1e3a5f', marginBottom: '6px' }}>
                  Company Address
                </label>
                <textarea rows="2"
                  value={chatbotContent.companyAddress || ''}
                  onChange={e => setChatbotContent(prev => ({
                    ...prev, companyAddress: e.target.value
                  }))}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px',
                    border: '1px solid #e2e8f0', fontSize: '14px',
                    boxSizing: 'border-box', fontFamily: 'inherit',
                    resize: 'vertical' }}
                />
              </div>

              {/* Welcome Messages */}
              <h3 style={{ color: '#1e3a5f', marginBottom: '16px',
                paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>
                Welcome Messages
              </h3>
              <div style={{ marginBottom: '24px' }}>
                {(chatbotContent.welcomeMessages || []).map((msg, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px',
                    marginBottom: '8px' }}>
                    <input type="text" value={msg}
                      onChange={e => {
                        const updated = [...chatbotContent.welcomeMessages];
                        updated[idx] = e.target.value;
                        setChatbotContent(prev => ({
                          ...prev, welcomeMessages: updated
                        }));
                      }}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px',
                        border: '1px solid #e2e8f0', fontSize: '14px' }}
                    />
                    <button onClick={() => {
                      const updated = chatbotContent.welcomeMessages
                        .filter((_, i) => i !== idx);
                      setChatbotContent(prev => ({
                        ...prev, welcomeMessages: updated
                      }));
                    }} style={{ padding: '8px 14px', backgroundColor: '#ef4444',
                      color: 'white', border: 'none', borderRadius: '8px',
                      cursor: 'pointer', fontSize: '13px' }}>
                      Remove
                    </button>
                  </div>
                ))}
                <button onClick={() => setChatbotContent(prev => ({
                  ...prev,
                  welcomeMessages: [...(prev.welcomeMessages || []), '']
                }))} style={{ padding: '8px 16px', backgroundColor: '#1e3a5f',
                  color: 'white', border: 'none', borderRadius: '8px',
                  cursor: 'pointer', fontSize: '13px' }}>
                  + Add Welcome Message
                </button>
              </div>

              {/* Main Menu Options */}
              <h3 style={{ color: '#1e3a5f', marginBottom: '8px',
                paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>
                Main Menu Options
              </h3>
              <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px' }}>
                These are the buttons users see first when they open the chatbot.
                You can edit button text, add new buttons, or remove existing ones.
              </p>
              <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px',
                padding: '16px', marginBottom: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px',
                    fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                    Main Menu Greeting Message
                  </label>
                  <textarea rows="2"
                    value={chatbotContent.menus?.main?.message || ''}
                    onChange={e => setChatbotContent(prev => ({
                      ...prev,
                      menus: {
                        ...prev.menus,
                        main: { ...prev.menus.main, message: e.target.value }
                      }
                    }))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px',
                      border: '1px solid #e2e8f0', fontSize: '14px',
                      boxSizing: 'border-box', fontFamily: 'inherit',
                      resize: 'vertical' }}
                  />
                </div>
                {(chatbotContent.menus?.main?.options || []).map((opt, optIdx) => (
                  <div key={opt.id} style={{ display: 'flex', gap: '8px',
                    marginBottom: '8px', alignItems: 'center' }}>
                    <input type="text" value={opt.text}
                      onChange={e => {
                        const updatedOptions = [
                          ...chatbotContent.menus.main.options
                        ];
                        updatedOptions[optIdx] = {
                          ...updatedOptions[optIdx],
                          text: e.target.value
                        };
                        setChatbotContent(prev => ({
                          ...prev,
                          menus: {
                            ...prev.menus,
                            main: {
                              ...prev.menus.main,
                              options: updatedOptions
                            }
                          }
                        }));
                      }}
                      style={{ flex: 1, padding: '8px 10px',
                        borderRadius: '8px', border: '1px solid #e2e8f0',
                        fontSize: '13px' }}
                    />
                    <span style={{ fontSize: '11px', color: '#6b7280',
                      backgroundColor: '#e2e8f0', padding: '4px 8px',
                      borderRadius: '6px', whiteSpace: 'nowrap' }}>
                      {opt.action}
                    </span>
                    {!['ticket','meeting','checkStatus'].includes(opt.action) && (
                      <button onClick={() => {
                        const updatedOptions =
                          chatbotContent.menus.main.options
                            .filter((_, i) => i !== optIdx);
                        setChatbotContent(prev => ({
                          ...prev,
                          menus: {
                            ...prev.menus,
                            main: {
                              ...prev.menus.main,
                              options: updatedOptions
                            }
                          }
                        }));
                      }} style={{ padding: '6px 10px',
                        backgroundColor: '#ef4444', color: 'white',
                        border: 'none', borderRadius: '6px',
                        cursor: 'pointer', fontSize: '12px' }}>
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ backgroundColor: '#eff6ff', borderRadius: '10px',
                padding: '16px', marginBottom: '24px', border: '1px solid #bfdbfe' }}>
                <p style={{ color: '#374151', fontSize: '13px', fontWeight: '600',
                  marginTop: 0, marginBottom: '8px' }}>
                  Add a button directly to main menu
                </p>
                <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '12px' }}>
                  Choose what happens when user clicks the button:
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button onClick={() => {
                    const btnText = window.prompt(
                      'Enter the button text shown to user\n' +
                      '(e.g. \"🎓 Training Services\"):'
                    );
                    if (!btnText || !btnText.trim()) return;
                    const sectionName = window.prompt(
                      'Enter a section name for this button\n' +
                      '(e.g. \"training\") — no spaces, lowercase only:'
                    );
                    if (!sectionName || !sectionName.trim()) return;
                    const key = sectionName.trim()
                      .toLowerCase()
                      .replace(/\\s+/g, '_')
                      .replace(/[^a-z0-9_]/g, '');
                    if (!key) {
                      alert('Invalid name.');
                      return;
                    }
                    if (chatbotContent.menus[key]) {
                      alert('A section with this name already exists.');
                      return;
                    }
                    const newMainOption = {
                      id: key,
                      text: btnText.trim(),
                      action: 'menu'
                    };
                    const updatedMainOptions = [
                      ...(chatbotContent.menus.main?.options || [])
                    ];
                    const insertIdx = updatedMainOptions.findIndex(
                      o => ['ticket','meeting','checkStatus'].includes(o.action)
                    );
                    if (insertIdx === -1) {
                      updatedMainOptions.push(newMainOption);
                    } else {
                      updatedMainOptions.splice(insertIdx, 0, newMainOption);
                    }
                    setChatbotContent(prev => ({
                      ...prev,
                      menus: {
                        ...prev.menus,
                        main: {
                          ...prev.menus.main,
                          options: updatedMainOptions
                        },
                        [key]: { message: '', options: [] }
                      }
                    }));
                    alert(
                      `✅ Button \"${btnText}\" added to main menu!\\n\\n` +
                      `Scroll down to find the \"${key}\" section to add ` +
                      `options and answers to it.\\n\\n` +
                      `Click Save All Changes when done.`
                    );
                  }} style={{ padding: '10px 18px', backgroundColor: '#1e3a5f',
                    color: 'white', border: 'none', borderRadius: '8px',
                    cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                    + Add Button → Opens Sub Menu
                  </button>

                  <button onClick={() => {
                    const btnText = window.prompt(
                      'Enter the button text shown to user\n' +
                      '(e.g. \"📞 Call Us\"):'
                    );
                    if (!btnText || !btnText.trim()) return;
                    const answerId = `main_${Date.now()}`;
                    const answerText = window.prompt(
                      'Enter the answer shown when user clicks this button:'
                    );
                    if (answerText === null) return;
                    const newMainOption = {
                      id: answerId,
                      text: btnText.trim(),
                      action: 'answer'
                    };
                    const updatedMainOptions = [
                      ...(chatbotContent.menus.main?.options || [])
                    ];
                    const insertIdx = updatedMainOptions.findIndex(
                      o => ['ticket','meeting','checkStatus'].includes(o.action)
                    );
                    if (insertIdx === -1) {
                      updatedMainOptions.push(newMainOption);
                    } else {
                      updatedMainOptions.splice(insertIdx, 0, newMainOption);
                    }
                    setChatbotContent(prev => ({
                      ...prev,
                      answers: {
                        ...prev.answers,
                        [answerId]: answerText.trim()
                      },
                      menus: {
                        ...prev.menus,
                        main: {
                          ...prev.menus.main,
                          options: updatedMainOptions
                        }
                      }
                    }));
                    alert(
                      `✅ Button \"${btnText}\" added to main menu!\\n\\n` +
                      `You can edit the answer text in the main menu ` +
                      `options list above.\\n\\n` +
                      `Click Save All Changes when done.`
                    );
                  }} style={{ padding: '10px 18px', backgroundColor: '#6366f1',
                    color: 'white', border: 'none', borderRadius: '8px',
                    cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                    + Add Button → Shows Answer Directly
                  </button>
                </div>
                <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '12px',
                  marginBottom: '0' }}>
                  Note: Submit a Query, Request a Meeting, and Check Query Status
                  buttons cannot be removed as they are core features.
                </p>
              </div>

              {/* Sub Menus */}
              <h3 style={{ color: '#1e3a5f', marginBottom: '8px',
                paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>
                Sub Menus & Answers
              </h3>
              <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px' }}>
                Each sub menu appears when a user clicks a main menu button.
                You can edit the message, edit option text, add new options,
                and write the answer for each option.
              </p>

              {chatbotContent.menus && Object.entries(chatbotContent.menus)
                .filter(([key]) => key !== 'main')
                .map(([menuKey, menu]) => (
                  <div key={menuKey} style={{ backgroundColor: '#f8fafc',
                    borderRadius: '12px', padding: '20px', marginBottom: '20px',
                    border: '1px solid #e2e8f0' }}>

                    {/* Menu Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', marginBottom: '14px' }}>
                      <h4 style={{ color: '#1e3a5f', margin: 0,
                        textTransform: 'capitalize', fontSize: '15px' }}>
                        📂 {menuKey}
                      </h4>
                      {!['sap','oracle','staffing','company','engagement',
                        'support','contact'].includes(menuKey) && (
                        <button onClick={() => {
                          if (!window.confirm(
                            `Delete entire "${menuKey}" menu section? ` +
                            `This will also remove its button from main menu.`
                          )) return;
                          // Remove from menus
                          const updatedMenus = { ...chatbotContent.menus };
                          delete updatedMenus[menuKey];
                          // Remove from main menu options
                          const updatedMainOptions =
                            (chatbotContent.menus.main?.options || [])
                              .filter(opt => opt.id !== menuKey);
                          updatedMenus.main = {
                            ...updatedMenus.main,
                            options: updatedMainOptions
                          };
                          setChatbotContent(prev => ({
                            ...prev, menus: updatedMenus
                          }));
                        }} style={{ padding: '6px 14px',
                          backgroundColor: '#ef4444', color: 'white',
                          border: 'none', borderRadius: '8px',
                          cursor: 'pointer', fontSize: '13px',
                          fontWeight: '600' }}>
                          🗑️ Delete This Section
                        </button>
                      )}
                    </div>

                    {/* Menu Message */}
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '13px',
                        fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                        Menu Message (shown when user opens this section)
                      </label>
                      <textarea rows="2"
                        value={menu.message || ''}
                        onChange={e => setChatbotContent(prev => ({
                          ...prev,
                          menus: {
                            ...prev.menus,
                            [menuKey]: {
                              ...prev.menus[menuKey],
                              message: e.target.value
                            }
                          }
                        }))}
                        style={{ width: '100%', padding: '10px',
                          borderRadius: '8px', border: '1px solid #e2e8f0',
                          fontSize: '14px', boxSizing: 'border-box',
                          fontFamily: 'inherit', resize: 'vertical' }}
                      />
                    </div>

                    {/* Options and Answers together */}
                    <label style={{ display: 'block', fontSize: '13px',
                      fontWeight: '600', color: '#374151', marginBottom: '10px' }}>
                      Options & Answers
                    </label>

                    {(menu.options || []).map((opt, optIdx) => (
                      <div key={opt.id} style={{ backgroundColor: 'white',
                        borderRadius: '10px', padding: '14px',
                        marginBottom: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', gap: '8px',
                          marginBottom: '10px', alignItems: 'center' }}>
                          <input type="text"
                            placeholder="Button text shown to user"
                            value={opt.text}
                            onChange={e => {
                              const updatedOptions = [...menu.options];
                              updatedOptions[optIdx] = {
                                ...updatedOptions[optIdx],
                                text: e.target.value
                              };
                              setChatbotContent(prev => ({
                                ...prev,
                                menus: {
                                  ...prev.menus,
                                  [menuKey]: {
                                    ...prev.menus[menuKey],
                                    options: updatedOptions
                                  }
                                }
                              }));
                            }}
                            style={{ flex: 1, padding: '8px 10px',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                              fontSize: '13px', fontWeight: '500' }}
                          />
                          <span style={{ fontSize: '11px', color: '#6b7280',
                            backgroundColor: '#e2e8f0', padding: '4px 8px',
                            borderRadius: '6px', whiteSpace: 'nowrap' }}>
                            {opt.action}
                          </span>
                          <button onClick={() => {
                            const updatedOptions = menu.options
                              .filter((_, i) => i !== optIdx);
                            // Also remove the answer
                            const updatedAnswers = {
                              ...chatbotContent.answers
                            };
                            delete updatedAnswers[opt.id];
                            setChatbotContent(prev => ({
                              ...prev,
                              answers: updatedAnswers,
                              menus: {
                                ...prev.menus,
                                [menuKey]: {
                                  ...prev.menus[menuKey],
                                  options: updatedOptions
                                }
                              }
                            }));
                          }} style={{ padding: '6px 10px',
                            backgroundColor: '#ef4444', color: 'white',
                            border: 'none', borderRadius: '6px',
                            cursor: 'pointer', fontSize: '12px' }}>
                            Remove
                          </button>
                        </div>
                        {opt.action === 'answer' && (
                          <div>
                            <label style={{ display: 'block',
                              fontSize: '12px', color: '#6b7280',
                              marginBottom: '6px' }}>
                              Answer shown to user when they click
                              this button:
                            </label>
                            <textarea rows="4"
                              placeholder="Type the answer for this option..."
                              value={chatbotContent.answers?.[opt.id] || ''}
                              onChange={e => setChatbotContent(prev => ({
                                ...prev,
                                answers: {
                                  ...prev.answers,
                                  [opt.id]: e.target.value
                                }
                              }))}
                              style={{ width: '100%', padding: '10px',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                fontSize: '13px',
                                boxSizing: 'border-box',
                                fontFamily: 'inherit',
                                resize: 'vertical',
                                backgroundColor: '#fafafa' }}
                            />
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add Option Button */}
                    <button onClick={() => {
                      const optText = window.prompt(
                        'Enter the button text that users will see:'
                      );
                      if (!optText || !optText.trim()) return;
                      const newId = `${menuKey}_${Date.now()}`;
                      const newOpt = {
                        id: newId,
                        text: optText.trim(),
                        action: 'answer'
                      };
                      const updatedOptions = [
                        ...(menu.options || []), newOpt
                      ];
                      setChatbotContent(prev => ({
                        ...prev,
                        answers: { ...prev.answers, [newId]: '' },
                        menus: {
                          ...prev.menus,
                          [menuKey]: {
                            ...prev.menus[menuKey],
                            options: updatedOptions
                          }
                        }
                      }));
                    }} style={{ padding: '8px 16px',
                      backgroundColor: '#6366f1', color: 'white',
                      border: 'none', borderRadius: '8px',
                      cursor: 'pointer', fontSize: '13px',
                      fontWeight: '600' }}>
                      + Add Option to this Section
                    </button>
                  </div>
                ))}

              {/* Add New Section Button */}
              <div style={{ backgroundColor: '#eff6ff', borderRadius: '12px',
                padding: '20px', marginBottom: '24px',
                border: '1px solid #bfdbfe' }}>
                <h4 style={{ color: '#1e3a5f', marginTop: 0, marginBottom: '8px' }}>
                  + Add New Menu Section
                </h4>
                <p style={{ color: '#6b7280', fontSize: '13px',
                  marginBottom: '14px' }}>
                  Creates a new section and automatically adds a button
                  for it in the main menu.
                </p>
                <button onClick={() => {
                  const sectionName = window.prompt(
                    'Enter the name for the new section\n' +
                    '(e.g. "Training Services"):'
                  );
                  if (!sectionName || !sectionName.trim()) return;
                  const key = sectionName.trim()
                    .toLowerCase()
                    .replace(/\s+/g, '_')
                    .replace(/[^a-z0-9_]/g, '');
                  if (!key) {
                    alert('Invalid name. Use letters and spaces only.');
                    return;
                  }
                  if (chatbotContent.menus[key]) {
                    alert('A section with this name already exists.');
                    return;
                  }
                  const buttonText = window.prompt(
                    'Enter the button text shown in main menu\n' +
                    '(e.g. "🎓 Training Services"):'
                  );
                  if (!buttonText || !buttonText.trim()) return;

                  // Add to menus
                  const newMenu = { message: '', options: [] };
                  // Add button to main menu
                  const newMainOption = {
                    id: key,
                    text: buttonText.trim(),
                    action: 'menu'
                  };
                  const updatedMainOptions = [
                    ...(chatbotContent.menus.main?.options || [])
                  ];
                  // Insert before ticket/meeting/checkStatus options
                  const insertIdx = updatedMainOptions.findIndex(
                    o => ['ticket','meeting','checkStatus']
                      .includes(o.action)
                  );
                  if (insertIdx === -1) {
                    updatedMainOptions.push(newMainOption);
                  } else {
                    updatedMainOptions.splice(insertIdx, 0, newMainOption);
                  }

                  setChatbotContent(prev => ({
                    ...prev,
                    menus: {
                      ...prev.menus,
                      main: {
                        ...prev.menus.main,
                        options: updatedMainOptions
                      },
                      [key]: newMenu
                    }
                  }));
                  alert(
                    `✅ Section "${sectionName}" created!\n\n` +
                    `A button "${buttonText}" has been added to the ` +
                    `main menu.\n\nNow add options and answers to this ` +
                    `section, then click Save All Changes.`
                  );
                }} style={{ padding: '12px 24px', backgroundColor: '#1e3a5f',
                  color: 'white', border: 'none', borderRadius: '8px',
                  cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                  + Add New Section
                </button>
              </div>

              {/* Save Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px',
                position: 'sticky', bottom: '0', backgroundColor: 'white',
                padding: '16px 0', borderTop: '2px solid #e2e8f0' }}>
                <button onClick={handleSaveChatbotContent}
                  disabled={contentSaving}
                  style={{ padding: '12px 32px', backgroundColor: '#1e3a5f',
                    color: 'white', border: 'none', borderRadius: '8px',
                    cursor: 'pointer', fontSize: '15px', fontWeight: '600' }}>
                  {contentSaving ? 'Saving...' : '💾 Save All Changes'}
                </button>
                {contentSaveMsg && (
                  <span style={{
                    color: contentSaveMsg.includes('Error')
                      ? '#ef4444' : '#16a34a',
                    fontSize: '14px', fontWeight: '600' }}>
                    {contentSaveMsg}
                  </span>
                )}
              </div>
            </div>
          )}

          {activeTab === 'traffic' && (
            <div>
              <h2 style={{ color: '#1e3a5f', marginTop: 0 }}>Traffic Analysis</h2>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
                Real-time overview of chatbot usage and session activity.
              </p>

              {/* Summary Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
                {[
                  { label: 'Total Sessions', value: trafficData.totalSessions, color: '#6366f1', icon: '💬' },
                  { label: 'Active Now', value: trafficData.activeSessions, color: '#22c55e', icon: '🟢' },
                  { label: 'Avg Per Day', value: trafficData.avgSessionsPerDay, color: '#f59e0b', icon: '📊' },
                  { label: 'Total Events', value: Object.values(trafficData.eventCounts).reduce((a, b) => a + b, 0), color: '#ef4444', icon: '⚡' },
                ].map((stat, i) => (
                  <div key={i} style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                      {stat.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '26px', fontWeight: '700', color: '#1e293b' }}>{stat.value}</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>{stat.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sessions by Day Chart */}
              <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ color: '#1e3a5f', marginTop: 0, marginBottom: '16px', fontSize: '15px' }}>Sessions Over Last 14 Days</h3>
                {trafficData.sessionsByDay.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>No session data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={trafficData.sessionsByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                      <Line type="monotone" dataKey="sessions" stroke="#1e3a5f" strokeWidth={2} dot={{ fill: '#1e3a5f', r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Peak Hours Chart */}
              <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ color: '#1e3a5f', marginTop: 0, marginBottom: '16px', fontSize: '15px' }}>Peak Usage Hours</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={trafficData.peakHours}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} interval={2} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="sessions" fill="#ef5b6c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Bottom Row - Events and Termination */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Event Breakdown */}
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ color: '#1e3a5f', marginTop: 0, marginBottom: '16px', fontSize: '15px' }}>Event Breakdown</h3>
                  {Object.entries(trafficData.eventCounts).length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>No events yet</div>
                  ) : (
                    Object.entries(trafficData.eventCounts).map(([event, count]) => (
                      <div key={event} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '13px', color: '#374151', backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '6px' }}>{event}</span>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e3a5f' }}>{count}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Termination Reasons */}
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ color: '#1e3a5f', marginTop: 0, marginBottom: '16px', fontSize: '15px' }}>Session Termination Reasons</h3>
                  {trafficData.terminationReasons.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>No terminated sessions yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={trafficData.terminationReasons} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={11}>
                          {trafficData.terminationReasons.map((_, index) => (
                            <Cell key={index} fill={['#1e3a5f', '#ef5b6c', '#f59e0b', '#22c55e', '#6366f1'][index % 5]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

