// app/api/movimientos/route.js
import { NextResponse } from 'next/server';
import {
  getSheetValues, rowsToObjects, appendRow, SHEETS,
  nowAR, formatDate, formatTime, generateId,
} from '@/lib/sheets';
import { requireAuth } from '@/lib/auth';
import { serializeItems } from '@/lib/utils';

/** GET /api/movimientos — todos los movimientos (admin) o del día (pañolero) */
export async function GET(request) {
  const payload = requireAuth(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const rows = await getSheetValues(SHEETS.MOVIMIENTOS);
  const movimientos = rowsToObjects(rows);

  const { searchParams } = new URL(request.url);
  const estado = searchParams.get('estado');
  const solo_hoy = searchParams.get('solo_hoy');
  const fecha_desde = searchParams.get('fecha_desde');
  const fecha_hasta = searchParams.get('fecha_hasta');
  const materia = searchParams.get('materia');
  const profesor = searchParams.get('profesor');
  const alumno = searchParams.get('alumno');
  const q = searchParams.get('q');

  let result = movimientos;

  if (payload.rol === 'PAÑOLERO' || solo_hoy === 'true') {
    const hoy = formatDate(nowAR());
    result = result.filter((m) => m.FECHA === hoy);
  }

  if (estado) result = result.filter((m) => m.ESTADO === estado);
  if (materia) result = result.filter((m) => m.MATERIA?.toLowerCase().includes(materia.toLowerCase()));
  if (profesor) result = result.filter((m) => m.PROFESOR?.toLowerCase().includes(profesor.toLowerCase()));
  if (alumno) result = result.filter((m) => m.ALUMNO_RESPONSABLE?.toLowerCase().includes(alumno.toLowerCase()));
  if (q) {
    const lq = q.toLowerCase();
    result = result.filter(
      (m) =>
        m.ALUMNO_RESPONSABLE?.toLowerCase().includes(lq) ||
        m.PROFESOR?.toLowerCase().includes(lq) ||
        m.MATERIA?.toLowerCase().includes(lq) ||
        m.DNI_ALUMNO?.includes(lq) ||
        m.ID_PLANILLA?.includes(lq)
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

  return NextResponse.json({ movimientos: result.reverse() });
}

/** POST /api/movimientos — registrar nuevo egreso */
export async function POST(request) {
  const payload = requireAuth(request);
  if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const { materia, profesor, alumno, dni, curso, items, observaciones } = body;

    if (!materia || !profesor || !alumno || !dni || !curso || !items?.length) {
      return NextResponse.json({ error: 'Campos obligatorios faltantes' }, { status: 400 });
    }

    // Validar stock y actualizar inventario
    const invRows = await getSheetValues(SHEETS.INVENTARIO);
    const inventario = rowsToObjects(invRows);

    for (const item of items) {
      const invItem = inventario.find((i) => i.NOMBRE === item.nombre && i.ACTIVO === 'TRUE');
      if (!invItem) return NextResponse.json({ error: `Ítem no encontrado: ${item.nombre}` }, { status: 400 });
      const disponible = parseInt(invItem.STOCK_DISPONIBLE, 10);
      if (item.cantidad > disponible) {
        return NextResponse.json({
          error: `Stock insuficiente para ${item.nombre}: disponible ${disponible}, solicitado ${item.cantidad}`,
        }, { status: 400 });
      }
    }

    // Actualizar inventario
    for (const item of items) {
      const idx = inventario.findIndex((i) => i.NOMBRE === item.nombre);
      const invItem = inventario[idx];
      const newDisponible = parseInt(invItem.STOCK_DISPONIBLE, 10) - item.cantidad;
      const newEnUso = parseInt(invItem.STOCK_EN_USO, 10) + item.cantidad;
      const headers = invRows[0];
      const updatedRow = headers.map((h) => {
        if (h === 'STOCK_DISPONIBLE') return String(newDisponible);
        if (h === 'STOCK_EN_USO') return String(newEnUso);
        return invItem[h] ?? '';
      });
      await import('@/lib/sheets').then((m) => m.updateRow(SHEETS.INVENTARIO, idx, updatedRow));
    }

    const now = nowAR();
    const id = generateId();
    const idPlanilla = `P-${Date.now().toString(36).toUpperCase()}`;

    const itemsStr = serializeItems(items);
    const cantidadesStr = items.map((i) => `${i.nombre}:${i.cantidad}`).join(',');

    const row = [
      id,
      formatDate(now),
      formatTime(now),
      '', // HORA_INGRESO (vacío)
      materia,
      profesor,
      alumno,
      dni,
      curso,
      itemsStr,        // ITEMS_EGRESADOS
      cantidadesStr,   // CANTIDADES_EGRESADAS
      '',              // ITEMS_INGRESADOS
      '',              // CANTIDADES_INGRESADAS
      '',              // DIFERENCIA
      'PENDIENTE',     // ESTADO
      observaciones || '',
      payload.nombre + ' ' + payload.apellido, // PAÑOLERO
      idPlanilla,
    ];

    await appendRow(SHEETS.MOVIMIENTOS, row);

    return NextResponse.json({
      success: true,
      id,
      idPlanilla,
      fecha: formatDate(now),
      hora: formatTime(now),
    }, { status: 201 });
  } catch (err) {
    console.error('Error registrando egreso:', err);
    return NextResponse.json({ error: 'Error interno al registrar egreso' }, { status: 500 });
  }
}
