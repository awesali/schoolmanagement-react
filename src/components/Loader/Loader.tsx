import React from 'react';
import './Loader.css';

export const Loader: React.FC<{ size?: 'small' | 'medium' | 'large'; label?: string }> = ({ size = 'medium', label }) => (
  <span className="universal-loader-wrap" role="status" aria-label={label || 'Loading'}>
    <span className={`universal-loader universal-loader--${size}`} />
    {label && <span>{label}</span>}
  </span>
);

export const PageLoader: React.FC<{ label?: string }> = ({ label = 'Please wait...' }) => (
  <div className="page-loader-overlay" role="status" aria-live="polite">
    <div className="page-loader-card"><Loader size="large" /><span>{label}</span></div>
  </div>
);

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; loadingText?: string; loadingOverlay?: boolean };
export const LoadingButton: React.FC<Props> = ({ loading = false, loadingText, loadingOverlay = true, disabled, children, ...props }) => (
  <>
    <button {...props} disabled={disabled || loading} aria-busy={loading}>
      {loading && !loadingOverlay ? <Loader size="small" label={loadingText || 'Please wait...'} /> : children}
    </button>
    {loading && loadingOverlay && <PageLoader label={loadingText} />}
  </>
);
