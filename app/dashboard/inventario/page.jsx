'use client';
// app/dashboard/inventario/page.jsx
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input, { Select } from '@/components/ui/Input';
import { Package, Plus, Pencil, Search, AlertTriangle, Trash2 } from 'lucide-react';

const CATEGORIAS = ['Herramienta manual', 'Herramienta eléctrica', 'Material', 'EPP', 'Otro'];
const EMPTY_FORM = { nombre: '', categoria: '', stock_total: '', unidad_medida: 'unidad', descripcion: '', stock_minimo: '1' };

function ItemForm({ form, setForm }) {
  return (
    <div className="space-y-4">
      <Input label="Nombre *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Martillo de goma" required />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Categoría *" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} required>
          <option value="">Seleccionar…</option>
          {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Input label="Unidad de medida" value={form.unidad_medida} onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })} placeholder="unidad, kg, m…" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Stock total *" type="number" min={0} value={form.stock_total} onChange={(e) => setForm({ ...form, stock_total: e.target.value })} required />
        <Input label="Stock mínimo" type="number" min={0} value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })} />
      </div>
      <Input label="Descripción" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción opcional…" />
    </div>
  );
}

export default function InventarioPage() {
  const { authFetch, user } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [inventario, setInventario] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editItem, setEditItem]     = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [q, setQ]                   = useState('');
  const [catFiltro, setCatFiltro]   = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // item a eliminar

  // Permitimos que estudiantes y pañoleros vean el stock, pero solo ADMIN puede editar

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/inventario');
      const data = await res.json();
      setInventario(data.inventario || []);
    } catch { toast('Error al cargar inventario', 'error'); }
    finally { setLoading(false); }
  }, [authFetch, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditItem(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      nombre: item.NOMBRE, categoria: item.CATEGORIA,
      stock_total: item.STOCK_TOTAL, unidad_medida: item.UNIDAD_MEDIDA,
      descripcion: item.DESCRIPCION, stock_minimo: item.STOCK_MINIMO,
      stock_disponible: parseInt(item.STOCK_TOTAL || 0, 10) - parseInt(item.STOCK_EN_USO || 0, 10),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre || !form.categoria || !form.stock_total) {
      toast('Nombre, categoría y stock son obligatorios', 'warning'); return;
    }
    setSaving(true);
    try {
      if (editItem) {
        const res = await authFetch(`/api/inventario/${editItem.ID}`, {
          method: 'PUT',
          body: JSON.stringify({
            nombre: form.nombre, categoria: form.categoria,
            stock_total: form.stock_total,
            unidad_medida: form.unidad_medida, descripcion: form.descripcion,
            stock_minimo: form.stock_minimo,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        toast('Ítem actualizado', 'success');
      } else {
        const res = await authFetch('/api/inventario', { method: 'POST', body: JSON.stringify(form) });
        if (!res.ok) throw new Error((await res.json()).error);
        toast('Ítem creado correctamente', 'success');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (item) => {
    try {
      const res = await authFetch(`/api/inventario/${item.ID}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      toast(`Ítem "${item.NOMBRE}" eliminado`, 'success');
      setConfirmDelete(null);
      fetchData();
    } catch (err) { toast(err.message, 'error'); }
  };

  const filtered = inventario.filter((i) => {
    const lq = q.toLowerCase();
    const matchQ = !q || i.NOMBRE?.toLowerCase().includes(lq) || i.CATEGORIA?.toLowerCase().includes(lq);
    const matchCat = !catFiltro || i.CATEGORIA === catFiltro;
    return matchQ && matchCat;
  });

  const stockBajo = inventario.filter(
    (i) => (parseInt(i.STOCK_TOTAL || 0, 10) - parseInt(i.STOCK_EN_USO || 0, 10)) <= parseInt(i.STOCK_MINIMO || 1)
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-400" /> Inventario
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">{inventario.length} ítems registrados</p>
        </div>
        {user?.rol === 'ADMIN' && (
          <Button onClick={openCreate} variant="accent"><Plus className="w-4 h-4" /> Agregar ítem</Button>
        )}
      </div>

      {stockBajo.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">
            <strong>{stockBajo.length} ítems</strong> con stock bajo o agotado:{' '}
            {stockBajo.map((i) => `${i.NOMBRE} (${parseInt(i.STOCK_TOTAL || 0, 10) - parseInt(i.STOCK_EN_USO || 0, 10)})`).join(', ')}
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text" placeholder="Buscar ítem…" value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-white text-sm
              placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>
        <select
          value={catFiltro} onChange={(e) => setCatFiltro(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-gray-900 border border-gray-800/50 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-zebra">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800/50">
                  <th className="px-5 py-3 text-left">Nombre</th>
                  <th className="px-5 py-3 text-left">Categoría</th>
                  <th className="px-5 py-3 text-center">Total</th>
                  <th className="px-5 py-3 text-center">Disponible</th>
                  <th className="px-5 py-3 text-center">En uso</th>
                  <th className="px-5 py-3 text-left">Unidad</th>
                  <th className="px-5 py-3 text-center">Mínimo</th>
                  <th className="px-5 py-3 text-center">Estado</th>
                  {user?.rol === 'ADMIN' && <th className="px-5 py-3 text-center">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const disp = parseInt(item.STOCK_TOTAL || 0, 10) - parseInt(item.STOCK_EN_USO || 0, 10);
                  const min = parseInt(item.STOCK_MINIMO || 1);
                  const stockOk = disp > min;
                  const stockAlerta = disp <= min && disp > 0;
                  const sinStock = disp === 0;
                  return (
                    <tr key={item.ID}>
                      <td className="px-5 py-3">
                        <p className="text-white font-medium">{item.NOMBRE}</p>
                        {item.DESCRIPCION && <p className="text-xs text-gray-500 truncate max-w-xs">{item.DESCRIPCION}</p>}
                      </td>
                      <td className="px-5 py-3 text-gray-300">{item.CATEGORIA}</td>
                      <td className="px-5 py-3 text-center text-gray-300">{item.STOCK_TOTAL}</td>
                      <td className="px-5 py-3 text-center">
                          {disp}
                      </td>
                      <td className="px-5 py-3 text-center text-blue-400">{item.STOCK_EN_USO || 0}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{item.UNIDAD_MEDIDA}</td>
                      <td className="px-5 py-3 text-center text-gray-400">{item.STOCK_MINIMO}</td>
                      <td className="px-5 py-3 text-center">
                        {sinStock
                          ? <Badge variant="alerta">Sin stock</Badge>
                          : stockAlerta
                          ? <Badge variant="pendiente">Stock bajo</Badge>
                          : <Badge variant="activo">En stock</Badge>}
                      </td>
                      {user?.rol === 'ADMIN' && (
                        <td className="px-5 py-3 text-center">
                          <div className="flex gap-2 justify-center">
                            <Button variant="ghost" size="xs" onClick={() => openEdit(item)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => setConfirmDelete(item)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? `Editar: ${editItem.NOMBRE}` : 'Agregar ítem al inventario'}
      >
        <ItemForm form={form} setForm={setForm} />
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
          <Button onClick={handleSave} variant="accent" loading={saving} className="flex-1">
            {editItem ? 'Guardar cambios' : 'Agregar ítem'}
          </Button>
        </div>
      </Modal>

      {/* Modal confirmación eliminación */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar ítem"
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">
              Esta acción es <strong>irreversible</strong>. Se eliminará permanentemente el ítem
              <strong className="text-white"> "{confirmDelete?.NOMBRE}"</strong> del inventario.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)} className="flex-1">Cancelar</Button>
            <Button variant="danger" onClick={() => handleDelete(confirmDelete)} className="flex-1">
              <Trash2 className="w-4 h-4" /> Eliminar definitivamente
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
