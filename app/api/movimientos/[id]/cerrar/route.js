import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { nowAR, formatDate, formatTime, generateId } from '@/lib/utils';

export async function POST(request, { params }) {
  const payload = requireAdmin(request);
  if (!payload) return NextResponse.json({ error: 'Solo administradores pueden cerrar pendientes' }, { status: 401 });

  const { id } = await params;

  try {
    const body = await request.json();
    const { faltantes = [], observaciones = '' } = body;

    let mov = null;
    const { data: byId } = await supabase.from('movimientos').select('*').eq('id', id).maybeSingle();
    if (byId) { mov = byId; }
    else {
      const { data: byPlanilla } = await supabase.from('movimientos').select('*').eq('id_planilla', id).maybeSingle();
      mov = byPlanilla;
    }
    if (!mov) return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 });

    if (!['PENDIENTE', 'INCOMPLETO'].includes(mov.estado)) {
      return NextResponse.json({ error: 'Este movimiento ya está cerrado' }, { status: 400 });
    }

    // Traer solo los items que son faltantes (no todo el inventario)
    const faltanteNames = faltantes.map(f => f.nombre);
    const { data: invItems } = faltanteNames.length > 0
      ? await supabase.from('inventario').select('*').in('nombre', faltanteNames)
      : { data: [] };

    for (const faltante of faltantes) {
      const invItem = invItems?.find(i => i.nombre === faltante.nombre);
      if (!invItem) continue;

      const stockTotal = parseInt(invItem.stock_total, 10) || 0;
      const stockEnUso = parseInt(invItem.stock_en_uso, 10) || 0;
      const cantFaltante = parseInt(faltante.cantidad, 10) || 0;

      const newTotal = Math.max(0, stockTotal - cantFaltante);
      const newEnUso = Math.max(0, stockEnUso - cantFaltante);
      let newActivo = invItem.activo;
      if (newTotal === 0) newActivo = 'FALSE';

      await supabase.from('inventario').update({
        stock_total: newTotal,
        stock_en_uso: newEnUso,
        activo: newActivo,
        modificado_por: payload.email
      }).eq('id', invItem.id);

      if (cantFaltante > 0) {
        await supabase.from('auditoria_stock').insert({
          id: generateId(),
          fecha: formatDate(nowAR()),
          hora: formatTime(nowAR()),
          item_id: invItem.id,
          item_nombre: invItem.nombre,
          accion: 'REDUCCION_FALTANTE',
          stock_anterior: stockTotal,
          stock_nuevo: newTotal,
          usuario: payload.email,
          diferencia: newTotal - stockTotal
        });
      }
    }

    const faltantesStr = faltantes.map(f => `${f.nombre}:${f.cantidad}`).join(',');
    const obsActualizada = [
      mov.observaciones,
      observaciones,
      faltantes.length > 0 ? `FALTANTES (ELIMINADOS): ${faltantesStr}` : '',
    ].filter(Boolean).join(' | ');

    await supabase.from('movimientos').update({
      estado: 'CERRADO_CON_FALTANTES',
      hora_ingreso: mov.hora_ingreso || formatTime(nowAR()),
      diferencia: faltantesStr || mov.diferencia || '',
      observaciones: obsActualizada,
      modificado_por: payload.email
    }).eq('id', mov.id);

    if (faltantes.length > 0) {
      await supabase.from('descuentos').insert({
        id: generateId(),
        id_movimiento: mov.id_planilla,
        fecha: formatDate(nowAR()),
        hora: formatTime(nowAR()),
        alumno: mov.alumno_responsable,
        curso: mov.curso,
        item: faltantesStr,
        cantidad: faltantes.reduce((acc, f) => acc + (parseInt(f.cantidad, 10) || 0), 0),
        registrado_por: payload.email
      });
    }

    return NextResponse.json({ success: true, estado: 'CERRADO_CON_FALTANTES', faltantes: faltantesStr });
  } catch (err) {
    console.error('Error cerrando pendiente:', err);
    return NextResponse.json({ error: 'Error interno al cerrar pendiente' }, { status: 500 });
  }
}
