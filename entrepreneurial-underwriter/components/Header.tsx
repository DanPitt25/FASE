'use client';

import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <Link href="/" className="block text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
            Entrepreneurial Underwriter
          </h1>
        </Link>
      </div>
      <nav className="border-t border-gray-100 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-center gap-10 text-sm font-medium">
          <Link href="/" className="text-gray-600 hover:text-fase-navy transition-colors">
            Home
          </Link>
          <Link href="/opinion" className="text-gray-600 hover:text-fase-navy transition-colors">
            Opinion
          </Link>
          <Link href="/analysis" className="text-gray-600 hover:text-fase-navy transition-colors">
            Analysis
          </Link>
        </div>
      </nav>
    </header>
  );
}
