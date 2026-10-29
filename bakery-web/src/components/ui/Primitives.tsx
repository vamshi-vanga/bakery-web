import React from 'react';
import { cn } from '@/lib/utils';

export const inputCls = (isLight: boolean = false) =>
  cn(
    'w-full px-4 py-2.5 rounded-xl text-xs font-medium border outline-none transition-all duration-200',
    isLight
      ? 'bg-[#FFFFFF] border-[#DDD5C7] text-[#1C1917] placeholder-[#78716C] focus:bg-white focus:border-[#B45309] focus:ring-2 focus:ring-[#B45309]/20 shadow-sm'
      : 'bg-[#18181B] border-white/10 text-gray-200 placeholder-gray-500 focus:bg-[#202024] focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20'
  );

export interface GlassProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  isLight?: boolean;
}

export function Glass({ children, className, isLight = false, ...props }: GlassProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border transition-all duration-200',
        isLight
          ? 'bg-[#FFFFFF] border-[#E8E2D8] shadow-sm shadow-stone-900/5 text-[#1C1917]'
          : 'bg-[#121214]/80 border-white/5 shadow-2xl backdrop-blur-xl text-white',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
