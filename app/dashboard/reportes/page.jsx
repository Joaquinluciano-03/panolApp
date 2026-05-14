'use client';
// app/dashboard/reportes/page.jsx
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { FileBarChart, Download, Printer, Filter } from 'lucide-react';
import Button from '@/components/ui/Button';

const REPORT_TYPES = {
  PENDIENTES: 'Pendientes de devolución',
  FALTANTES: 'Ítems con stock bajo o faltantes',
  MOVIMIENTOS: 'Historial completo de movimientos',
  INVENTARIO: 'Estado general del inventario',
  MAS_USADOS: 'Ítems más utilizados',
};

export default function ReportesPage() {
  const { authFetch, user } = useAuth();
  const toast = useToast();

  const [movimientos, setMovimientos] = useState([]);
  const [inventario, setInventario]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [reportType, setReportType]   = useState('PENDIENTES');

  // Prevent non-admins from viewing
  if (user && user.rol !== 'ADMIN') {
    return <div className="p-8 text-center text-red-400">Acceso denegado.</div>;
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [movRes, invRes] = await Promise.all([
        authFetch('/api/movimientos'),
        authFetch('/api/inventario')
      ]);
      const movData = await movRes.json();
      const invData = await invRes.json();
      setMovimientos(movData.movimientos || []);
      setInventario(invData.inventario || []);
    } catch {
      toast('Error al cargar datos para reportes', 'error');
    } finally {
      setLoading(false);
    }
  }, [authFetch, toast]);

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
            'Ítems a devolver': (JSON.parse(m.ITEMS_EGRESADOS || '[]')).map(i => `${i.nombre} (x${i.cantidad})`).join(', '),
          }));
      case 'FALTANTES':
        return inventario
          .filter(i => i.ACTIVO === 'TRUE' && parseInt(i.STOCK_DISPONIBLE) <= parseInt(i.STOCK_MINIMO || 1))
          .map(i => ({
            'Ítem': i.NOMBRE,
            'Categoría': i.CATEGORIA,
            'Stock Total': i.STOCK_TOTAL,
            'Disponible': i.STOCK_DISPONIBLE,
            'Mínimo Requerido': i.STOCK_MINIMO,
            'En Uso': i.STOCK_EN_USO,
          }));
      case 'MOVIMIENTOS':
        return movimientos.map(m => ({
          'Fecha': m.FECHA,
          'ID Planilla': m.ID_PLANILLA,
          'Estado': m.ESTADO,
          'Alumno': m.ALUMNO_RESPONSABLE,
          'Curso': m.CURSO,
          'Materia': m.MATERIA,
          'Egresos': (JSON.parse(m.ITEMS_EGRESADOS || '[]')).map(i => `${i.nombre} (x${i.cantidad})`).join(', '),
          'Devueltos': m.ESTADO === 'DEVUELTO' ? (JSON.parse(m.ITEMS_INGRESADOS || '[]')).map(i => `${i.nombre} (x${i.cantidad})`).join(', ') : '-',
        }));
      case 'INVENTARIO':
        return inventario
          .filter(i => i.ACTIVO === 'TRUE')
          .map(i => ({
            'Ítem': i.NOMBRE,
            'Categoría': i.CATEGORIA,
            'Total': i.STOCK_TOTAL,
            'Disponible': i.STOCK_DISPONIBLE,
            'En Uso': i.STOCK_EN_USO,
            'Unidad': i.UNIDAD_MEDIDA,
          }));
      case 'MAS_USADOS': {
        const usage = {};
        movimientos.forEach(m => {
          try {
            const items = JSON.parse(m.ITEMS_EGRESADOS || '[]');
            items.forEach(i => {
              if (!usage[i.nombre]) usage[i.nombre] = 0;
              usage[i.nombre] += parseInt(i.cantidad || 0);
            });
          } catch(e) {}
        });
        return Object.entries(usage)
          .sort((a, b) => b[1] - a[1]) // mayor a menor
          .map(([nombre, cantidad]) => {
            const inv = inventario.find(i => i.NOMBRE === nombre);
            return {
              'Ítem': nombre,
              'Categoría': inv?.CATEGORIA || '-',
              'Veces Egresado (Total)': cantidad,
              'Stock Actual': inv?.STOCK_DISPONIBLE || '-',
            };
          });
      }
      default:
        return [];
    }
  };

  const reportData = getReportData();

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (reportData.length === 0) return;
    const headers = Object.keys(reportData[0]);
    const csvContent = [
      headers.join(','),
      ...reportData.map(row => 
        headers.map(header => {
          const cell = String(row[header] || '').replace(/"/g, '""');
          return `"${cell}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Reporte_${reportType}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in print:m-0 print:p-0 print:max-w-full">
      <div className="flex items-center justify-between gap-4 flex-wrap print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-amber-400" /> Reportes del Sistema
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Generá, imprimí y exportá información clave del pañol.</p>
        </div>
      </div>

      {/* Controles (ocultos al imprimir) */}
      <div className="bg-gray-900 border border-gray-800/50 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="w-5 h-5 text-gray-500 hidden sm:block" />
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full md:w-80 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm
              focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
          >
            {Object.entries(REPORT_TYPES).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <Button variant="secondary" onClick={handleExportCSV} disabled={reportData.length === 0} className="flex-1 md:flex-none">
            <Download className="w-4 h-4" /> Exportar a Excel
          </Button>
          <Button onClick={handlePrint} disabled={reportData.length === 0} className="flex-1 md:flex-none">
            <Printer className="w-4 h-4" /> Imprimir / PDF
          </Button>
        </div>
      </div>

      {/* Vista del Reporte para impresión y pantalla */}
      <div className="bg-gray-900 border border-gray-800/50 rounded-2xl p-6 print:bg-white print:border-none print:p-0">
        
        {/* Cabecera de impresión (oculta en pantalla, visible al imprimir) */}
        <div className="hidden print:block mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-black uppercase">Sistema de Pañol - Colegio Técnico</h2>
          <p className="text-lg text-gray-800 mt-1">Reporte: {REPORT_TYPES[reportType]}</p>
          <p className="text-sm text-gray-600 mt-1">Fecha de generación: {new Date().toLocaleDateString('es-AR')} a las {new Date().toLocaleTimeString('es-AR')}</p>
        </div>

        <div className="mb-4 print:hidden">
          <h2 className="text-lg font-semibold text-white">{REPORT_TYPES[reportType]}</h2>
          <p className="text-sm text-gray-400">{reportData.length} registros encontrados.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 print:hidden">
            <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : reportData.length === 0 ? (
          <div className="text-center py-12 text-gray-500 print:text-black">
            No hay datos disponibles para este reporte.
          </div>
        ) : (
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-sm text-left print:text-black">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800/50 print:border-b-2 print:border-black print:text-black">
                  {Object.keys(reportData[0]).map((header) => (
                    <th key={header} className="px-4 py-3">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50 print:divide-gray-300">
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-800/30 transition-colors print:hover:bg-transparent">
                    {Object.values(row).map((val, colIdx) => (
                      <td key={colIdx} className="px-4 py-3 text-gray-300 print:text-black">
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
