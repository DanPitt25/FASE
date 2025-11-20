'use client';

import { useTranslations } from 'next-intl';

export default function Footer() {
  const tFooter = useTranslations('footer');
  const tNav = useTranslations('navigation');
  return (
    <footer className="bg-fase-black text-white py-12 border-t-4 border-fase-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-2xl font-noto-serif font-bold mb-4 text-white">FASE</h3>
            <p className="text-fase-cream">
              {tFooter('description')}
            </p>
          </div>
          <div>
            <h4 className="text-lg font-noto-serif font-semibold mb-4 text-white">{tFooter('membership')}</h4>
            <ul className="space-y-2 text-fase-cream">
              <li><a href="/join" className="hover:text-fase-navy transition duration-200">{tFooter('join_fase')}</a></li>
              <li><a href="/directory" className="hover:text-fase-navy transition duration-200">{tFooter('member_directory')}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-noto-serif font-semibold mb-4 text-white">{tFooter('resources')}</h4>
            <ul className="space-y-2 text-fase-cream">
              <li><a href="/events" className="hover:text-fase-navy transition duration-200">{tFooter('events')}</a></li>
              <li><a href="/about/news" className="hover:text-fase-navy transition duration-200">{tFooter('news')}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-noto-serif font-semibold mb-4 text-white">{tFooter('connect')}</h4>
            <ul className="space-y-2 text-fase-cream">
              <li><a href="mailto:info@fasemga.com" className="hover:text-fase-navy transition duration-200">{tFooter('contact_us')}</a></li>
              <li><a href="/about" className="hover:text-fase-navy transition duration-200">{tFooter('about_fase')}</a></li>
              <li>
                <a 
                  href="https://www.linkedin.com/company/fasemga/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-fase-navy transition duration-200 inline-flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-fase-gold mt-8 pt-8 text-center text-fase-cream">
          <p>{tFooter('copyright')}</p>
        </div>
      </div>
    </footer>
  );
}