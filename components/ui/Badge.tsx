import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "error" | "primary" | "easy" | "medium" | "complex";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-[#F5F5F5] text-[#737373]",
  success: "bg-[#E1F5EE] text-[#1D9E75]",
  warning: "bg-amber-50 text-amber-700",
  error: "bg-red-50 text-red-600",
  primary: "bg-[#EEEDFE] text-[#534AB7]",
  easy: "bg-[#E1F5EE] text-[#1D9E75]",
  medium: "bg-amber-50 text-amber-700",
  complex: "bg-red-50 text-red-600",
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", variants[variant], className)}>
      {children}
    </span>
  );
}
