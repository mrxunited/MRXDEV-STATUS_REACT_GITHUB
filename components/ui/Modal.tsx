import React, { ReactNode, useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: ReactNode;
  preventModalFocus?: boolean; 
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', footer, preventModalFocus = false }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      if (!preventModalFocus) {
        setTimeout(() => modalRef.current?.focus(), 0);
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose, preventModalFocus]); 

  if (!isOpen) {
    return null;
  }

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div
      className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/60 dark:bg-black/70 backdrop-blur-sm p-4"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose} 
    >
      <div
        ref={modalRef}
        className={`bg-[var(--color-light-modal-bg)] dark:bg-[var(--color-dark-modal-bg)] rounded-lg shadow-xl overflow-hidden transform transition-all w-full ${sizeClasses[size]}`}
        onClick={(e) => e.stopPropagation()} 
        tabIndex={-1} 
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
          <h2 id="modal-title" className="text-xl font-semibold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 rounded-full p-1"
            aria-label="Close modal"
          >
            <i className="fas fa-times fa-lg"></i>
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)] text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">
          {children}
        </div>
        {footer && (
            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800 border-t border-[var(--color-light-border)] dark:border-[var(--color-dark-border)] flex justify-end space-x-3">
                {footer}
            </div>
        )}
      </div>
    </div>
  );
};

export default Modal;