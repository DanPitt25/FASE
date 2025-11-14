'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${maxWidthClasses[maxWidth]} overflow-hidden text-left transition-all bg-white shadow-xl rounded-lg z-10 max-h-[90vh] overflow-y-auto`}
        style={{ maxWidth: 'calc(100vw - 2rem)' }}
      >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-fase-light-gold">
            <h2 className="text-xl font-noto-serif font-semibold text-fase-navy">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 text-fase-black hover:text-fase-navy focus:outline-none focus:ring-2 focus:ring-fase-navy rounded-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
        <div className="px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  );

  // Use portal to render modal at document body level, breaking out of page layout
  return typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null;
}