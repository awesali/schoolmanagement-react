import AdminActionIcon from './AdminActionIcon';
import React, { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import { PageLoader } from '../components/Loader/Loader';
import './StudentMessageInbox.css';

type Conversation = { studentId: number; studentName: string; lastMessage: string; lastSentAt: string; lastFromStudent: boolean; unreadCount: number };
type Message = { id: number; body: string; fromStudent: boolean; sentAt: string; readAt?: string | null };
const when = (value: string) => new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const api = async (path: string, options?: RequestInit) => {
  const response = await fetch(`${API_BASE_URL}/api/StaffMessages${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...options?.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Could not load messages.');
  return body;
};

export default function StudentMessageInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const loadList = useCallback(async () => {
    const result = await api('/conversations');
    setConversations(result.data || []);
  }, []);
  const loadThread = useCallback(async (studentId: number) => {
    const result = await api(`/conversations/${studentId}`);
    setMessages(result.data || []);
    await api(`/conversations/${studentId}/read`, { method: 'POST' });
    setConversations(current => current.map(item => item.studentId === studentId ? { ...item, unreadCount: 0 } : item));
  }, []);
  useEffect(() => {
    loadList().catch(failure => setError(failure.message)).finally(() => setLoading(false));
    const timer = window.setInterval(() => {
      void loadList().catch(() => {});
      if (selectedStudentId !== null) void loadThread(selectedStudentId).catch(() => {});
    }, 15000);
    return () => window.clearInterval(timer);
  }, [loadList, loadThread, selectedStudentId]);
  const open = async (studentId: number) => {
    setSelectedStudentId(studentId); setError('');
    try { await loadThread(studentId); } catch (failure: any) { setError(failure.message || 'Could not open conversation.'); }
  };
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (selectedStudentId === null || !body) return;
    setSaving(true); setError('');
    try {
      await api(`/conversations/${selectedStudentId}`, { method: 'POST', body: JSON.stringify({ body }) });
      setDraft('');
      await loadThread(selectedStudentId);
      await loadList();
    } catch (failure: any) { setError(failure.message || 'Could not send message.'); }
    finally { setSaving(false); }
  };
  const selected = conversations.find(item => item.studentId === selectedStudentId);
  return <section className="smi">
    <div className="smi-heading"><div><h2>Student messages</h2><p>Open a conversation to read and reply. New messages move to the top.</p></div></div>
    {error && <p className="smi-error" role="alert">{error}</p>}
    {loading ? <PageLoader label="Loading conversations..." /> : <div className="smi-layout">
      <nav className="smi-list" aria-label="Student conversations">
        {conversations.length ? conversations.map(item => <button type="button" key={item.studentId}
          className={'smi-person' + (item.studentId === selectedStudentId ? ' selected' : '') + (item.unreadCount ? ' unread' : '')}
          onClick={() => void open(item.studentId)}>
          <span className="smi-avatar">{item.studentName.trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase()}</span>
          <span className="smi-person-text"><strong>{item.studentName}</strong><small>{item.lastFromStudent ? '' : 'You: '}{item.lastMessage}</small></span>
          <span className="smi-person-meta"><small>{when(item.lastSentAt)}</small>{item.unreadCount > 0 && <b aria-label={`${item.unreadCount} unread messages`}>{item.unreadCount}</b>}</span>
        </button>) : <p className="smi-empty">No student conversations yet.</p>}
      </nav>
      <div className="smi-thread">{selectedStudentId === null ? <p className="smi-empty">Choose a student to open their conversation.</p> : <>
        <header><h3>{selected?.studentName || 'Student'}</h3><button type="button" onClick={() => { setSelectedStudentId(null); setMessages([]); }}><AdminActionIcon action="close" />Close</button></header>
        <div className="smi-messages" aria-live="polite">{messages.map(message => <div className={'smi-bubble' + (message.fromStudent ? ' incoming' : ' outgoing')} key={message.id}>
          <p>{message.body}</p><small>{when(message.sentAt)}{message.fromStudent ? '' : message.readAt ? ' · Read' : ' · Sent'}</small>
        </div>)}</div>
        <form className="smi-compose" onSubmit={event => void send(event)}><textarea aria-label="Reply to student" rows={2} maxLength={2000} placeholder="Write a reply" value={draft} onChange={event => setDraft(event.target.value)} /><button className="btn btn-primary" disabled={saving || !draft.trim()}><AdminActionIcon action="send" />{saving ? 'Sending...' : 'Send'}</button></form>
      </>}</div>
    </div>}
  </section>;
}