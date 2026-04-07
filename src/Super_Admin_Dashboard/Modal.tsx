import React from 'react';
import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onSubmit?: () => void;
  submitLabel?: string;
  showSubmit?: boolean;
  showCancel?: boolean;
  onCancel?: () => void;
  children: React.ReactNode;
  formId?: string;
  size?: 'normal' | 'large';
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  onSubmit,
  submitLabel = 'Submit',
  showSubmit = true,
  showCancel = true,
  onCancel,
  children,
  formId,
  size = 'normal'
}) => {
  if (!isOpen) return null;

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content ${size === 'large' ? 'modal-large' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <div className="header-actions">
            {showCancel && (
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                Clear
              </button>
            )}
            {showSubmit && (
              <button type="submit" className="btn btn-primary" form={formId} onClick={onSubmit}>
                {submitLabel}
              </button>
            )}
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
