import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { parseItems, calcDiferencia, nowAR, formatTime, toUpperKeys } from '@/lib/utils';

export async function GET(request, { params }) {
  const payload = requireAuth(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const { data: mov, error } = await supabase.from('movimientos').select('*').or(`id.eq.${id},id_planilla.eq.${id}`).single();
  if (error || !mov) return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 });

  return NextResponse.json({ movimiento: toUpperKeys(mov) });
}

export async function PUT(request, { params }) {
  const payload = requireAuth(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  try {
    const body = await request.json();
    const { itemsIngresados, observaciones } = body;

    const { data: mov, error: fetchErr } = await supabase.from('movimientos').select('*').or(`id.eq.${id},id_planilla.eq.${id}`).single();
    if (fetchErr || !mov) return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 });

    if (mov.estado !== 'PENDIENTE' && mov.estado !== 'INCOMPLETO') {
      return NextResponse.json({ error: 'Este movimiento ya está completado o cerrado' }, { status: 400 });
    }

    const previousIngresados = parseItems(mov.items_ingresados || '');
    const mapIngresados = {};
    previousIngresados.forEach((i) => { mapIngresados[i.nombre] = i.cantidad; });

    const egresados = parseItems(mov.items_egresados);
    for (const item of itemsIngresados) {
      const eg = egresados.find((e) => e.nombre === item.nombre);
      if (!eg) continue;
      
      const prevQty = mapIngresados[item.nombre] || 0;
      const totalIngresado = prevQty + item.cantidad;

      if (totalIngresado > eg.cantidad) {
        return NextResponse.json({ error: `No se puede retornar más unidades de las egresadas para ${item.nombre}` }, { status: 400 });
      }
      mapIngresados[item.nombre] = totalIngresado;
    }

    const now = nowAR();
    const itemsIngStr = Object.entries(mapIngresados).map(([nombre, cant]) => `${nombre}:${cant}`).join(',');
    const diferencia = calcDiferencia(mov.items_egresados, itemsIngStr);
    const estado = diferencia.length > 0 ? 'INCOMPLETO' : 'COMPLETADO';

    // Actualizar inventario
    const itemNames = itemsIngresados.map(i => i.nombre);
    const { data: invItems } = await supabase.from('inventario').select('*').in('nombre', itemNames);
    
    for (const item of itemsIngresados) {
      const invItem = invItems?.find(i => i.nombre === item.nombre);
      if (!invItem) continue;
      const newEnUso = Math.max(0, parseInt(invItem.stock_en_uso, 10) - item.cantidad);
      await supabase.from('inventario').update({ stock_en_uso: newEnUso, modificado_por: payload.email }).eq('id', invItem.id);
    }

    await supabase.from('movimientos').update({
      hora_ingreso: formatTime(now),
      items_ingresados: itemsIngStr,
      diferencia,
      estado,
      observaciones: observaciones || mov.observaciones || '',
      modificado_por: payload.email
    }).eq('id', mov.id);

    return NextResponse.json({ success: true, estado, diferencia });
  } catch (err) {
    console.error('Error registrando retorno:', err);
    return NextResponse.json({ error: 'Error interno al registrar retorno' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const payload = requireAuth(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const { observaciones } = await request.json();

  const { error } = await supabase.from('movimientos').update({ 
    observaciones: observaciones || '', 
    modificado_por: payload.email 
  }).eq('id', id);
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
