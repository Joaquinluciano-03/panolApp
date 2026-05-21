'use client';
// app/dashboard/reportes/page.jsx
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { FileBarChart, Download, Filter, Calendar } from 'lucide-react';
import Button from '@/components/ui/Button';
import { parseItems } from '@/lib/utils';
import * as XLSX from 'xlsx';

const REPORT_TYPES = {
  PENDIENTES: 'Pendientes de devolución',
  FALTANTES: 'Ítems con stock bajo o faltantes',
  MOVIMIENTOS: 'Historial completo de movimientos',
  INVENTARIO: 'Estado general del inventario',
  MAS_USADOS: 'Ítems más utilizados',
  DESCUENTOS: 'Descuentos por faltante',
  AUDITORIA: 'Alta / Baja y Cambios de Stock',
};

// Colores de cabecera por tipo de reporte
const HEADER_COLORS = {
  PENDIENTES: 'FFD97D', // amber
  FALTANTES:  'FF6B6B', // red
  MOVIMIENTOS:'4ECDC4', // teal
  INVENTARIO: '95D5B2', // green
  MAS_USADOS: 'C3B1E1', // purple
  DESCUENTOS: 'FFA07A', // light salmon
  AUDITORIA:  'B19CD9', // pastel purple
};

export default function ReportesPage() {
  const { authFetch, user } = useAuth();
  const toast = useToast();

  const [movimientos, setMovimientos] = useState([]);
  const [inventario, setInventario]   = useState([]);
  const [descuentos, setDescuentos]   = useState([]);
  const [auditoria, setAuditoria]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [reportType, setReportType]   = useState('PENDIENTES');

  // Filtros para movimientos
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Prevent non-admins from viewing
  if (user && user.rol !== 'ADMIN') {
    return <div className="p-8 text-center text-red-400">Acceso denegado.</div>;
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fechaDesde) params.set('fecha_desde', fechaDesde);
      if (fechaHasta) params.set('fecha_hasta', fechaHasta);

      const [movRes, invRes, descRes, audRes] = await Promise.all([
        authFetch(`/api/movimientos${params.toString() ? '?' + params : ''}`),
        authFetch('/api/inventario'),
        authFetch('/api/descuentos'),
        authFetch('/api/auditoria-stock')
      ]);
      const movData = await movRes.json();
      const invData = await invRes.json();
      const descData = await descRes.json();
      const audData = await audRes.json();
      setMovimientos(movData.movimientos || []);
      setInventario(invData.inventario || []);
      setDescuentos(descData.descuentos || []);
      setAuditoria(audData.auditoria || []);
    } catch {
      toast('Error al cargar datos para reportes', 'error');
    } finally {
      setLoading(false);
    }
  }, [authFetch, toast, fechaDesde, fechaHasta]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Generar datos según el tipo de reporte
  const getReportData = () => {
    switch (reportType) {
      case 'PENDIENTES':
        return movimientos
          .filter(m => m.ESTADO === 'PENDIENTE')
          .map(m => ({
            'ID Planilla': m.ID_PLANILLA,
            'Fecha': m.FECHA,
            'Alumno': m.ALUMNO_RESPONSABLE,
            'Curso': m.CURSO,
            'Materia': m.MATERIA,
            'Profesor': m.PROFESOR,
            'Pañolero': m.PAÑOLERO || m['PA\u00d1OLERO'] || '',
            'Ítems a devolver': parseItems(m.ITEMS_EGRESADOS).map(i => `${i.nombre} (x${i.cantidad})`).join(', '),
          }));
      case 'FALTANTES': {
        return inventario
          .filter(i => {
            const disponible = parseInt(i.STOCK_TOTAL, 10) - parseInt(i.STOCK_EN_USO, 10);
            return i.ACTIVO === 'TRUE' && disponible <= parseInt(i.STOCK_MINIMO || 1);
          })
          .map(i => {
            const disponible = parseInt(i.STOCK_TOTAL, 10) - parseInt(i.STOCK_EN_USO, 10);
            return {
              'Ítem': i.NOMBRE,
              'Categoría': i.CATEGORIA,
              'Stock Total': i.STOCK_TOTAL,
              'Disponible': disponible,
              'Mínimo Requerido': i.STOCK_MINIMO,
              'En Uso': i.STOCK_EN_USO,
            };
          });}
      case 'MOVIMIENTOS':
        return movimientos.map(m => ({
          'Fecha': m.FECHA,
          'Hora Egreso': m.HORA_EGRESO,
          'Hora Ingreso': m.HORA_INGRESO || '',
          'ID Planilla': m.ID_PLANILLA,
          'Estado': m.ESTADO,
          'Alumno': m.ALUMNO_RESPONSABLE,
          'Curso': m.CURSO,
          'Materia': m.MATERIA,
          'Profesor': m.PROFESOR,
          'Pañolero': m.PAÑOLERO || m['PA\u00d1OLERO'] || '',
          'Ítems egresados': parseItems(m.ITEMS_EGRESADOS).map(i => `${i.nombre} (x${i.cantidad})`).join(', '),
          'Ítems devueltos': m.ITEMS_INGRESADOS ? parseItems(m.ITEMS_INGRESADOS).map(i => `${i.nombre} (x${i.cantidad})`).join(', ') : '-',
          'Diferencias': m.DIFERENCIA || '',
          'Observaciones': m.OBSERVACIONES || '',
        }));
      case 'INVENTARIO':
        return inventario
          .filter(i => i.ACTIVO === 'TRUE')
          .map(i => {
            const disponible = parseInt(i.STOCK_TOTAL, 10) - parseInt(i.STOCK_EN_USO, 10);
            return {
              'Ítem': i.NOMBRE,
              'Categoría': i.CATEGORIA,
              'Stock Total': i.STOCK_TOTAL,
              'Disponible': disponible,
              'En Uso': i.STOCK_EN_USO,
              'Mínimo': i.STOCK_MINIMO,
              'Unidad': i.UNIDAD_MEDIDA,
            };
          });
      case 'MAS_USADOS': {
        const usage = {};
        movimientos.forEach(m => {
          try {
            const items = parseItems(m.ITEMS_EGRESADOS);
            items.forEach(i => {
              if (!usage[i.nombre]) usage[i.nombre] = 0;
              usage[i.nombre] += parseInt(i.cantidad || 0);
            });
          } catch(e) {}
        });
        return Object.entries(usage)
          .sort((a, b) => b[1] - a[1])
          .map(([nombre, cantidad]) => {
            const inv = inventario.find(i => i.NOMBRE === nombre);
            const disponible = inv ? parseInt(inv.STOCK_TOTAL, 10) - parseInt(inv.STOCK_EN_USO, 10) : '-';
            return {
              'Ítem': nombre,
              'Categoría': inv?.CATEGORIA || '-',
              'Total Egresado': cantidad,
              'Stock Actual': disponible,
              'Stock Mínimo': inv?.STOCK_MINIMO || '-',
            };
          });
      }
      case 'DESCUENTOS':
        return descuentos
          .filter(d => {
            if (!fechaDesde && !fechaHasta) return true;
            const [day, mo, y] = (d.FECHA || '').split('/');
            if (!y) return true;
            const t = new Date(y, mo - 1, day);
            if (fechaDesde && t < new Date(fechaDesde)) return false;
            if (fechaHasta && t > new Date(fechaHasta)) return false;
            return true;
          })
          .map(d => ({
            'Fecha': d.FECHA,
            'Hora': d.HORA,
            'Planilla Original': d.ID_MOVIMIENTO,  // columna real en Supabase
            'Pañolero': d.PANOLERO || '—',
            'Alumno': d.ALUMNO,
            'Curso': d.CURSO,
            'Ítems Eliminados': d.ITEM,             // columna real en Supabase
            'Cantidad': d.CANTIDAD,
            'Registrado Por': d.REGISTRADO_POR,    // columna real en Supabase
          }));
      case 'AUDITORIA':
        return auditoria
          .filter(a => {
            if (!fechaDesde && !fechaHasta) return true;
            const [day, mo, y] = (a.FECHA || '').split('/');
            if (!y) return true;
            const t = new Date(y, mo - 1, day);
            if (fechaDesde && t < new Date(fechaDesde)) return false;
            if (fechaHasta && t > new Date(fechaHasta)) return false;
            return true;
          })
          .map(a => ({
            'Fecha': a.FECHA,
            'Hora': a.HORA,
            'Ítem': a.ITEM_NOMBRE,
            'Acción': a.ACCION,
            'Cant. Anterior': a.STOCK_ANTERIOR,   // columna real en Supabase
            'Cant. Nueva': a.STOCK_NUEVO,          // columna real en Supabase
            'Diferencia': a.DIFERENCIA,
            'Usuario (Admin)': a.USUARIO,
          }));
      default:
        return [];
    }
  };

  const reportData = getReportData();

  const handleExportExcel = () => {
    if (reportData.length === 0) {
      toast('No hay datos para exportar', 'warning');
      return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(reportData);

    // Calcular ancho automático de columnas
    const headers = Object.keys(reportData[0]);
    const colWidths = headers.map(h => {
      const maxData = Math.max(
        h.length,
        ...reportData.map(row => String(row[h] || '').length)
      );
      return { wch: Math.min(Math.max(maxData + 2, 12), 60) };
    });
    ws['!cols'] = colWidths;

    // Estilo de cabeceras
    const headerColor = HEADER_COLORS[reportType] || 'FFD97D';
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[cellRef]) continue;
      ws[cellRef].s = {
        fill: { fgColor: { rgb: headerColor } },
        font: { bold: true, color: { rgb: '1A1A2E' }, sz: 11 },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top:    { style: 'thin', color: { rgb: 'AAAAAA' } },
          bottom: { style: 'thin', color: { rgb: 'AAAAAA' } },
          left:   { style: 'thin', color: { rgb: 'AAAAAA' } },
          right:  { style: 'thin', color: { rgb: 'AAAAAA' } },
        },
      };
    }

    // Estilo de filas de datos (alternadas)
    for (let R = range.s.r + 1; R <= range.e.r; R++) {
      const isEven = R % 2 === 0;
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellRef]) ws[cellRef] = { v: '', t: 's' };
        ws[cellRef].s = {
          fill: { fgColor: { rgb: isEven ? 'F5F5F5' : 'FFFFFF' } },
          font: { sz: 10 },
          alignment: { vertical: 'center', wrapText: true },
          border: {
            top:    { style: 'hair', color: { rgb: 'DDDDDD' } },
            bottom: { style: 'hair', color: { rgb: 'DDDDDD' } },
            left:   { style: 'hair', color: { rgb: 'DDDDDD' } },
            right:  { style: 'hair', color: { rgb: 'DDDDDD' } },
          },
        };
      }
    }

    // Fila de altura mínima
    ws['!rows'] = [{ hpt: 22 }, ...Array(range.e.r).fill({ hpt: 18 })];

    const sheetTitle = REPORT_TYPES[reportType].substring(0, 31); // Excel max 31 chars
    XLSX.utils.book_append_sheet(wb, ws, sheetTitle);

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `Reporte_${reportType}_${dateStr}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast(`Excel exportado: ${fileName}`, 'success');
  };

  const showDateFilter = reportType === 'MOVIMIENTOS' || reportType === 'DESCUENTOS' || reportType === 'AUDITORIA';

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-blue-400" /> Reportes del Sistema
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Generá y exportá información clave del pañol en Excel.</p>
        </div>
      </div>

      {/* Controles */}
      <div className="bg-gray-900 border border-gray-800/50 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Filter className="w-5 h-5 text-gray-500 hidden sm:block" />
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full md:w-80 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            >
              {Object.entries(REPORT_TYPES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <Button variant="primary" onClick={handleExportExcel} disabled={reportData.length === 0 || loading}>
            <Download className="w-4 h-4" /> Exportar a Excel
          </Button>
        </div>

        {/* Filtros de fecha solo para movimientos */}
        {showDateFilter && (
          <div className="border-t border-gray-800/50 pt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" /> Filtrar por rango de fechas
            </p>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Desde</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Hasta</label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>
              {(fechaDesde || fechaHasta) && (
                <button
                  onClick={() => { setFechaDesde(''); setFechaHasta(''); }}
                  className="px-4 py-2 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl transition-all"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Vista previa */}
      <div className="bg-gray-900 border border-gray-800/50 rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">{REPORT_TYPES[reportType]}</h2>
            <p className="text-sm text-gray-400">{reportData.length} registro{reportData.length !== 1 ? 's' : ''} encontrado{reportData.length !== 1 ? 's' : ''}.</p>
          </div>
          {loading && (
            <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : reportData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No hay datos disponibles para este reporte.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800/50">
                  {Object.keys(reportData[0]).map((header) => (
                    <th key={header} className="px-4 py-3 whitespace-nowrap">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {reportData.slice(0, 50).map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-800/30 transition-colors">
                    {Object.values(row).map((val, colIdx) => (
                      <td key={colIdx} className="px-4 py-3 text-gray-300 max-w-xs truncate">
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {reportData.length > 50 && (
              <p className="text-center text-xs text-gray-600 py-3">
                Mostrando primeros 50 de {reportData.length} registros. Exportá el Excel para ver todos.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
