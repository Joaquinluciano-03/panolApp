// components/ui/Input.jsx
export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <input
        {...props}
        className={`w-full bg-gray-800 border rounded-xl px-4 py-2.5 text-white placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500/50' : 'border-gray-700'}`}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function Select({ label, error, className = '', children, ...props }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <select
        {...props}
        className={`w-full bg-gray-800 border rounded-xl px-4 py-2.5 text-white
          focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500/50' : 'border-gray-700'}`}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <textarea
        {...props}
        className={`w-full bg-gray-800 border rounded-xl px-4 py-2.5 text-white placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all
          disabled:opacity-50 disabled:cursor-not-allowed resize-none
          ${error ? 'border-red-500/50' : 'border-gray-700'}`}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
