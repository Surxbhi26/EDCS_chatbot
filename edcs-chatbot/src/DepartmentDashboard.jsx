import React, { useState, useEffect, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from './apiBase';

const DEPARTMENTS = ['SAP', 'Oracle DBA', 'HR Department', 'Accounts'];

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  } catch { return dateStr; }
};

const StatusBadge = ({ status }) => {
  const colors = {
    Pending: { bg: '#fee2e2', color: '#dc2626' },
    Approved: { bg: '#dcfce7', color: '#16a34a' },
    Rejected: { bg: '#f3f4f6', color: '#6b7280' },
    Resolved: { bg: '#dcfce7', color: '#16a34a' },
    Scheduled: { bg: '#fef3c7', color: '#d97706' },
    Confirmed: { bg: '#fef3c7', color: '#d97706' },
    Completed: { bg: '#dcfce7', color: '#16a34a' },
    Cancelled: { bg: '#f3f4f6', color: '#6b7280' },
    'In Progress': { bg: '#fef3c7', color: '#d97706' },
  };
  const style = colors[status] || { bg: '#f3f4f6', color: '#6b7280' };
  return (
    <span style={{
      padding: '3px 10px', borderRadius: '12px', fontSize: '11px',
      fontWeight: '600', backgroundColor: style.bg, color: style.color,
      textTransform: 'uppercase', letterSpacing: '0.3px'
    }}>
      {status || 'Pending'}
    </span>
  );
};

