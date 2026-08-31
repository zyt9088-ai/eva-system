"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Tooltip } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";

export interface Option {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
}

interface ModernDropdownProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder: string;
  icon?: any;
  className?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
}

const GAP = 6;
const MAX_PANEL_HEIGHT = 380;
const MIN_PANEL_HEIGHT = 160;
const VIEWPORT_MARGIN = 16;

export const ModernDropdown = ({
  value,
  options,
  onChange,
  placeholder,
  icon: Icon,
  className = "w-full lg:w-48",
  searchable = false,
  searchPlaceholder = "بحث بالاسم أو الإدارة أو البريد...",
}: ModernDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [coords, setCoords] = useState<{
    left?: number;
    right?: number;
    width: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
  }>({ width: 0, maxHeight: MAX_PANEL_HEIGHT });
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - GAP - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - GAP - VIEWPORT_MARGIN;

    // Prefer opening downwards unless there is significantly more space above
    const openUpwards = spaceBelow < 220 && spaceAbove > spaceBelow;
    const availableSpace = openUpwards ? spaceAbove : spaceBelow;
    const calculatedMaxHeight = Math.max(MIN_PANEL_HEIGHT, Math.min(MAX_PANEL_HEIGHT, availableSpace - 10));

    // Ensure dropdown is at least as wide as button or minimum 260px for readability
    const panelWidth = Math.max(rect.width, 240);

    // Calculate RTL right alignment
    let rightPos = window.innerWidth - rect.right;
    if (rightPos + panelWidth > window.innerWidth - VIEWPORT_MARGIN) {
      rightPos = window.innerWidth - panelWidth - VIEWPORT_MARGIN;
    }
    if (rightPos < VIEWPORT_MARGIN) {
      rightPos = VIEWPORT_MARGIN;
    }

    if (openUpwards) {
      setCoords({
        right: rightPos,
        width: panelWidth,
        bottom: window.innerHeight - rect.top + GAP,
        top: undefined,
        maxHeight: calculatedMaxHeight,
      });
    } else {
      setCoords({
        right: rightPos,
        width: panelWidth,
        top: rect.bottom + GAP,
        bottom: undefined,
        maxHeight: calculatedMaxHeight,
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedButton = buttonRef.current?.contains(target);
      const clickedPanel = panelRef.current?.contains(target);
      if (!clickedButton && !clickedPanel) setIsOpen(false);
    };

    const handleScroll = (event: Event) => {
      // If the scroll happened inside the dropdown panel, do NOT close!
      if (panelRef.current && panelRef.current.contains(event.target as Node)) {
        return;
      }
      setIsOpen(false);
    };

    const handleResize = () => {
      if (isOpen) updatePosition();
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  const toggleOpen = () => {
    if (!isOpen) {
      updatePosition();
      setSearchTerm("");
    }
    setIsOpen((prev) => !prev);
  };

  const selectedOption = options.find((o) => o.value === value);
  const filteredOptions = searchable && searchTerm.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
        (o.subLabel && o.subLabel.toLowerCase().includes(searchTerm.trim().toLowerCase())) ||
        (o.badge && o.badge.toLowerCase().includes(searchTerm.trim().toLowerCase()))
      )
    : options;

  return (
    <div className={`relative text-right min-w-0 max-w-full ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        className={`w-full min-w-0 max-w-full flex items-center justify-between px-3.5 py-2 min-h-[44px] bg-white text-sm font-bold text-gray-700 border rounded-xl transition-all cursor-pointer overflow-hidden ${
          isOpen ? "border-[#0D4435] ring-1 ring-[#0D4435]/30 shadow-xs" : "border-gray-200 hover:border-[#0D4435]"
        }`}
      >
        <div className="flex-1 min-w-0 max-w-full text-right overflow-hidden">
          {selectedOption ? (
            <Tooltip
              content={`${selectedOption.label} ${selectedOption.badge ? `(${selectedOption.badge})` : ""} ${selectedOption.subLabel || ""}`}
              className="block max-w-full"
            >
            <div
              className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap py-0.5 max-w-full"
            >
              <span className="font-black text-gray-900 shrink-0">{selectedOption.label}</span>
              {selectedOption.badge && (
                <span className="px-2 py-0.5 bg-[#0D4435]/10 text-[#0D4435] rounded-md text-[11px] font-black shrink-0">
                  {selectedOption.badge}
                </span>
              )}
              {selectedOption.subLabel && (
                <span className="text-[11px] text-gray-400 font-mono shrink-0" dir="ltr">
                  {selectedOption.subLabel}
                </span>
              )}
            </div>
            </Tooltip>
          ) : (
            <span className="text-gray-400 font-bold truncate block">{placeholder}</span>
          )}
        </div>

        {Icon ? (
          <Icon
            size={16}
            className={`text-gray-400 transition-transform duration-300 shrink-0 mr-2 ${
              isOpen ? "rotate-180 text-[#0D4435]" : ""
            }`}
          />
        ) : (
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform duration-300 shrink-0 mr-2 ${
              isOpen ? "rotate-180 text-[#0D4435]" : ""
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
                initial={{ opacity: 0, y: coords.bottom !== undefined ? 6 : -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: coords.bottom !== undefined ? 6 : -6, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: "fixed",
                  top: coords.top,
                  bottom: coords.bottom,
                  right: coords.right,
                  width: coords.width,
                  maxHeight: coords.maxHeight,
                  zIndex: 999999,
                }}
                className="bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                dir="rtl"
              >
                {searchable && (
                  <div className="p-2.5 border-b border-gray-100 bg-gray-50/90 shrink-0">
                    <div className="relative">
                      <input
                        type="text"
                        autoFocus
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="w-full h-9 pr-8 pl-3 text-xs font-bold text-gray-800 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#0D4435] transition-colors"
                      />
                      <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                <div className="overflow-y-auto overscroll-contain flex-1 divide-y divide-gray-50/80 custom-scrollbar">
                  {filteredOptions.length === 0 && (
                    <div className="px-4 py-6 text-xs text-gray-400 font-bold text-center">
                      لا توجد نتائج مطابقة
                    </div>
                  )}
                  {filteredOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-3 text-xs hover:bg-[#0D4435]/5 hover:text-[#0D4435] transition-colors text-right cursor-pointer ${
                        opt.value === value ? "bg-[#0D4435]/10 font-black text-[#0D4435]" : "text-gray-700 font-bold"
                      }`}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1 text-right">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{opt.label}</span>
                          {opt.badge && (
                            <span className="px-1.5 py-0.5 bg-[#0D4435]/10 text-[#0D4435] rounded text-[10px] font-black shrink-0">
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        {opt.subLabel && (
                          <span className="text-[10px] text-gray-400 font-mono text-right" dir="ltr">
                            {opt.subLabel}
                          </span>
                        )}
                      </div>
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
