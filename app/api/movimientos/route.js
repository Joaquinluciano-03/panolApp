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

  // created_at existe en la tabla → ordenar por él (timestamp real con índice)
  let query = supabase.from('movimientos').select(
    'id, id_planilla, fecha, hora_egreso, hora_ingreso, alumno_responsable, curso, materia, profesor, items_egresados, items_ingresados, diferencia, estado, panolero, observaciones, modificado_por'
  ).order('created_at', { ascending: false });

  // Filtro "solo hoy" — fecha es string DD/MM/YYYY
  if (payload.rol === 'PAÑOLERO' || solo_hoy === 'true') {
    query = query.eq('fecha', formatDate(nowAR()));
  }

  // Filtros de rango usando created_at (columna real con índice)
  if (fecha_desde) query = query.gte('created_at', new Date(fecha_desde + 'T00:00:00').toISOString());
  if (fecha_hasta) query = query.lte('created_at', new Date(fecha_hasta + 'T23:59:59').toISOString());

  // Resto de filtros SQL
  if (estado) query = query.in('estado', estado.split(',').map(s => s.trim()));
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
  return NextResponse.json({ movimientos: mapToUpper(data) });
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
      .in('nombre', itemNames);
    if (invErr) throw invErr;

    for (const item of items) {
      const invItem = invItems.find((i) => i.nombre === item.nombre);
      if (!invItem) return NextResponse.json({ error: `Ítem no encontrado o inactivo: ${item.nombre}` }, { status: 400 });
      const disponible = parseInt(invItem.stock_total, 10) - parseInt(invItem.stock_en_uso, 10);
      if (item.cantidad > disponible) {
        return NextResponse.json({ error: `Stock insuficiente para ${item.nombre}: disponible ${disponible}, solicitado ${item.cantidad}` }, { status: 400 });
      }
    }

    // Actualizar stock con re-lectura fresca (anti race-condition)
    for (const item of items) {
      const invItem = invItems.find(i => i.nombre === item.nombre);
      const { data: fresh } = await supabase.from('inventario').select('stock_en_uso').eq('id', invItem.id).single();
      const newEnUso = parseInt(fresh?.stock_en_uso ?? invItem.stock_en_uso, 10) + item.cantidad;
      await supabase.from('inventario').update({ stock_en_uso: newEnUso, modificado_por: payload.email }).eq('id', invItem.id);
    }

    const now = nowAR();
    const id = generateId();
    const idPlanilla = `P-${Date.now().toString(36).toUpperCase()}`;

    const { error: movErr } = await supabase.from('movimientos').insert({
      id, id_planilla: idPlanilla, fecha: formatDate(now), hora_egreso: formatTime(now),
      alumno_responsable: alumno, curso, materia, profesor,
      items_egresados: serializeItems(items), estado: 'PENDIENTE',
      panolero: `${payload.nombre} ${payload.apellido}`,
      observaciones: observaciones || '', modificado_por: payload.email
    });
    if (movErr) throw movErr;

    return NextResponse.json({ success: true, id, idPlanilla, fecha: formatDate(now), hora: formatTime(now) }, { status: 201 });
  } catch (err) {
    console.error('Error registrando egreso:', err);
    return NextResponse.json({ error: 'Error interno al registrar egreso' }, { status: 500 });
  }
}
