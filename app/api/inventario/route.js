import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth, requireAdmin } from '@/lib/auth';
import { generateId, mapToUpper, nowAR, formatDate, formatTime } from '@/lib/utils';

export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let query = supabase.from('inventario').select('*');

  const { searchParams } = new URL(request.url);
  const categoria = searchParams.get('categoria');
  const activo = searchParams.get('activo');
  const solo_activos = searchParams.get('solo_activos');

  if (solo_activos === 'true') query = query.eq('activo', 'TRUE');
  if (categoria) query = query.eq('categoria', categoria);
  if (activo !== null && activo !== undefined && activo !== '') {
    query = query.eq('activo', activo === 'true' ? 'TRUE' : 'FALSE');
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let result = mapToUpper(data);
  const q = searchParams.get('q');
  if (q) {
    const lq = q.toLowerCase();
    result = result.filter(
      (i) => i.NOMBRE?.toLowerCase().includes(lq) || i.CATEGORIA?.toLowerCase().includes(lq)
    );
  }

  return NextResponse.json({ inventario: result });
}

export async function POST(request) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const { nombre, categoria, stock_total, unidad_medida, descripcion, stock_minimo } = body;

  if (!nombre || !categoria || stock_total === undefined) {
    return NextResponse.json({ error: 'Nombre, categoría y stock son obligatorios' }, { status: 400 });
  }

  const { data: existing } = await supabase.from('inventario').select('id').ilike('nombre', nombre).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'Ya existe un ítem con ese nombre' }, { status: 409 });
  }

  const id = generateId();
  const total = parseInt(stock_total, 10) || 0;

  const { error } = await supabase.from('inventario').insert({
    id, nombre, categoria, stock_total: total, stock_en_uso: 0,
    unidad_medida: unidad_medida || 'unidad', descripcion: descripcion || '',
    stock_minimo: parseInt(stock_minimo, 10) || 1, activo: 'TRUE', modificado_por: payload.email
  });
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = nowAR();
  await supabase.from('auditoria_stock').insert({
    id: generateId(), fecha: formatDate(now), hora: formatTime(now), item_id: id, item_nombre: nombre,
    accion: 'ALTA_ITEM', stock_anterior: 0, stock_nuevo: total, usuario: payload.email, diferencia: total
  });

  return NextResponse.json({ success: true, id }, { status: 201 });
}
