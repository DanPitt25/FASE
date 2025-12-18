'use client';

import { useState } from 'react';
import ContactModal from './ContactModal';

interface ContactButtonProps {
  email: string;
  children?: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  variant?: 'text' | 'button';
}

export default function ContactButton({ 
  email, 
  children, 
  className = '', 
  title,
  description,
  variant = 'text'
}: ContactButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const baseClasses = variant === 'button' 
    ? 'inline-flex items-center px-4 py-2 bg-fase-navy text-white rounded-lg hover:bg-fase-blue transition-colors' 
    : 'text-fase-navy hover:text-fase-blue transition-colors cursor-pointer';

  return (
    <>
      <span
        onClick={() => setIsModalOpen(true)}
        className={`${baseClasses} ${className}`}
      >
        {children || 'Contact Us'}
      </span>

      <ContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        email={email}
        title={title}
        description={description}
      />
    </>
  );
}