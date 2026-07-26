import './globals.css';

export const metadata = {
  title: 'LinguaHover',
  description: 'Interaktív angol–magyar és német–magyar nyelvtanulás.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="hu"><body>{children}</body></html>;
}
