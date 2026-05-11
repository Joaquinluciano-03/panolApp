'use client';
// app/dashboard/pendientes/page.jsx
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Clock, RefreshCw, Search, AlertTriangle } from 'lucide-react';
import { tiempoTranscurrido, minutosTranscurridos } from '@/lib/utils';

export default function PendientesPage() {
  const { authFetch } = useAuth();
  const toast = useToast();
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [q, setQ]                     = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/movimientos?estado=PENDIENTE');
      const data = await res.json();
      setMovimientos(data.movimientos || []);
    } catch {
      toast('Error al cargar pendientes', 'error');
    } finally {
      setLoading(false);
    }
  }, [authFetch, toast]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filtered = movimientos.filter((m) => {
    if (!q) return true;
    const lq = q.toLowerCase();
    return (
      m.ALUMNO_RESPONSABLE?.toLowerCase().includes(lq) ||
      m.PROFESOR?.toLowerCase().includes(lq) ||
      m.ID_PLANILLA?.toLowerCase().includes(lq) ||
      m.MATERIA?.toLowerCase().includes(lq)
    );
  });

  const vencidos = filtered.filter((m) => minutosTranscurridos(m.FECHA, m.HORA_EGRESO) > 180);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-400" />
            Movimientos Pendientes
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {movimientos.length} pendiente{movimientos.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchData}>
          <RefreshCw className="w-4 h-4" /> Actualizar
        </Button>
      </div>

      {vencidos.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-300">
              {vencidos.length} planilla{vencidos.length > 1 ? 's' : ''} supera{vencidos.length === 1 ? '' : 'n'} las 3 horas sin retorno
            </p>
            <p className="text-xs text-red-400/70 mt-0.5">
              {vencidos.map((m) => m.ALUMNO_RESPONSABLE).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Buscar por alumno, profesor, planilla…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white
            placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
        />
      </div>

      {/* Tabla */}
      <div className="bg-gray-900 border border-gray-800/50 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay movimientos pendientes</p>
            {q && <p className="text-sm mt-1">Intentá con otra búsqueda</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-zebra">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800/50">
                  <th className="px-6 py-3 text-left">Planilla</th>
                  <th className="px-6 py-3 text-left">Alumno</th>
                  <th className="px-6 py-3 text-left">DNI</th>
                  <th className="px-6 py-3 text-left">Materia / Profesor</th>
                  <th className="px-6 py-3 text-left">Ítems egresados</th>
                  <th className="px-6 py-3 text-left">Hora egreso</th>
                  <th className="px-6 py-3 text-left">Tiempo</th>
                  <th className="px-6 py-3 text-left">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const mins = minutosTranscurridos(m.FECHA, m.HORA_EGRESO);
                  const vencido = mins > 180;
                  return (
                    <tr key={m.ID} className={vencido ? 'bg-red-500/5 border-l-2 border-l-red-500' : ''}>
                      <td className="px-6 py-4 font-mono text-xs text-gray-400">{m.ID_PLANILLA}</td>
                      <td className="px-6 py-4">
                        <p className="text-white font-medium">{m.ALUMNO_RESPONSABLE}</p>
                        <p className="text-xs text-gray-500">{m.CURSO}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-400 font-mono text-xs">{m.DNI_ALUMNO}</td>
                      <td className="px-6 py-4">
                        <p className="text-gray-200">{m.MATERIA}</p>
                        <p className="text-xs text-gray-500">{m.PROFESOR}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-300 text-xs max-w-xs">
                        <div className="space-y-0.5">
                          {m.ITEMS_EGRESADOS?.split(',').map((item, i) => {
                            const [nombre, cant] = item.split(':');
                            return (
                              <div key={i} className="flex justify-between gap-3">
                                <span>{nombre?.trim()}</span>
                                <span className="text-amber-400 font-medium">×{cant}</span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-300">{m.HORA_EGRESO}</p>
                        <p className="text-xs text-gray-600">{m.FECHA}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-semibold ${vencido ? 'text-red-400' : 'text-amber-400'}`}>
                          {vencido && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                          {tiempoTranscurrido(m.FECHA, m.HORA_EGRESO)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/dashboard/retorno/${m.ID}`}>
                          <Button variant="primary" size="sm">
                            Registrar retorno
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
      </div>
    </div>
  );
}
