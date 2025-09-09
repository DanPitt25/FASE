import './globals.css';
import { GeistSans } from 'geist/font/sans';
import { AuthProvider } from '../contexts/AuthContext';
import { LocaleProvider } from '../contexts/LocaleContext';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

let title = 'FASE - Federation of European MGAs';
let description =
  'The voice of Managing General Agents across Europe, driving innovation and excellence in the insurance marketplace.';

export const metadata = {
  title,
  description,
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
  metadataBase: new URL('https://fase-site.vercel.app'),
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get messages for the current locale
  const messages = await getMessages();
  
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/europe.jpg" as="image" />
      </head>
      <body className={GeistSans.variable}>
        <NextIntlClientProvider messages={messages}>
          <LocaleProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </LocaleProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}