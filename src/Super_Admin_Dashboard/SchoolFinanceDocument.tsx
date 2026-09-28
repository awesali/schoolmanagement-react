import AdminActionIcon from './AdminActionIcon';
import React from 'react';
import { profilePictureUrl } from './ProfilePictureInput';
import '../Student/StudentPaymentReceipt.css';

export type DocumentField = { label: string; value: React.ReactNode };
export type DocumentLine = { label: string; amount: number };
type Props = {
  title: string;
  kind: 'receipt' | 'payslip';
  schoolName?: string;
  schoolAddress?: string;
  schoolLogoUrl?: string | null;
  reference?: string | number;
  date?: string;
  recipientLabel: string;
  recipient: string;
  fields?: DocumentField[];
  lines?: DocumentLine[];
  totalLabel: string;
  total: number;
  onClose: () => void;
  printLabel?: string;
};

const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0);
const displayDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function SchoolFinanceDocument({ title, kind, schoolName = 'School', schoolAddress, schoolLogoUrl,
  reference, date, recipientLabel, recipient, fields = [], lines = [], totalLabel, total, onClose,
  printLabel = kind === 'payslip' ? 'Print Payslip' : 'Print Receipt' }: Props) {
  const logo = profilePictureUrl(schoolLogoUrl);
  const initials = schoolName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const print = () => {
    const previousTitle = document.title;
    document.title = `${schoolName} - ${title}${reference ? ' ' + reference : ''}`;
    window.addEventListener('afterprint', () => { document.title = previousTitle; }, { once: true });
    window.print();
  };
  return <div className="sp-modal-backdrop sp-payment-receipt-overlay" onMouseDown={onClose}>
    <section className="sp-modal sp-payment-receipt school-finance-document" role="dialog" aria-modal="true" aria-label={title} onMouseDown={event => event.stopPropagation()}>
      <button type="button" className="sp-modal-close" aria-label={'Close ' + title} onClick={onClose}><AdminActionIcon action="close" /></button>
      <header className="sp-payment-receipt-header">
        <div className="sp-payment-receipt-logo">{logo ? <img src={logo} alt={schoolName + ' logo'} /> : <span>{initials || 'S'}</span>}</div>
        <div><strong>{schoolName}</strong>{schoolAddress && <address>{schoolAddress}</address>}</div>
      </header>
      <div className="sp-payment-receipt-title">
        <div><small>{kind === 'payslip' ? 'OFFICIAL SALARY STATEMENT' : 'OFFICIAL PAYMENT RECEIPT'}</small><h2>{title}</h2></div>
        <span className="sp-payment-receipt-status">PAID</span>
      </div>
      <div className="sp-payment-receipt-meta">
        <div><span>{kind === 'payslip' ? 'Salary period' : 'Receipt number'}</span><strong>{reference || '—'}</strong></div>
        <div><span>Payment date</span><strong>{displayDate(date)}</strong></div>
      </div>
      <section className="sp-payment-receipt-section">
        <h3>{kind === 'payslip' ? 'Employee details' : 'Received from'}</h3>
        <dl><div><dt>{recipientLabel}</dt><dd>{recipient || '—'}</dd></div>
          {fields.map(field => <div key={field.label}><dt>{field.label}</dt><dd>{field.value || '—'}</dd></div>)}
        </dl>
      </section>
      {lines.length > 0 && <section className="sp-payment-receipt-section">
        <h3>{kind === 'payslip' ? 'Salary breakdown' : 'Payment details'}</h3>
        <dl>{lines.map(line => <div key={line.label}><dt>{line.label}</dt><dd>{money(line.amount)}</dd></div>)}</dl>
      </section>}
      <div className="sp-payment-receipt-total"><span>{totalLabel}</span><strong>{money(total)}</strong></div>
      <p className="sp-payment-receipt-note">{kind === 'payslip' ? 'This statement reflects the recorded salary payment.' : 'Payment received by ' + schoolName + '. Keep this receipt for your records.'}</p>
      <div className="sp-payment-receipt-actions"><button type="button" className="btn btn-primary" onClick={print}><AdminActionIcon action="print" />{printLabel}</button></div>
    </section>
  </div>;
}