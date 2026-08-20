"use client";

import { useEffect } from "react";
import { cn } from "@/shared/utils/cn";
import Button from "./Button";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  closeOnOverlay = true,
  className,
}) {
  const sizes = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-3xl",
    full: "max-w-5xl",
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={closeOnOverlay ? onClose : undefined}
      />

      {/* Modal Card */}
      <div
        className={cn(
          "relative w-full max-h-[calc(100vh-3.5rem)] flex flex-col bg-card/95 backdrop-blur-xl",
          "border border-border/80 rounded-2xl shadow-2xl overflow-hidden",
          "animate-in fade-in zoom-in-95 duration-200",
          sizes[size] || sizes.md,
          className
        )}
      >
        {/* Header */}
        {title && (
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border/60 bg-secondary/15">
            <h2 className="text-base font-semibold text-foreground tracking-tight">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-border/60 bg-secondary/15">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-muted-foreground text-sm leading-relaxed">{message}</p>
    </Modal>
  );
}
