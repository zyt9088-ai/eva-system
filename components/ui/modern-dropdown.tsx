"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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

const GAP = 8;
const MAX_PANEL_HEIGHT = 240;
const VIEWPORT_MARGIN = 12;

export const ModernDropdown = ({
  value,
  options,
  onChange,
  placeholder,
  icon: Icon,
  className = "w-full lg:w-48",
}: ModernDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
  }>({ left: 0, width: 0, top: 0, maxHeight: MAX_PANEL_HEIGHT });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Portals need `document.body`, which doesn't exist during SSR — flip this after mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedButton = buttonRef.current?.contains(target);
      const clickedPanel = panelRef.current?.contains(target);
      if (!clickedButton && !clickedPanel) setIsOpen(false);
    };
    const handleScrollOrResize = () => setIsOpen(false);

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, []);

  const toggleOpen = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - GAP - VIEWPORT_MARGIN;
      const spaceAbove = rect.top - GAP - VIEWPORT_MARGIN;

      if (spaceBelow < 120 && spaceAbove > spaceBelow) {
        // not enough room below: flip the panel above the trigger instead
        setCoords({
          left: rect.left,
          width: rect.width,
          bottom: window.innerHeight - rect.top + GAP,
          maxHeight: Math.max(120, Math.min(MAX_PANEL_HEIGHT, spaceAbove)),
        });
      } else {
        setCoords({
          left: rect.left,
          width: rect.width,
          top: rect.bottom + GAP,
          maxHeight: Math.max(120, Math.min(MAX_PANEL_HEIGHT, spaceBelow)),
        });
      }
    }
    setIsOpen((prev) => !prev);
  };

  const selectedLabel = options.find((o) => o.value === value)?.label || placeholder;

  return (
    <div className={`relative text-right ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        className={`w-full flex items-center justify-between px-3 py-2 min-h-[44px] bg-white text-sm font-bold text-gray-700 border rounded-md transition-all ${
          isOpen ? "border-[#C5A059] ring-1 ring-[#C5A059]/30 shadow-sm" : "border-gray-300 hover:border-[#C5A059]"
        }`}
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

      {mounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                ref={panelRef}
                initial={{ opacity: 0, y: coords.bottom !== undefined ? 6 : -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: coords.bottom !== undefined ? 6 : -6 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: "fixed",
                  top: coords.top,
                  bottom: coords.bottom,
                  left: coords.left,
                  width: coords.width,
                  zIndex: 9999,
                }}
                className="bg-white border border-[#C5A059] rounded-lg shadow-xl overflow-hidden"
              >
                <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: coords.maxHeight }}>
                  {options.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className="w-full flex justify-between items-center px-3 py-2.5 text-sm text-gray-700 hover:bg-[#C5A059]/10 hover:text-[#0D4435] font-bold transition-colors text-right"
                    >
                      <span className="truncate">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};
