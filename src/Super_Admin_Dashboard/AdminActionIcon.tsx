import React from 'react';
import { AddCircleIcon, AssignmentIcon, BackIcon, ClipboardIcon, CloseIcon, EditIcon, ExportIcon, ImportIcon, LoadIcon, PaymentIcon, PreviewIcon, PrintIcon, ReceiptIcon, RemoveIcon, ResetIcon, SearchIcon } from '../components/Icons/Icons';
import './AdminActionIcon.css';

type Props = { action: string };
const CheckIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4 12 5 5L20 6" /></svg>;
const LocationIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
const SendIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 12 18-9-5 18-4-7-9-2Zm9 2 9-11" /></svg>;
const NextIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>;
const icons: Record<string, React.ComponentType<{ size?: number }>> = {
  add: AddCircleIcon, delete: RemoveIcon, close: CloseIcon, edit: EditIcon,
  view: PreviewIcon, refresh: ResetIcon, reset: ResetIcon, print: PrintIcon,
  download: ImportIcon, export: ExportIcon, import: ImportIcon,
  collect: PaymentIcon, assign: AssignmentIcon, publish: ExportIcon,
  back: BackIcon, search: SearchIcon, load: LoadIcon, select: ClipboardIcon,
  history: ReceiptIcon, absent: CloseIcon, reject: CloseIcon,
};
export default function AdminActionIcon({ action }: Props) {
  const Icon = icons[action];
  return <span className="admin-action-icon" aria-hidden="true">{Icon ? <Icon size={16} /> : action === 'next' ? <NextIcon /> : action === 'location' ? <LocationIcon /> : action === 'send' ? <SendIcon /> : <CheckIcon />}</span>;
}