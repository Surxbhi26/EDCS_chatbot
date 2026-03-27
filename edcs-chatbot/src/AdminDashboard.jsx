import React, { useState, useEffect } from 'react';
import { apiUrl } from './apiBase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy, limit, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from './firebase';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { curateMenus, curatedCareersAnswers } from './curatedChatbotConfig';
import { chatbotData, answers as defaultAnswers } from './chatbotData';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('email');
  const [emailConfig, setEmailConfig] = useState([]);
  const [editedEmails, setEditedEmails] = useState({});
  const [saveStatus, setSaveStatus] = useState({});
  const [sessions, setSessions] = useState([]);
  const [queue, setQueue] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [showUsageCharts, setShowUsageCharts] = useState(true);
  const [usageRange, setUsageRange] = useState('7d'); // 7d | 15d | month | all
  const [usageSearchDraft, setUsageSearchDraft] = useState('');
  const [usageSearch, setUsageSearch] = useState('');
  const [usageUserTab, setUsageUserTab] = useState('all'); // all | repeated
  const [userDetailsPopup, setUserDetailsPopup] = useState(null);
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
    const now = new Date();
    let start = null;
    if (usageRange === '7d') start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    if (usageRange === '15d') start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);
    if (usageRange === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
    // For "overall", use a month-wise view for the last 12 months (keeps charts fast + readable)
    if (usageRange === 'all') start = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const ticketsBase = [collection(db, 'tickets'), orderBy('created_at', 'desc')];
    const meetingsBase = [collection(db, 'meetings'), orderBy('created_at', 'desc')];

    const unsubTickets = onSnapshot(
      start
        ? query(...ticketsBase, where('created_at', '>=', start.toISOString()), limit(5000))
        : query(...ticketsBase, limit(5000)),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTickets(data);
      }
    );

    const unsubMeetings = onSnapshot(
      start
        ? query(...meetingsBase, where('created_at', '>=', start.toISOString()), limit(5000))
        : query(...meetingsBase, limit(5000)),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setMeetings(data);
      }
    );

    return () => {
      unsubTickets();
      unsubMeetings();
    };
  }, [usageRange]);

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
    const unsub = onSnapshot(
      doc(db, 'chatbot_content', 'main'),
      (snap) => {
        if (snap.exists()) setChatbotContent(snap.data());
      }
    );
    return () => unsub();
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

    // Event counts (derived from session docs)
    const eventCounts = {
      tabClicks: sessions.reduce((sum, s) => sum + (s.tab_clicks_total || 0), 0),
      queries: sessions.reduce((sum, s) => sum + (s.requested_query_count || 0), 0),
      meetings: sessions.reduce((sum, s) => sum + (s.requested_meeting_count || 0), 0),
    };

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
      try {
        await setDoc(doc(db, 'chatbot_content', 'main'), chatbotContent || {});
        setContentSaveMsg('Saved successfully!');
      } catch (firestoreErr) {
        const res = await fetch(apiUrl('/api/chatbot-content'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chatbotContent)
        });
        const data = await res.json();
        if (data.success) setContentSaveMsg('Saved successfully!');
        else setContentSaveMsg('Error saving.');
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
      const res = await fetch(apiUrl('/api/session/end'), {
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
      const res = await fetch(apiUrl('/api/admin/force-cleanup'), {
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
      const res = await fetch(apiUrl('/api/admin/cleanup-all'), {
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

  const subTabStyle = (selected) => ({
    padding: '8px 12px',
    border: `1px solid ${selected ? '#1e3a5f' : '#e2e8f0'}`,
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    backgroundColor: selected ? '#1e3a5f' : 'white',
    color: selected ? 'white' : '#1e3a5f',
    borderRadius: '8px',
  });

  const statusPillStyle = (statusRaw) => {
    const status = String(statusRaw || '').toLowerCase();
    if (status === 'active') {
      return { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac' };
    }
    if (status === 'inactive') {
      return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' };
    }
    return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
  };

  const normalizeSearch = (v) => String(v || '').toLowerCase().trim();

  const sessionSearchText = (s) => {
    const user = s && s.user ? s.user : {};
    const parts = [
      s && s.session_id,
      s && s.status,
      user && user.email,
      user && user.name,
      user && user.phone,
      s && s.email,
      s && s.name,
      s && s.phone,
      user && (user.company || user.companyName || user.company_name),
      s && (s.company || s.companyName || s.company_name),
    ];
    return normalizeSearch(parts.filter(Boolean).join(' '));
  };

  const userSearchText = (u) => {
    const parts = [u && u.email, u && u.name, u && u.phone];
    return normalizeSearch(parts.filter(Boolean).join(' '));
  };

  const applyUsageSearch = () => setUsageSearch(usageSearchDraft.trim());
  const clearUsageSearch = () => {
    setUsageSearch('');
    setUsageSearchDraft('');
  };

  const getSessionDurationSeconds = (s) => {
    const stored = typeof s.duration_seconds === 'number' ? s.duration_seconds : 0;
    if (stored > 0) return stored;
    if (s.status !== 'active' || !s.created_at) return 0;
    const createdMs = new Date(s.created_at).getTime();
    if (Number.isNaN(createdMs)) return 0;
    return Math.max(0, Math.floor((Date.now() - createdMs) / 1000));
  };

  const usageByUser = sessions.reduce((acc, s) => {
    const user = s.user || {};
    const email = user.email || s.email || 'Unknown';
    if (!acc[email]) {
      acc[email] = {
        email,
        name: user.name || s.name || '',
        phone: user.phone || s.phone || '',
        sessions: 0,
        totalDurationSeconds: 0,
        tabClicks: 0,
        queries: 0,
        meetings: 0,
      };
    }
    acc[email].sessions += 1;
    acc[email].totalDurationSeconds += getSessionDurationSeconds(s);
    acc[email].tabClicks += (s.tab_clicks_total || 0);
    acc[email].queries += (s.requested_query_count || 0);
    acc[email].meetings += (s.requested_meeting_count || 0);
    return acc;
  }, {});

  const usageByUserRows = Object.values(usageByUser).sort(
    (a, b) => b.totalDurationSeconds - a.totalDurationSeconds
  );

  const usageSearchNorm = normalizeSearch(usageSearch);
  const visibleSessions = usageSearchNorm
    ? sessions.filter((s) => sessionSearchText(s).includes(usageSearchNorm))
    : sessions;

  const visibleUsageByUserRows = usageSearchNorm
    ? usageByUserRows.filter((u) => userSearchText(u).includes(usageSearchNorm))
    : usageByUserRows;

  const repeatedUsageByUserRows = visibleUsageByUserRows.filter((u) => (u.sessions || 0) > 1);
  const perUserRowsToShow = usageUserTab === 'repeated' ? repeatedUsageByUserRows : visibleUsageByUserRows;

  const rangeStartDate = (() => {
    const now = new Date();
    if (usageRange === '7d') return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    if (usageRange === '15d') return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);
    if (usageRange === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
    if (usageRange === 'all') return new Date(now.getFullYear(), now.getMonth() - 11, 1);
    return null;
  })();

  const filteredSessions = rangeStartDate
    ? sessions.filter((s) => {
      if (!s.created_at) return false;
      const ms = new Date(s.created_at).getTime();
      return !Number.isNaN(ms) && ms >= rangeStartDate.getTime();
    })
    : sessions;

  const totalUsageSeconds = filteredSessions.reduce((sum, s) => sum + getSessionDurationSeconds(s), 0);
  const pendingTickets = tickets.filter(t => String(t.status || '').toLowerCase() === 'pending').length;
  const pendingMeetings = meetings.filter(m => String(m.status || '').toLowerCase() === 'pending').length;

  const topClickedTopics = (() => {
    const idToText = {
      sap: 'SAP Services',
      oracle: 'Oracle Services',
      staffing: 'Managed IT services',
      careers: 'Careers',
      ticket: 'Submit a query',
      meeting: 'Request a meeting',
    };

    const menus = chatbotContent && chatbotContent.menus ? chatbotContent.menus : {};
    Object.entries(menus).forEach(([menuId, menu]) => {
      if (!menu || typeof menu !== 'object') return;
      if (menuId && !idToText[menuId]) idToText[menuId] = menuId;
      (menu.options || []).forEach((opt) => {
        if (opt && opt.id && opt.text) idToText[opt.id] = opt.text;
      });
    });

    const agg = {};
    filteredSessions.forEach((s) => {
      const clicks = s.tab_clicks && typeof s.tab_clicks === 'object' ? s.tab_clicks : {};
      Object.entries(clicks).forEach(([k, v]) => {
        const n = Number(v) || 0;
        const label = idToText[k] || k;
        agg[label] = (agg[label] || 0) + n;
      });
    });
    return Object.entries(agg)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  })();

  const effectiveEditorMenus = chatbotContent
    ? { ...chatbotData, ...(chatbotContent.menus || {}) }
    : chatbotData;
  const curatedEditorMenus = curateMenus(effectiveEditorMenus);
  const editorMainOptions = curatedEditorMenus?.main?.options || [];
  const editorMenuKeysInOrder = editorMainOptions
    .filter((o) => o && o.action === 'menu' && o.id)
    .map((o) => o.id);

  const getEffectiveAnswerText = (answerId) => {
    if (!answerId) return '';
    if (chatbotContent && chatbotContent.answers && chatbotContent.answers[answerId] != null) {
      return chatbotContent.answers[answerId];
    }
    if (defaultAnswers && defaultAnswers[answerId] != null) return defaultAnswers[answerId];
    if (curatedCareersAnswers && curatedCareersAnswers[answerId] != null) return curatedCareersAnswers[answerId];
    return '';
  };

  const activityTrend = (() => {
    const labelDay = (d) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const labelMonth = (d) => d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

    const normalizeDateOnly = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());

    if (usageRange === 'month') {
      const now = new Date();
      const daysInMonthSoFar = now.getDate();

      const weeks = [];
      for (let startDay = 1; startDay <= daysInMonthSoFar; startDay += 7) {
        const endDay = Math.min(daysInMonthSoFar, startDay + 6);
        weeks.push({ startDay, endDay });
      }

      const weekKeyFor = (dt) => {
        const day = dt.getDate();
        const idx = Math.floor((day - 1) / 7) + 1;
        return idx;
      };

      const counts = {};
      weeks.forEach((w, i) => {
        counts[i + 1] = { sessions: 0, queries: 0, meetings: 0, label: `W${i + 1} (${w.startDay}-${w.endDay})` };
      });

      filteredSessions.forEach((s) => {
        if (!s.created_at) return;
        const dt = new Date(s.created_at);
        if (Number.isNaN(dt.getTime())) return;
        const key = weekKeyFor(dt);
        if (counts[key]) counts[key].sessions += 1;
      });
      tickets.forEach((t) => {
        if (!t.created_at) return;
        const dt = new Date(t.created_at);
        if (Number.isNaN(dt.getTime())) return;
        const key = weekKeyFor(dt);
        if (counts[key]) counts[key].queries += 1;
      });
      meetings.forEach((m) => {
        if (!m.created_at) return;
        const dt = new Date(m.created_at);
        if (Number.isNaN(dt.getTime())) return;
        const key = weekKeyFor(dt);
        if (counts[key]) counts[key].meetings += 1;
      });

      return weeks.map((w, i) => ({
        day: counts[i + 1].label,
        sessions: counts[i + 1].sessions,
        queries: counts[i + 1].queries,
        meetings: counts[i + 1].meetings,
      }));
    }

    if (usageRange === 'all') {
      const now = new Date();
      const months = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        return d;
      });

      const counts = {};
      months.forEach((d) => {
        const key = d.getTime();
        counts[key] = { sessions: 0, queries: 0, meetings: 0, label: labelMonth(d) };
      });

      const monthKeyFor = (dt) => new Date(dt.getFullYear(), dt.getMonth(), 1).getTime();

      filteredSessions.forEach((s) => {
        if (!s.created_at) return;
        const dt = new Date(s.created_at);
        if (Number.isNaN(dt.getTime())) return;
        const key = monthKeyFor(dt);
        if (counts[key]) counts[key].sessions += 1;
      });
      tickets.forEach((t) => {
        if (!t.created_at) return;
        const dt = new Date(t.created_at);
        if (Number.isNaN(dt.getTime())) return;
        const key = monthKeyFor(dt);
        if (counts[key]) counts[key].queries += 1;
      });
      meetings.forEach((m) => {
        if (!m.created_at) return;
        const dt = new Date(m.created_at);
        if (Number.isNaN(dt.getTime())) return;
        const key = monthKeyFor(dt);
        if (counts[key]) counts[key].meetings += 1;
      });

      return months.map((d) => {
        const key = d.getTime();
        return {
          day: counts[key].label,
          sessions: counts[key].sessions,
          queries: counts[key].queries,
          meetings: counts[key].meetings,
        };
      });
    }

    // 7d / 15d (daily)
    const daysCount = usageRange === '15d' ? 15 : 7;
    const days = Array.from({ length: daysCount }, (_, i) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - ((daysCount - 1) - i));
      return date;
    });

    const counts = {};
    days.forEach((d) => {
      const key = d.getTime();
      counts[key] = { sessions: 0, queries: 0, meetings: 0, label: labelDay(d) };
    });

    filteredSessions.forEach((s) => {
      if (!s.created_at) return;
      const dt = new Date(s.created_at);
      if (Number.isNaN(dt.getTime())) return;
      const key = normalizeDateOnly(dt).getTime();
      if (counts[key]) counts[key].sessions += 1;
    });
    tickets.forEach((t) => {
      if (!t.created_at) return;
      const dt = new Date(t.created_at);
      if (Number.isNaN(dt.getTime())) return;
      const key = normalizeDateOnly(dt).getTime();
      if (counts[key]) counts[key].queries += 1;
    });
    meetings.forEach((m) => {
      if (!m.created_at) return;
      const dt = new Date(m.created_at);
      if (Number.isNaN(dt.getTime())) return;
      const key = normalizeDateOnly(dt).getTime();
      if (counts[key]) counts[key].meetings += 1;
    });

    return days.map((d) => {
      const key = d.getTime();
      return {
        day: counts[key].label,
        sessions: counts[key].sessions,
        queries: counts[key].queries,
        meetings: counts[key].meetings,
      };
    });
  })();

  const requestStatusData = (items) => {
    const pending = items.filter(x => String(x.status || '').toLowerCase() === 'pending').length;
    const done = Math.max(0, items.length - pending);
    return [
      { name: 'Pending', value: pending },
      { name: 'Other', value: done },
    ];
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
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: 'transparent',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.5)',
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
          <button style={tabStyle('content')} onClick={() => setActiveTab('content')}>
            Chatbot Content
          </button>
          <button style={tabStyle('traffic')} onClick={() => setActiveTab('traffic')}>
            Traffic Analysis
          </button>
          <button style={tabStyle('usage')} onClick={() => setActiveTab('usage')}>
            Usage Tracking
          </button>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '0 8px 8px 8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          padding: '24px'
        }}>

          <div style={{
    backgroundColor: '#fff7ed',
    border: '1px solid #fed7aa',
    borderRadius: '12px',
    padding: '14px 20px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '10px'
}}>
    <div>
        <div style={{ fontSize: '14px', fontWeight: '600',
            color: '#c2410c', marginBottom: '2px' }}>
             Session & Queue Cleanup
        </div>
        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
            Use if queue shows wrong numbers or users are stuck. 
            Auto-cleans every 60 seconds.
        </div>
    </div>
    <div style={{ display: 'flex', gap: '8px', 
        alignItems: 'center', flexWrap: 'wrap' }}>
        <button
            onClick={handleSoftCleanup}
            disabled={cleanupLoading}
            style={{
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600'
            }}
        >
            {cleanupLoading ? 'Cleaning...' : 'Clean Stale Sessions'}
        </button>
        <button
            onClick={handleForceCleanup}
            disabled={cleanupLoading}
            style={{
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600'
            }}
        >
            {cleanupLoading ? 'Clearing...' : 'Force Clear Everything'}
        </button>
        {cleanupStatus && (
            <span style={{
                fontSize: '13px',
                color: cleanupStatus.includes('?') 
                    ? '#ef4444' : '#16a34a',
                fontWeight: '600'
            }}>
                {cleanupStatus}
            </span>
        )}
    </div>
