'use client';
// app/dashboard/descuentos/page.jsx
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { AlertTriangle, Search, Clock, Package } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function DescuentosPage() {
  const { authFetch } = useAuth();
  const toast = useToast();
  const [descuentos, setDescuentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/descuentos');
      const data = await res.json();
      setDescuentos(data.descuentos || []);
    } catch {
      toast('Error al cargar la tabla de descuentos', 'error');
    } finally {
      setLoading(false);
    }
  }, [authFetch, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = descuentos.filter((d) => {
    const lq = q.toLowerCase();
    return (
      !q ||
      d.ALUMNO?.toLowerCase().includes(lq) ||
      d.ID_MOVIMIENTO?.toLowerCase().includes(lq) ||
      d.ITEM?.toLowerCase().includes(lq)
    );
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            Descuentos por faltante
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Registro histórico de ítems no devueltos y eliminados del stock.
          </p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por alumno, profesor, ítem, planilla…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white
              placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all text-sm"
          />
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800/50 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay registros de descuentos</p>
            {q && <p className="text-sm mt-1">Intentá con otra búsqueda</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-zebra">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800/50">
                  <th className="px-6 py-3 text-left">Planilla</th>
                  <th className="px-6 py-3 text-left">Alumno</th>
                  <th className="px-6 py-3 text-left">Materia / Profesor</th>
                  <th className="px-6 py-3 text-left">Ítems Eliminados</th>
                  <th className="px-6 py-3 text-left">Fecha Cierre</th>
                  <th className="px-6 py-3 text-left">Admin (Cerró)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.ID} className="border-l-2 border-l-red-500/50 bg-red-500/5 hover:bg-red-500/10">
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">{d.ID_MOVIMIENTO || '—'}</td>
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">{d.ALUMNO}</p>
                      <p className="text-xs text-gray-500">{d.CURSO}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-400 text-xs italic">No registrado</p>
                    </td>
                    <td className="px-6 py-4 text-gray-300 text-xs max-w-xs">
                      <div className="space-y-0.5">
                        {d.ITEM?.split(',').map((part, i) => {
                          const [nombre, cant] = part.split(':');
                          return (
                            <div key={i} className="flex justify-between gap-3">
                              <span className="text-red-300 font-medium">{nombre?.trim()}</span>
                              <span className="text-red-400 font-bold">−{cant?.trim()}</span>
                            </div>
                          );
                        })}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Total: {d.CANTIDAD} unidades</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-300">{d.HORA}</p>
                      <p className="text-xs text-gray-600">{d.FECHA}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-300 text-xs truncate max-w-[150px]" title={d.REGISTRADO_POR}>
                        {d.REGISTRADO_POR}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
