import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { serializeItems, generateId, nowAR, formatDate, formatTime, mapToUpper } from '@/lib/utils';

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let query = supabase.from('movimientos').select('*').order('timestamp', { ascending: false });

  const { searchParams } = new URL(request.url);
  const estado = searchParams.get('estado');
  const solo_hoy = searchParams.get('solo_hoy');
  const fecha_desde = searchParams.get('fecha_desde');
  const fecha_hasta = searchParams.get('fecha_hasta');
  const materia = searchParams.get('materia');
  const profesor = searchParams.get('profesor');
  const alumno = searchParams.get('alumno');
  const q = searchParams.get('q');

  if (payload.rol === 'PAÑOLERO' || solo_hoy === 'true') {
    query = query.eq('fecha', formatDate(nowAR()));
  }

  if (estado) {
    const estados = estado.split(',').map(s => s.trim());
    query = query.in('estado', estados);
  }
  if (materia) query = query.ilike('materia', `%${materia}%`);
  if (profesor) query = query.ilike('profesor', `%${profesor}%`);
  if (alumno) query = query.ilike('alumno_responsable', `%${alumno}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let result = mapToUpper(data);

  if (q) {
    const lq = q.toLowerCase();
    result = result.filter(
      (m) =>
        m.ALUMNO_RESPONSABLE?.toLowerCase().includes(lq) ||
        m.PROFESOR?.toLowerCase().includes(lq) ||
        m.MATERIA?.toLowerCase().includes(lq) ||
        m.DNI_ALUMNO?.includes(lq) ||
        m.ID_PLANILLA?.toLowerCase().includes(lq)
    );
  }
  
  if (fecha_desde) {
    result = result.filter((m) => {
      const [d, mo, y] = (m.FECHA || '').split('/');
      const t = new Date(y, mo - 1, d);
      return t >= new Date(fecha_desde);
    });
  }
  if (fecha_hasta) {
    result = result.filter((m) => {
      const [d, mo, y] = (m.FECHA || '').split('/');
      const t = new Date(y, mo - 1, d);
      return t <= new Date(fecha_hasta);
    });
  }

  return NextResponse.json({ movimientos: result });
}

export async function POST(request) {
  const payload = requireAuth(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const { materia, profesor, alumno, curso, items, observaciones } = body;

    if (!materia || !profesor || !alumno || !curso || !items?.length) {
      return NextResponse.json({ error: 'Campos obligatorios faltantes' }, { status: 400 });
    }

    const itemNames = items.map(i => i.nombre);
    const { data: invItems, error: invErr } = await supabase.from('inventario').select('*').in('nombre', itemNames).eq('activo', 'TRUE');
    if (invErr) throw invErr;

    for (const item of items) {
      const invItem = invItems.find((i) => i.nombre === item.nombre);
      if (!invItem) return NextResponse.json({ error: `Ítem no encontrado o inactivo: ${item.nombre}` }, { status: 400 });
      const disponible = parseInt(invItem.stock_total, 10) - parseInt(invItem.stock_en_uso, 10);
      if (item.cantidad > disponible) {
        return NextResponse.json({ error: `Stock insuficiente para ${item.nombre}: disponible ${disponible}, solicitado ${item.cantidad}` }, { status: 400 });
      }
    }

    // Actualizar inventario — usar RPC de incremento atómico para evitar race conditions
    for (const item of items) {
      const invItem = invItems.find(i => i.nombre === item.nombre);
      // Re-leer stock_en_uso fresco antes de actualizar para evitar datos viejos
      const { data: fresh } = await supabase.from('inventario').select('stock_en_uso').eq('id', invItem.id).single();
      const newEnUso = parseInt(fresh?.stock_en_uso ?? invItem.stock_en_uso, 10) + item.cantidad;
      await supabase.from('inventario').update({ stock_en_uso: newEnUso, modificado_por: payload.email }).eq('id', invItem.id);
    }

    const now = nowAR();
    const id = generateId();
    const idPlanilla = `P-${Date.now().toString(36).toUpperCase()}`;
    const itemsStr = serializeItems(items);

    const { error: movErr } = await supabase.from('movimientos').insert({
      id,
      id_planilla: idPlanilla,
      fecha: formatDate(now),
      hora_egreso: formatTime(now),
      alumno_responsable: alumno,
      curso,
      materia,
      profesor,
      items_egresados: itemsStr,
      estado: 'PENDIENTE',
      panolero: `${payload.nombre} ${payload.apellido}`,
      observaciones: observaciones || '',
      modificado_por: payload.email
    });
    if (movErr) throw movErr;

    return NextResponse.json({ success: true, id, idPlanilla, fecha: formatDate(now), hora: formatTime(now) }, { status: 201 });
  } catch (err) {
    console.error('Error registrando egreso:', err);
    return NextResponse.json({ error: 'Error interno al registrar egreso' }, { status: 500 });
  }
}
