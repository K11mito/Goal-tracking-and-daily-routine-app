import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  delay?: string;
  noPadding?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  title, 
  icon, 
  action, 
  delay = '',
  noPadding = false
}) => {
  return (
    <div className={`animate-enter ${delay} group relative overflow-hidden rounded-[32px] spatial-glass transition-all duration-500 hover:shadow-[0_20px_40px_-10px_rgba(190,242,100,0.1)] hover:scale-[1.005] hover:border-lime-500/20 dark:hover:border-lime-500/20 hover:border-lime-600/30 ${className}`}>
      
      {/* Subtle shine effect on top border */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50"></div>

      {/* Header */}
      {(title || icon || action) && (
        <div className="relative z-10 flex items-center justify-between px-7 pt-6 pb-3">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 shadow-inner text-lime-600 dark:text-lime-300">
                {icon}
              </div>
            )}
            {title && <h2 className="text-[19px] font-bold tracking-tight text-sage-900 dark:text-white/90 drop-shadow-sm">{title}</h2>}
          </div>
          {action && <div className="z-10">{action}</div>}
        </div>
      )}
      
      <div className={`relative z-10 ${noPadding ? '' : 'p-6'}`}>
        {children}
      </div>
    </div>
  );
};

export default GlassCard;