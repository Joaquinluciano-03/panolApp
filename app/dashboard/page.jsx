'use client';
// app/dashboard/page.jsx
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import {
  PackagePlus, Clock, CheckCircle, AlertTriangle,
  TrendingUp, Package, RefreshCw, BarChart3, XCircle,
} from 'lucide-react';
import { parseItems, tiempoTranscurrido, minutosTranscurridos } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

function StatCard({ title, value, subtitle, icon: Icon, color = 'amber' }) {
  const colors = {
    amber: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    green: 'bg-green-500/10 border-green-500/20 text-green-400',
    red:   'bg-red-500/10 border-red-500/20 text-red-400',
    blue:  'bg-blue-500/10 border-blue-500/20 text-blue-400',
  };
  return (
    <div className="bg-gray-900 border border-gray-800/50 rounded-2xl p-5 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">{value ?? '—'}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl border ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, authFetch } = useAuth();
  const toast = useToast();
  const router = require('next/navigation').useRouter();
  const isAdmin = user?.rol === 'ADMIN';

  useEffect(() => {
    if (user?.rol === 'ESTUDIANTE') {
      router.replace('/dashboard/inventario');
    }
  }, [user, router]);

  const [movimientos, setMovimientos]   = useState([]);
  const [inventario, setInventario]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [lastRefresh, setLastRefresh]   = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [movRes, invRes] = await Promise.all([
        authFetch('/api/movimientos'),
        authFetch('/api/inventario'),
      ]);
      const movData = await movRes.json();
      const invData = await invRes.json();
      setMovimientos(movData.movimientos || []);
      setInventario(invData.inventario || []);
      setLastRefresh(new Date());
    } catch {
      toast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  }, [authFetch, toast]);

  useEffect(() => {
    fetchData();
    // Auto-refresh cada 30 segundos
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const hoy = new Date().toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const movHoy         = movimientos.filter((m) => m.FECHA === hoy);
  const pendientes     = movimientos.filter((m) => m.ESTADO === 'PENDIENTE');
  const incompletos    = movimientos.filter((m) => m.ESTADO === 'INCOMPLETO');
  const cerradosFalt   = movimientos.filter((m) => m.ESTADO === 'CERRADO_CON_FALTANTES');
  const pendientesHoy  = pendientes.filter((m) => m.FECHA === hoy);
  const completadosHoy = movHoy.filter((m) => m.ESTADO === 'COMPLETADO');
  const stockBajo      = inventario.filter(
    (i) => i.ACTIVO === 'TRUE' && parseInt(i.STOCK_DISPONIBLE) <= parseInt(i.STOCK_MINIMO || 1)
  );
  // Items que están desactivados por faltantes (ACTIVO=FALSE y tienen STOCK_EN_USO=0)
  const itemsPerdidos  = inventario.filter((i) => i.ACTIVO !== 'TRUE');

  // Movimientos del mes actual (formato FECHA: DD/MM/YYYY)
  const currentDate = new Date();
  const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
  const currentYear = String(currentDate.getFullYear());
  
  const movMesActual = movimientos.filter((m) => {
    if (!m.FECHA) return false;
    const [d, mStr, yStr] = m.FECHA.split('/');
    return mStr === currentMonth && yStr === currentYear;
  });

  // Top ítems utilizados (para gráfico, mes actual)
  const itemUsage = {};
  movMesActual.forEach((m) => {
    parseItems(m.ITEMS_EGRESADOS).forEach(({ nombre, cantidad }) => {
      itemUsage[nombre] = (itemUsage[nombre] || 0) + cantidad;
    });
  });
  const topItems = Object.entries(itemUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([nombre, total]) => ({ nombre: nombre.length > 12 ? nombre.slice(0, 12) + '…' : nombre, total }));

  // Top 5 materias con más movimientos (mes actual)
  const materiaCounts = {};
  movMesActual.forEach((m) => {
    if (m.MATERIA) materiaCounts[m.MATERIA] = (materiaCounts[m.MATERIA] || 0) + 1;
  });
  const materiasData = Object.entries(materiaCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nombre, total]) => ({
      nombre: nombre.length > 15 ? nombre.slice(0, 15) + '…' : nombre, total,
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isAdmin ? 'Panel de Administración' : 'Panel de Pañolero'}
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {hoy} — {user?.nombre} {user?.apellido}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <p className="text-xs text-gray-600">
              Actualizado: {lastRefresh.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          <Button variant="secondary" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" /> Actualizar
          </Button>
          <Link href="/dashboard/egreso">
            <Button variant="accent" size="lg" className="gap-2">
              <PackagePlus className="w-5 h-5" /> Nuevo Egreso
            </Button>
          </Link>
        </div>
      </div>

      {/* Alerta stock bajo */}
      {stockBajo.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-300">
              {stockBajo.length} ítem{stockBajo.length > 1 ? 's' : ''} con stock bajo
            </p>
            <p className="text-xs text-red-400/70 mt-0.5">
              {stockBajo.map((i) => `${i.NOMBRE} (${i.STOCK_DISPONIBLE} disponible)`).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Alerta incompletos pendientes de cierre (solo admin) */}
      {isAdmin && incompletos.length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-300">
              {incompletos.length} retorno{incompletos.length !== 1 ? 's' : ''} incompleto{incompletos.length !== 1 ? 's' : ''} sin cerrar
            </p>
            <p className="text-xs text-orange-400/70 mt-0.5">
              {incompletos.map((m) => m.ALUMNO_RESPONSABLE).join(', ')} — requerím{incompletos.length !== 1 ? 'en' : 'e'} acción de cierre
            </p>
          </div>
          <Link href="/dashboard/pendientes">
            <button className="text-xs text-orange-400 hover:text-orange-300 font-medium underline underline-offset-2 flex-shrink-0">
              Gestionar
            </button>
          </Link>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Movimientos hoy"
          value={movHoy.length}
          subtitle={`${completadosHoy.length} completados`}
          icon={TrendingUp}
          color="amber"
        />
        <StatCard
          title="Pendientes hoy"
          value={pendientesHoy.length}
          subtitle={pendientesHoy.length > 0 ? '⚠ requieren retorno' : 'Sin pendientes'}
          icon={Clock}
          color={pendientesHoy.length > 0 ? 'red' : 'green'}
        />
        {isAdmin && (
          <>
            <StatCard
              title="Sin cerrar (incompletos)"
              value={incompletos.length}
              subtitle={incompletos.length > 0 ? 'Requieren acción admin' : 'Todo cerrado'}
              icon={XCircle}
              color={incompletos.length > 0 ? 'red' : 'green'}
            />
            <StatCard
              title="Ítems stock bajo"
              value={stockBajo.length}
              subtitle={stockBajo.length > 0 ? 'Requieren reposición' : 'Stock OK'}
              icon={Package}
              color={stockBajo.length > 0 ? 'red' : 'green'}
            />
          </>
        )}
        {!isAdmin && (
          <StatCard
            title="Stock bajo"
            value={stockBajo.length}
            subtitle={stockBajo.length > 0 ? 'Requieren reposición' : 'Stock OK'}
            icon={Package}
            color={stockBajo.length > 0 ? 'red' : 'green'}
          />
        )}
      </div>

      {/* Movimientos Pendientes */}
      <section className="bg-gray-900 border border-gray-800/50 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/50">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            Pendientes e Incompletos
            {(pendientes.length + incompletos.length) > 0 && (
              <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded-full border border-blue-500/30">
                {pendientes.length + incompletos.length}
              </span>
            )}
            {incompletos.length > 0 && isAdmin && (
              <span className="bg-orange-500/20 text-orange-300 text-xs px-2 py-0.5 rounded-full border border-orange-500/30">
                {incompletos.length} sin cerrar
              </span>
            )}
          </h2>
          <Link href="/dashboard/pendientes">
            <Button variant="ghost" size="sm">Ver todos →</Button>
          </Link>
        </div>

        {(pendientes.length + incompletos.length) === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <CheckCircle className="w-10 h-10 mb-3 text-green-500/50" />
            <p>No hay movimientos pendientes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-zebra">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3 text-left">Planilla</th>
                  <th className="px-6 py-3 text-left">Alumno</th>
                  <th className="px-6 py-3 text-left">Materia</th>
                  <th className="px-6 py-3 text-left">Hora egreso</th>
                  <th className="px-6 py-3 text-left">Tiempo</th>
                  <th className="px-6 py-3 text-center">Estado</th>
                  <th className="px-6 py-3 text-left">Acción</th>
                </tr>
              </thead>
              <tbody>
                {[...pendientes, ...incompletos].slice(0, 5).map((m) => {
                  const mins = minutosTranscurridos(m.FECHA, m.HORA_EGRESO);
                  const vencido = m.ESTADO === 'PENDIENTE' && mins > 180;
                  const esIncompleto = m.ESTADO === 'INCOMPLETO';
                  return (
                    <tr key={m.ID} className={vencido ? 'bg-red-500/5' : esIncompleto ? 'bg-orange-500/5' : ''}>
                      <td className="px-6 py-3 text-gray-300 font-mono text-xs">{m.ID_PLANILLA}</td>
                      <td className="px-6 py-3 text-white font-medium">{m.ALUMNO_RESPONSABLE}</td>
                      <td className="px-6 py-3 text-gray-300">{m.MATERIA}</td>
                      <td className="px-6 py-3 text-gray-300">{m.HORA_EGRESO}</td>
                      <td className="px-6 py-3">
                        <span className={`text-xs font-medium ${
                          vencido ? 'text-red-400' : esIncompleto ? 'text-orange-400' : 'text-blue-400'
                        }`}>
                          {vencido && '⚠ '}{tiempoTranscurrido(m.FECHA, m.HORA_EGRESO)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <Badge variant={m.ESTADO?.toLowerCase()}>
                          {esIncompleto ? 'Incompleto' : 'Pendiente'}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        <Link href={`/dashboard/retorno/${m.ID}`}>
                          <Button variant="outline" size="xs">
                            {esIncompleto ? 'Ver / Cerrar' : 'Registrar retorno'}
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Gráficos (solo admin) */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top ítems */}
          <div className="bg-gray-900 border border-gray-800/50 rounded-2xl p-6">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              Ítems más solicitados (Top 10 - Mes actual)
            </h2>
            {topItems.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">Sin datos aún</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topItems} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 11 }} />
                  <YAxis type="category" dataKey="nombre" width={90} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 12 }}
                    cursor={{ fill: 'rgba(245,158,11,0.05)' }}
                  />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {topItems.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#F59E0B' : `rgba(245,158,11,${0.8 - i * 0.07})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Movimientos por materia */}
          <div className="bg-gray-900 border border-gray-800/50 rounded-2xl p-6">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              Materias con más movimientos (Top 5 - Mes actual)
            </h2>
            {materiasData.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">Sin datos aún</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={materiasData} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 11 }} />
                  <YAxis type="category" dataKey="nombre" width={110} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 12 }}
                    cursor={{ fill: 'rgba(245,158,11,0.05)' }}
                  />
                  <Bar dataKey="total" fill="#6366F1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Últimos movimientos */}
      <section className="bg-gray-900 border border-gray-800/50 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/50">
          <h2 className="font-semibold text-white">Últimos movimientos del día</h2>
          {isAdmin && (
            <Link href="/dashboard/historial">
              <Button variant="ghost" size="sm">Ver historial →</Button>
            </Link>
          )}
        </div>
        {movHoy.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <p>No hay movimientos hoy</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-zebra">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3 text-left">Planilla</th>
                  <th className="px-6 py-3 text-left">Alumno</th>
                  <th className="px-6 py-3 text-left">Materia</th>
                  <th className="px-6 py-3 text-left">Egreso</th>
                  <th className="px-6 py-3 text-left">Estado</th>
                </tr>
              </thead>
              <tbody>
                {movHoy.slice(0, 8).map((m) => (
                  <tr key={m.ID}>
                    <td className="px-6 py-3 font-mono text-xs text-gray-400">{m.ID_PLANILLA}</td>
                    <td className="px-6 py-3 text-white">{m.ALUMNO_RESPONSABLE}</td>
                    <td className="px-6 py-3 text-gray-300">{m.MATERIA}</td>
                    <td className="px-6 py-3 text-gray-300">{m.HORA_EGRESO}</td>
                    <td className="px-6 py-3">
                      <Badge variant={m.ESTADO?.toLowerCase()}>
                        {m.ESTADO}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
