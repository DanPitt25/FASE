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
              <li><a href="/knowledge" className="hover:text-fase-navy transition duration-200">{tFooter('knowledge_base')}</a></li>
              <li><a href="/events" className="hover:text-fase-navy transition duration-200">{tFooter('events')}</a></li>
              <li><a href="/news" className="hover:text-fase-navy transition duration-200">{tFooter('news')}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-noto-serif font-semibold mb-4 text-white">{tFooter('connect')}</h4>
            <ul className="space-y-2 text-fase-cream">
              <li><a href="mailto:info@fasemga.com" className="hover:text-fase-navy transition duration-200">{tFooter('contact_us')}</a></li>
              <li><a href="/member-portal" className="hover:text-fase-navy transition duration-200">{tFooter('member_portal')}</a></li>
              <li><a href="/about" className="hover:text-fase-navy transition duration-200">{tFooter('about_fase')}</a></li>
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