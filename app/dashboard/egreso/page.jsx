'use client';
// app/dashboard/egreso/page.jsx
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input, { Select, Textarea } from '@/components/ui/Input';
import { Plus, Trash2, PackagePlus, AlertTriangle, CheckCircle } from 'lucide-react';

function ItemRow({ item, inventario, onChange, onRemove, index }) {
  const invItem = inventario.find((i) => i.NOMBRE === item.nombre);
  const disponible = invItem ? parseInt(invItem.STOCK_DISPONIBLE) : 0;
  const excede = item.cantidad > disponible;

  return (
    <div className={`flex gap-3 items-end p-4 rounded-xl border transition-colors
      ${excede ? 'bg-red-500/5 border-red-500/30' : 'bg-gray-800/50 border-gray-700/50'}`}>
      <div className="flex-1">
        <label className="text-xs text-gray-400 mb-1 block">Ítem #{index + 1}</label>
        <select
          value={item.nombre}
          onChange={(e) => onChange({ ...item, nombre: e.target.value, cantidad: 1 })}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm
            focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
        >
          <option value="">Seleccionar ítem…</option>
          {inventario
            .filter((i) => i.ACTIVO === 'TRUE' && parseInt(i.STOCK_DISPONIBLE) > 0)
            .map((i) => (
              <option key={i.ID} value={i.NOMBRE}>
                {i.NOMBRE} ({i.STOCK_DISPONIBLE} disp.)
              </option>
            ))}
        </select>
      </div>
      <div className="w-32">
        <label className="text-xs text-gray-400 mb-1 block">
          Cantidad {invItem && `(máx: ${disponible})`}
        </label>
        <input
          type="number"
          min={1}
          max={disponible}
          value={item.cantidad}
          onChange={(e) => onChange({ ...item, cantidad: parseInt(e.target.value) || 1 })}
          className={`w-full bg-gray-800 border rounded-xl px-3 py-2.5 text-white text-sm text-center
            focus:outline-none focus:ring-2 transition-all
            ${excede
              ? 'border-red-500/50 focus:ring-red-500/50'
              : 'border-gray-700 focus:ring-amber-500/50 focus:border-amber-500/50'}`}
        />
      </div>
      {invItem && (
        <div className="text-xs text-gray-500 pb-2 min-w-[80px]">
          <span className={disponible === 0 ? 'text-red-400' : disponible <= parseInt(invItem.STOCK_MINIMO || 1) ? 'text-amber-400' : 'text-green-400'}>
            {disponible === 0 ? '⚠ Sin stock' : `${disponible} disponible`}
          </span>
        </div>
      )}
      {excede && (
        <div className="flex items-center gap-1 text-red-400 text-xs pb-2">
          <AlertTriangle className="w-3 h-3" /> Excede
        </div>
      )}
      <button
        onClick={onRemove}
        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors mb-0.5"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function EgresoPage() {
  const { authFetch, user } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [materias, setMaterias]   = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [submitted, setSubmitted] = useState(null);

  const [form, setForm] = useState({
    materia: '', profesor: '', alumno: '', curso: '', observaciones: '',
  });
  const [items, setItems] = useState([{ nombre: '', cantidad: 1 }]);

  useEffect(() => {
    const load = async () => {
      const [matRes, invRes] = await Promise.all([
        authFetch('/api/materias'),
        authFetch('/api/inventario?solo_activos=true'),
      ]);
      const matData = await matRes.json();
      const invData = await invRes.json();
      setMaterias(matData.materias || []);
      setInventario(invData.inventario || []);
    };
    load();
  }, [authFetch]);

  // Filtrar profesores según materia seleccionada
  useEffect(() => {
    if (!form.materia) { setProfesores([]); return; }
    authFetch(`/api/profesores?materia=${encodeURIComponent(form.materia)}`)
      .then((r) => r.json())
      .then((d) => setProfesores(d.profesores || []));
  }, [form.materia, authFetch]);

  const addItem = () => setItems((prev) => [...prev, { nombre: '', cantidad: 1 }]);
  const removeItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, val) => setItems((prev) => prev.map((item, idx) => idx === i ? val : item));

  const validItems = items.filter((i) => i.nombre && i.cantidad > 0);
  const hasErrors = items.some((item) => {
    if (!item.nombre) return false;
    const inv = inventario.find((i) => i.NOMBRE === item.nombre);
    return inv && item.cantidad > parseInt(inv.STOCK_DISPONIBLE);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validItems.length === 0) { toast('Agregá al menos un ítem', 'warning'); return; }
    if (hasErrors) { toast('Hay ítems con cantidad que excede el stock', 'error'); return; }

    setLoading(true);
    try {
      const res = await authFetch('/api/movimientos', {
        method: 'POST',
        body: JSON.stringify({ ...form, items: validItems }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmitted(data);
      toast('Egreso registrado correctamente', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ materia: '', profesor: '', alumno: '', curso: '', observaciones: '' });
    setItems([{ nombre: '', cantidad: 1 }]);
    setSubmitted(null);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="bg-gray-900 border border-green-500/20 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-9 h-9 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">¡Egreso registrado!</h2>
          <p className="text-gray-400 mb-6">El egreso fue guardado correctamente en el sistema.</p>

          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-left space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">ID Planilla:</span>
              <span className="font-mono text-amber-400 font-medium">{submitted.idPlanilla}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Fecha:</span>
              <span className="text-white">{submitted.fecha}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Hora egreso:</span>
              <span className="text-white">{submitted.hora}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Alumno:</span>
              <span className="text-white">{form.alumno}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Ítems:</span>
              <span className="text-white">{validItems.map((i) => `${i.nombre} (×${i.cantidad})`).join(', ')}</span>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={resetForm}>Nuevo egreso</Button>
            <Button onClick={() => router.push('/dashboard/pendientes')}>Ver pendientes</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <PackagePlus className="w-6 h-6 text-amber-400" />
          Registrar Egreso
        </h1>
        <p className="text-gray-400 text-sm mt-1">Completá todos los campos para registrar la salida de materiales.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sección: Datos académicos */}
        <div className="bg-gray-900 border border-gray-800/50 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Datos académicos</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Materia *"
              value={form.materia}
              onChange={(e) => setForm({ ...form, materia: e.target.value, profesor: '' })}
              required
            >
              <option value="">Seleccionar materia…</option>
              {materias.map((m) => (
                <option key={m.ID} value={m.NOMBRE}>{m.NOMBRE} {m.CURSO ? `(${m.CURSO})` : ''}</option>
              ))}
            </Select>

            <Select
              label="Profesor *"
              value={form.profesor}
              onChange={(e) => setForm({ ...form, profesor: e.target.value })}
              disabled={!form.materia}
              required
            >
              <option value="">{form.materia ? 'Seleccionar profesor…' : 'Primero elegí materia'}</option>
              {profesores.map((p) => (
                <option key={p.ID} value={`${p.NOMBRE} ${p.APELLIDO}`}>
                  {p.NOMBRE} {p.APELLIDO}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Sección: Datos del alumno */}
        <div className="bg-gray-900 border border-gray-800/50 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Datos del alumno</h2>

          <Input
            label="Nombre completo *"
            value={form.alumno}
            onChange={(e) => setForm({ ...form, alumno: e.target.value })}
            placeholder="Apellido, Nombre"
            required
          />
          <div className="grid grid-cols-1 gap-4">
            <Input
              label="Curso *"
              value={form.curso}
              onChange={(e) => setForm({ ...form, curso: e.target.value })}
              placeholder="Ej: 4to 1ra"
              required
            />
          </div>
        </div>

        {/* Sección: Ítems */}
        <div className="bg-gray-900 border border-gray-800/50 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
              Ítems a egresar
            </h2>
            <span className="text-xs text-gray-500">{validItems.length} ítem(s) válido(s)</span>
          </div>

          <div className="space-y-3">
            {items.map((item, i) => (
              <ItemRow
                key={i}
                index={i}
                item={item}
                inventario={inventario}
                onChange={(val) => updateItem(i, val)}
                onRemove={() => removeItem(i)}
              />
            ))}
          </div>

          <Button type="button" variant="secondary" onClick={addItem} className="w-full">
            <Plus className="w-4 h-4" /> Agregar otro ítem
          </Button>
        </div>

        {/* Observaciones */}
        <div className="bg-gray-900 border border-gray-800/50 rounded-2xl p-6">
          <Textarea
            label="Observaciones (opcional)"
            value={form.observaciones}
            onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
            placeholder="Ej: El alumno solicita materiales para proyecto final…"
            rows={3}
          />
        </div>

        {/* Resumen y botón */}
        {validItems.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
            <p className="text-sm text-amber-300 font-medium mb-2">Resumen del egreso:</p>
            <div className="space-y-1">
              {validItems.map((item, i) => {
                const inv = inventario.find((x) => x.NOMBRE === item.nombre);
                return (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{item.nombre}</span>
                    <span className="text-amber-400 font-medium">×{item.cantidad}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Button
          type="submit"
          size="xl"
          loading={loading}
          disabled={hasErrors || validItems.length === 0}
          className="w-full"
        >
          <PackagePlus className="w-5 h-5" />
          Confirmar Egreso
        </Button>
      </form>
    </div>
  );
}
