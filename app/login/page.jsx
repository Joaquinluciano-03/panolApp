'use client';
// app/login/page.jsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const handleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      await login(credentialResponse.credential);
      toast('¡Bienvenido al sistema!', 'success');
      router.push('/dashboard');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleError = () => {
    toast('Fallo al iniciar sesión con Google', 'error');
  };

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* El fondo general (bg-gray-950) y los blobs animados ya vienen de app/layout.js */}
        
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(48,80,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(48,80,255,0.5) 1px,transparent 1px)', backgroundSize: '40px 40px' }}
        />

        <div className="relative w-full max-w-md animate-fade-in">
          <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30 p-2">
                <img src="/favicon.ico" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-2xl font-bold text-white text-center">Sistema de Pañol</h1>
              <p className="text-gray-400 text-sm mt-1 text-center">Colegio Técnico — Gestión de Herramientas</p>
            </div>

            <div className="flex flex-col items-center justify-center gap-4 py-4">
              {loading ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                  <p className="text-sm text-gray-400">Verificando...</p>
                </div>
              ) : (
                <GoogleLogin
                  onSuccess={handleSuccess}
                  onError={handleError}
                  theme="filled_black"
                  shape="circle"
                  size="large"
                  text="continue_with"
                />
              )}
              <p className="text-xs text-gray-500 text-center mt-2 px-4">
                Solo se permiten cuentas con dominio <br /> <b>@donorionevictoria.com.ar</b>
              </p>
            </div>

            <p className="text-center text-xs text-gray-600 mt-6 border-t border-gray-800/50 pt-6">
              Sistema de Gestión de Pañol © {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
