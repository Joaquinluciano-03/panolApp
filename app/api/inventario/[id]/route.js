import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { generateId, nowAR, formatDate, formatTime } from '@/lib/utils';

async function updateItem(request, id, body, payload) {
  const { data: item, error: fetchErr } = await supabase.from('inventario').select('*').eq('id', id).single();
  if (fetchErr || !item) return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 });

  const updates = { modificado_por: payload.email };
  const updatable = ['nombre', 'categoria', 'stock_total', 'unidad_medida', 'descripcion', 'stock_minimo', 'activo'];
  
  for (const key of updatable) {
    if (body[key] !== undefined) {
      if (key === 'activo') {
        updates[key] = String(body[key]).toUpperCase() === 'FALSE' ? 'FALSE' : 'TRUE';
      } else {
        updates[key] = body[key];
      }
    }
  }

  const { error } = await supabase.from('inventario').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const oldStock = parseInt(item.stock_total, 10) || 0;
  const newStock = parseInt(body.stock_total ?? oldStock, 10);
  const oldActivo = item.activo;
  const newActivo = updates.activo ?? oldActivo;

  if (oldStock !== newStock || oldActivo !== newActivo) {
    const now = nowAR();
    let accion = 'MODIFICACION_STOCK';
    
    if (oldActivo === 'TRUE' && newActivo === 'FALSE') accion = 'BAJA_ITEM';
    else if (oldActivo === 'FALSE' && newActivo === 'TRUE') accion = 'ALTA_ITEM';
    else if (newStock > oldStock) accion = 'AUMENTO_STOCK';
    else if (newStock < oldStock) accion = 'REDUCCION_STOCK';

    await supabase.from('auditoria_stock').insert({
      id: generateId(), fecha: formatDate(now), hora: formatTime(now), item_id: id, item_nombre: item.nombre,
      accion, stock_anterior: oldStock, stock_nuevo: newStock, usuario: payload.email, diferencia: newStock - oldStock
    });
  }

  return NextResponse.json({ success: true });
}

export async function PUT(request, { params }) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  return updateItem(request, id, body, payload);
}

export async function PATCH(request, { params }) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  return updateItem(request, id, body, payload);
}

export async function DELETE(request, { params }) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const { data: item, error: fetchErr } = await supabase.from('inventario').select('stock_en_uso').eq('id', id).single();
  if (fetchErr || !item) return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 });

  if (parseInt(item.stock_en_uso || 0) > 0) {
    return NextResponse.json({ error: 'No se puede eliminar un ítem con unidades en uso actualmente' }, { status: 400 });
  }

  const { error } = await supabase.from('inventario').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
