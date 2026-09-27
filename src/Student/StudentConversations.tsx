import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../config';
import './StudentConversations.css';

type Message = { id: number; staffId: number; staffName: string; roleId: number; body: string; fromStudent: boolean; sentAt: string; readAt?: string | null };
type Recipient = { id: number; name: string; roleId: number };
type Role = { id: number; roleName: string };
const when = (value: string) => new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const api = async (path: string, options?: RequestInit) => {
  const response = await fetch(`${API_BASE_URL}/api/StudentPortal/${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...options?.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Could not load messages.');
  return body;
};
export default function StudentConversations({ initialMessages, initialStaffId = null }: { initialMessages: Message[]; initialStaffId?: number | null }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages || []);
  const [roles, setRoles] = useState<Role[]>([]);
  const [staff, setStaff] = useState<Recipient[]>([]);
  const [roleId, setRoleId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const loadMessages = useCallback(async () => {
    const result = await api('messages');
    setMessages(result.data || []);
  }, []);
  useEffect(() => {
    api('message-recipients').then(result => {
      setRoles(result.data?.roles || []);
      setStaff(result.data?.staff || []);
    }).catch(failure => setError(failure.message));
    void loadMessages().catch(failure => setError(failure.message));
    const timer = window.setInterval(() => void loadMessages().catch(() => {}), 15000);
    return () => window.clearInterval(timer);
  }, [loadMessages]);
  const conversations = useMemo(() => {
    const groups = new Map<number, Message[]>();
    for (const message of messages) groups.set(message.staffId, [...(groups.get(message.staffId) || []), message]);
    return [...groups.entries()].map(([id, thread]) => {
      const latest = thread[thread.length - 1];
      return { staffId: id, staffName: latest.staffName, roleId: latest.roleId,
        lastMessage: latest.body, lastSentAt: latest.sentAt,
        unreadCount: thread.filter(x => !x.fromStudent && !x.readAt).length };
    }).sort((a, b) => new Date(b.lastSentAt).getTime() - new Date(a.lastSentAt).getTime());
  }, [messages]);
  useEffect(() => {
    if (!initialStaffId) return;
    const conversation = conversations.find(item => item.staffId === initialStaffId);
    if (conversation) {
      setRoleId(String(conversation.roleId));
      setStaffId(String(conversation.staffId));
    }
  }, [initialStaffId, conversations]);
  const selectedId = Number(staffId);
  const selectedStaff = staff.find(x => x.id === selectedId);
  const selectedConversation = conversations.find(x => x.staffId === selectedId);
  const thread = messages.filter(x => x.staffId === selectedId);
  const open = async (id: number, recipientRoleId: number) => {
    setRoleId(String(recipientRoleId)); setStaffId(String(id)); setError('');
    if (messages.some(x => x.staffId === id && !x.fromStudent && !x.readAt)) {
      try {
        await api(`messages/${id}/read`, { method: 'POST' });
        setMessages(current => current.map(x => x.staffId === id && !x.fromStudent ? { ...x, readAt: x.readAt || new Date().toISOString() } : x));
      } catch (failure: any) { setError(failure.message || 'Could not mark messages read.'); }
    }
  };
  useEffect(() => {
    if (!selectedId || !messages.some(x => x.staffId === selectedId && !x.fromStudent && !x.readAt)) return;
    void api(`messages/${selectedId}/read`, { method: 'POST' }).then(() =>
      setMessages(current => current.map(x => x.staffId === selectedId && !x.fromStudent ? { ...x, readAt: x.readAt || new Date().toISOString() } : x))
    ).catch(() => {});
  }, [messages, selectedId]);
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!selectedId || !roleId || !body) return;
    setSaving(true); setError('');
    try {
      await api('messages', { method: 'POST', body: JSON.stringify({ recipientRoleId: Number(roleId), staffId: selectedId, body }) });
      setDraft(''); await loadMessages();
    } catch (failure: any) { setError(failure.message || 'Could not send message.'); }
    finally { setSaving(false); }
  };
  return <section className="scv">
    <div className="scv-heading"><h2>Messages</h2><p>Choose a role and staff member. Each person has a separate conversation.</p></div>
    {error && <p className="scv-error" role="alert">{error}</p>}
    <div className="scv-pick"><label>Role<select value={roleId} onChange={event => { setRoleId(event.target.value); setStaffId(''); }}><option value="">Choose role</option>{roles.filter(x => x.id !== 1 && x.id !== 7).map(x => <option key={x.id} value={x.id}>{x.roleName}</option>)}</select></label>
      <label>Staff member<select disabled={!roleId} value={staffId} onChange={event => void open(Number(event.target.value), Number(roleId))}><option value="">Choose staff</option>{staff.filter(x => x.roleId !== 7 && String(x.roleId) === roleId).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      {roleId && !staff.some(x => String(x.roleId) === roleId) && <small>No active staff member is available for this role.</small>}</div>
    <div className="scv-layout"><nav className="scv-list" aria-label="Conversations">{conversations.length ? conversations.map(item => <button type="button" key={item.staffId}
      className={'scv-person' + (item.staffId === selectedId ? ' selected' : '') + (item.unreadCount ? ' unread' : '')}
      onClick={() => void open(item.staffId, item.roleId)}><span><strong>{item.staffName}</strong><small>{roles.find(x => x.id === item.roleId)?.roleName || 'Staff'} · {item.lastMessage}</small></span><span><small>{when(item.lastSentAt)}</small>{item.unreadCount > 0 && <b>{item.unreadCount} new</b>}</span></button>) : <p className="scv-empty">No conversations yet.</p>}</nav>
      <div className="scv-thread">{!selectedId ? <p className="scv-empty">Select a staff member to start or open a conversation.</p> : <><header><h3>{selectedStaff?.name || selectedConversation?.staffName || 'Staff member'}</h3><small>{roles.find(x => String(x.id) === roleId)?.roleName || 'Staff'}</small></header>
        <div className="scv-messages" aria-live="polite">{thread.length ? thread.map(message => <div key={message.id} className={'scv-bubble' + (message.fromStudent ? ' mine' : '')}><p>{message.body}</p><small>{when(message.sentAt)}{message.fromStudent ? message.readAt ? ' · Read' : ' · Sent' : ''}</small></div>) : <p className="scv-empty">No messages yet. Say hello.</p>}</div>
        <form className="scv-compose" onSubmit={event => void send(event)}><textarea aria-label="Write message" rows={2} maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Write a message" /><button className="btn btn-primary" disabled={saving || !draft.trim()}>{saving ? 'Sending...' : 'Send'}</button></form>
      </>}</div>
    </div>
  </section>;
}