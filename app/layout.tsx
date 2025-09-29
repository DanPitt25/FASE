import './globals.css';
import { AuthProvider } from '../contexts/AuthContext';
import { LocaleProvider } from '../contexts/LocaleContext';
import DynamicIntlProvider from '../components/DynamicIntlProvider';

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
  // Load both message sets for dynamic switching
  const enMessages = (await import('../messages/en.json')).default;
  const frMessages = (await import('../messages/fr.json')).default;
  const allMessages = { en: enMessages, fr: frMessages };
  
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fase-logo-mark.png" as="image" />
      </head>
      <body>
        <LocaleProvider>
          <DynamicIntlProvider allMessages={allMessages}>
            <AuthProvider>
              {children}
            </AuthProvider>
          </DynamicIntlProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}