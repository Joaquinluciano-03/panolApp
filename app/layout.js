import { Geist } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';

const geist = Geist({ subsets: ['latin'] });

export const metadata = {
  title: 'Sistema de Pañol — Colegio Técnico',
  description: 'Sistema de gestión de herramientas y materiales del pañol',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="dark">
      <body className={`${geist.className} bg-gray-950 text-white antialiased`}>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
