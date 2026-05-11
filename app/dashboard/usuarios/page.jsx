'use client';
// app/dashboard/usuarios/page.jsx
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input, { Select } from '@/components/ui/Input';
import { Users, Plus, Pencil, ShieldCheck, Wrench } from 'lucide-react';

const EMPTY_FORM = { nombre: '', apellido: '', email: '', rol: 'PAÑOLERO' };

export default function UsuariosPage() {
  const { authFetch, user } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);

  useEffect(() => { if (user && user.rol !== 'ADMIN') router.push('/dashboard'); }, [user, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/usuarios');
      setUsuarios((await res.json()).usuarios || []);
    } catch { toast('Error al cargar usuarios', 'error'); }
    finally { setLoading(false); }
  }, [authFetch, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditUser(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (u) => {
    setEditUser(u);
    setForm({ nombre: u.NOMBRE, apellido: u.APELLIDO, email: u.EMAIL, rol: u.ROL });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre || !form.apellido || !form.email) {
      toast('Completá todos los campos obligatorios', 'warning'); return;
    }
    setSaving(true);
    try {
      if (editUser) {
        const body = { nombre: form.nombre, apellido: form.apellido, email: form.email, rol: form.rol };
        const res = await authFetch(`/api/usuarios/${editUser.ID}`, { method: 'PUT', body: JSON.stringify(body) });
        if (!res.ok) throw new Error((await res.json()).error);
        toast('Usuario actualizado', 'success');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const toggleActivo = async (u) => {
    if (u.ID === user?.id && u.ACTIVO === 'TRUE') {
      toast('No podés desactivarte a vos mismo', 'warning'); return;
    }
    try {
      await authFetch(`/api/usuarios/${u.ID}`, {
        method: 'PUT',
        body: JSON.stringify({
          nombre: u.NOMBRE, apellido: u.APELLIDO, email: u.EMAIL, rol: u.ROL,
          activo: u.ACTIVO !== 'TRUE',
        }),
      });
      toast(`Usuario ${u.ACTIVO === 'TRUE' ? 'desactivado' : 'activado'}`, 'info');
      fetchData();
    } catch { toast('Error al cambiar estado', 'error'); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-400" /> Gestión de Usuarios
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">{usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} registrado{usuarios.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800/50 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-zebra">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800/50">
                  <th className="px-5 py-3 text-left">Usuario</th>
                  <th className="px-5 py-3 text-left">Email</th>
                  <th className="px-5 py-3 text-center">Rol</th>
                  <th className="px-5 py-3 text-center">Estado</th>
                  <th className="px-5 py-3 text-left">Último acceso</th>
                  <th className="px-5 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.ID} className={u.ACTIVO !== 'TRUE' ? 'opacity-50' : ''}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold
                          ${u.ROL === 'ADMIN' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                          {u.NOMBRE?.[0]}{u.APELLIDO?.[0]}
                        </div>
                        <div>
                          <p className="text-white font-medium">{u.NOMBRE} {u.APELLIDO}</p>
                          <p className="text-xs text-gray-500">ID: {u.ID?.slice(0, 12)}…</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-300">{u.EMAIL}</td>
                    <td className="px-5 py-3 text-center">
                      <Badge variant={u.ROL === 'ADMIN' ? 'admin' : 'pañolero'}>
                        {u.ROL === 'ADMIN'
                          ? <><ShieldCheck className="w-3 h-3 inline mr-1" />Admin</>
                          : <><Wrench className="w-3 h-3 inline mr-1" />Pañolero</>}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Badge variant={u.ACTIVO === 'TRUE' ? 'activo' : 'inactivo'}>
                        {u.ACTIVO === 'TRUE' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{u.ULTIMO_ACCESO || '—'}</td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <Button variant="ghost" size="xs" onClick={() => openEdit(u)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant={u.ACTIVO === 'TRUE' ? 'ghost' : 'outline'}
                          size="xs"
                          onClick={() => toggleActivo(u)}
                          disabled={u.ID === user?.id && u.ACTIVO === 'TRUE'}
                        >
                          {u.ACTIVO === 'TRUE' ? 'Desactivar' : 'Activar'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Editar: ${editUser?.NOMBRE} ${editUser?.APELLIDO}`}
        size="sm"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nombre *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            <Input label="Apellido *" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
          </div>
          <Input label="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Select label="Rol *" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
            <option value="PAÑOLERO">Pañolero</option>
            <option value="ADMIN">Administrador</option>
          </Select>
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
          <Button onClick={handleSave} loading={saving} className="flex-1">
            Guardar cambios
          </Button>
        </div>
      </Modal>
    </div>
  );
}