const StatsBar = ({ tickets, meetings, activeSubTab }) => {
  const items = activeSubTab === 'tickets' ? tickets : meetings;
  const isTickets = activeSubTab === 'tickets';

  const stats = isTickets ? [
    { label: 'Total Tickets', value: items.length, color: '#6366f1', icon: '🎫' },
    { label: 'Pending', value: items.filter(t => t.status === 'Pending').length, color: '#ef4444', icon: '⏳' },
    { label: 'In Progress', value: items.filter(t => t.status === 'In Progress').length, color: '#f59e0b', icon: '🔄' },
    { label: 'Resolved', value: items.filter(t => t.status === 'Resolved').length, color: '#22c55e', icon: '✅' },
  ] : [
    { label: 'Total Meetings', value: items.length, color: '#6366f1', icon: '📅' },
    { label: 'Scheduled', value: items.filter(m => m.status === 'Scheduled' || m.status === 'Pending').length, color: '#ef4444', icon: '📆' },
    { label: 'Confirmed', value: items.filter(m => m.status === 'Confirmed').length, color: '#f59e0b', icon: '✔️' },
    { label: 'Completed', value: items.filter(m => m.status === 'Completed').length, color: '#22c55e', icon: '🎉' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
      {stats.map((s, i) => (
        <div key={i} style={{
          backgroundColor: 'white', borderRadius: '12px', padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            backgroundColor: s.color, display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '22px'
          }}>
            {s.icon}
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>{s.value}</div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

const EmailModal = ({ data, onClose, onSend }) => {
  const [to, setTo] = useState(data.to || '');
  const [cc, setCc] = useState(data.cc || '');
  const [subject, setSubject] = useState(data.subject || '');
  const [body, setBody] = useState(data.body || '');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    await onSend({ to, cc, subject, body });
    setSending(false);
  };

  const inputStyle = {
    width: '100%', padding: '10px', borderRadius: '8px',
    border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box',
    fontFamily: 'inherit'
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(15,23,42,0.6)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '16px', padding: '28px',
        width: '580px', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 25px 80px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#1e3a5f', fontSize: '18px' }}>📧 Send Email</h3>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '16px' }}>×</button>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>To *</label>
          <input style={inputStyle} value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>CC</label>
          <input style={inputStyle} value={cc} onChange={e => setCc(e.target.value)} />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Subject *</label>
          <input style={inputStyle} value={subject} onChange={e => setSubject(e.target.value)} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Message *</label>
          <textarea rows="8" style={{ ...inputStyle, resize: 'vertical' }} value={body} onChange={e => setBody(e.target.value)} />
        </div>
        <div style={{ backgroundColor: '#eff6ff', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: '#1e40af', borderLeft: '4px solid #2563eb' }}>
          💡 The message will be sent from the EDCS support email.
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
          <button onClick={handleSend} disabled={sending} style={{ flex: 1, padding: '10px', backgroundColor: '#1e3a5f', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
            {sending ? 'Sending...' : '📧 Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
};

const NewMeetingModal = ({ onClose, onCreate }) => {
  const [form, setForm] = useState({ title: '', datetime: '', duration: 60, attendees: '', link: '', agenda: '' });
  const [creating, setCreating] = useState(false);

  const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit' };

  const handleCreate = async () => {
    if (!form.title || !form.datetime) { alert('Please fill required fields'); return; }
    setCreating(true);
    await onCreate(form);
    setCreating(false);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15,23,42,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '28px', width: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 80px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#1e3a5f' }}>📅 Schedule New Meeting</h3>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '16px' }}>×</button>
        </div>
        {[
          { label: 'Meeting Title *', key: 'title', type: 'text', placeholder: 'e.g., Q4 Strategy Review' },
          { label: 'Date & Time *', key: 'datetime', type: 'datetime-local' },
          { label: 'Duration (minutes)', key: 'duration', type: 'number' },
          { label: 'Meeting Link', key: 'link', type: 'text', placeholder: 'https://zoom.us/...' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>{f.label}</label>
            <input type={f.type} placeholder={f.placeholder || ''} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={inputStyle} />
          </div>
        ))}
        {[
          { label: 'Attendees (comma-separated emails)', key: 'attendees', placeholder: 'john@example.com, jane@example.com' },
          { label: 'Agenda / Notes', key: 'agenda', placeholder: 'Meeting agenda...' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>{f.label}</label>
            <textarea rows="3" placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        ))}
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleCreate} disabled={creating} style={{ flex: 1, padding: '10px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
            {creating ? 'Creating...' : '✨ Create Meeting'}
          </button>
        </div>
      </div>
    </div>
  );
};

const DepartmentTab = ({ department }) => {
  const [subTab, setSubTab] = useState('tickets');
  const [tickets, setTickets] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [emailModal, setEmailModal] = useState(null);
  const [newMeetingModal, setNewMeetingModal] = useState(false);
  const [replyOpen, setReplyOpen] = useState({});
  const [replyText, setReplyText] = useState({});
  const [actionStatus, setActionStatus] = useState({});
  const [loading, setLoading] = useState(true);

  const loadTickets = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/api/tickets/department/${encodeURIComponent(department)}`));
      const data = await res.json();
      if (data.success) setTickets(data.tickets);
    } catch (err) { console.error(err); }
  }, [department]);

  const loadMeetings = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/api/meetings/department/${encodeURIComponent(department)}`));
      const data = await res.json();
      if (data.success) setMeetings(data.meetings);
    } catch (err) { console.error(err); }
  }, [department]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadTickets(), loadMeetings()]);
      setLoading(false);
    };
    load();
  }, [loadTickets, loadMeetings]);

  const matchesTime = (dateStr, filter) => {
    if (filter === 'all') return true;
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (filter === 'today') return date >= today;
    if (filter === 'week') return date >= new Date(today - 7 * 86400000);
    if (filter === 'month') return date >= new Date(today - 30 * 86400000);
    if (filter === 'older') return date < new Date(today - 30 * 86400000);
    return true;
  };

  const filteredTickets = tickets.filter(t => {
    const text = `${t.ticket_id} ${t.name} ${t.email} ${t.description}`.toLowerCase();
    return text.includes(search.toLowerCase()) &&
      (statusFilter === 'all' || t.status === statusFilter) &&
      matchesTime(t.created_at, timeFilter);
  });

  const filteredMeetings = meetings.filter(m => {
    const text = `${m.meeting_id} ${m.name || ''} ${m.email || ''} ${m.purpose || ''}`.toLowerCase();
    return text.includes(search.toLowerCase()) &&
      (statusFilter === 'all' || m.status === statusFilter) &&
      matchesTime(m.created_at, timeFilter);
  });

  const updateTicketStatus = async (ticket_id, status) => {
    await fetch(apiUrl(`/api/ticket/${ticket_id}/update`), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    setActionStatus(p => ({ ...p, [ticket_id]: status }));
    loadTickets();
  };

  const updateMeetingStatus = async (meeting_id, status) => {
    await fetch(apiUrl(`/api/meeting/${meeting_id}/update`), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    loadMeetings();
  };

  const deleteTicket = async (ticket_id) => {
    if (!window.confirm('Delete this ticket? This cannot be undone.')) return;
    await fetch(apiUrl(`/api/ticket/${ticket_id}/delete`), { method: 'DELETE' });
    loadTickets();
  };

  const deleteMeeting = async (meeting_id) => {
    if (!window.confirm('Delete this meeting? This cannot be undone.')) return;
    await fetch(apiUrl(`/api/meeting/${meeting_id}/delete`), { method: 'DELETE' });
    loadMeetings();
  };

  const openTicketEmail = (ticket) => {
    const body = `Dear ${ticket.name},\n\nThank you for contacting EDCS support.\n\n🎫 Ticket ID: ${ticket.ticket_id}\n📂 Category: ${ticket.category}\n⚡ Priority: ${ticket.priority}\n📊 Status: ${ticket.status}\n\nYour Query:\n${ticket.description}\n\nOur Response:\n${ticket.response || 'Our team is currently reviewing your request.'}\n\nBest regards,\nEDCS Support Team\nExpora Database Consulting Pvt. Ltd India`;
    setEmailModal({ type: 'ticket', id: ticket.ticket_id, to: ticket.email, cc: '', subject: `Update on Ticket ${ticket.ticket_id}: ${ticket.category}`, body });
  };

  const openMeetingEmail = (meeting) => {
    const displayTitle = meeting.title || meeting.purpose || 'Meeting';
    const displayDateTime = meeting.datetime ? formatDate(meeting.datetime) : (meeting.date && meeting.time ? `${meeting.date} at ${meeting.time}` : 'TBD');
    const body = `Dear ${meeting.name || 'Attendee'},\n\nYou are invited to the following meeting:\n\n📋 Meeting: ${displayTitle}\n🆔 Meeting ID: ${meeting.meeting_id}\n📅 Date & Time: ${displayDateTime}\n⏱️ Duration: ${meeting.duration || 60} minutes\n🔗 Meeting Link: ${meeting.link || 'Will be provided'}\n\nAgenda:\n${meeting.agenda || meeting.notes || 'No agenda provided'}\n\nBest regards,\nEDCS Support Team\nExpora Database Consulting Pvt. Ltd India`;
    const attendees = (meeting.attendees || '').split(',').map(e => e.trim()).filter(e => e);
    setEmailModal({ type: 'meeting', id: meeting.meeting_id, to: attendees[0] || meeting.email || '', cc: attendees.slice(1).join(', '), subject: `Meeting Invitation: ${displayTitle}`, body });
  };

  const handleSendEmail = async ({ to, cc, subject, body }) => {
    const endpoint = emailModal.type === 'ticket'
      ? apiUrl(`/api/ticket/${emailModal.id}/send-email`)
      : apiUrl(`/api/meeting/${emailModal.id}/send-email`);
    try {
      const res = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, cc, subject, body })
      });
      const data = await res.json();
      if (data.success) { alert('✅ Email sent successfully!'); setEmailModal(null); }
      else alert('❌ Failed to send email: ' + data.message);
    } catch (err) { alert('❌ Error sending email'); }
  };

  const handleCreateMeeting = async (form) => {
    try {
      const res = await fetch(apiUrl('/api/meeting/create'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, department, status: 'Scheduled' })
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Meeting created! ID: ${data.meeting_id}`);
        setNewMeetingModal(false);
        loadMeetings();
      } else alert('❌ Failed: ' + data.message);
    } catch (err) { alert('❌ Error creating meeting'); }
  };

  const sendReply = async (ticket) => {
    const body = replyText[ticket.ticket_id] || '';
    if (!body.trim()) return;
    try {
      await fetch(`http://localhost:5000/api/ticket/${ticket.ticket_id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: ticket.email,
          cc: '',
          subject: `Re: Your Query ${ticket.ticket_id} - ${ticket.category}`,
          body: `Dear ${ticket.name},\n\nThank you for contacting EDCS Support.\n\nTicket ID: ${ticket.ticket_id}\nCategory: ${ticket.category}\nPriority: ${ticket.priority}\nStatus: ${ticket.status}\n\nOur Response:\n${body}\n\nIf you have further questions, please submit a new query through our chatbot.\n\nBest regards,\nEDCS Support Team\nExpora Database Consulting Pvt. Ltd India`
        })
      });
      setActionStatus(p => ({ 
        ...p, [`reply_${ticket.ticket_id}`]: 'Sent!' 
      }));
      setReplyOpen(p => ({ 
        ...p, [ticket.ticket_id]: false 
      }));
      setReplyText(p => ({ 
        ...p, [ticket.ticket_id]: '' 
      }));
    } catch (err) { 
      console.error(err); 
    }
  };

  const inputStyle = { padding: '10px 14px', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '14px', backgroundColor: '#f8fafc', outline: 'none' };
  const btnStyle = (bg) => ({ backgroundColor: bg, color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', marginRight: '4px', marginBottom: '4px' });

  const ticketStatuses = ['all', 'Pending', 'In Progress', 'Resolved'];
  const meetingStatuses = ['all', 'Pending', 'Scheduled', 'Confirmed', 'Completed', 'Cancelled'];

  return (
    <div>
      {emailModal && <EmailModal data={emailModal} onClose={() => setEmailModal(null)} onSend={handleSendEmail} />}
      {newMeetingModal && <NewMeetingModal onClose={() => setNewMeetingModal(false)} onCreate={handleCreateMeeting} />}

      <StatsBar tickets={tickets} meetings={meetings} activeSubTab={subTab} />

      <div style={{ display: 'flex', gap: '8px', marginBottom: '0', backgroundColor: 'white', borderRadius: '12px 12px 0 0', padding: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
        {['tickets', 'meetings'].map(t => (
          <button key={t} onClick={() => { setSubTab(t); setStatusFilter('all'); setSearch(''); }} style={{ padding: '12px 24px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', backgroundColor: subTab === t ? '#1e3a5f' : 'transparent', color: subTab === t ? 'white' : '#64748b', transition: 'all 0.2s' }}>
            {t === 'tickets' ? '🎫 Support Tickets' : '📅 Meeting Schedule'}
          </button>
        ))}
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '0 0 12px 12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', borderTop: 'none' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }}>🔍</span>
            <input placeholder={`Search ${subTab}...`} value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, width: '100%', paddingLeft: '36px', boxSizing: 'border-box' }} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inputStyle}>
            {(subTab === 'tickets' ? ticketStatuses : meetingStatuses).map(s => (
              <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</option>
            ))}
          </select>
          <select value={timeFilter} onChange={e => setTimeFilter(e.target.value)} style={inputStyle}>
            {['all', 'today', 'week', 'month', 'older'].map(t => (
              <option key={t} value={t}>{t === 'all' ? 'All Time' : t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
          {subTab === 'meetings' && (
            <button onClick={() => setNewMeetingModal(true)} style={{ ...btnStyle('#22c55e'), padding: '10px 18px', fontSize: '14px' }}>+ New Meeting</button>
          )}
          <button onClick={() => { loadTickets(); loadMeetings(); window.location.reload(); }} style={{ ...btnStyle('#1e3a5f'), padding: '10px 18px', fontSize: '14px' }}>↻ Refresh</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>⏳ Loading...</div>
        ) : subTab === 'tickets' ? (
          filteredTickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', fontSize: '16px' }}>📭 No tickets found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredTickets.map(ticket => (
                <div key={ticket.ticket_id} style={{ border: ticket.priority === 'Urgent' ? '2px solid #ef4444' : '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', backgroundColor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '16px', fontWeight: '700', color: '#1e3a5f' }}>#{ticket.ticket_id}</span>
                      {ticket.priority === 'Urgent' && <span style={{ backgroundColor: '#ef4444', color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>⚠️ URGENT</span>}
                    </div>
                    <StatusBadge status={ticket.status} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #1e3a5f' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>👤 Customer</div>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{ticket.name}</div>
                      <div style={{ color: '#64748b', fontSize: '13px' }}>{ticket.email}</div>
                      {ticket.phone && <div style={{ color: '#64748b', fontSize: '13px' }}>{ticket.phone}</div>}
                    </div>
                    <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #1e3a5f' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>📋 Details</div>
                      <div style={{ fontSize: '13px', color: '#374151' }}><strong>Category:</strong> {ticket.category}</div>
                      <div style={{ fontSize: '13px', color: '#374151' }}><strong>Priority:</strong> <span style={{ color: ticket.priority === 'Urgent' ? '#dc2626' : '#d97706', fontWeight: '600' }}>{ticket.priority}</span></div>
                      <div style={{ fontSize: '13px', color: '#374151' }}><strong>Created:</strong> {formatDate(ticket.created_at)}</div>
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #64748b', marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>💬 Query</div>
                    <div style={{ fontSize: '14px', color: '#4a5568', lineHeight: '1.6' }}>{ticket.description}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select defaultValue={ticket.status} onChange={e => updateTicketStatus(ticket.ticket_id, e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '13px', backgroundColor: '#f8fafc' }}>
                      {['Pending', 'In Progress', 'Resolved'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={() => openTicketEmail(ticket)} style={btnStyle('#1e3a5f')}>📧 Email</button>
                    <button onClick={() => setReplyOpen(p => ({ ...p, [ticket.ticket_id]: !p[ticket.ticket_id] }))} style={btnStyle('#6366f1')}>💬 Reply</button>
                    <button onClick={() => deleteTicket(ticket.ticket_id)} style={btnStyle('#ef4444')}>🗑️ Delete</button>
                    {actionStatus[`reply_${ticket.ticket_id}`] && <span style={{ color: 'green', fontSize: '12px' }}>{actionStatus[`reply_${ticket.ticket_id}`]}</span>}
                  </div>
                  {replyOpen[ticket.ticket_id] && (
                    <div style={{ marginTop: '12px', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                      <textarea rows="3" placeholder="Type your reply..." value={replyText[ticket.ticket_id] || ''} onChange={e => setReplyText(p => ({ ...p, [ticket.ticket_id]: e.target.value }))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }} />
                      <button onClick={() => sendReply(ticket)} style={{ ...btnStyle('#1e3a5f'), marginTop: '8px', padding: '8px 16px' }}>Send Reply</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          filteredMeetings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', fontSize: '16px' }}>📭 No meetings found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredMeetings.map(meeting => (
                <div key={meeting.meeting_id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', backgroundColor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid #f1f5f9' }}>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: '#1e3a5f' }}>#{meeting.meeting_id}</span>
                    <StatusBadge status={meeting.status} />
                  </div>
                  {(meeting.name || meeting.email) && (
                    <div style={{ backgroundColor: '#eff6ff', padding: '12px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', color: '#1e40af', borderLeft: '4px solid #2563eb' }}>
                      📋 <strong>Customer:</strong> {meeting.name} | {meeting.phone || 'No phone'} | {meeting.email}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #1e3a5f' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>📅 Details</div>
                      <div style={{ fontSize: '13px', color: '#374151' }}><strong>Purpose:</strong> {meeting.purpose || meeting.title || 'N/A'}</div>
                      <div style={{ fontSize: '13px', color: '#374151' }}><strong>Date:</strong> {meeting.date || formatDate(meeting.datetime)}</div>
                      <div style={{ fontSize: '13px', color: '#374151' }}><strong>Time:</strong> {meeting.time || 'N/A'}</div>
                      <div style={{ fontSize: '13px', color: '#374151' }}><strong>Duration:</strong> {meeting.duration || 60} min</div>
                    </div>
                    <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #1e3a5f' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>📝 Notes</div>
                      <div style={{ fontSize: '13px', color: '#374151' }}>{meeting.notes || meeting.agenda || 'No notes'}</div>
                      {meeting.link && <div style={{ marginTop: '6px' }}><a href={meeting.link} target="_blank" rel="noreferrer" style={{ color: '#1e3a5f', fontSize: '13px', fontWeight: '600' }}>🔗 Join Meeting</a></div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <select defaultValue={meeting.status} onChange={e => updateMeetingStatus(meeting.meeting_id, e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '13px', backgroundColor: '#f8fafc' }}>
                      {['Pending', 'Scheduled', 'Confirmed', 'Completed', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={() => openMeetingEmail(meeting)} style={btnStyle('#1e3a5f')}>📧 Email</button>
                    <button onClick={() => deleteMeeting(meeting.meeting_id)} style={btnStyle('#ef4444')}>🗑️ Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

const DepartmentDashboard = () => {
  const [activeTab, setActiveTab] = useState('SAP');
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%)',
        color: 'white', padding: '20px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 4px 20px rgba(30,58,95,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', backgroundColor: '#ef5b6c', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>📊</div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '700' }}>EDCS Support Dashboard</div>
            <div style={{ fontSize: '13px', opacity: 0.85 }}>Expora Database Consulting Pvt. Ltd India</div>
          </div>
        </div>
        <button onClick={handleLogout} style={{ backgroundColor: '#ef5b6c', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
          Logout
        </button>
      </div>

      <div style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '0', backgroundColor: 'white', borderRadius: '12px', padding: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', width: 'fit-content' }}>
          {DEPARTMENTS.map(dept => (
            <button key={dept} onClick={() => setActiveTab(dept)} style={{
              padding: '12px 22px', border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontSize: '14px', fontWeight: '600', transition: 'all 0.2s',
              backgroundColor: activeTab === dept ? '#1e3a5f' : 'transparent',
              color: activeTab === dept ? 'white' : '#64748b',
              boxShadow: activeTab === dept ? '0 4px 15px rgba(30,58,95,0.3)' : 'none'
            }}>
              {dept === 'SAP' ? '⚙️' : dept === 'Oracle DBA' ? '🗄️' : dept === 'HR Department' ? '👥' : '💰'} {dept}
            </button>
          ))}
        </div>

        <div style={{ marginTop: '20px' }}>
          <DepartmentTab key={activeTab} department={activeTab} />
        </div>
      </div>
    </div>
  );
};

export default DepartmentDashboard;
