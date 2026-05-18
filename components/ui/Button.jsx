// components/ui/Button.jsx
import { clsx } from '@/lib/utils';

const variants = {
  primary:   'bg-blue-500 hover:bg-blue-400 text-white font-semibold shadow-lg shadow-blue-500/20',
  secondary: 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600',
  danger:    'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20',
  ghost:     'hover:bg-gray-700/50 text-gray-300 hover:text-white',
  outline:   'border border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:text-white',
};

const sizes = {
  xs:  'px-2.5 py-1 text-xs rounded-lg',
  sm:  'px-3 py-1.5 text-sm rounded-lg',
  md:  'px-4 py-2 text-sm rounded-xl',
  lg:  'px-6 py-3 text-base rounded-xl',
  xl:  'px-8 py-4 text-lg rounded-2xl',
};

export default function Button({
  children, variant = 'primary', size = 'md',
  className = '', loading = false, ...props
}) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={clsx(
        'inline-flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {loading && (
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {children}
    </button>
  );
}
