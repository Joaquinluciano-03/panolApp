'use client';
// components/Sidebar.jsx
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, PackagePlus, Clock, History,
  Package, BookOpen, Users, LogOut, ChevronLeft,
  Wrench, Menu,
} from 'lucide-react';
import { clsx } from '@/lib/utils';

const adminNav = [
  { href: '/dashboard',           label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/dashboard/egreso',    label: 'Nuevo Egreso',   icon: PackagePlus },
  { href: '/dashboard/pendientes',label: 'Pendientes',     icon: Clock },
  { href: '/dashboard/historial', label: 'Historial',      icon: History },
  { href: '/dashboard/inventario',label: 'Inventario',     icon: Package },
  { href: '/dashboard/maestros',  label: 'Materias/Prof.', icon: BookOpen },
  { href: '/dashboard/usuarios',  label: 'Usuarios',       icon: Users },
];

const pañoleroNav = [
  { href: '/dashboard',           label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/dashboard/egreso',    label: 'Nuevo Egreso',   icon: PackagePlus },
  { href: '/dashboard/pendientes',label: 'Pendientes',     icon: Clock },
];

const estudianteNav = [
  { href: '/dashboard/inventario',label: 'Stock del Pañol', icon: Package },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const nav = user?.rol === 'ADMIN' ? adminNav : (user?.rol === 'PAÑOLERO' ? pañoleroNav : estudianteNav);

  return (
    <>
      {/* Overlay móvil */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      <aside
        className={clsx(
          'fixed lg:relative z-30 h-screen flex flex-col bg-gray-950 border-r border-gray-800/50',
          'transition-all duration-300 ease-in-out',
          collapsed ? '-translate-x-full lg:translate-x-0 lg:w-16' : 'translate-x-0 w-64'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800/50 flex-shrink-0">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Wrench className="w-5 h-5 text-gray-950" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">Sistema de Pañol</p>
              <p className="text-xs text-gray-500 truncate">Colegio Técnico</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-gray-400 hover:text-white transition-colors hidden lg:block"
          >
            <ChevronLeft className={clsx('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                  active
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                )}
              >
                <Icon className={clsx('w-5 h-5 flex-shrink-0', active && 'text-amber-400')} />
                {!collapsed && (
                  <span className="text-sm font-medium truncate">{label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-gray-800/50 p-3 flex-shrink-0">
          {!collapsed && (
            <div className="px-2 py-2 mb-2">
              <p className="text-sm font-medium text-white truncate">
                {user?.nombre} {user?.apellido}
              </p>
                {user?.rol === 'ADMIN' ? 'Administrador' : (user?.rol === 'PAÑOLERO' ? 'Pañolero' : 'Estudiante')}
              </p>
            </div>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-gray-400
              hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm">Cerrar sesión</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
