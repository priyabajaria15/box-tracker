import './globals.css';

export const metadata = {
  title: 'Box Tracker — Moving Helper',
  manifest: '/manifest.json',
  themeColor: '#c05c2e',
  appleWebApp: {
    capable: true,
    title: 'BoxTracker',
    statusBarStyle: 'default'
  },
  icons: {
    apple: '/icons/icon-192.png'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
