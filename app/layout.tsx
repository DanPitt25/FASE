import './globals.css';
import { GeistSans } from 'geist/font/sans';
import { AuthProvider } from '../contexts/AuthContext';

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/europe.jpg" as="image" />
      </head>
      <body className={GeistSans.variable}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}