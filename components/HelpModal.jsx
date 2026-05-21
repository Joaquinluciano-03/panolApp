'use client';
import { useAuth } from '@/context/AuthContext';
import { X, HelpCircle, AlertTriangle, BookOpen, Clock, Package, PackagePlus, FileBarChart, Users } from 'lucide-react';

export default function HelpModal({ open, onClose }) {
  const { user } = useAuth();
  
  if (!open) return null;

  const isAdmin = user?.rol === 'ADMIN';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Manual de Usuario</h2>
              <p className="text-xs text-gray-400">{isAdmin ? 'Perfil: Administrador' : 'Perfil: Pañolero'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8 flex-1 text-gray-300 text-sm">
          {isAdmin ? (
            <>
              {/* ADMIN MANUAL */}
              <section className="space-y-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-400" /> 1. Maestros (Materias y Profesores)
                </h3>
                <p>Es fundamental tener esto cargado para que los pañoleros puedan hacer egresos.</p>
                <ul className="list-disc pl-5 space-y-1 text-gray-400">
                  <li><strong>Materias:</strong> Haz clic en "+ Nueva", ingresa el Nombre y Curso (opcional).</li>
                  <li><strong>Profesores:</strong> Haz clic en "+ Nuevo", ingresa Nombre y Apellido. Escribe el nombre de la materia que dicta y presiona Enter para asociarla.</li>
                </ul>
              </section>

              <section className="space-y-3 border-t border-gray-800 pt-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-400" /> 2. Inventario
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-gray-400">
                  <li>Haz clic en <strong>+ Nuevo Ítem</strong>.</li>
                  <li>Llena el Nombre, Categoría, Stock Inicial (físico) y Stock Mínimo (alerta).</li>
                  <li>Usa el ícono de Lápiz en la columna Acciones para editar cantidades si se compran más.</li>
                </ul>
              </section>

              <section className="space-y-3 border-t border-gray-800 pt-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <PackagePlus className="w-4 h-4 text-purple-400" /> 3. Realizar Préstamos (Egreso)
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-gray-400">
                  <li>Ingresa los datos del alumno, materia y profesor.</li>
                  <li>Busca herramientas y usa el "+" para agregarlas al carro.</li>
                  <li>Presiona <strong>Confirmar Egreso</strong> para generar el Ticket.</li>
                </ul>
              </section>

              <section className="space-y-3 border-t border-gray-800 pt-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" /> 4. Devoluciones y Sanciones (Pendientes)
                </h3>
                <p>Busca la planilla en "Pendientes" y haz clic en el Ticket azul (Retorno).</p>
                <ul className="list-disc pl-5 space-y-2 text-gray-400">
                  <li><strong>Devolución Normal:</strong> Si devuelve todo, haz clic en "Cerrar Planilla".</li>
                  <li><strong>Con Faltantes (Perdió/Rompió):</strong> Disminuye el contador del ítem faltante en la pantalla. Al hacer clic en "Cerrar Planilla", se abrirá el menú de Sanción. Haz clic en <strong>"Confirmar y Descontar"</strong> para eliminarlo del stock y registrar el descuento.</li>
                  <li><span className="text-amber-500 font-medium">Nota:</span> Si un pañolero cerró una planilla con faltantes previamente, verás una tuerca amarilla en "Pendientes". Haz clic en ella para aplicar la sanción pendiente.</li>
                </ul>
              </section>

              <section className="space-y-3 border-t border-gray-800 pt-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileBarChart className="w-4 h-4 text-teal-400" /> 5. Reportes y Usuarios
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-gray-400">
                  <li><strong>Reportes:</strong> Tienes historial, inventario actual, descuentos y auditoría. Puedes filtrar por fechas y usar "Descargar CSV/PDF".</li>
                  <li><strong>Usuarios:</strong> Edita roles (ej: promover a "Pañolero" o "Admin") haciendo clic en el Lápiz.</li>
                </ul>
              </section>
            </>
          ) : (
            <>
              {/* PAÑOLERO MANUAL */}
              <div className="bg-blue-500/10 border border-blue-500/20 text-blue-300 p-4 rounded-xl mb-6 text-sm">
                Tu tarea principal es la atención en mostrador: entregar herramientas, registrarlas y recibirlas. El sistema se pondrá en pantalla completa automáticamente al hacer clic.
              </div>

              <section className="space-y-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <PackagePlus className="w-4 h-4 text-blue-400" /> 1. Registrar un Préstamo (Egreso)
                </h3>
                <ul className="list-decimal pl-5 space-y-2 text-gray-400">
                  <li>Ve a <strong>Nuevo Egreso</strong>.</li>
                  <li>Pide al estudiante: Nombre, Apellido, Curso, Materia y Profesor.</li>
                  <li>Usa el buscador para encontrar lo que el alumno pide.</li>
                  <li>Presiona el <strong>"+"</strong> para sumar el ítem al Carro. (Si pide 3 destornilladores, presiona el "+" tres veces).</li>
                  <li>Haz clic en <strong>Confirmar Egreso</strong>. Se generará un Ticket (ej: P-X78AB9) que el alumno debe recordar.</li>
                </ul>
              </section>

              <section className="space-y-3 border-t border-gray-800 pt-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" /> 2. Recibir Devolución (Pendientes)
                </h3>
                <p className="text-gray-400">Ve a <strong>Pendientes</strong> y busca la planilla con el código del ticket o el nombre. Haz clic en el Ticket azul (Retorno).</p>
                
                <div className="mt-4 p-4 bg-gray-800/30 rounded-xl space-y-2">
                  <p className="font-bold text-emerald-400">👉 Escenario A: Devuelve TODO perfecto</p>
                  <p className="text-gray-400 text-sm">Si coincide lo que ves en pantalla con lo que te entrega, haz clic en "Cerrar Planilla". Las herramientas vuelven al stock.</p>
                </div>

                <div className="mt-4 p-4 bg-red-500/5 border border-red-500/10 rounded-xl space-y-2">
                  <p className="font-bold text-red-400">👉 Escenario B: PERDIÓ o ROMPIÓ algo (Faltantes)</p>
                  <ul className="list-disc pl-5 space-y-1 text-gray-400 text-sm">
                    <li>Usa el botón <strong>"-" (menos)</strong> para bajar el contador de la herramienta perdida. Deja en pantalla exactamente lo que el alumno te está entregando.</li>
                    <li>Haz clic en "Cerrar Planilla".</li>
                    <li>La planilla quedará marcada en rojo como <strong>INCOMPLETO</strong>. Las que faltan quedan "congeladas" hasta que un Administrador decida la sanción. ¡Tú ya no debes hacer más nada!</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-3 border-t border-gray-800 pt-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-teal-400" /> 3. Monitoreo
                </h3>
                <p className="text-gray-400">
                  En tu <strong>Dashboard</strong> puedes ver cuántas planillas pendientes hay hoy y un resumen de las herramientas con Stock Bajo, para poder avisarle al Administrador.
                </p>
              </section>
            </>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-800 text-center">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all text-sm font-medium"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
