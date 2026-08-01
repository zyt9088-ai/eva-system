"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [mounted, setMounted] = useState(false);

  // Portals need `document.body`, which doesn't exist during SSR — flip this after mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const close = (result: boolean) => {
    pending?.resolve(result);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {pending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => close(false)}
                className="fixed inset-0 z-99999 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.15 }}
                  onClick={(e) => e.stopPropagation()}
                  dir="rtl"
                  className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                >
                  <div className="p-6 text-center">
                    <div
                      className={`w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center ${
                        pending.danger === false ? "bg-[#0D4435]/10" : "bg-red-50"
                      }`}
                    >
                      <AlertTriangle size={26} className={pending.danger === false ? "text-[#0D4435]" : "text-red-500"} />
                    </div>
                    {pending.title && <h3 className="text-lg font-black text-gray-900 mb-2">{pending.title}</h3>}
                    <p className="text-sm font-bold text-gray-500 leading-relaxed">{pending.message}</p>
                  </div>
                  <div className="flex border-t border-gray-100">
                    <button
                      onClick={() => close(false)}
                      className="flex-1 py-3.5 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      {pending.cancelLabel || "إلغاء"}
                    </button>
                    <button
                      onClick={() => close(true)}
                      className={`flex-1 py-3.5 text-sm font-black text-white transition-colors ${
                        pending.danger === false ? "bg-[#0D4435] hover:bg-[#0a3529]" : "bg-red-500 hover:bg-red-600"
                      }`}
                    >
                      {pending.confirmLabel || "تأكيد"}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}
