import React, { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../config';
import './AccountingWorkspace.css';

type Account = { id: number; code: string; name: string; type: string; isBank: boolean };
type Line = { id: number; accountId: number; debit: number; credit: number };
type Voucher = { id: number; requestId: string; date: string; kind: string; narration: string; reference: string; status: string; sourceKey: string | null; revision: number; reversalOfId: number | null; createdBy: number; postedBy: number | null; lines: Line[] };
type ReportRow = Account & { opening: number; debit: number; credit: number; closing: number };
type Audit = { id: number; at: string; userId: number; action: string; detail: string };
type Workspace = { accounts: Account[]; report: ReportRow[]; vouchers: Voucher[]; total: number; lockedThrough: string | null; audit: Audit[]; canCreate: boolean; canUpdate: boolean };
type LedgerRow = { id: number; date: string; voucherId: number; narration: string; reference: string; debit: number; credit: number; clearedDate: string | null; bankReference: string | null };
type Ledger = { opening: number; rows: LedgerRow[] };
type Bank = { book: number; uncleared: number; reconciled: number; history: { id: number; date: string; statementBalance: number; createdAt: string }[] };
type Source = { key: string; date: string; reference: string; amount: number; mode: string; accountCode: string; outflow: boolean };
type Sources = { rows: Source[]; imported: { sourceKey: string; id: number; status: string }[] };
type DraftLine = { accountId: string; debit: string; credit: string };
type Draft = { id?: number; revision: number; requestId: string; date: string; kind: string; narration: string; reference: string; lines: DraftLine[] };
type Tab = 'Summary' | 'Accounts' | 'Vouchers' | 'Ledger' | 'Reports' | 'Bank reconciliation' | 'Import records' | 'Audit & close';
const tabs: Tab[] = ['Summary', 'Accounts', 'Vouchers', 'Ledger', 'Reports', 'Bank reconciliation', 'Import records', 'Audit & close'];
const kinds = ['Journal', 'Receipt', 'Payment', 'Expense', 'Supplier bill', 'Supplier payment', 'Refund', 'Opening'];
const types = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];
export const accountingMoney = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
const day = () => { const d = new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); };
const shortDate = (d: string | null) => d?.slice(0, 10) || '—';
export function accountingCsvCell(value: unknown) {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]|^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
function exportCsv(name: string, rows: unknown[][]) {
  const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(r => r.map(accountingCsvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const blankLine = (): DraftLine => ({ accountId: '', debit: '', credit: '' });
const newDraft = (): Draft => ({ revision: 0, requestId: crypto.randomUUID(), date: day(), kind: 'Journal', narration: '', reference: '', lines: [blankLine(), blankLine()] });
export function draftTotals(lines: DraftLine[]) {
  const cents = (v: string) => Math.round(Number(v || 0) * 100);
  return { debit: lines.reduce((n, l) => n + cents(l.debit), 0) / 100, credit: lines.reduce((n, l) => n + cents(l.credit), 0) / 100 };
}
async function request<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(API_BASE_URL + '/api/accounting/' + path, { method, signal, cache: 'no-store',
    headers: { Authorization: 'Bearer ' + localStorage.getItem('token'), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || (response.status === 403 ? 'Accounting permission is required for this action.' : 'Unable to complete the accounting request. Refresh and retry.'));
  return data;
}

export default function AccountingWorkspace({ schoolName = 'School accounting' }: { schoolName?: string }) {
  const [tab, setTab] = useState<Tab>('Summary');
  const [from, setFrom] = useState(day().slice(0, 8) + '01');
  const [to, setTo] = useState(day());
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [data, setData] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const mutation = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [decision, setDecision] = useState('');
  const [reason, setReason] = useState('');
  const [decisionDate, setDecisionDate] = useState(day());
  const [account, setAccount] = useState({ code: '', name: '', type: 'Asset', isBank: false });
  const [accountId, setAccountId] = useState('');
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [bank, setBank] = useState<Bank | null>(null);
  const [statement, setStatement] = useState('');
  const [clearLine, setClearLine] = useState<number | null>(null);
  const [clearDate, setClearDate] = useState(day());
  const [bankReference, setBankReference] = useState('');
  const [sources, setSources] = useState<Sources | null>(null);
  const [sourceKeys, setSourceKeys] = useState<string[]>([]);
  const [importBank, setImportBank] = useState('');
  const [lockDate, setLockDate] = useState('');
  const validRange = !!from && !!to && from <= to && to <= day() && from >= '1900-01-01';
  const range = 'from=' + from + '&to=' + to;

  useEffect(() => {
    const controller = new AbortController();
    setData(null); setLoading(true); setError('');
    if (!validRange) { setLoading(false); setError('Choose a valid date range through today.'); return; }
    request<Workspace>('workspace?' + range + '&page=' + page, 'GET', undefined, controller.signal)
      .then(setData).catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [range, page, version, validRange]);

  useEffect(() => {
    const controller = new AbortController();
    setLedger(null); setBank(null); setSources(null); setSourceKeys([]); setDetailLoading(false);
    if (!validRange || !data) return;
    let task: Promise<void> | undefined;
    if ((tab === 'Ledger' || tab === 'Bank reconciliation') && accountId) {
      task = Promise.all([
        request<Ledger>('ledger?' + range + '&accountId=' + accountId, 'GET', undefined, controller.signal),
        tab === 'Bank reconciliation' ? request<Bank>('bank?date=' + to + '&accountId=' + accountId, 'GET', undefined, controller.signal) : Promise.resolve(null)
      ]).then(([l, b]) => { setLedger(l); setBank(b); });
    } else if (tab === 'Import records') {
      task = request<Sources>('sources?' + range, 'GET', undefined, controller.signal).then(setSources);
    }
    if (task) {
      setDetailLoading(true);
      task.catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    }
    return () => controller.abort();
  }, [tab, accountId, range, to, data, validRange]);

  async function mutate(path: string, method: string, body?: unknown) {
    if (mutation.current) return false;
    mutation.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const result = await request<{ message?: string }>(path, method, body);
      setNotice(result.message || 'Saved.'); setVersion(n => n + 1); return true;
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save.'); return false; }
    finally { mutation.current = false; setBusy(false); }
  }
  function changeTab(next: Tab) { setTab(next); setSelected(null); setDecision(''); setError(''); setAccountId(''); setSearch(''); }
  const accounts = data?.accounts || [];
  const report = data?.report || [];
  const voucher = data?.vouchers.find(v => v.id === selected);
  const nameOf = (id: number) => { const a = accounts.find(x => x.id === id); return a ? a.code + ' · ' + a.name : String(id); };
  const total = draft ? draftTotals(draft.lines) : { debit: 0, credit: 0 };
  const income = report.filter(a => a.type === 'Income').reduce((n, a) => n + a.credit - a.debit, 0);
  const expense = report.filter(a => a.type === 'Expense').reduce((n, a) => n + a.debit - a.credit, 0);
  const sumClosing = (type: string) => report.filter(a => a.type === type).reduce((n, a) => n + a.closing, 0);
  const surplus = -sumClosing('Income') - sumClosing('Expense');
  const bankDifference = bank && statement.trim() ? Math.round((bank.reconciled - Number(statement)) * 100) / 100 : null;
  const choices = (onlyBank = false) => accounts.filter(a => !onlyBank || a.isBank).map(a => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>);
  function edit(v: Voucher) { setDraft({ id: v.id, revision: v.revision, requestId: v.requestId, date: shortDate(v.date), kind: v.kind, narration: v.narration, reference: v.reference,
    lines: v.lines.map(l => ({ accountId: String(l.accountId), debit: l.debit ? String(l.debit) : '', credit: l.credit ? String(l.credit) : '' })) }); }
  function updateLine(index: number, key: keyof DraftLine, value: string) {
    if (draft) setDraft({ ...draft, lines: draft.lines.map((l, i) => i === index ? { ...l, [key]: value } : l) });
  }
  function template(kind: string) {
    if (!draft) return;
    const code = (c: string) => String(accounts.find(a => a.code === c)?.id || '');
    const pair: Record<string, string[]> = { Receipt: ['1000', '4000'], Payment: ['5010', '1000'], Expense: ['5010', '1000'], 'Supplier bill': ['5010', '2000'], 'Supplier payment': ['2000', '1010'], Refund: ['5020', '1000'], Opening: ['1010', '3000'] };
    setDraft({ ...draft, kind, lines: pair[kind] ? pair[kind].map(c => ({ ...blankLine(), accountId: code(c) })) : draft.lines });
  }
  const reportCsv = () => exportCsv('trial-balance-' + to + '.csv', [['Code', 'Account', 'Type', 'Opening debit net', 'Debits', 'Credits', 'Closing debit net'], ...report.map(a => [a.code, a.name, a.type, a.opening, a.debit, a.credit, a.closing])]);
  let running = ledger?.opening || 0;

  return <section className="accounting-workspace" aria-label="Accounting workspace">
    <div className="ac-banner"><div><span className="ac-eyebrow">ACCOUNTING WORKSPACE</span><h2>Books & financial control</h2><p>{schoolName} · INR · Posted vouchers form the ledger. Review imported receipts and payments before posting.</p></div>
      <button disabled={loading || busy} onClick={() => setVersion(n => n + 1)}>Refresh books</button></div>
    <div className="ac-tabs" role="tablist" aria-label="Accounting sections">{tabs.map(t => <button key={t} role="tab" aria-selected={t === tab} onClick={() => changeTab(t)}>{t}</button>)}</div>
    <div className="ac-toolbar"><label>From<input type="date" value={from} max={to} onChange={e => { setFrom(e.target.value); setPage(1); }} /></label><label>Through<input type="date" value={to} min={from} max={day()} onChange={e => { setTo(e.target.value); setPage(1); }} /></label>
      {data && <span className="ac-muted">Books locked through {shortDate(data.lockedThrough)}</span>}</div>
    {error && <div className="ac-message ac-error" role="alert">{error}</div>}
    {notice && <div className="ac-message" role="status">{notice}</div>}
    {loading && <p role="status">Loading accounting records…</p>}
    {!loading && data && <>
      {!accounts.length ? <div className="ac-card"><h3>Set up your books</h3><p>Create the standard chart for cash, bank, payables, receipts and expenses. Add opening balances using a balanced opening voucher.</p>{data.canCreate && <button disabled={busy} onClick={() => mutate('initialize', 'POST')}>Initialize chart of accounts</button>}</div> : <>
      {tab === 'Summary' && <>
        <div className="ac-metrics">{[['Income in period', income], ['Expenses in period', expense], ['Period surplus / deficit', income - expense], ['Cash & bank at end', report.filter(a => a.code === '1000' || a.isBank).reduce((n, a) => n + a.closing, 0)]].map(([label, value]) => <div className="ac-card" key={String(label)}><span>{label}</span><strong>{accountingMoney(Number(value))}</strong></div>)}</div>
        <div className="ac-columns"><div className="ac-card"><h3>Daily work</h3><div className="ac-actions"><button onClick={() => { changeTab('Vouchers'); if (data.canCreate) setDraft(newDraft()); }}>Create a voucher</button><button onClick={() => changeTab('Import records')}>Review school collections</button><button onClick={() => changeTab('Bank reconciliation')}>Reconcile a bank account</button></div></div>
        <div className="ac-card"><h3>Bookkeeping basis</h3><p>Imports recognize receipts and salary payments on their payment dates. Use journal entries for accruals, supplier bills, opening balances and adjustments.</p><p>Reports include posted vouchers only. Unimported operational transactions and drafts are excluded.</p></div></div>
      </>}
      {tab === 'Accounts' && <div className="ac-columns"><section className="ac-card"><h3>Chart of accounts</h3><p>Create a separate liability account for each supplier to track individual balances.</p><input aria-label="Search accounts" placeholder="Search code or account" value={search} onChange={e => setSearch(e.target.value)} /><div className="ac-table"><table><thead><tr><th>Code</th><th>Account</th><th>Type</th><th>Closing balance</th></tr></thead><tbody>{report.filter(a => (a.code + a.name).toLowerCase().includes(search.toLowerCase())).map(a => <tr key={a.id}><td>{a.code}</td><td>{a.name}{a.isBank ? ' · Bank' : ''}</td><td>{a.type}</td><td>{accountingMoney(Math.abs(a.closing))} {a.closing < 0 ? 'Cr' : 'Dr'}</td></tr>)}</tbody></table></div></section>
        {data.canCreate && <form className="ac-card ac-form" onSubmit={async e => { e.preventDefault(); if (await mutate('accounts', 'POST', account)) setAccount({ code: '', name: '', type: 'Asset', isBank: false }); }}><h3>Add account</h3>
          <label>Account code<input required maxLength={20} value={account.code} onChange={e => setAccount({ ...account, code: e.target.value })} /></label>
          <label>Account name<input required maxLength={120} value={account.name} onChange={e => setAccount({ ...account, name: e.target.value })} /></label>
          <label>Account type<select value={account.type} onChange={e => setAccount({ ...account, type: e.target.value, isBank: false })}>{types.map(t => <option key={t}>{t}</option>)}</select></label>
          {account.type === 'Asset' && <label className="ac-check"><input type="checkbox" checked={account.isBank} onChange={e => setAccount({ ...account, isBank: e.target.checked })} />Bank account</label>}<button disabled={busy}>Save account</button>
        </form>}</div>}
      {tab === 'Vouchers' && <>
        <div className="ac-section-title"><h3>Voucher register</h3>{data.canCreate && <button disabled={busy} onClick={() => { setDraft(newDraft()); setSelected(null); }}>New voucher</button>}</div>
        {draft && <form className="ac-card ac-form" onSubmit={async e => { e.preventDefault(); if (total.debit !== total.credit || total.debit <= 0) { setError('Debits and credits must balance to a positive amount.'); return; }
          if (await mutate(draft.id ? 'vouchers/' + draft.id : 'vouchers', draft.id ? 'PUT' : 'POST', { ...draft, lines: draft.lines.map(l => ({ accountId: Number(l.accountId), debit: Number(l.debit || 0), credit: Number(l.credit || 0) })) })) setDraft(null);
        }}><h3>{draft.id ? 'Edit draft V-' + draft.id : 'New draft voucher'}</h3><div className="ac-fields">
          <label>Voucher date<input required type="date" max={day()} value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} /></label>
          <label>Voucher type<select value={draft.kind} onChange={e => template(e.target.value)}>{kinds.map(k => <option key={k}>{k}</option>)}</select></label>
          <label>Invoice / reference<input maxLength={120} value={draft.reference} onChange={e => setDraft({ ...draft, reference: e.target.value })} /></label></div>
          <label>Narration<textarea required maxLength={500} value={draft.narration} onChange={e => setDraft({ ...draft, narration: e.target.value })} /></label>
          <p>Debit increases assets and expenses. Credit increases liabilities, equity and income. Verify the suggested accounts for this transaction.</p>
          <div className="ac-table"><table><thead><tr><th>Account</th><th>Debit (INR)</th><th>Credit (INR)</th><th>Action</th></tr></thead><tbody>{draft.lines.map((l, i) => <tr key={i}>
            <td><select required aria-label={'Line ' + (i + 1) + ' account'} value={l.accountId} onChange={e => updateLine(i, 'accountId', e.target.value)}><option value="">Select account</option>{choices()}</select></td>
            <td><input aria-label={'Line ' + (i + 1) + ' debit'} type="number" min="0" max="999999999999" step="0.01" value={l.debit} onChange={e => updateLine(i, 'debit', e.target.value)} /></td>
            <td><input aria-label={'Line ' + (i + 1) + ' credit'} type="number" min="0" max="999999999999" step="0.01" value={l.credit} onChange={e => updateLine(i, 'credit', e.target.value)} /></td>
            <td><button type="button" disabled={draft.lines.length <= 2} aria-label={'Remove line ' + (i + 1)} onClick={() => setDraft({ ...draft, lines: draft.lines.filter((_, n) => n !== i) })}>Remove</button></td></tr>)}</tbody></table></div>
          <div className="ac-toolbar"><button type="button" disabled={draft.lines.length >= 100} onClick={() => setDraft({ ...draft, lines: [...draft.lines, blankLine()] })}>Add line</button><strong>Debit {accountingMoney(total.debit)} · Credit {accountingMoney(total.credit)}</strong><span>Difference {accountingMoney(total.debit - total.credit)}</span></div>
          <div className="ac-actions"><button disabled={busy || total.debit <= 0 || total.debit !== total.credit}>Save draft</button><button type="button" disabled={busy} onClick={() => setDraft(null)}>Cancel edit</button></div>
        </form>}
        <div className="ac-card"><div className="ac-table"><table><thead><tr><th>Voucher</th><th>Date</th><th>Type / narration</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.vouchers.map(v => <tr key={v.id}><td>V-{v.id}</td><td>{shortDate(v.date)}</td><td><strong>{v.kind}</strong><small>{v.narration}</small></td><td>{accountingMoney(v.lines.reduce((n, l) => n + l.debit, 0))}</td><td><span className={'ac-status ' + v.status.toLowerCase()}>{v.status}</span></td><td><button onClick={() => { setSelected(v.id); setDecision(''); setReason(''); }}>Review V-{v.id}</button></td></tr>)}
        {!data.vouchers.length && <tr><td colSpan={6}>No vouchers in this period.</td></tr>}</tbody></table></div><div className="ac-toolbar"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page} · {data.total} vouchers</span><button disabled={page * 50 >= data.total} onClick={() => setPage(p => p + 1)}>Next</button></div></div>
        {voucher && <section className="ac-card"><h3>V-{voucher.id} · {voucher.status}</h3><p>{voucher.narration}</p><p>Reference: {voucher.reference || '—'} · Created by user {voucher.createdBy}{voucher.postedBy ? ' · Posted by user ' + voucher.postedBy : ''}{voucher.sourceKey ? ' · Source ' + voucher.sourceKey : ''}</p>
          <div className="ac-table"><table><thead><tr><th>Account</th><th>Debit</th><th>Credit</th></tr></thead><tbody>{voucher.lines.map(l => <tr key={l.id}><td>{nameOf(l.accountId)}</td><td>{accountingMoney(l.debit)}</td><td>{accountingMoney(l.credit)}</td></tr>)}</tbody></table></div>
          <div className="ac-actions">{data.canUpdate && voucher.status === 'Draft' && <>{!voucher.sourceKey && <button onClick={() => edit(voucher)}>Edit draft</button>}<button onClick={() => setDecision('post')}>Post voucher</button><button onClick={() => setDecision('void')}>Void draft</button></>}
          {data.canUpdate && voucher.status === 'Posted' && <button onClick={() => setDecision('reverse')}>Reverse voucher</button>}<button onClick={() => exportCsv('voucher-' + voucher.id + '.csv', [['Voucher', 'Date', 'Narration', 'Reference', 'Account', 'Debit', 'Credit'], ...voucher.lines.map(l => ['V-' + voucher.id, shortDate(voucher.date), voucher.narration, voucher.reference, nameOf(l.accountId), l.debit, l.credit])])}>Export voucher</button></div>
          {decision && <form className="ac-form ac-confirm" onSubmit={async e => { e.preventDefault(); if (await mutate('vouchers/' + voucher.id + '/' + decision, 'PUT', { revision: voucher.revision, reason, date: decisionDate })) setDecision(''); }}>
            <h4>{decision === 'post' ? 'Post these entries to the ledger?' : decision === 'void' ? 'Void this draft?' : 'Create an opposite entry in the ledger?'}</h4>
            {decision === 'post' ? <p>Posted entries are immutable. Correct them with a reversal voucher.</p> : <label>Reason<textarea required maxLength={400} value={reason} onChange={e => setReason(e.target.value)} /></label>}
            {decision === 'reverse' && <label>Reversal date<input required type="date" min={shortDate(voucher.date)} max={day()} value={decisionDate} onChange={e => setDecisionDate(e.target.value)} /></label>}
            <div className="ac-actions"><button disabled={busy}>Confirm {decision}</button><button type="button" onClick={() => setDecision('')}>Cancel</button></div>
          </form>}
        </section>}
      </>}
      {(tab === 'Ledger' || tab === 'Bank reconciliation') && <>
        <div className="ac-toolbar"><label>{tab === 'Ledger' ? 'Ledger account' : 'Bank account'}<select value={accountId} onChange={e => { setAccountId(e.target.value); setClearLine(null); }}><option value="">Select account</option>{choices(tab === 'Bank reconciliation')}</select></label>
        {ledger && <button onClick={() => { let balance = ledger.opening; exportCsv('ledger-' + accountId + '-' + to + '.csv', [['Date', 'Voucher', 'Narration', 'Reference', 'Debit', 'Credit', 'Balance debit net'], [from, '', 'Opening balance', '', '', '', balance], ...ledger.rows.map(l => { balance += l.debit - l.credit; return [shortDate(l.date), 'V-' + l.voucherId, l.narration, l.reference, l.debit, l.credit, balance]; })]); }}>Export ledger</button>}</div>
        {detailLoading && <p role="status">Loading ledger…</p>}
        {!accountId && <p>Select an account to view its transactions and running balance.</p>}
        {bank && <section className="ac-card"><h3>Reconcile through {to}</h3><div className="ac-summary"><span>Book balance <strong>{accountingMoney(bank.book)}</strong></span><span>Uncleared net <strong>{accountingMoney(bank.uncleared)}</strong></span><span>Expected statement balance <strong>{accountingMoney(bank.reconciled)}</strong></span></div>
          <form className="ac-form" onSubmit={e => { e.preventDefault(); mutate('reconcile', 'POST', { accountId: Number(accountId), date: to, statementBalance: Number(statement) }); }}><label>Bank statement closing balance<input required type="number" step="0.01" value={statement} onChange={e => setStatement(e.target.value)} /></label><p>Difference: {bankDifference === null ? 'Enter the statement balance' : accountingMoney(bankDifference)}</p>{data.canCreate && <button disabled={busy || bankDifference !== 0}>Save reconciled snapshot</button>}</form>
          <p>Uncleared net includes all posted bank entries through the statement date. The transaction list below uses the selected date range; move From earlier to find older outstanding entries.</p>
          {!!bank.history.length && <details><summary>Saved reconciliations ({bank.history.length})</summary>{bank.history.map(h => <p key={h.id}>{shortDate(h.date)} · {accountingMoney(h.statementBalance)} · saved {new Date(h.createdAt).toLocaleString()}</p>)}</details>}
        </section>}
        {ledger && <section className="ac-card"><h3>Account ledger</h3><p>Opening balance: {accountingMoney(ledger.opening)}</p><div className="ac-table"><table><thead><tr><th>Date / voucher</th><th>Narration</th><th>Debit</th><th>Credit</th><th>Balance (Dr net)</th>{bank && <th>Bank clearance</th>}</tr></thead><tbody>{ledger.rows.map(l => { running += l.debit - l.credit; return <tr key={l.id}><td>{shortDate(l.date)}<small>V-{l.voucherId}</small></td><td>{l.narration}<small>{l.reference}</small></td><td>{accountingMoney(l.debit)}</td><td>{accountingMoney(l.credit)}</td><td>{accountingMoney(running)}</td>{bank && <td>{l.clearedDate ? shortDate(l.clearedDate) : 'Uncleared'}<small>{l.bankReference}</small>{data.canUpdate && <button onClick={() => { setClearLine(l.id); setClearDate(l.clearedDate ? shortDate(l.clearedDate) : day()); setBankReference(l.bankReference || ''); }}>Set clearance {l.id}</button>}</td>}</tr>; })}
          {!ledger.rows.length && <tr><td colSpan={bank ? 6 : 5}>No posted transactions in this range.</td></tr>}</tbody></table></div><strong>Closing balance: {accountingMoney(running)}</strong></section>}
        {clearLine && bank && <form className="ac-card ac-form" onSubmit={async e => { e.preventDefault(); if (await mutate('lines/' + clearLine + '/clear', 'PUT', { date: clearDate, reference: bankReference })) setClearLine(null); }}><h3>Bank clearance · line {clearLine}</h3><label>Cleared date<input required type="date" max={day()} value={clearDate} onChange={e => setClearDate(e.target.value)} /></label><label>Bank statement reference<input required maxLength={120} value={bankReference} onChange={e => setBankReference(e.target.value)} /></label><div className="ac-actions"><button disabled={busy}>Save clearance</button><button type="button" disabled={busy} onClick={async () => { if (await mutate('lines/' + clearLine + '/clear', 'PUT', { date: null, reference: '' })) setClearLine(null); }}>Mark uncleared</button><button type="button" onClick={() => setClearLine(null)}>Cancel</button></div></form>}
      </>}
      {tab === 'Reports' && <>
        <div className="ac-section-title"><h3>Financial reports · {from} to {to}</h3><div className="ac-actions"><button onClick={reportCsv}>Export trial balance</button><button onClick={() => window.print()}>Print reports</button></div></div>
        <section className="ac-card"><h3>Trial balance</h3><div className="ac-table"><table><thead><tr><th>Account</th><th>Opening (Dr net)</th><th>Period debits</th><th>Period credits</th><th>Closing debit</th><th>Closing credit</th></tr></thead><tbody>{report.map(a => <tr key={a.id}><td>{a.code} · {a.name}</td><td>{accountingMoney(a.opening)}</td><td>{accountingMoney(a.debit)}</td><td>{accountingMoney(a.credit)}</td><td>{accountingMoney(Math.max(0, a.closing))}</td><td>{accountingMoney(Math.max(0, -a.closing))}</td></tr>)}</tbody><tfoot><tr><th>Total</th>{[report.reduce((n, a) => n + a.opening, 0), report.reduce((n, a) => n + a.debit, 0), report.reduce((n, a) => n + a.credit, 0), report.reduce((n, a) => n + Math.max(0, a.closing), 0), report.reduce((n, a) => n + Math.max(0, -a.closing), 0)].map((n, i) => <th key={i}>{accountingMoney(n)}</th>)}</tr></tfoot></table></div></section>
        <div className="ac-columns"><section className="ac-card"><h3>Income & expenditure</h3>{report.filter(a => a.type === 'Income' || a.type === 'Expense').map(a => <div className="ac-report-row" key={a.id}><span>{a.name}</span><strong>{accountingMoney(a.type === 'Income' ? a.credit - a.debit : a.debit - a.credit)}</strong></div>)}<hr /><div className="ac-report-row"><span>Income</span><strong>{accountingMoney(income)}</strong></div><div className="ac-report-row"><span>Expenditure</span><strong>{accountingMoney(expense)}</strong></div><div className="ac-report-row"><span>Surplus / deficit</span><strong>{accountingMoney(income - expense)}</strong></div>
          <button onClick={() => exportCsv('income-expenditure-' + to + '.csv', [['Account', 'Type', 'Period amount'], ...report.filter(a => a.type === 'Income' || a.type === 'Expense').map(a => [a.name, a.type, a.type === 'Income' ? a.credit - a.debit : a.debit - a.credit]), ['Surplus / deficit', '', income - expense]])}>Export income & expenditure</button></section>
        <section className="ac-card"><h3>Balance sheet at {to}</h3>{report.filter(a => ['Asset', 'Liability', 'Equity'].includes(a.type)).map(a => <div className="ac-report-row" key={a.id}><span>{a.type} · {a.name}</span><strong>{accountingMoney(a.type === 'Asset' ? a.closing : -a.closing)}</strong></div>)}<div className="ac-report-row"><span>Accumulated surplus / deficit</span><strong>{accountingMoney(surplus)}</strong></div><hr /><div className="ac-report-row"><span>Total assets</span><strong>{accountingMoney(sumClosing('Asset'))}</strong></div><div className="ac-report-row"><span>Liabilities, equity & surplus</span><strong>{accountingMoney(-sumClosing('Liability') - sumClosing('Equity') + surplus)}</strong></div>
          <button onClick={() => exportCsv('balance-sheet-' + to + '.csv', [['Account', 'Type', 'Balance'], ...report.filter(a => ['Asset', 'Liability', 'Equity'].includes(a.type)).map(a => [a.name, a.type, a.type === 'Asset' ? a.closing : -a.closing]), ['Accumulated surplus / deficit', 'Equity', surplus]])}>Export balance sheet</button></section></div>
        <p className="ac-muted">Reports reflect the entries posted in these books. Review opening balances, accruals and source imports before using them for a financial close.</p>
      </>}
      {tab === 'Import records' && <section className="ac-card"><h3>Review operational receipts & payments</h3><p>Fees, transport collections, inventory receipts and paid salaries appear according to your permissions. Imports create drafts on a receipts-and-payments basis and retain a unique source reference.</p><p>Select only transactions belonging to the chosen bank account. Cash transactions use the Cash account. Refunds and accruals require separate vouchers.</p>
        <label>Bank for selected non-cash records<select value={importBank} onChange={e => setImportBank(e.target.value)}><option value="">Select bank account</option>{choices(true)}</select></label>
        {detailLoading && <p role="status">Loading source records…</p>}
        {sources && <><div className="ac-toolbar"><button onClick={() => setSourceKeys(sources.rows.filter(s => !sources.imported.some(i => i.sourceKey === s.key)).map(s => s.key))}>Select all unimported</button><button onClick={() => setSourceKeys([])}>Clear selection</button><span>{sourceKeys.length} selected</span>{data.canCreate && <button disabled={busy || !sourceKeys.length} onClick={() => mutate('import', 'POST', { from, to, keys: sourceKeys, bankAccountId: Number(importBank) })}>Import selected as drafts</button>}</div>
        <div className="ac-table"><table><thead><tr><th>Select</th><th>Source / reference</th><th>Date</th><th>Mode</th><th>Amount</th><th>Voucher</th></tr></thead><tbody>{sources.rows.map(s => { const imported = sources.imported.find(i => i.sourceKey === s.key); return <tr key={s.key}><td><input type="checkbox" aria-label={'Import ' + s.key} disabled={!!imported || !data.canCreate} checked={sourceKeys.includes(s.key)} onChange={e => setSourceKeys(e.target.checked ? [...sourceKeys, s.key] : sourceKeys.filter(k => k !== s.key))} /></td><td>{s.key}<small>{s.reference}</small></td><td>{shortDate(s.date)}</td><td>{s.mode}</td><td>{s.outflow ? 'Out ' : 'In '}{accountingMoney(s.amount)}</td><td>{imported ? 'V-' + imported.id + ' · ' + imported.status : 'Not imported'}</td></tr>; })}{!sources.rows.length && <tr><td colSpan={6}>No accessible source records in this range.</td></tr>}</tbody></table></div></>}
      </section>}
      {tab === 'Audit & close' && <>
        {data.canUpdate && <form className="ac-card ac-form" onSubmit={async e => { e.preventDefault(); if (await mutate('period', 'PUT', { date: lockDate })) setLockDate(''); }}><h3>Close an accounting period</h3><p>Posting, editing, voiding and bank-clearance changes are blocked through the lock date. Post or void all drafts first. Closed periods cannot be reopened from this workspace.</p><label>Lock books through<input required type="date" max={day()} value={lockDate} onChange={e => setLockDate(e.target.value)} /></label><button disabled={busy || !lockDate}>Lock books through {lockDate || 'selected date'}</button></form>}
        <section className="ac-card"><div className="ac-section-title"><h3>Recent audit history</h3><button onClick={() => exportCsv('accounting-audit.csv', [['Time UTC', 'User', 'Action', 'Detail'], ...data.audit.map(a => [a.at, a.userId, a.action, a.detail])])}>Export recent audit</button></div><p>Latest 100 events across all accounting dates.</p><div className="ac-table"><table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Detail</th></tr></thead><tbody>{data.audit.map(a => <tr key={a.id}><td>{new Date(a.at).toLocaleString()}</td><td>{a.userId}</td><td>{a.action}</td><td>{a.detail}</td></tr>)}{!data.audit.length && <tr><td colSpan={4}>No accounting activity yet.</td></tr>}</tbody></table></div></section>
      </>}
      </>}
    </>}
  </section>;
}
