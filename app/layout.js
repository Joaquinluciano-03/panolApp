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
      <body className={`${geist.className} bg-gray-950 text-white antialiased relative min-h-screen`}>
        {/* Fondo animado difuminado */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
          <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-cyan-600/20 blur-[120px] mix-blend-screen animate-blob" />
          <div className="absolute top-[20%] -right-[20%] w-[60vw] h-[60vw] rounded-full bg-blue-600/20 blur-[100px] mix-blend-screen animate-blob animation-delay-2000" />
          <div className="absolute -bottom-[20%] left-[20%] w-[80vw] h-[80vw] rounded-full bg-cyan-500/10 blur-[150px] mix-blend-screen animate-blob animation-delay-4000" />
        </div>

        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
