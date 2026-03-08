import type { ReactNode } from "react";

type PrimaryButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
};

export function PrimaryButton({ children, onClick, className = "" }: PrimaryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#2563EB] px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all duration-150 hover:bg-[#1D4ED8] ${className}`}
    >
      {children}
    </button>
  );
}
