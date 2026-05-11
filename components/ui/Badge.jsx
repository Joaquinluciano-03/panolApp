// components/ui/Badge.jsx
export default function Badge({ children, variant = 'default' }) {
  const variants = {
    default:    'bg-gray-700 text-gray-300',
    pendiente:  'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    completado: 'bg-green-500/20 text-green-300 border border-green-500/30',
    incompleto: 'bg-red-500/20 text-red-300 border border-red-500/30',
    admin:      'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    pañolero:   'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    activo:     'bg-green-500/20 text-green-300 border border-green-500/30',
    inactivo:   'bg-gray-500/20 text-gray-400 border border-gray-500/30',
    alerta:     'bg-red-500/20 text-red-300 border border-red-500/30',
    ok:         'bg-green-500/20 text-green-300 border border-green-500/30',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant] || variants.default}`}>
      {children}
    </span>
  );
}
