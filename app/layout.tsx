import './globals.css';
import { UnifiedAuthProvider } from '../contexts/UnifiedAuthContext';
import { LocaleProvider } from '../contexts/LocaleContext';
import DynamicIntlProvider from '../components/DynamicIntlProvider';
import CookieBanner from '../components/CookieBanner';
import ConsentAwareAnalytics from '../components/ConsentAwareAnalytics';

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
  metadataBase: new URL('https://fasemga.com'),
};

// Helper to merge translation files
const mergeTranslations = async (locale: string) => {
  const files = ['core', 'auth', 'pages', 'knowledge', 'content', 'other'];
  const translations = {};
  
  for (const file of files) {
    try {
      const fileTranslations = (await import(`../messages/${locale}/${file}.json`)).default;
      Object.assign(translations, fileTranslations);
    } catch (error) {
      console.warn(`Could not load ${locale}/${file}.json`);
    }
  }
  
  return translations;
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Load all message sets for dynamic switching using organized structure
  const enMessages = await mergeTranslations('en');
  const frMessages = await mergeTranslations('fr');
  const deMessages = await mergeTranslations('de');
  const esMessages = await mergeTranslations('es');
  const itMessages = await mergeTranslations('it');
  const allMessages = { en: enMessages, fr: frMessages, de: deMessages, es: esMessages, it: itMessages };
  
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fase-logo-mark.png" as="image" />
      </head>
      <body>
        <LocaleProvider>
          <DynamicIntlProvider allMessages={allMessages}>
            <UnifiedAuthProvider>
              {children}
              <CookieBanner />
              <ConsentAwareAnalytics />
            </UnifiedAuthProvider>
          </DynamicIntlProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}