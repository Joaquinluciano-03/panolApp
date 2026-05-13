'use client';
// app/dashboard/retorno/[id]/page.jsx
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useRouter, useParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { ArrowLeft, CheckCircle, AlertTriangle, Package } from 'lucide-react';
import { parseItems } from '@/lib/utils';
import Link from 'next/link';

export default function RetornoPage() {
  const { id } = useParams();
  const { authFetch } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [movimiento, setMovimiento] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [retorno, setRetorno]       = useState({}); // { nombre: cantidad_retornada }
  const [observaciones, setObservaciones] = useState('');
  const [submitted, setSubmitted]   = useState(null);

  useEffect(() => {
    authFetch(`/api/movimientos/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { toast(d.error, 'error'); router.push('/dashboard/pendientes'); return; }
        setMovimiento(d.movimiento);
        // Inicializar retorno con las mismas cantidades egresadas
        const init = {};
        parseItems(d.movimiento.ITEMS_EGRESADOS).forEach(({ nombre, cantidad }) => {
          init[nombre] = cantidad;
        });
        setRetorno(init);
      })
      .finally(() => setLoading(false));
  }, [id, authFetch, toast, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const itemsIngresados = Object.entries(retorno)
      .map(([nombre, cantidad]) => ({ nombre, cantidad: parseInt(cantidad) || 0 }));

    // Validar que no exceda lo egresado
    const egresados = parseItems(movimiento.ITEMS_EGRESADOS);
    for (const { nombre, cantidad } of itemsIngresados) {
      const eg = egresados.find((e) => e.nombre === nombre);
      if (eg && cantidad > eg.cantidad) {
        toast(`No podés retornar más de ${eg.cantidad} de ${nombre}`, 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await authFetch(`/api/movimientos/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ itemsIngresados, observaciones }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmitted(data);
      toast(
        data.estado === 'COMPLETADO'
          ? '¡Retorno completado correctamente!'
          : 'Retorno registrado con diferencias.',
        data.estado === 'COMPLETADO' ? 'success' : 'warning'
      );
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!movimiento) return null;

  const egresados = parseItems(movimiento.ITEMS_EGRESADOS);

  if (submitted) {
    const isComplete = submitted.estado === 'COMPLETADO';
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className={`bg-gray-900 border rounded-2xl p-8 text-center ${isComplete ? 'border-green-500/20' : 'border-amber-500/20'}`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border ${isComplete ? 'bg-green-500/10 border-green-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
            {isComplete
              ? <CheckCircle className="w-9 h-9 text-green-400" />
              : <AlertTriangle className="w-9 h-9 text-amber-400" />
            }
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {isComplete ? 'Retorno completado' : 'Retorno con diferencias'}
          </h2>
          <p className="text-gray-400 mb-4">
            {isComplete
              ? 'Todos los ítems fueron retornados correctamente.'
              : 'El retorno fue registrado pero hay diferencias en las cantidades.'}
          </p>

          {submitted.diferencia && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-6 text-left">
              <p className="text-xs text-amber-400 font-medium mb-1">Diferencias detectadas:</p>
              <p className="text-sm text-amber-300 font-mono">{submitted.diferencia}</p>
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

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/pendientes">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" /> Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Registrar Retorno</h1>
          <p className="text-gray-400 text-sm mt-0.5">Planilla: <span className="font-mono text-amber-400">{movimiento.ID_PLANILLA}</span></p>
        </div>
      </div>

      {/* Info del egreso */}
      <div className="bg-gray-900 border border-gray-800/50 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-4">Datos del egreso original</h2>
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

      {/* Formulario de retorno */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-900 border border-gray-800/50 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Package className="w-4 h-4" /> Cantidades retornadas
          </h2>

          <div className="space-y-3">
            {egresados.map(({ nombre, cantidad: cantEgresada }) => {
              const cantRetorno = parseInt(retorno[nombre] || cantEgresada);
              const diff = cantEgresada - cantRetorno;
              const excede = cantRetorno > cantEgresada;

              return (
                <div key={nombre} className={`flex items-center gap-4 p-4 rounded-xl border transition-colors
                  ${excede ? 'bg-red-500/5 border-red-500/30' : diff > 0 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-gray-800/30 border-gray-700/50'}`}>
                  <div className="flex-1">
                    <p className="text-white font-medium">{nombre}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Egresado: <span className="text-amber-400">{cantEgresada}</span></p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Retorna</p>
                      <input
                        type="number"
                        min={0}
                        max={cantEgresada}
                        value={retorno[nombre] ?? cantEgresada}
                        onChange={(e) => setRetorno({ ...retorno, [nombre]: parseInt(e.target.value) || 0 })}
                        className={`w-20 bg-gray-800 border rounded-xl px-3 py-2 text-white text-center font-semibold
                          focus:outline-none focus:ring-2 transition-all text-sm
                          ${excede ? 'border-red-500 focus:ring-red-500/50' : 'border-gray-700 focus:ring-amber-500/50'}`}
                      />
                    </div>
                    {diff > 0 && !excede && (
                      <div className="text-center">
                        <p className="text-xs text-amber-400 font-medium">-{diff} faltante</p>
                      </div>
                    )}
                    {excede && (
                      <div className="text-center">
                        <AlertTriangle className="w-4 h-4 text-red-400 mx-auto" />
                        <p className="text-xs text-red-400">Excede</p>
                      </div>
                    )}
                    {diff === 0 && !excede && (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Advertencia si hay diferencias */}
          {egresados.some(({ nombre, cantidad }) => (parseInt(retorno[nombre] || cantidad)) < cantidad) && (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-300">
                Hay ítems con retorno parcial. El movimiento quedará en estado <strong>INCOMPLETO</strong>.
              </p>
            </div>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800/50 rounded-2xl p-6">
          <Textarea
            label="Observaciones del retorno (opcional)"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Ej: El alumno rompió el martillo, se notificó al profesor…"
            rows={3}
          />
        </div>

        <Button type="submit" size="xl" loading={submitting} className="w-full">
          <CheckCircle className="w-5 h-5" />
          Confirmar Retorno
        </Button>
      </form>
    </div>
  );
}
