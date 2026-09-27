import React, { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../config';
import FinanceManagement from './FinanceManagement';
import SalaryManagement from './SalaryManagement';
import { profilePictureUrl } from './ProfilePictureInput';
import { LogoutIcon, ProfileIcon } from '../components/Icons/Icons';
import './PrincipalDashboard.css';
import './CaDashboard.css';

type Payment = { id: number; studentName: string; amount: number; date: string; mode: string; receipt: string };
type Balance = { id: number; studentName: string; feeType: string; amount: number; paid: number; balance: number };
type Data = {
  schoolId: number; schoolName: string; academicYear: string | null; generatedAt: string;
  fees: null | { today: number; month: number; assessed: number; collected: number; outstanding: number; payments: Payment[]; balances: Balance[]; modes: { name: string; amount: number }[]; trend: { date: string; amount: number }[] };
  payroll: null | { total: number; paid: number; pending: number; count: number };
};
type Page = 'Overview' | 'Collection register' | 'Outstanding fees' | 'Fee management' | 'Payroll' | 'Reports';
type Props = { userName: string; profilePicture?: string | null; schoolName?: string; schoolLogoUrl?: string | null; onLogout: () => void; onProfile: () => void };
const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
const today = () => { const d = new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); };
export function csvCell(value: unknown) { return '"' + String(value ?? '').replace(/^[=+@-]/, "'$&").replace(/"/g, '""') + '"'; }
function download(name: string, rows: unknown[][]) {
  const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
export default function CaDashboard({ userName, profilePicture, schoolName, schoolLogoUrl, onLogout, onProfile }: Props) {
  const [data, setData] = useState<Data | null>(null);
  const [date, setDate] = useState(today);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState<Page>('Overview');
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('');
  const [menu, setMenu] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [failedLogo, setFailedLogo] = useState(false);
  const [failedAvatar, setFailedAvatar] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!profileOpen) return;
    const outside = (e: MouseEvent) => { if (!profileRef.current?.contains(e.target as Node)) setProfileOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setProfileOpen(false); avatarRef.current?.focus(); } };
    document.addEventListener('mousedown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape); };
  }, [profileOpen]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setData(null);
    fetch(API_BASE_URL + '/api/ca/dashboard?date=' + date, { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }, signal: controller.signal, cache: 'no-store' })
      .then(async r => { if (!r.ok) { const body = await r.json().catch(() => ({})); throw new Error(body.message || (r.status === 403 ? 'This account does not have access to the CA dashboard.' : 'Unable to load financial records. Please retry.')); } return r.json(); })
      .then(d => { if (!controller.signal.aborted) setData(d); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [date, refresh]);
  const go = (next: Page) => { setPage(next); setSearch(''); setMode(''); setMenu(false); scrollRef.current?.scrollTo?.(0, 0); if (page === 'Fee management' || page === 'Payroll') setRefresh(n => n + 1); };
  const fees = data?.fees;
  const label = data?.schoolName || schoolName || 'School';
  const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(s => s[0]).join('').toUpperCase();
  const payments = (fees?.payments || []).filter(p => (p.studentName + ' ' + p.receipt).toLowerCase().includes(search.toLowerCase()) && (!mode || p.mode === mode));
  const balances = (fees?.balances || []).filter(b => b.balance > 0 && (b.studentName + ' ' + b.feeType).toLowerCase().includes(search.toLowerCase()));
  const exportPayments = () => download('collections-' + date + '.csv', [['Receipt', 'Student', 'Date', 'Mode', 'Amount'], ...payments.map(p => [p.receipt, p.studentName, p.date, p.mode, p.amount])]);
  const exportBalances = () => download('outstanding-' + date + '.csv', [['Student', 'Fee', 'Assessed', 'Paid', 'Outstanding'], ...balances.map(b => [b.studentName, b.feeType, b.amount, b.paid, b.balance])]);
  const pages: Page[] = ['Overview', ...(fees ? ['Collection register', 'Outstanding fees', 'Fee management'] as Page[] : []), ...(data?.payroll ? ['Payroll'] as Page[] : []), 'Reports'];
  const metric = (title: string, value: string, note: string, next: Page) => <button className="principal-metric" onClick={() => go(next)}><span>{title}<span aria-hidden="true">↗</span></span><strong>{value}</strong><small>{note}</small></button>;
  return <div className="principal-shell ca-shell">
    <aside className={'principal-sidebar' + (menu ? ' is-open' : '')}><div className="principal-brand"><span className="principal-school-logo">{schoolLogoUrl && !failedLogo ? <img src={profilePictureUrl(schoolLogoUrl)} alt={label + ' logo'} onError={() => setFailedLogo(true)} /> : initials(label)}</span><div><strong>CA's Office</strong><small>{label}</small></div></div>
      <nav aria-label="CA navigation"><p className="principal-nav-group">FINANCE & ACCOUNTS</p>{pages.map(p => <button key={p} className={p === page ? 'active' : ''} aria-current={p === page ? 'page' : undefined} onClick={() => go(p)}>{p}</button>)}</nav>
    </aside>
    <main className="principal-main"><header className="principal-topbar"><button className="principal-mobile-toggle" aria-label="Toggle navigation" aria-expanded={menu} onClick={() => setMenu(v => !v)}>☰</button><span>Finance & accounts <span className="principal-muted">/ {page}</span></span><div className="principal-account"><span className="principal-account-name">Welcome, <strong>{userName}</strong></span><div className="profile-menu" ref={profileRef}><button className="user-avatar" ref={avatarRef} aria-label={userName + ' profile menu'} aria-haspopup="menu" aria-expanded={profileOpen} onClick={() => setProfileOpen(v => !v)}>{profilePicture && !failedAvatar ? <img src={profilePictureUrl(profilePicture)} alt={userName} onError={() => setFailedAvatar(true)} /> : <span>{initials(userName)}</span>}</button>{profileOpen && <div className="profile-dropdown" role="menu"><button role="menuitem" onClick={onProfile}><ProfileIcon size={20} />Profile</button><button role="menuitem" onClick={onLogout}><LogoutIcon size={20} />Logout</button></div>}</div></div></header>
      <div className="principal-scroll-area" ref={scrollRef}><div className="principal-content"><div className="principal-heading"><div><span className="principal-eyebrow">YOUR SCHOOL FINANCES</span><h1>{page === 'Overview' ? 'Financial overview' : page}</h1><p>{label} · Academic year {data?.academicYear || 'not configured'}</p></div><div className="principal-toolbar"><label>Overview date<input aria-label="Overview date" type="date" value={date} max={today()} onChange={e => { if (e.target.value && e.target.value <= today()) setDate(e.target.value); }} /></label><button disabled={loading} onClick={() => setRefresh(n => n + 1)}>Refresh</button></div></div>
      {loading && <section className="principal-panel" role="status">Loading financial records...</section>}
      {error && <div className="principal-notice" role="alert">{error} <button className="principal-link" onClick={() => setRefresh(n => n + 1)}>Retry</button></div>}
      {!loading && data && <>
        {!fees && !data.payroll && <div className="principal-notice">No finance permissions are assigned to this account.</div>}
        {page === 'Overview' && <>
          <div className="principal-kpis">
            {fees && <>{metric('Collections on selected date', money(fees.today), date, 'Collection register')}{metric('Month-to-date collections', money(fees.month), 'All academic years · through selected date', 'Collection register')}{metric('Outstanding fees', data.academicYear ? money(fees.outstanding) : 'Unavailable', 'Selected academic year · not overdue ageing', 'Outstanding fees')}</>}
            {data.payroll && metric('Payroll paid', money(data.payroll.paid), 'Selected salary month · current payment status', 'Payroll')}
          </div>
          <div className="principal-columns"><section className="principal-panel"><h2>Daily collections</h2><p>Month to date · all academic years</p>{fees ? fees.trend.length ? fees.trend.map(t => <div className="ca-trend" key={t.date}><span>{t.date.slice(5)}</span><progress aria-label={'Collections ' + t.date} value={t.amount} max={Math.max(1, ...fees.trend.map(x => x.amount))} /><strong>{money(t.amount)}</strong></div>) : <p>No collections in this period.</p> : <p>Fee access is not assigned.</p>}</section>
          <section className="principal-panel"><h2>Follow-up queue</h2>{fees && <button className="principal-alert" onClick={() => go('Outstanding fees')}><span className="principal-alert-dot" /><span><b>{fees.balances.filter(b => b.balance > 0).length} fee items with outstanding balances</b><small>Review student balances and collect payments.</small></span></button>}{data.payroll && <button className="principal-alert" onClick={() => go('Payroll')}><span className="principal-alert-dot" /><span><b>{data.payroll.pending} salary records not fully paid</b><small>Current status for the selected salary month.</small></span></button>}<h3>Collection by payment mode</h3>{fees?.modes.map(m => <div className="principal-list-row" key={m.name}><span>{m.name || 'Unspecified'}</span><b>{money(m.amount)}</b></div>)}{fees && !fees.modes.length && <p>No recorded payments.</p>}</section></div>
          {fees && <section className="principal-panel"><h2>Academic-year fee position</h2>{data.academicYear ? <><div className="principal-summary"><div><span>Assessed fees</span><strong>{money(fees.assessed)}</strong></div><div><span>Collected through selected date</span><strong>{money(fees.collected)}</strong></div><div><span>Outstanding</span><strong>{money(fees.outstanding)}</strong></div></div><p className="principal-footnote">Outstanding includes all unpaid assigned fees. Due dates are not recorded, so these amounts are not classified as overdue.</p></> : <p>No academic year covers the selected date.</p>}</section>}
        </>}
        {page === 'Collection register' && fees && <section className="principal-panel"><div className="principal-section-title"><h2>Month-to-date collection register</h2><button className="principal-link" onClick={exportPayments}>Export CSV</button></div><div className="principal-filters"><input aria-label="Search collections" placeholder="Search student or receipt" value={search} onChange={e => setSearch(e.target.value)} /><label>Payment mode<select value={mode} onChange={e => setMode(e.target.value)}><option value="">All modes</option>{fees.modes.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}</select></label></div><p>{payments.length} payment entries · {money(payments.reduce((sum, p) => sum + p.amount, 0))}</p><div className="principal-table-scroll"><table><thead><tr><th>Receipt</th><th>Student</th><th>Date</th><th>Mode</th><th>Amount</th></tr></thead><tbody>{payments.map(p => <tr key={p.id}><td>{p.receipt || '—'}</td><td>{p.studentName}</td><td>{p.date.slice(0, 10)}</td><td>{p.mode}</td><td>{money(p.amount)}</td></tr>)}{!payments.length && <tr><td colSpan={5}>No payments match this view.</td></tr>}</tbody></table></div></section>}
        {page === 'Outstanding fees' && fees && <section className="principal-panel"><div className="principal-section-title"><h2>Academic-year outstanding fees</h2><button className="principal-link" onClick={exportBalances}>Export CSV</button></div><p>Balances through {date}. Due dates are not available for overdue classification.</p><input aria-label="Search outstanding fees" placeholder="Search student or fee type" value={search} onChange={e => setSearch(e.target.value)} /><div className="principal-table-scroll"><table><thead><tr><th>Student</th><th>Fee type</th><th>Assessed</th><th>Paid</th><th>Outstanding</th></tr></thead><tbody>{balances.map(b => <tr key={b.id}><td>{b.studentName}</td><td>{b.feeType}</td><td>{money(b.amount)}</td><td>{money(b.paid)}</td><td><span className="principal-badge warning">{money(b.balance)}</span></td></tr>)}{!balances.length && <tr><td colSpan={5}>{data.academicYear ? 'No outstanding fees match this view.' : 'No academic year covers the selected date.'}</td></tr>}</tbody></table></div><button className="principal-link" onClick={() => go('Fee management')}>Open fee collection →</button></section>}
        {page === 'Fee management' && fees && <FinanceManagement selectedSchoolId={data.schoolId} />}
        {page === 'Payroll' && data.payroll && <SalaryManagement selectedSchoolId={data.schoolId} />}
        {page === 'Reports' && <section className="principal-panel"><h2>Financial reports</h2><p>Collection reports cover the selected month through {date}. Outstanding balances cover the academic year shown above.</p>{fees && <><div className="principal-list-row"><span>Collection register</span><button className="principal-link" onClick={exportPayments}>Download CSV</button></div><div className="principal-list-row"><span>Outstanding fee balances</span><button className="principal-link" onClick={exportBalances}>Download CSV</button></div></>}{data.payroll && <div className="principal-list-row"><span>Salary history and pending salaries</span><button className="principal-link" onClick={() => go('Payroll')}>Open payroll</button></div>}<p className="principal-footnote">These reports cover recorded school fees and payroll. Transport fees, expenses, bank balances and statutory accounts are outside this report.</p></section>}
        <p className="principal-updated">Updated {new Date(data.generatedAt).toLocaleString('en-IN')}</p>
      </>}
      </div></div>
    </main>
  </div>;
}

