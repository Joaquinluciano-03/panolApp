'use client';
// app/dashboard/retorno/[id]/page.jsx
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useRouter, useParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import {
  ArrowLeft, CheckCircle, AlertTriangle, Package,
  Trash2, EyeOff, XCircle,
} from 'lucide-react';
import { parseItems } from '@/lib/utils';
import Link from 'next/link';

// ─── Modal de gestión de faltantes ───────────────────────────────────────────
function ModalFaltantes({ open, onClose, faltantes, onConfirm, loading }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Gestionar ítems no devueltos"
      size="md"
    >
      <div className="space-y-4">
        {/* Aviso */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">
            Los siguientes ítems <strong>no fueron devueltos</strong>. Al confirmar el cierre, estas unidades serán eliminadas del stock y se generará un registro en la tabla de <strong>Descuentos por faltante</strong>.
          </p>
        </div>

        {/* Lista de faltantes */}
        <div className="space-y-3">
          {faltantes.map(({ nombre, cantidad }) => (
            <div key={nombre} className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">{nombre}</p>
                <p className="text-xs text-red-400 mt-0.5">
                  Faltan <span className="font-bold">{cantidad}</span> unidad{cantidad !== 1 ? 'es' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 text-red-400/80 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">
                <Trash2 className="w-4 h-4" />
                <span className="text-xs font-medium">Se eliminará</span>
              </div>
            </div>
          ))}
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1" disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm()}
            loading={loading}
            className="flex-1 bg-red-600 hover:bg-red-500"
          >
            Confirmar eliminación y cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Pantalla de resultado ────────────────────────────────────────────────────
function ResultScreen({ submitted }) {
  const isCerrado = submitted.estado === 'CERRADO_CON_FALTANTES';
  const isComplete = submitted.estado === 'COMPLETADO';

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className={`bg-gray-900 border rounded-2xl p-8 text-center ${
        isComplete ? 'border-green-500/20' : isCerrado ? 'border-red-500/20' : 'border-amber-500/20'
      }`}>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border ${
          isComplete
            ? 'bg-green-500/10 border-green-500/20'
            : isCerrado
            ? 'bg-red-500/10 border-red-500/20'
            : 'bg-amber-500/10 border-amber-500/20'
        }`}>
          {isComplete
            ? <CheckCircle className="w-9 h-9 text-green-400" />
            : isCerrado
            ? <XCircle className="w-9 h-9 text-red-400" />
            : <AlertTriangle className="w-9 h-9 text-amber-400" />
          }
        </div>

        <h2 className="text-xl font-bold text-white mb-2">
          {isComplete
            ? 'Retorno completado'
            : isCerrado
            ? 'Pendiente cerrado con faltantes'
            : 'Retorno con diferencias'}
        </h2>
        <p className="text-gray-400 mb-4">
          {isComplete
            ? 'Todos los ítems fueron retornados correctamente.'
            : isCerrado
            ? 'Se registró el cierre. Los ítems faltantes fueron procesados según la acción elegida.'
            : 'El retorno fue registrado pero hay diferencias.'}
        </p>

        {submitted.diferencia && (
          <div className={`border rounded-xl p-3 mb-6 text-left ${
            isCerrado
              ? 'bg-red-500/10 border-red-500/20'
              : 'bg-amber-500/10 border-amber-500/20'
          }`}>
            <p className={`text-xs font-medium mb-1 ${isCerrado ? 'text-red-400' : 'text-amber-400'}`}>
              {isCerrado ? 'Ítems faltantes registrados:' : 'Diferencias detectadas:'}
            </p>
            <p className={`text-sm font-mono ${isCerrado ? 'text-red-300' : 'text-amber-300'}`}>
              {submitted.diferencia}
            </p>
          </div>
        )}

        {isCerrado && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-6 text-left">
            <p className="text-xs text-blue-400 font-medium mb-1">💡 Recordá</p>
            <p className="text-xs text-blue-300">
              Estos ítems se redujeron del stock total y quedaron anotados en la sección <strong>Descuentos por faltante</strong>.
            </p>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Link href="/dashboard/pendientes">
            <Button variant="secondary">Ver pendientes</Button>
          </Link>
          <Link href="/dashboard">
            <Button>Ir al dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function RetornoPage() {
  const { id } = useParams();
  const { authFetch, user } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [movimiento, setMovimiento]       = useState(null);
  const [loading, setLoading]             = useState(true);
  const [submitting, setSubmitting]       = useState(false);
  const [retorno, setRetorno]             = useState({});
  const [observaciones, setObservaciones] = useState('');
  const [submitted, setSubmitted]         = useState(null);

  // Modal de faltantes
  const [modalFaltantes, setModalFaltantes] = useState(false);
  const [faltantesData, setFaltantesData]   = useState([]);
  const [cerrando, setCerrando]             = useState(false);

  const [sourceItems, setSourceItems]       = useState([]);

  const isAdmin = user?.rol === 'ADMIN';

  useEffect(() => {
    authFetch(`/api/movimientos/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { toast(d.error, 'error'); router.push('/dashboard/pendientes'); return; }
        setMovimiento(d.movimiento);
        
        // Si ya está incompleto, trabajamos sobre la diferencia (faltantes)
        const isInc = d.movimiento.ESTADO === 'INCOMPLETO';
        const sItems = isInc 
          ? parseItems(d.movimiento.DIFERENCIA) 
          : parseItems(d.movimiento.ITEMS_EGRESADOS);
          
        setSourceItems(sItems);

        // Inicializar retorno asumiendo que devuelven todo lo que falta
        const init = {};
        sItems.forEach(({ nombre, cantidad }) => {
          // Remover sufijos de acciones si existen (ej. "(ELIMINAR)")
          const cantNum = parseInt(String(cantidad).replace(/\(.*\)/, ''), 10);
          init[nombre] = cantNum;
        });
        setRetorno(init);
      })
      .finally(() => setLoading(false));
  }, [id, authFetch, toast, router]);

  const calcFaltantesActuales = () =>
    sourceItems
      .map(({ nombre, cantidad: cantPendiente }) => {
        const cantNum = parseInt(String(cantPendiente).replace(/\(.*\)/, ''), 10);
        const cantRetorno = parseInt(retorno[nombre] ?? cantNum, 10);
        const diff = cantNum - cantRetorno;
        return diff > 0 ? { nombre, cantidad: diff } : null;
      })
      .filter(Boolean);

  // ── Registrar retorno normal ─────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const itemsIngresados = Object.entries(retorno)
      .map(([nombre, cantidad]) => ({ nombre, cantidad: parseInt(cantidad) || 0 }));

    // Validar que no exceda lo pendiente
    for (const { nombre, cantidad } of itemsIngresados) {
      const src = sourceItems.find((e) => e.nombre === nombre);
      const srcCant = src ? parseInt(String(src.cantidad).replace(/\(.*\)/, ''), 10) : 0;
      if (src && cantidad > srcCant) {
        toast(`No podés retornar más de ${srcCant} de ${nombre}`, 'error');
        return;
      }
    }

    const faltantes = calcFaltantesActuales();

    setSubmitting(true);
    try {
      const res = await authFetch(`/api/movimientos/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ itemsIngresados, observaciones }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Si hay faltantes y el usuario es admin, abrir modal de gestión
      if (data.estado === 'INCOMPLETO' && faltantes.length > 0 && isAdmin) {
        setMovimiento((m) => ({ ...m, ESTADO: 'INCOMPLETO' }));
        setFaltantesData(faltantes);
        setModalFaltantes(true);
        toast('Retorno registrado. Gestioná los ítems faltantes para cerrar el pendiente.', 'warning');
      } else {
        setSubmitted(data);
        toast(
          data.estado === 'COMPLETADO'
            ? '¡Retorno completado correctamente!'
            : 'Retorno registrado con diferencias.',
          data.estado === 'COMPLETADO' ? 'success' : 'warning'
        );
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Abrir modal para cierre definitivo por el admin ──────────────────────
  const abrirModalFaltantes = () => {
    const diff = parseItems(movimiento.DIFERENCIA);
    if (diff.length === 0) {
      toast('No se detectaron faltantes en este movimiento', 'warning');
      return;
    }
    
    // Limpiar string de acciones
    const cleanDiff = diff.map(d => ({
      ...d,
      cantidad: parseInt(String(d.cantidad).replace(/\(.*\)/, ''), 10)
    }));
    
    setFaltantesData(cleanDiff);
    setModalFaltantes(true);
  };

  // ── Confirmar cierre con faltantes ───────────────────────────────────────
  const handleCerrarConFaltantes = async () => {
    setCerrando(true);
    try {
      const faltantesPayload = faltantesData.map(({ nombre, cantidad }) => ({
        nombre,
        cantidad,
      }));

      const res = await authFetch(`/api/movimientos/${id}/cerrar`, {
        method: 'POST',
        body: JSON.stringify({ faltantes: faltantesPayload, observaciones }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setModalFaltantes(false);
      setSubmitted(data);
      toast('Pendiente cerrado correctamente con registro de faltantes.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setCerrando(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!movimiento) return null;

  if (submitted) return <ResultScreen submitted={submitted} />;

  // Si el movimiento ya está INCOMPLETO (viene de pendientes), mostrar botón de cierre directo
  const yaIncompleto = movimiento.ESTADO === 'INCOMPLETO';

  return (
    <>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/pendientes">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" /> Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {yaIncompleto ? 'Gestionar Pendiente Incompleto' : 'Registrar Retorno'}
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Planilla: <span className="font-mono text-amber-400">{movimiento.ID_PLANILLA}</span>
              {yaIncompleto && (
                <span className="ml-2 text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30">
                  Incompleto
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Info del egreso */}
        <div className="bg-gray-900 border border-gray-800/50 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-4">
            Datos del egreso original
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            {[
              ['Alumno', movimiento.ALUMNO_RESPONSABLE],
              ['Curso', movimiento.CURSO],
              ['Materia', movimiento.MATERIA],
              ['Profesor', movimiento.PROFESOR],
              ['Hora egreso', `${movimiento.HORA_EGRESO} (${movimiento.FECHA})`],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-gray-500 text-xs">{k}</p>
                <p className="text-white font-medium mt-0.5">{v}</p>
              </div>
            ))}
          </div>
          {movimiento.OBSERVACIONES && (
            <div className="mt-4 pt-4 border-t border-gray-800/50">
              <p className="text-xs text-gray-500">Observaciones originales:</p>
              <p className="text-gray-300 text-sm mt-1">{movimiento.OBSERVACIONES}</p>
            </div>
          )}
        </div>

        {/* Panel de Admin (Cierre definitivo) */}
        {yaIncompleto && isAdmin && (
          <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Cierre definitivo
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Si estos ítems definitivamente no van a ser devueltos, podés cerrar el pendiente y eliminar las unidades del stock.
            </p>
            <Button
              onClick={abrirModalFaltantes}
              className="w-full bg-red-600 hover:bg-red-500 border-red-500"
            >
              <XCircle className="w-4 h-4" />
              Cerrar pendiente con faltantes
            </Button>
          </div>
        )}

        {/* Formulario de retorno (Aplica para PENDIENTE e INCOMPLETO) */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-900 border border-gray-800/50 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-[var(--theme-primary-400)] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Package className="w-4 h-4" /> {yaIncompleto ? 'Registrar devolución de faltantes' : 'Cantidades retornadas'}
            </h2>

            <div className="space-y-3">
              {sourceItems.map(({ nombre, cantidad: cantPendienteRaw }) => {
                const cantPendiente = parseInt(String(cantPendienteRaw).replace(/\(.*\)/, ''), 10);
                const cantRetorno = parseInt(retorno[nombre] ?? cantPendiente, 10);
                const diff = cantPendiente - cantRetorno;
                const excede = cantRetorno > cantPendiente;

                return (
                  <div
                    key={nombre}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-colors
                      ${excede
                        ? 'bg-red-500/5 border-red-500/30'
                        : diff > 0
                        ? 'bg-orange-500/5 border-orange-500/30'
                        : 'bg-gray-800/30 border-gray-700/50'
                      }`}
                  >
                    <div className="flex-1">
                      <p className="text-white font-medium">{nombre}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {yaIncompleto ? 'Faltante previo:' : 'Egresado:'} <span className="text-[var(--theme-primary-400)]">{cantPendiente}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Retorna</p>
                        <input
                          type="number"
                          min={0}
                          max={cantPendiente}
                          value={retorno[nombre] ?? cantPendiente}
                          onChange={(e) =>
                            setRetorno({ ...retorno, [nombre]: parseInt(e.target.value) || 0 })
                          }
                          className={`w-20 bg-gray-800 border rounded-xl px-3 py-2 text-white text-center
                            font-semibold focus:outline-none focus:ring-2 transition-all text-sm
                            ${excede
                              ? 'border-red-500 focus:ring-red-500/50'
                              : 'border-gray-700 focus:ring-[var(--theme-primary-500)]'
                            }`}
                        />
                      </div>
                      {diff > 0 && !excede && (
                        <div className="text-center">
                          <p className="text-xs text-orange-400 font-medium">−{diff} faltará</p>
                        </div>
                      )}
                      {excede && (
                        <div className="text-center">
                          <AlertTriangle className="w-4 h-4 text-red-400 mx-auto" />
                          <p className="text-xs text-red-400">Excede</p>
                        </div>
                      )}
                      {diff === 0 && !excede && (
                        <CheckCircle className="w-5 h-5 text-[var(--theme-success-400)]" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Advertencia si hay diferencias */}
            {sourceItems.some(({ nombre, cantidad }) => {
              const cantPendiente = parseInt(String(cantidad).replace(/\(.*\)/, ''), 10);
              return parseInt(retorno[nombre] ?? cantPendiente, 10) < cantPendiente;
            }) && (
              <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-orange-300">
                    Hay ítems con retorno parcial.
                  </p>
                  {isAdmin ? (
                    <p className="text-xs text-orange-400/80 mt-0.5">
                      Al confirmar, podrás cerrar el pendiente de forma definitiva desde el panel superior.
                    </p>
                  ) : (
                    <p className="text-xs text-orange-400/80 mt-0.5">
                      El movimiento continuará en estado <strong>INCOMPLETO</strong> hasta que un administrador lo cierre.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800/50 rounded-2xl p-6">
            <Textarea
              label="Observaciones del retorno (opcional)"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej: Se devuelven los faltantes encontrados..."
              rows={3}
            />
          </div>

          <Button type="submit" size="xl" loading={submitting} className="w-full">
            <CheckCircle className="w-5 h-5" />
            {yaIncompleto ? 'Confirmar Devolución' : 'Confirmar Retorno'}
          </Button>
        </form>
      </div>

      {/* Modal de gestión de faltantes */}
      <ModalFaltantes
        open={modalFaltantes}
        onClose={() => setModalFaltantes(false)}
        faltantes={faltantesData}
        onConfirm={handleCerrarConFaltantes}
        loading={cerrando}
      />
    </>
  );
}