</div>

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
                3) Main Menu (Current Chatbot)
              </h3>
              <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px' }}>
                This section matches the current chatbot flow (SAP, Oracle, Managed IT services, Careers, Submit a query).
                IDs/actions are fixed; you can edit only the text shown to users.
              </p>
              <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px',
                padding: '16px', marginBottom: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px',
                    fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                    Main Menu Greeting Message
                  </label>
                  <textarea rows="2"
                    value={
                      (chatbotContent.menus?.main?.message != null)
                        ? chatbotContent.menus.main.message
                        : (curatedEditorMenus?.main?.message || '')
                    }
                    onChange={e => setChatbotContent(prev => ({
                      ...prev,
                      menus: {
                        ...(prev.menus || {}),
                        main: { ...((prev.menus || {}).main || {}), message: e.target.value }
                      }
                    }))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px',
                      border: '1px solid #e2e8f0', fontSize: '14px',
                      boxSizing: 'border-box', fontFamily: 'inherit',
                      resize: 'vertical' }}
                  />
                </div>
                {editorMainOptions.map((opt) => (
                  <div key={opt.id} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const text = e.target.value;
                        setChatbotContent((prev) => {
                          const existing = (prev.menus?.main?.options || []);
                          const byId = existing.reduce((acc, o) => {
                            if (o && o.id) acc[o.id] = o;
                            return acc;
                          }, {});
                          const nextOptions = curateMenus({ ...chatbotData, ...(prev.menus || {}) }).main.options.map((base) => ({
                            id: base.id,
                            action: base.action,
                            text: base.id === opt.id ? text : (byId[base.id]?.text || base.text),
                          }));

                          return {
                            ...prev,
                            menus: {
                              ...prev.menus,
                              main: {
                                ...(prev.menus?.main || {}),
                                options: nextOptions,
                              }
                            }
                          };
                        });
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '13px',
                        backgroundColor: 'white',
                        color: '#111827',
                      }}
                    />
                    <span style={{ fontSize: '11px', color: '#6b7280',
                      backgroundColor: '#e2e8f0', padding: '4px 8px',
                      borderRadius: '6px', whiteSpace: 'nowrap' }}>
                      {opt.action}
                    </span>
                  </div>
                ))}
                <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '12px', marginBottom: '0' }}>
                  Adding/removing main-menu buttons is disabled in the current chatbot; edit the labels and the sub-menus below.
                </p>
              </div>
              {false && (
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
              )}

              {/* Sub Menus */}
              <h3 style={{ color: '#1e3a5f', marginBottom: '8px',
                paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>
                4) Sub Menus & Answers (In Order)
              </h3>
              <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px' }}>
                These appear after a user clicks a main menu option. Edit them in the same order users see them.
              </p>

              {editorMenuKeysInOrder
                .map((key) => {
                  const effectiveMenu = curatedEditorMenus?.[key] || {};
                  const fromContent = chatbotContent.menus?.[key] || {};
                  const options = Array.isArray(fromContent.options)
                    ? fromContent.options
                    : (Array.isArray(effectiveMenu.options) ? effectiveMenu.options : []);
                  const message = (fromContent.message != null)
                    ? fromContent.message
                    : (effectiveMenu.message || '');
                  return [key, { ...effectiveMenu, ...fromContent, message, options }];
                })
                .map(([menuKey, menu], idx) => (
                  <div key={menuKey} style={{ backgroundColor: '#f8fafc',
                    borderRadius: '12px', padding: '20px', marginBottom: '20px',
                    border: '1px solid #e2e8f0' }}>

                    {/* Menu Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', marginBottom: '14px' }}>
                      <h4 style={{ color: '#1e3a5f', margin: 0,
                        textTransform: 'capitalize', fontSize: '15px' }}>
                        {idx + 1}. {editorMainOptions.find((o) => o.id === menuKey)?.text || menuKey}
                        <span style={{ marginLeft: '8px', color: '#64748b', fontWeight: '700', fontSize: '12px' }}>
                          ({menuKey})
                        </span>
                      </h4>
                      {!['sap','oracle','staffing','company','engagement',
                        'support','contact'].includes(menuKey) && false && (
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
                            ...(prev.menus || {}),
                            [menuKey]: {
                              ...((prev.menus || {})[menuKey] || {}),
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
                                  ...(prev.menus || {}),
                                  [menuKey]: {
                                    ...((prev.menus || {})[menuKey] || {}),
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
                            setChatbotContent((prev) => {
                              const prevMenu = (prev.menus || {})[menuKey] || {};
                              const baseOptions = Array.isArray(prevMenu.options) ? prevMenu.options : (menu.options || []);
                              const updatedOptions = baseOptions.filter((_, i) => i !== optIdx);
                              const updatedAnswers = { ...(prev.answers || {}) };
                              if (opt && opt.id) delete updatedAnswers[opt.id];

                              return {
                                ...prev,
                                answers: updatedAnswers,
                                menus: {
                                  ...(prev.menus || {}),
                                  [menuKey]: {
                                    ...prevMenu,
                                    options: updatedOptions
                                  }
                                }
                              };
                            });
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
                              value={getEffectiveAnswerText(opt.id)}
                              onChange={e => setChatbotContent(prev => ({
                                ...prev,
                                answers: {
                                  ...(prev.answers || {}),
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
                        answers: { ...(prev.answers || {}), [newId]: '' },
                        menus: {
                          ...(prev.menus || {}),
                          [menuKey]: {
                            ...((prev.menus || {})[menuKey] || {}),
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
              {false && (
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
              )}

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

              {/* Bottom Row - Termination */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
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

          {activeTab === 'usage' && (
            <div>
              <h2 style={{ color: '#1e3a5f', marginTop: 0 }}>Usage Tracking</h2>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
                Tracks tabs clicked, query/meeting requests, and time spent per user.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
                {[
                  { label: 'Total Hours', value: (totalUsageSeconds / 3600).toFixed(2), color: '#6366f1' },
                  { label: 'Tab Clicks', value: trafficData.eventCounts.tabClicks || 0, color: '#ef5b6c' },
                  { label: 'Queries', value: trafficData.eventCounts.queries || 0, color: '#1e3a5f' },
                  { label: 'Meetings', value: trafficData.eventCounts.meetings || 0, color: '#22c55e' },
                  { label: 'Pending Requests', value: pendingTickets + pendingMeetings, color: '#f59e0b' },
                ].map((stat, i) => (
                  <div key={i} style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>{stat.label}</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: stat.color }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>Range:</div>
                  <select
                    value={usageRange}
                    onChange={(e) => setUsageRange(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      fontSize: '13px',
                      fontWeight: '700',
                      backgroundColor: 'white',
                      color: '#1e293b',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="7d">Last 7 days (Default)</option>
                    <option value="15d">Last 15 days</option>
                    <option value="month">This month (Weekly)</option>
                    <option value="all">Overall (Monthly)</option>
                  </select>
                  <button
                    onClick={() => setShowUsageCharts(v => !v)}
                    style={{
                      backgroundColor: '#1e3a5f',
                      color: 'white',
                      border: 'none',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '700'
                    }}
                  >
                    {showUsageCharts ? 'Hide charts' : 'Show charts'}
                  </button>
                </div>
              </div>

              {showUsageCharts && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ color: '#1e3a5f', marginTop: 0, marginBottom: '12px' }}>
                      Activity Trend
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={activityTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} />
                        <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                        <Bar dataKey="sessions" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="queries" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="meetings" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                      {usageRange === 'month'
                        ? 'This month grouped by week.'
                        : usageRange === 'all'
                          ? 'Overall grouped by month (last 12 months).'
                          : 'Grouped by day for the selected range.'}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ color: '#1e3a5f', marginTop: 0, marginBottom: '12px' }}>Query Status</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={requestStatusData(tickets)}
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                            labelLine={false}
                            fontSize={11}
                          >
                            <Cell fill="#f59e0b" />
                            <Cell fill="#94a3b8" />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                        Based on tickets created in last 7 days.
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ color: '#1e3a5f', marginTop: 0, marginBottom: '12px' }}>Meeting Status</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={requestStatusData(meetings)}
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                            labelLine={false}
                            fontSize={11}
                          >
                            <Cell fill="#f59e0b" />
                            <Cell fill="#94a3b8" />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                        Based on meeting requests created in last 7 days.
                      </div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ color: '#1e3a5f', marginTop: 0, marginBottom: '12px' }}>Top Clicked Topics</h3>
                    {topClickedTopics.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#6b7280', padding: '28px' }}>
                        No click data yet
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={topClickedTopics} layout="vertical" margin={{ left: 10, right: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                          <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 12, fill: '#64748b' }} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                          <Bar dataKey="value" fill="#ef5b6c" radius={[6, 6, 6, 6]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                      Top clicked topics from sessions created in the selected range.
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h3 style={{ color: '#1e3a5f', marginTop: 0, marginBottom: 0 }}>Per User</h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" style={subTabStyle(usageUserTab === 'all')} onClick={() => setUsageUserTab('all')}>
                      All Users
                    </button>
                    <button type="button" style={subTabStyle(usageUserTab === 'repeated')} onClick={() => setUsageUserTab('repeated')}>
                      Repeated Users
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    value={usageSearchDraft}
                    onChange={(e) => setUsageSearchDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applyUsageSearch();
                    }}
                    placeholder="Search company / person (email, name, phone)"
                    style={{
                      padding: '9px 10px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      minWidth: '280px',
                      fontSize: '13px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={applyUsageSearch}
                    style={{
                      padding: '9px 12px',
                      backgroundColor: '#1e3a5f',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '13px'
                    }}
                  >
                    Search
                  </button>
                  {(usageSearch || usageSearchDraft) && (
                    <button
                      type="button"
                      onClick={clearUsageSearch}
                      style={{
                        padding: '9px 12px',
                        backgroundColor: '#e2e8f0',
                        color: '#1e3a5f',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '13px'
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Phone</th>
                    <th style={thStyle}>Sessions</th>
                    <th style={thStyle}>Hours Used</th>
                    <th style={thStyle}>Tab Clicks</th>
                    <th style={thStyle}>Queries</th>
                    <th style={thStyle}>Meetings</th>
                  </tr>
                </thead>
                <tbody>
                  {perUserRowsToShow.map((u) => (
                    <tr key={u.email}>
                      <td style={tdStyle}>{u.email}</td>
                      <td style={tdStyle}>{u.name}</td>
                      <td style={tdStyle}>{u.phone}</td>
                      <td style={tdStyle}>{u.sessions}</td>
                      <td style={tdStyle}>{(u.totalDurationSeconds / 3600).toFixed(2)}</td>
                      <td style={tdStyle}>{u.tabClicks}</td>
                      <td style={tdStyle}>{u.queries}</td>
                      <td style={tdStyle}>{u.meetings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px' }}>
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ color: '#1e3a5f', marginTop: 0, marginBottom: '10px' }}>
                    Latest Queries (Tickets) {pendingTickets ? `(Pending: ${pendingTickets})` : ''}
                  </h3>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Ticket ID</th>
                        <th style={thStyle}>Status</th>
                        <th style={thStyle}>Customer</th>
                        <th style={thStyle}>Phone</th>
                        <th style={thStyle}>Dept</th>
                        <th style={thStyle}>Preferred</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.slice(0, 10).map((t) => (
                        <tr key={t.ticket_id || t.id}>
                          <td style={tdStyle}>{t.ticket_id}</td>
                          <td style={tdStyle}>{t.status}</td>
                          <td style={tdStyle}>{t.email}</td>
                          <td style={tdStyle}>{t.phone}</td>
                          <td style={tdStyle}>{t.department}</td>
                          <td style={tdStyle}>
                            {t.preferred_date ? `${t.preferred_date} ${t.preferred_time || ''}` : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ color: '#1e3a5f', marginTop: 0, marginBottom: '10px' }}>
                    Latest Meeting Requests {pendingMeetings ? `(Pending: ${pendingMeetings})` : ''}
                  </h3>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Meeting ID</th>
                        <th style={thStyle}>Status</th>
                        <th style={thStyle}>Customer</th>
                        <th style={thStyle}>Phone</th>
                        <th style={thStyle}>Purpose</th>
                        <th style={thStyle}>When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meetings.slice(0, 10).map((m) => (
                        <tr key={m.meeting_id || m.id}>
                          <td style={tdStyle}>{m.meeting_id}</td>
                          <td style={tdStyle}>{m.status}</td>
                          <td style={tdStyle}>{m.email}</td>
                          <td style={tdStyle}>{m.phone}</td>
                          <td style={tdStyle}>{m.purpose}</td>
                          <td style={tdStyle}>{m.date ? `${m.date} ${m.time || ''}` : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <h3 style={{ color: '#1e3a5f', marginTop: '24px', marginBottom: '12px' }}>Per Session</h3>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>S. No.</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>User</th>
                    <th style={thStyle}>Created</th>
                    <th style={thStyle}>Ended</th>
                    <th style={thStyle}>Hours</th>
                    <th style={thStyle}>Tab Clicks</th>
                    <th style={thStyle}>Tabs Clicked</th>
                    <th style={thStyle}>Queries</th>
                    <th style={thStyle}>Meetings</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSessions.map((s, idx) => {
                    const user = s.user || {};
                    const durationSeconds = getSessionDurationSeconds(s);
                    const email = user.email || s.email || 'Unknown';
                    const phone = user.phone || s.phone || '';
                    const rowKey = s.session_id || s.id || `${email}-${idx}`;
                    return (
                      <tr key={rowKey}>
                        <td style={tdStyle}>{idx + 1}</td>
                        <td style={tdStyle}>
                          <span style={{ ...statusPillStyle(s.status), display: 'inline-block', padding: '3px 10px', borderRadius: '999px', fontWeight: 700, fontSize: '12px' }}>
                            {String(s.status || '').toLowerCase() || 'unknown'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <button
                            type="button"
                            onClick={() => setUserDetailsPopup({ email, phone })}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              padding: 0,
                              margin: 0,
                              cursor: 'pointer',
                              color: '#1e3a5f',
                              textDecoration: 'underline',
                              fontSize: '13px',
                              fontWeight: 600
                            }}
                            title="Click to view user details"
                          >
                            {email}
                          </button>
                        </td>
                        <td style={tdStyle}>{s.created_at ? new Date(s.created_at).toLocaleString() : ''}</td>
                        <td style={tdStyle}>{s.ended_at ? new Date(s.ended_at).toLocaleString() : ''}</td>
                        <td style={tdStyle}>{(durationSeconds / 3600).toFixed(2)}</td>
                        <td style={tdStyle}>{s.tab_clicks_total || 0}</td>
                        <td style={tdStyle}>{Array.isArray(s.tabs_clicked) ? s.tabs_clicked.join(', ') : ''}</td>
                        <td style={tdStyle}>{s.requested_query_count || 0}</td>
                        <td style={tdStyle}>{s.requested_meeting_count || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {userDetailsPopup && (
                <div
                  role="dialog"
                  aria-modal="true"
                  onClick={() => setUserDetailsPopup(null)}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    zIndex: 9999
                  }}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '100%',
                      maxWidth: '420px',
                      borderRadius: '14px',
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
                      padding: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontWeight: 800, color: '#1e3a5f', fontSize: '15px' }}>
                        User Details
                      </div>
                      <button
                        type="button"
                        onClick={() => setUserDetailsPopup(null)}
                        style={{
                          border: 'none',
                          background: '#e2e8f0',
                          color: '#0f172a',
                          cursor: 'pointer',
                          borderRadius: '10px',
                          padding: '6px 10px',
                          fontWeight: 800
                        }}
                        aria-label="Close"
                      >
                        Close
                      </button>
                    </div>

                    <div style={{ marginTop: '12px', fontSize: '13px', color: '#334155' }}>
                      <div style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#f8fafc' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>Email</div>
                        <div style={{ marginTop: '4px' }}>{userDetailsPopup.email || 'Unknown'}</div>
                      </div>

                      <div style={{ height: '10px' }} />

                      <div style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#f8fafc' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>Phone</div>
                        <div style={{ marginTop: '4px' }}>{userDetailsPopup.phone || '-'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
