import { NextResponse } from 'next/server';
import { getSheetValues, rowsToObjects, SHEETS } from '@/lib/sheets';
import { supabase } from '@/lib/supabase';

// Este endpoint es temporal y solo se debe ejecutar una vez para migrar datos
export async function GET(request) {
  try {
    // 1. Migrar Usuarios
    console.log('Migrando usuarios...');
    const usersRows = await getSheetValues(SHEETS.USUARIOS);
    const usuarios = rowsToObjects(usersRows).map(u => ({
      id: u.ID,
      nombre: u.NOMBRE || '',
      apellido: u.APELLIDO || '',
      email: u.EMAIL || '',
      rol: u.ROL || 'ESTUDIANTE',
      activo: u.ACTIVO || 'TRUE',
      fecha_creacion: u.FECHA_CREACION || null,
      ultimo_acceso: u.ULTIMO_ACCESO || null,
      modificado_por: u.MODIFICADO_POR || null
    }));
    
    // Insertar en Supabase en lotes
    if (usuarios.length > 0) {
      const { error: err1 } = await supabase.from('usuarios').upsert(usuarios);
      if (err1) throw new Error('Error usuarios: ' + err1.message);
    }

    // 2. Migrar Inventario
    console.log('Migrando inventario...');
    const invRows = await getSheetValues(SHEETS.INVENTARIO);
    const inventario = rowsToObjects(invRows).map(i => ({
      id: i.ID,
      nombre: i.NOMBRE || '',
      categoria: i.CATEGORIA || '',
      stock_total: parseInt(i.STOCK_TOTAL, 10) || 0,
      stock_en_uso: parseInt(i.STOCK_EN_USO, 10) || 0,
      unidad_medida: i.UNIDAD_MEDIDA || 'unidad',
      descripcion: i.DESCRIPCION || '',
      stock_minimo: parseInt(i.STOCK_MINIMO, 10) || 1,
      activo: i.ACTIVO || 'TRUE',
      modificado_por: i.MODIFICADO_POR || null
    }));
    
    if (inventario.length > 0) {
      const { error: err2 } = await supabase.from('inventario').upsert(inventario);
      if (err2) throw new Error('Error inventario: ' + err2.message);
    }

    // 3. Migrar Profesores
    console.log('Migrando profesores...');
    const profRows = await getSheetValues(SHEETS.PROFESORES);
    const profesores = rowsToObjects(profRows).map(p => ({
      id: p.ID,
      nombre: p.NOMBRE || '',
      apellido: p.APELLIDO || '',
      materias: p.MATERIAS || '',
      activo: p.ACTIVO || 'TRUE',
      modificado_por: p.MODIFICADO_POR || null
    }));
    
    if (profesores.length > 0) {
      const { error: err3 } = await supabase.from('profesores').upsert(profesores);
      if (err3) throw new Error('Error profesores: ' + err3.message);
    }

    // 4. Migrar Materias
    console.log('Migrando materias...');
    const matRows = await getSheetValues(SHEETS.MATERIAS);
    const materias = rowsToObjects(matRows).map(m => ({
      id: m.ID,
      nombre: m.NOMBRE || '',
      curso: m.CURSO || '',
      activo: m.ACTIVO || 'TRUE',
      modificado_por: m.MODIFICADO_POR || null
    }));
    
    if (materias.length > 0) {
      const { error: err4 } = await supabase.from('materias').upsert(materias);
      if (err4) throw new Error('Error materias: ' + err4.message);
    }

    // 5. Migrar Movimientos
    console.log('Migrando movimientos...');
    const movRows = await getSheetValues(SHEETS.MOVIMIENTOS);
    const movimientos = rowsToObjects(movRows).map(m => ({
      id: m.ID,
      id_planilla: m.ID_PLANILLA || null,
      fecha: m.FECHA || null,
      hora_egreso: m.HORA_EGRESO || null,
      alumno_responsable: m.ALUMNO_RESPONSABLE || null,
      curso: m.CURSO || null,
      materia: m.MATERIA || null,
      profesor: m.PROFESOR || null,
      items_egresados: m.ITEMS_EGRESADOS || null,
      estado: m.ESTADO || null,
      panolero: m.PAÑOLERO || null,
      items_ingresados: m.ITEMS_INGRESADOS || null,
      hora_ingreso: m.HORA_INGRESO || null,
      diferencia: m.DIFERENCIA || null,
      observaciones: m.OBSERVACIONES || null,
      modificado_por: m.MODIFICADO_POR || null
    }));
    
    if (movimientos.length > 0) {
      const { error: err5 } = await supabase.from('movimientos').upsert(movimientos);
      if (err5) throw new Error('Error movimientos: ' + err5.message);
    }

    return NextResponse.json({ success: true, message: '¡Migración completada exitosamente!' });
  } catch (error) {
    console.error('Error durante la migración:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
