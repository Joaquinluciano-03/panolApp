'use client';
// app/dashboard/historial/page.jsx
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { History, Download, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 15;

function MovimientoModal({ mov, onClose }) {
  if (!mov) return null;

  // Parse faltantes string: "Nombre:cantidad(ACCION),..."
  const parseFaltantes = (str) => {
    if (!str) return [];
    return str.split(',').map((part) => {
      const match = part.match(/^(.+):(\d+)(?:\((.+)\))?$/);
      if (!match) return { nombre: part, cantidad: 0, accion: null };
      return { nombre: match[1].trim(), cantidad: parseInt(match[2]), accion: match[3] || null };
    });
  };

  const tieneFaltantes = mov.ESTADO === 'CERRADO_CON_FALTANTES';
  const faltantesList  = tieneFaltantes ? parseFaltantes(mov.DIFERENCIA) : [];

  return (
    <Modal open={!!mov} onClose={onClose} title={`Detalle: ${mov.ID_PLANILLA}`} size="lg">
      <div className="grid grid-cols-2 gap-4 text-sm">
        {[
          ['ID', mov.ID], ['Planilla', mov.ID_PLANILLA], ['Fecha', mov.FECHA],
          ['Hora egreso', mov.HORA_EGRESO], ['Hora ingreso', mov.HORA_INGRESO || '—'],
          ['Estado', mov.ESTADO], ['Alumno', mov.ALUMNO_RESPONSABLE],
          ['Curso', mov.CURSO], ['Materia', mov.MATERIA], ['Profesor', mov.PROFESOR],
          ['Pañolero', mov.PAÑOLERO],
        ].map(([k, v]) => (
          <div key={k} className="bg-gray-800/30 rounded-xl p-3">
            <p className="text-xs text-gray-500">{k}</p>
            <p className={`font-medium mt-0.5 break-all ${
              k === 'Estado' && tieneFaltantes ? 'text-orange-300' :
              k === 'Estado' && v === 'COMPLETADO' ? 'text-green-300' :
              k === 'Estado' && v === 'INCOMPLETO' ? 'text-red-300' : 'text-white'
            }`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        <div className="bg-gray-800/30 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-2">Ítems egresados</p>
          <div className="space-y-1">
            {mov.ITEMS_EGRESADOS?.split(',').map((item, i) => {
              const [nombre, cant] = item.split(':');
              return (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-300">{nombre?.trim()}</span>
                  <span className="text-blue-400 font-medium">×{cant}</span>
                </div>
              );
            })}
          </div>
        </div>

        {mov.ITEMS_INGRESADOS && (
          <div className="bg-gray-800/30 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-2">Ítems ingresados</p>
            <div className="space-y-1">
              {mov.ITEMS_INGRESADOS?.split(',').map((item, i) => {
                const [nombre, cant] = item.split(':');
                return (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-300">{nombre?.trim()}</span>
                    <span className="text-green-400 font-medium">×{cant}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Faltantes con detalle de acción */}
        {tieneFaltantes && faltantesList.length > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
            <p className="text-xs text-orange-400 font-semibold mb-2">Ítems no devueltos (cerrado con faltantes)</p>
            <div className="space-y-2">
              {faltantesList.map(({ nombre, cantidad, accion }, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-orange-200">{nombre}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 font-medium">−{cantidad}</span>
                    {accion && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        accion === 'ELIMINAR'
                          ? 'bg-red-500/20 text-red-300 border-red-500/30'
                          : 'bg-gray-600/30 text-gray-400 border-gray-500/30'
                      }`}>
                        {accion === 'ELIMINAR' ? 'Eliminado del stock' : 'Marcado no disponible'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Diferencias simples (INCOMPLETO) */}
        {mov.DIFERENCIA && !tieneFaltantes && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <p className="text-xs text-red-400 mb-1">Diferencias</p>
            <p className="text-sm text-red-300 font-mono">{mov.DIFERENCIA}</p>
          </div>
        )}

        {mov.OBSERVACIONES && (
          <div className="bg-gray-800/30 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Observaciones</p>
            <p className="text-sm text-gray-300">{mov.OBSERVACIONES}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function HistorialPage() {
  const { authFetch, user } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(null);
  const [page, setPage]               = useState(1);

  // Filtros
  const [q, setQ]               = useState('');
  const [estado, setEstado]     = useState('');
  const [materia, setMateria]   = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => {
    if (user?.rol !== 'ADMIN') { router.push('/dashboard'); return; }
  }, [user, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (estado) params.set('estado', estado);
      if (materia) params.set('materia', materia);
      if (fechaDesde) params.set('fecha_desde', fechaDesde);
      if (fechaHasta) params.set('fecha_hasta', fechaHasta);
      if (q) params.set('q', q);
      const res = await authFetch(`/api/movimientos?${params}`);
      const data = await res.json();
      setMovimientos(data.movimientos || []);
      setPage(1);
    } catch {
      toast('Error al cargar historial', 'error');
    } finally {
      setLoading(false);
    }
  }, [authFetch, toast, estado, materia, fechaDesde, fechaHasta, q]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const total = movimientos.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paginated = movimientos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCSV = () => {
    if (movimientos.length === 0) { toast('No hay datos para exportar', 'warning'); return; }
    const headers = Object.keys(movimientos[0]);
    const csv = [
      headers.join(','),
      ...movimientos.map((m) => headers.map((h) => `"${(m[h] || '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial_panol_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV exportado correctamente', 'success');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="w-6 h-6 text-blue-400" />
            Historial de Movimientos
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">{total} registro{total !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="secondary" onClick={exportCSV}>
          <Download className="w-4 h-4" /> Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-gray-900 border border-gray-800/50 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-white text-sm
              placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        >
          <option value="">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="COMPLETADO">Completado</option>
          <option value="INCOMPLETO">Incompleto</option>
          <option value="CERRADO_CON_FALTANTES">Cerrado con faltantes</option>
        </select>
        <input
          type="date"
          value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          placeholder="Desde"
        />
        <input
          type="date"
          value={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          placeholder="Hasta"
        />
      </div>

      {/* Tabla */}
      <div className="bg-gray-900 border border-gray-800/50 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay movimientos para los filtros aplicados</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-zebra">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800/50">
                    <th className="px-5 py-3 text-left">Planilla</th>
                    <th className="px-5 py-3 text-left">Fecha</th>
                    <th className="px-5 py-3 text-left">Alumno</th>
                    <th className="px-5 py-3 text-left">Materia</th>
                    <th className="px-5 py-3 text-left">Profesor</th>
                    <th className="px-5 py-3 text-left">Ítems</th>
                    <th className="px-5 py-3 text-left">Estado</th>
                    <th className="px-5 py-3 text-left">Pañolero</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((m) => (
                    <tr
                      key={m.ID}
                      onClick={() => setSelected(m)}
                      className="cursor-pointer"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-blue-400">{m.ID_PLANILLA}</td>
                      <td className="px-5 py-3 text-gray-300">
                        <p>{m.FECHA}</p>
                        <p className="text-xs text-gray-500">{m.HORA_EGRESO}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-white font-medium">{m.ALUMNO_RESPONSABLE}</p>
                        <p className="text-xs text-gray-500">{m.CURSO}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-300">{m.MATERIA}</td>
                      <td className="px-5 py-3 text-gray-300">{m.PROFESOR}</td>
                      <td className="px-5 py-3 text-xs text-gray-400 max-w-xs truncate">
                        {m.ITEMS_EGRESADOS?.split(',').slice(0, 2).join(', ')}
                        {m.ITEMS_EGRESADOS?.split(',').length > 2 && ' …'}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={m.ESTADO?.toLowerCase()}>{m.ESTADO}</Badge>
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{m.PAÑOLERO}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800/50">
                <p className="text-sm text-gray-500">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="px-3 py-1.5 text-sm text-gray-300">{page} / {totalPages}</span>
                  <Button variant="secondary" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <MovimientoModal mov={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
