'use client';
// app/dashboard/layout.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { Menu, Clock, LogOut } from 'lucide-react';

export default function DashboardLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  // Estudiantes/alumnos ven pantalla de espera
  if (user.rol === 'ESTUDIANTE' || user.rol === 'ALUMNO') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900 border border-gray-800/50 rounded-3xl p-10 text-center shadow-2xl">
          <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-blue-400 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Cuenta pendiente</h1>
          <p className="text-gray-400 leading-relaxed mb-2">
            Tu cuenta fue registrada correctamente.
          </p>
          <p className="text-gray-400 leading-relaxed mb-8">
            <span className="text-blue-300 font-medium">Esperá a ser habilitado por un administrador</span> para acceder al sistema.
          </p>
          <div className="bg-gray-800/50 rounded-2xl p-4 mb-8 text-left space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Tu cuenta</p>
            <p className="text-white font-medium">{user.nombre} {user.apellido}</p>
            <p className="text-gray-400 text-sm">{user.email}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 mx-auto px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl transition-all text-sm font-medium"
          >
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar móvil */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-xl flex-shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <p className="text-sm font-semibold text-white">Sistema de Pañol</p>
        </div>

        {/* Contenido principal */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
