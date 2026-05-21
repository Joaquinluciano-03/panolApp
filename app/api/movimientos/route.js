import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { serializeItems, generateId, nowAR, formatDate, formatTime, mapToUpper } from '@/lib/utils';

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const estado = searchParams.get('estado');
  const solo_hoy = searchParams.get('solo_hoy');
  const fecha_desde = searchParams.get('fecha_desde');  // YYYY-MM-DD
  const fecha_hasta = searchParams.get('fecha_hasta');  // YYYY-MM-DD
  const materia = searchParams.get('materia');
  const profesor = searchParams.get('profesor');
  const alumno = searchParams.get('alumno');
  const q = searchParams.get('q');

  // Ordenar por id (los IDs empiezan con Date.now(), son cronológicos)
  let query = supabase.from('movimientos').select(
    'id, id_planilla, fecha, hora_egreso, hora_ingreso, alumno_responsable, curso, materia, profesor, items_egresados, items_ingresados, diferencia, estado, panolero, observaciones, modificado_por'
  ).order('id', { ascending: false });

  // Filtro "solo hoy" — la columna fecha es DD/MM/YYYY, hacemos eq exacto
  if (payload.rol === 'PAÑOLERO' || solo_hoy === 'true') {
    query = query.eq('fecha', formatDate(nowAR()));
  }

  // Filtros SQL
  if (estado) {
    const estados = estado.split(',').map(s => s.trim());
    query = query.in('estado', estados);
  }
  if (materia) query = query.ilike('materia', `%${materia}%`);
  if (profesor) query = query.ilike('profesor', `%${profesor}%`);
  if (alumno) query = query.ilike('alumno_responsable', `%${alumno}%`);
  if (q) {
    query = query.or(
      `alumno_responsable.ilike.%${q}%,profesor.ilike.%${q}%,materia.ilike.%${q}%,id_planilla.ilike.%${q}%`
    );
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let result = mapToUpper(data);

  // Filtro de rango de fecha en JS (fecha está como DD/MM/YYYY)
  if (fecha_desde) {
    const desde = new Date(fecha_desde);
    result = result.filter((m) => {
      const [d, mo, y] = (m.FECHA || '').split('/');
      return new Date(+y, +mo - 1, +d) >= desde;
    });
  }
  if (fecha_hasta) {
    const hasta = new Date(fecha_hasta);
    result = result.filter((m) => {
      const [d, mo, y] = (m.FECHA || '').split('/');
      return new Date(+y, +mo - 1, +d) <= hasta;
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
    const { data: invItems, error: invErr } = await supabase
      .from('inventario')
      .select('id, nombre, stock_total, stock_en_uso')
      .in('nombre', itemNames)
      .eq('activo', 'TRUE');
    if (invErr) throw invErr;

    for (const item of items) {
      const invItem = invItems.find((i) => i.nombre === item.nombre);
      if (!invItem) return NextResponse.json({ error: `Ítem no encontrado o inactivo: ${item.nombre}` }, { status: 400 });
      const disponible = parseInt(invItem.stock_total, 10) - parseInt(invItem.stock_en_uso, 10);
      if (item.cantidad > disponible) {
        return NextResponse.json({ error: `Stock insuficiente para ${item.nombre}: disponible ${disponible}, solicitado ${item.cantidad}` }, { status: 400 });
      }
    }

    for (const item of items) {
      const invItem = invItems.find(i => i.nombre === item.nombre);
      const { data: fresh } = await supabase.from('inventario').select('stock_en_uso').eq('id', invItem.id).single();
      const newEnUso = parseInt(fresh?.stock_en_uso ?? invItem.stock_en_uso, 10) + item.cantidad;
      await supabase.from('inventario').update({ stock_en_uso: newEnUso, modificado_por: payload.email }).eq('id', invItem.id);
    }

    const now = nowAR();
    const id = generateId();
    const idPlanilla = `P-${Date.now().toString(36).toUpperCase()}`;
    const itemsStr = serializeItems(items);

    const { error: movErr } = await supabase.from('movimientos').insert({
      id, id_planilla: idPlanilla, fecha: formatDate(now), hora_egreso: formatTime(now),
      alumno_responsable: alumno, curso, materia, profesor, items_egresados: itemsStr,
      estado: 'PENDIENTE', panolero: `${payload.nombre} ${payload.apellido}`,
      observaciones: observaciones || '', modificado_por: payload.email
    });
    if (movErr) throw movErr;

    return NextResponse.json({ success: true, id, idPlanilla, fecha: formatDate(now), hora: formatTime(now) }, { status: 201 });
  } catch (err) {
    console.error('Error registrando egreso:', err);
    return NextResponse.json({ error: 'Error interno al registrar egreso' }, { status: 500 });
  }
}
