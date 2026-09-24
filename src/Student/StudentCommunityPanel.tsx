import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { API_BASE_URL } from '../config';
import { PageLoader } from '../components/Loader/Loader';

type Row = Record<string, any>;
export type CommunityView = 'Clubs' | 'Classmates' | 'House' | 'Discussions' | 'Lost & Found' | 'ID Card' | 'Events' | 'Library' | 'Transport';
export default function StudentCommunityPanel({ view, events = [], books = [], profile = {} }: { view: CommunityView; events?: Row[]; books?: Row[]; profile?: Row }) {
  const [data, setData] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [thread, setThread] = useState<Row | null>(null);
  const [posts, setPosts] = useState<Row[]>([]);
  const [postBody, setPostBody] = useState('');
  const [lostForm, setLostForm] = useState({ kind: 'Lost', title: '', description: '' });
  const [qr, setQr] = useState('');
  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
  const load = async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/StudentCommunity/overview`, { headers: headers() });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Could not load student services.');
      setData(body.data);
    } catch (failure: any) { setError(failure.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (view !== 'ID Card' || !data?.identityToken) return;
    QRCode.toDataURL(`school-student:${data.identityToken}`, { width: 180, margin: 2 }).then(setQr).catch(() => setError('Could not generate ID code.'));
  }, [view, data?.identityToken]);
  const post = async (path: string, payload?: object) => {
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/StudentCommunity/${path}`, { method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload || {}) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Could not save.');
      setNotice(body.message || 'Saved.'); await load(); return true;
    } catch (failure: any) { setError(failure.message); return false; }
    finally { setSaving(false); }
  };
  const openThread = async (item: Row) => {
    setThread(item); setError('');
    try { const response = await fetch(`${API_BASE_URL}/api/StudentCommunity/discussions/${item.id}/posts`, { headers: headers() }); const body = await response.json(); if (!response.ok) throw new Error(body.message || 'Could not load discussion.'); setPosts(body.data || []); }
    catch (failure: any) { setError(failure.message); }
  };
  const panel = (title: string, content: React.ReactNode) => <section className="sp-panel"><div className="sp-panel-title"><h2>{title}</h2></div>{content}</section>;
  const empty = (message: string) => <div className="sp-empty">{message}</div>;
  return <div className="sp-community">
    {loading && <PageLoader label="Loading student services…"/>}
    {error && <div className="sp-error" role="alert">{error}<button onClick={() => void load()}>Retry</button></div>}
    {notice && <div className="sp-notice" role="status">{notice}</div>}
    {data && view === 'Classmates' && panel('My classmates', data.classmates?.length ? <><p>Names and roll numbers for your section only.</p>{data.classmates.map((x: Row, i: number) => <div className="sp-line" key={i}><strong>{x.studentName}</strong><span>Roll {x.rollNumber || '—'}</span></div>)}</> : empty('No classmates found.'))}
    {data && view === 'House' && panel('My house', data.house ? <div className="sp-stats sp-stats-three"><div><small>House</small><strong>{data.house.name}</strong></div><div><small>Points</small><strong>{data.house.points}</strong></div></div> : empty('Your school has not assigned a house.'))}
    {data && view === 'Clubs' && panel('Activities and clubs', data.clubs?.length ? data.clubs.map((x: Row) => <article className="sp-record" key={x.id}><h3>{x.name}</h3><p>{x.description}</p><small>{x.schedule || 'Schedule to be announced'} · {x.coordinator || 'Coordinator to be announced'}</small><div className="sp-record-foot">{data.memberships.includes(x.id) ? <span className="sp-tag">Joined</span> : <button disabled={saving} onClick={() => void post(`clubs/${x.id}/join`)}>Join club</button>}</div></article>) : empty('No clubs available yet.'))}
    {data && view === 'Events' && panel('Event registration', events.length ? events.map(x => <div className="sp-line" key={x.id}><div><strong>{x.title}</strong><small>{String(x.eventDate || '').slice(0, 10)}</small></div>{data.registrations.includes(x.id) ? <span className="sp-tag">Registered</span> : new Date(x.eventDate) >= new Date(new Date().toDateString()) && <button className="btn" disabled={saving} onClick={() => void post(`events/${x.id}/register`)}>Register</button>}</div>) : empty('No school events.'))}
    {data && view === 'Library' && panel('Book reservations', <>{data.reservations?.length > 0 && data.reservations.map((x: Row) => <div className="sp-line" key={x.id}><strong>{x.bookName}</strong><span className="sp-tag">{x.status}</span></div>)}{books.length ? books.map(x => <div className="sp-line" key={x.id}><strong>{x.bookName}</strong>{data.reservations?.some((r: Row) => r.bookId === x.id && ['Pending','Ready'].includes(r.status)) ? <span className="sp-tag">Reserved</span> : <button className="btn" disabled={saving} onClick={() => void post(`library/${x.id}/reserve`)}>Reserve</button>}</div>) : empty('No books available for your class.')}</>)}
    {data && view === 'Transport' && panel('Transport updates', data.transportAlerts?.length ? data.transportAlerts.map((x: Row) => <div className="sp-line" key={x.id}><div><strong>{x.title}</strong><small>{String(x.effectiveDate).slice(0,10)} · {x.message}</small></div></div>) : empty('No transport changes announced.'))}
    {data && view === 'Lost & Found' && <>{panel('Report lost or found item', <form className="sp-action-form" onSubmit={async e => { e.preventDefault(); if (await post('lost-found', lostForm)) setLostForm({ kind:'Lost', title:'', description:'' }); }}><label>Type<select value={lostForm.kind} onChange={e => setLostForm({ ...lostForm, kind: e.target.value })}><option>Lost</option><option>Found</option></select></label><label>Item<input required maxLength={160} value={lostForm.title} onChange={e => setLostForm({ ...lostForm, title: e.target.value })}/></label><label>Description<textarea required maxLength={1000} value={lostForm.description} onChange={e => setLostForm({ ...lostForm, description: e.target.value })}/></label><button className="btn btn-primary" disabled={saving}>Submit for approval</button></form>)}{panel('Approved posts', data.lostFound?.length ? data.lostFound.map((x: Row) => <div className="sp-line" key={x.id}><span className="sp-tag">{x.kind}</span><div><strong>{x.title}</strong><small>{x.description}</small></div>{!x.isApproved && <span>Pending approval</span>}</div>) : empty('No lost and found posts.'))}</>}
    {data && view === 'Discussions' && panel('Class discussions', data.grade < 9 ? empty('Discussion board is available from Class 9.') : <><div className="sp-filter">{data.threads?.map((x: Row) => <button className={thread?.id === x.id ? 'active' : ''} key={x.id} onClick={() => void openThread(x)}>{x.title}</button>)}</div>{!data.threads?.length && empty('Your teacher has not opened a discussion.')}{thread && <><h3>{thread.title}</h3>{posts.map(x => <div className="sp-line" key={x.id}><div><strong>{x.byTeacher ? 'Teacher' : x.mine ? 'You' : 'Classmate'}</strong><p>{x.body}</p></div>{!x.isApproved && <span>Awaiting approval</span>}</div>)}<form className="sp-action-form" onSubmit={async e => { e.preventDefault(); if (await post(`discussions/${thread.id}/posts`, { body: postBody })) { setPostBody(''); void openThread(thread); } }}><label>Reply<textarea required maxLength={2000} value={postBody} onChange={e => setPostBody(e.target.value)}/></label><button className="btn btn-primary" disabled={saving}>Post for teacher review</button></form></>}</>)}
    {data && view === 'ID Card' && panel('Digital student ID', <div className="sp-id-card"><h3>{data.studentName}</h3><p>{profile.className} {profile.sectionName} · Roll {profile.rollNumber || '—'}</p><p>Student ID: {data.studentId}</p>{qr && <img src={qr} width={180} height={180} alt="Secure student ID QR code"/>}<small>QR contains an opaque school identifier, no contact or academic information.</small><button className="btn" onClick={() => window.print()}>Print ID</button></div>)}
  </div>;
}
