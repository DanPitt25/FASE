'use client';

import { ReactNode, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';

interface RendezvousPageLayoutProps {
  children: ReactNode;
}

export default function RendezvousPageLayout({ children }: RendezvousPageLayoutProps) {
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('scroll-visible');
          entry.target.classList.remove('scroll-hidden');
        }
      });
    }, observerOptions);

    // Observe all elements with scroll-hidden class
    const scrollElements = document.querySelectorAll('.scroll-hidden');
    scrollElements.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      scrollElements.forEach((element) => {
        observer.unobserve(element);
      });
    };
  }, []);

  return (
    <div className="min-h-screen bg-white font-dm-sans">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}