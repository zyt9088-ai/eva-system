"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Option {
  value: string;
  label: string;
}

interface ModernDropdownProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder: string;
  icon?: any;
  className?: string;
}

export const ModernDropdown = ({
  value,
  options,
  onChange,
  placeholder,
  icon: Icon,
  className = "w-full lg:w-48",
}: ModernDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = options.find((o) => o.value === value)?.label || placeholder;

  return (
    <div ref={ref} className={`relative z-40 text-right ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 min-h-[44px] bg-white text-sm font-bold text-gray-700 transition-all ${
          isOpen
            ? "border border-[#C5A059] rounded-t-md shadow-sm"
            : "border border-gray-300 rounded-md hover:border-[#C5A059]"
        }`}
        style={{ borderBottomColor: isOpen ? "transparent" : "" }}
      >
        <span className="truncate">{selectedLabel}</span>
        {Icon && (
          <Icon
            size={14}
            className={`text-gray-400 transition-transform duration-300 shrink-0 ${
              isOpen ? "rotate-180 text-[#C5A059]" : ""
            }`}
          />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 w-full bg-white border border-[#C5A059] border-t-0 rounded-b-md shadow-lg overflow-hidden z-50"
          >
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className="w-full flex justify-between items-center px-3 py-2.5 text-sm text-gray-700 hover:bg-[#C5A059]/10 hover:text-[#0D4435] font-bold transition-colors"
                >
                  <span className="truncate">{opt.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
