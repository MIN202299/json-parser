import React from 'react';
import { Loader2 } from 'lucide-react';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ElementType;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'ai';
  loading?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ 
  icon: Icon, 
  label, 
  variant = 'secondary', 
  loading = false,
  className = '',
  ...props 
}) => {
  const baseStyles = "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-500 border border-transparent shadow-lg shadow-blue-900/20",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 focus:ring-slate-500",
    danger: "bg-red-900/30 hover:bg-red-900/50 text-red-200 border border-red-900/50 focus:ring-red-500",
    ghost: "bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200 focus:ring-slate-500",
    ai: "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border border-transparent shadow-lg shadow-indigo-900/30"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        Icon && <Icon size={14} />
      )}
      <span>{label}</span>
    </button>
  );
};

export default ActionButton;