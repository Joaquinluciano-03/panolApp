'use client';
// app/dashboard/maestros/page.jsx — Gestión de Materias y Profesores
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input, { Select } from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { BookOpen, Users, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';

export default function MaestrosPage() {
  const { authFetch, user } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [materias, setMaterias]     = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [loading, setLoading]       = useState(true);

  // Modals
  const [matModal, setMatModal]   = useState(false);
  const [profModal, setProfModal] = useState(false);
  const [editMat, setEditMat]     = useState(null);
  const [editProf, setEditProf]   = useState(null);
  const [matForm, setMatForm]     = useState({ nombre: '', curso: '' });
  const [profForm, setProfForm]   = useState({ nombre: '', apellido: '', materias: [] });
  const [saving, setSaving]       = useState(false);
  const [confirmDeleteMat, setConfirmDeleteMat]   = useState(null);
  const [confirmDeleteProf, setConfirmDeleteProf] = useState(null);

  useEffect(() => { if (user && user.rol !== 'ADMIN') router.push('/dashboard'); }, [user, router]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, pRes] = await Promise.all([
        authFetch('/api/materias'),
        authFetch('/api/profesores'),
      ]);
      // Para admin queremos ver todas incluyendo inactivas — necesitamos endpoint sin filtro
      // Por ahora obtenemos desde la API que filtra ACTIVO=TRUE para el flujo de egreso
      // Para el ABM pedimos todos (el endpoint de profesores ya devuelve solo ACTIVO=TRUE)
      setMaterias((await mRes.json()).materias || []);
      setProfesores((await pRes.json()).profesores || []);
    } catch { toast('Error al cargar datos', 'error'); }
    finally { setLoading(false); }
  }, [authFetch, toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Materias ──────────────────────────────────────────────────────────────
  const openCreateMat = () => { setEditMat(null); setMatForm({ nombre: '', curso: '' }); setMatModal(true); };
  const openEditMat = (m) => {
    // Si viene "4 A", extraer solo el numero o dejar el texto (ahora que sabemos que los viejos tenian division, limpiamos)
    const parts = m.CURSO ? m.CURSO.split(' ') : [];
    const cursoStr = parts[0] ? parts[0].replace('°', '') : '';
    setEditMat(m); 
    setMatForm({ nombre: m.NOMBRE, curso: cursoStr }); 
    setMatModal(true); 
  };

  const saveMat = async () => {
    if (!matForm.nombre) { toast('Nombre requerido', 'warning'); return; }
    setSaving(true);
    try {
      if (editMat) {
        await authFetch(`/api/materias/${editMat.ID}`, { method: 'PUT', body: JSON.stringify({ nombre: matForm.nombre, curso: matForm.curso }) });
        toast('Materia actualizada', 'success');
      } else {
        await authFetch('/api/materias', { method: 'POST', body: JSON.stringify({ nombre: matForm.nombre, curso: matForm.curso }) });
        toast('Materia creada', 'success');
      }
      setMatModal(false);
      fetchAll();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const toggleMat = async (m) => {
    await authFetch(`/api/materias/${m.ID}`, { method: 'PUT', body: JSON.stringify({ nombre: m.NOMBRE, curso: m.CURSO, activo: m.ACTIVO !== 'TRUE' }) });
    toast('Estado actualizado', 'info');
    fetchAll();
  };

  // ── Profesores ────────────────────────────────────────────────────────────
  const openCreateProf = () => { setEditProf(null); setProfForm({ nombre: '', apellido: '', materias: [] }); setProfModal(true); };
  const openEditProf = (p) => {
    setEditProf(p);
    setProfForm({ nombre: p.NOMBRE, apellido: p.APELLIDO, materias: p.MATERIA_ID ? p.MATERIA_ID.split(', ') : [] });
    setProfModal(true);
  };

  const saveProf = async () => {
    if (!profForm.nombre || !profForm.apellido) { toast('Nombre y apellido requeridos', 'warning'); return; }
    setSaving(true);
    try {
      if (editProf) {
        await authFetch(`/api/profesores/${editProf.ID}`, { method: 'PUT', body: JSON.stringify({ ...profForm, materias: profForm.materias.join(', ') }) });
        toast('Profesor actualizado', 'success');
      } else {
        await authFetch('/api/profesores', { method: 'POST', body: JSON.stringify({ ...profForm, materias: profForm.materias.join(', ') }) });
        toast('Profesor creado', 'success');
      }
      setProfModal(false);
      fetchAll();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const toggleProf = async (p) => {
    await authFetch(`/api/profesores/${p.ID}`, { method: 'PUT', body: JSON.stringify({ nombre: p.NOMBRE, apellido: p.APELLIDO, materias: p.MATERIA_ID, activo: p.ACTIVO !== 'TRUE' }) });
    toast('Estado actualizado', 'info');
    fetchAll();
  };

  const handleDeleteMat = async (m) => {
    try {
      const res = await authFetch(`/api/materias/${m.ID}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      toast(`Materia "${m.NOMBRE}" eliminada`, 'success');
      setConfirmDeleteMat(null);
      fetchAll();
    } catch (err) { toast(err.message, 'error'); }
  };

  const handleDeleteProf = async (p) => {
    try {
      const res = await authFetch(`/api/profesores/${p.ID}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      toast(`Profesor "${p.NOMBRE} ${p.APELLIDO}" eliminado`, 'success');
      setConfirmDeleteProf(null);
      fetchAll();
    } catch (err) { toast(err.message, 'error'); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-white">Materias y Profesores</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── MATERIAS ────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-400" /> Materias
            </h2>
            <Button size="sm" onClick={openCreateMat}><Plus className="w-4 h-4" /> Nueva</Button>
          </div>

          <div className="bg-gray-900 border border-gray-800/50 rounded-2xl overflow-hidden">
            {loading ? (
              <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>
            ) : materias.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No hay materias registradas</p>
            ) : (
              <table className="w-full text-sm table-zebra">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase border-b border-gray-800/50">
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-left">Curso</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {materias.map((m) => (
                    <tr key={m.ID}>
                      <td className="px-4 py-3 text-white font-medium">{m.NOMBRE}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{m.CURSO || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={m.ACTIVO === 'TRUE' ? 'activo' : 'inactivo'}>
                          {m.ACTIVO === 'TRUE' ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-2 justify-center">
                          <Button variant="ghost" size="xs" onClick={() => openEditMat(m)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="xs" onClick={() => toggleMat(m)}>
                            {m.ACTIVO === 'TRUE' ? 'Desactivar' : 'Activar'}
                          </Button>
                          <Button
                            variant="ghost" size="xs"
                            onClick={() => setConfirmDeleteMat(m)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── PROFESORES ────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" /> Profesores
            </h2>
            <Button size="sm" onClick={openCreateProf}><Plus className="w-4 h-4" /> Nuevo</Button>
          </div>

          <div className="bg-gray-900 border border-gray-800/50 rounded-2xl overflow-hidden">
            {loading ? (
              <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>
            ) : profesores.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No hay profesores registrados</p>
            ) : (
              <table className="w-full text-sm table-zebra">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase border-b border-gray-800/50">
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-left">Materia</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {profesores.map((p) => (
                    <tr key={p.ID}>
                      <td className="px-4 py-3 text-white font-medium">{p.NOMBRE} {p.APELLIDO}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{p.MATERIA_ID || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-2 justify-center">
                          <Button variant="ghost" size="xs" onClick={() => openEditProf(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="xs" onClick={() => toggleProf(p)}>
                            {p.ACTIVO === 'TRUE' ? 'Desactivar' : 'Activar'}
                          </Button>
                          <Button
                            variant="ghost" size="xs"
                            onClick={() => setConfirmDeleteProf(p)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal Materia */}
      <Modal open={matModal} onClose={() => setMatModal(false)} title={editMat ? 'Editar materia' : 'Nueva materia'} size="sm">
        <div className="space-y-3">
          <Input label="Nombre de la materia *" value={matForm.nombre} onChange={(e) => setMatForm({ ...matForm, nombre: e.target.value })} placeholder="Ej: Tecnología de la Madera" />
          <div>
            <Select
              label="Curso/Grado"
              value={matForm.curso}
              onChange={(e) => setMatForm({ ...matForm, curso: e.target.value })}
            >
              <option value="">Ninguno</option>
              {[1, 2, 3, 4, 5, 6, 7].map(num => (
                <option key={num} value={num.toString()}>{num}°</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <Button variant="secondary" onClick={() => setMatModal(false)} className="flex-1">Cancelar</Button>
          <Button onClick={saveMat} variant="accent" loading={saving} className="flex-1">{editMat ? 'Guardar' : 'Crear'}</Button>
        </div>
      </Modal>

      {/* Modal Profesor */}
      <Modal open={profModal} onClose={() => setProfModal(false)} title={editProf ? 'Editar profesor' : 'Nuevo profesor'} size="sm">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nombre *" value={profForm.nombre} onChange={(e) => setProfForm({ ...profForm, nombre: e.target.value })} />
            <Input label="Apellido *" value={profForm.apellido} onChange={(e) => setProfForm({ ...profForm, apellido: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Materias asociadas</label>
            <div className="max-h-40 overflow-y-auto bg-gray-900 border border-gray-700 rounded-xl p-3 space-y-2">
              {materias.map((m) => (
                <label key={m.ID} className="flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox"
                    checked={profForm.materias.includes(m.NOMBRE)}
                    onChange={(e) => {
                      if (e.target.checked) setProfForm({ ...profForm, materias: [...profForm.materias, m.NOMBRE] });
                      else setProfForm({ ...profForm, materias: profForm.materias.filter(x => x !== m.NOMBRE) });
                    }}
                    className="rounded border-gray-700 bg-gray-800 text-blue-500 focus:ring-blue-500"
                  />
                  {m.NOMBRE} {m.CURSO ? `(${m.CURSO})` : ''}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <Button variant="secondary" onClick={() => setProfModal(false)} className="flex-1">Cancelar</Button>
          <Button onClick={saveProf} variant="accent" loading={saving} className="flex-1">{editProf ? 'Guardar' : 'Crear'}</Button>
        </div>
      </Modal>

      {/* Modal confirmar eliminar Materia */}
      <Modal open={!!confirmDeleteMat} onClose={() => setConfirmDeleteMat(null)} title="Eliminar materia" size="sm">
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">
              Esta acción es <strong>irreversible</strong>. Se eliminará la materia
              <strong className="text-white"> "{confirmDeleteMat?.NOMBRE}"</strong>.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setConfirmDeleteMat(null)} className="flex-1">Cancelar</Button>
            <Button variant="danger" onClick={() => handleDeleteMat(confirmDeleteMat)} className="flex-1">
              <Trash2 className="w-4 h-4" /> Eliminar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal confirmar eliminar Profesor */}
      <Modal open={!!confirmDeleteProf} onClose={() => setConfirmDeleteProf(null)} title="Eliminar profesor" size="sm">
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">
              Esta acción es <strong>irreversible</strong>. Se eliminará el profesor
              <strong className="text-white"> "{confirmDeleteProf?.NOMBRE} {confirmDeleteProf?.APELLIDO}"</strong>.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setConfirmDeleteProf(null)} className="flex-1">Cancelar</Button>
            <Button variant="danger" onClick={() => handleDeleteProf(confirmDeleteProf)} className="flex-1">
              <Trash2 className="w-4 h-4" /> Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
