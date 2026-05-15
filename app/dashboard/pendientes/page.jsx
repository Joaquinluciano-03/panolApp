'use client';
// app/dashboard/pendientes/page.jsx
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import {
  Clock, RefreshCw, Search, AlertTriangle,
  XCircle, Trash2, EyeOff,
} from 'lucide-react';
import { tiempoTranscurrido, minutosTranscurridos, parseItems } from '@/lib/utils';

// ─── Modal gestión de faltantes (inline, sin navegación) ─────────────────────
function ModalFaltantes({ open, onClose, movimiento, onCerrado }) {
  const { authFetch, user } = useAuth();
  const toast = useToast();
  const [acciones, setAcciones] = useState({});
  const [cerrando, setCerrando] = useState(false);
  const [observaciones, setObservaciones] = useState('');

  // Calcular faltantes: de DIFERENCIA (movimientos ya INCOMPLETO) o de todos los ítems (PENDIENTE directo)
  const faltantes = movimiento
    ? parseItems(movimiento.DIFERENCIA || movimiento.ITEMS_EGRESADOS)
    : [];

  useEffect(() => {
    const init = {};
    faltantes.forEach(({ nombre }) => { init[nombre] = 'DESACTIVAR'; });
    setAcciones(init);
    setObservaciones('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movimiento]);

  if (!movimiento) return null;

  const setAccion = (nombre, accion) =>
    setAcciones((prev) => ({ ...prev, [nombre]: accion }));

  const allSet = faltantes.every(({ nombre }) => acciones[nombre]);

  const handleConfirm = async () => {
    setCerrando(true);
    try {
      const faltantesPayload = faltantes.map(({ nombre, cantidad }) => ({
        nombre,
        cantidad,
        accion: acciones[nombre],
      }));

      const res = await authFetch(`/api/movimientos/${movimiento.ID}/cerrar`, {
        method: 'POST',
        body: JSON.stringify({ faltantes: faltantesPayload, observaciones }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast('Pendiente cerrado correctamente con registro de faltantes.', 'success');
      onCerrado();
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setCerrando(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Gestionar ítems no devueltos"
      size="md"
    >
      <div className="space-y-4">
        {/* Cabecera del movimiento */}
        <div className="bg-gray-800/50 rounded-xl p-3 text-sm">
          <p className="text-gray-400">
            Planilla: <span className="text-amber-400 font-mono">{movimiento.ID_PLANILLA}</span>
            {' · '}
            <span className="text-white">{movimiento.ALUMNO_RESPONSABLE}</span>
          </p>
        </div>

        {/* Aviso */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">
            Los siguientes ítems <strong>no fueron devueltos</strong>. Elegí qué hacer con cada uno.
          </p>
        </div>

        {/* Lista de faltantes */}
        <div className="space-y-3">
          {faltantes.map(({ nombre, cantidad }) => (
            <div key={nombre} className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-white font-semibold">{nombre}</p>
                  <p className="text-xs text-red-400 mt-0.5">
                    Faltan <strong>{cantidad}</strong> unidad{cantidad !== 1 ? 'es' : ''}
                  </p>
                </div>
                <XCircle className="w-5 h-5 text-red-400/60" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAccion(nombre, 'ELIMINAR')}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    acciones[nombre] === 'ELIMINAR'
                      ? 'bg-red-500/20 border-red-500/50 text-red-300'
                      : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:border-red-500/30 hover:text-red-400'
                  }`}
                >
                  <Trash2 className="w-4 h-4 flex-shrink-0" />
                  <div className="text-left">
                    <p className="leading-tight">Eliminar del stock</p>
                    <p className="text-xs opacity-70 leading-tight">Reduce el total permanentemente</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAccion(nombre, 'DESACTIVAR')}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    acciones[nombre] === 'DESACTIVAR'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:border-amber-500/30 hover:text-amber-400'
                  }`}
                >
                  <EyeOff className="w-4 h-4 flex-shrink-0" />
                  <div className="text-left">
                    <p className="leading-tight">Marcar no disponible</p>
                    <p className="text-xs opacity-70 leading-tight">Reactivable si aparece</p>
                  </div>
                </button>
              </div>

              {acciones[nombre] === 'ELIMINAR' && (
                <p className="text-xs text-red-400/70 mt-2 pl-1">
                  ⚠ Se reducirá el stock total en {cantidad} unidad{cantidad !== 1 ? 'es' : ''}. Acción permanente.
                </p>
              )}
              {acciones[nombre] === 'DESACTIVAR' && (
                <p className="text-xs text-amber-400/70 mt-2 pl-1">
                  El ítem quedará inactivo. Podés reactivarlo desde Inventario si aparece.
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Observaciones opcionales */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Observaciones del cierre (opcional)</label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Ej: El alumno extravió el destornillador…"
            rows={2}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm
              placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none transition-all"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1" disabled={cerrando}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            loading={cerrando}
            disabled={!allSet}
            className="flex-1 bg-red-600 hover:bg-red-500"
          >
            Cerrar pendiente
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function PendientesPage() {
  const { authFetch, user } = useAuth();
  const toast = useToast();
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [q, setQ]                     = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');

  // Modal faltantes
  const [modalFaltantes, setModalFaltantes] = useState(false);
  const [movSelected, setMovSelected]       = useState(null);

  const isAdmin = user?.rol === 'ADMIN';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Traer PENDIENTE e INCOMPLETO en una sola llamada
      const res = await authFetch('/api/movimientos?estado=PENDIENTE,INCOMPLETO');
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

  // ── Filtros ──────────────────────────────────────────────────────────────
  const filtered = movimientos.filter((m) => {
    // Filtro de búsqueda
    const lq = q.toLowerCase();
    const matchQ = !q || (
      m.ALUMNO_RESPONSABLE?.toLowerCase().includes(lq) ||
      m.PROFESOR?.toLowerCase().includes(lq) ||
      m.ID_PLANILLA?.toLowerCase().includes(lq) ||
      m.MATERIA?.toLowerCase().includes(lq)
    );
    // Filtro de estado
    const matchEstado =
      filtroEstado === 'TODOS' ||
      m.ESTADO === filtroEstado;

    return matchQ && matchEstado;
  });

  const pendientes   = movimientos.filter((m) => m.ESTADO === 'PENDIENTE');
  const incompletos  = movimientos.filter((m) => m.ESTADO === 'INCOMPLETO');
  const vencidos     = filtered.filter(
    (m) => m.ESTADO === 'PENDIENTE' && minutosTranscurridos(m.FECHA, m.HORA_EGRESO) > 90
  );

  const abrirModalFaltantes = (mov) => {
    setMovSelected(mov);
    setModalFaltantes(true);
  };

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Clock className="w-6 h-6 text-amber-400" />
              Movimientos Pendientes
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              <span className="text-amber-400 font-medium">{pendientes.length}</span> pendiente{pendientes.length !== 1 ? 's' : ''}
              {incompletos.length > 0 && (
                <>
                  {' · '}
                  <span className="text-red-400 font-medium">{incompletos.length}</span> incompleto{incompletos.length !== 1 ? 's' : ''}
                </>
              )}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" /> Actualizar
          </Button>
        </div>

        {/* Alerta de vencidos */}
        {vencidos.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-300">
                {vencidos.length} planilla{vencidos.length > 1 ? 's' : ''} supera{vencidos.length === 1 ? '' : 'n'} 1h 30min sin retorno
              </p>
              <p className="text-xs text-red-400/70 mt-0.5">
                {vencidos.map((m) => m.ALUMNO_RESPONSABLE).join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* Alerta de incompletos sin cerrar */}
        {incompletos.length > 0 && isAdmin && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-300">
                {incompletos.length} retorno{incompletos.length !== 1 ? 's' : ''} incompleto{incompletos.length !== 1 ? 's' : ''} pendiente{incompletos.length !== 1 ? 's' : ''} de cierre
              </p>
              <p className="text-xs text-orange-400/70 mt-0.5">
                Como administrador podés cerrarlos gestionando los ítems faltantes.
              </p>
            </div>
          </div>
        )}

        {/* Controles: búsqueda + filtro estado */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por alumno, profesor, planilla…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white
                placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all text-sm"
            />
          </div>
          <div className="flex gap-1.5 bg-gray-900 border border-gray-700 rounded-xl p-1">
            {['TODOS', 'PENDIENTE', 'INCOMPLETO'].map((est) => (
              <button
                key={est}
                onClick={() => setFiltroEstado(est)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filtroEstado === est
                    ? est === 'INCOMPLETO'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : est === 'PENDIENTE'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-gray-700 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {est === 'TODOS' ? `Todos (${movimientos.length})` : est === 'PENDIENTE' ? `Pendiente (${pendientes.length})` : `Incompleto (${incompletos.length})`}
              </button>
            ))}
          </div>
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
              <p className="font-medium">No hay movimientos{filtroEstado !== 'TODOS' ? ` en estado ${filtroEstado}` : ''}</p>
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
                    <th className="px-6 py-3 text-left">Ítems</th>
                    <th className="px-6 py-3 text-left">Hora egreso</th>
                    <th className="px-6 py-3 text-left">Tiempo</th>
                    <th className="px-6 py-3 text-center">Estado</th>
                    <th className="px-6 py-3 text-left">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => {
                    const mins    = minutosTranscurridos(m.FECHA, m.HORA_EGRESO);
                    const vencido = m.ESTADO === 'PENDIENTE' && mins > 90;
                    const esIncompleto = m.ESTADO === 'INCOMPLETO';

                    return (
                      <tr
                        key={m.ID}
                        className={
                          esIncompleto
                            ? 'bg-orange-500/5 border-l-2 border-l-orange-500'
                            : vencido
                            ? 'bg-red-500/5 border-l-2 border-l-red-500'
                            : ''
                        }
                      >
                        <td className="px-6 py-4 font-mono text-xs text-gray-400">{m.ID_PLANILLA}</td>
                        <td className="px-6 py-4">
                          <p className="text-white font-medium">{m.ALUMNO_RESPONSABLE}</p>
                          <p className="text-xs text-gray-500">{m.CURSO}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-200">{m.MATERIA}</p>
                          <p className="text-xs text-gray-500">{m.PROFESOR}</p>
                        </td>
                        <td className="px-6 py-4 text-gray-300 text-xs max-w-xs">
                          {esIncompleto && m.DIFERENCIA ? (
                            /* Para INCOMPLETO mostramos los faltantes en rojo */
                            <div className="space-y-0.5">
                              <p className="text-xs text-gray-500 mb-1">Egresados:</p>
                              {m.ITEMS_EGRESADOS?.split(',').map((item, i) => {
                                const [nombre, cant] = item.split(':');
                                return (
                                  <div key={i} className="flex justify-between gap-3">
                                    <span>{nombre?.trim()}</span>
                                    <span className="text-amber-400 font-medium">×{cant}</span>
                                  </div>
                                );
                              })}
                              <p className="text-xs text-red-400 mt-1.5 font-medium">Faltantes:</p>
                              {m.DIFERENCIA?.split(',').map((item, i) => {
                                const [nombre, cant] = item.split(':');
                                // ignorar la parte de acción entre paréntesis si ya fue cerrado
                                const cantNum = cant?.replace(/\(.*\)/, '').trim();
                                return (
                                  <div key={`diff-${i}`} className="flex justify-between gap-3">
                                    <span className="text-red-300">{nombre?.trim()}</span>
                                    <span className="text-red-400 font-medium">−{cantNum}</span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
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
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-300">{m.HORA_EGRESO}</p>
                          <p className="text-xs text-gray-600">{m.FECHA}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm font-semibold ${vencido ? 'text-red-400' : esIncompleto ? 'text-orange-400' : 'text-amber-400'}`}>
                            {vencido && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                            {tiempoTranscurrido(m.FECHA, m.HORA_EGRESO)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {esIncompleto
                            ? <Badge variant="incompleto">Incompleto</Badge>
                            : <Badge variant="pendiente">Pendiente</Badge>
                          }
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                            {/* Botón principal de retorno (solo para PENDIENTE) */}
                            {m.ESTADO === 'PENDIENTE' && (
                              <Link href={`/dashboard/retorno/${m.ID}`}>
                                <Button variant="primary" size="sm" className="w-full">
                                  Registrar retorno
                                </Button>
                              </Link>
                            )}

                            {/* Para INCOMPLETO: ir a retorno (para ver detalle) */}
                            {esIncompleto && (
                              <Link href={`/dashboard/retorno/${m.ID}`}>
                                <Button variant="outline" size="sm" className="w-full">
                                  Ver detalle
                                </Button>
                              </Link>
                            )}

                            {/* Botón de cierre con faltantes (solo admin) */}
                            {isAdmin && esIncompleto && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20"
                                onClick={() => abrirModalFaltantes(m)}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Cerrar con faltantes
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Leyenda de estados */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              Pendiente: esperando retorno
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
              Incompleto: retornado parcialmente, aguarda cierre admin
            </span>
            {isAdmin && (
              <span className="flex items-center gap-1.5">
                <XCircle className="w-3 h-3 text-red-400" />
                Como admin podés cerrar incompletos gestionando faltantes
              </span>
            )}
          </div>
        )}
      </div>

      {/* Modal de faltantes */}
      <ModalFaltantes
        open={modalFaltantes}
        onClose={() => setModalFaltantes(false)}
        movimiento={movSelected}
        onCerrado={fetchData}
      />
    </>
  );
}
