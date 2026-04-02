"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  selected?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({ className, hover, selected, padding = "md", children, ...props }: CardProps) {
  const base = "bg-white rounded-[12px] border transition-all duration-250";
  const paddings = { none: "", sm: "p-4", md: "p-6", lg: "p-8" };

  return (
    <motion.div
      className={cn(
        base,
        paddings[padding],
        selected
          ? "border-[#534AB7] shadow-[0_0_0_1px_#534AB7]"
          : "border-[#E5E5E5]",
        hover && !selected && "hover:border-[#534AB7] hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(83,74,183,0.12)] cursor-pointer",
        className
      )}
      {...(props as any)}
    >
      {children}
    </motion.div>
  );
}
