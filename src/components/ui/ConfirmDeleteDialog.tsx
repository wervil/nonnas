"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, ShieldAlert } from "lucide-react";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
}

export default function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Delete this item?",
  description = "This action cannot be undone.",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  isLoading = false,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isLoading) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        style={{ zIndex: 1000000 }}
        overlayStyle={{ zIndex: 1000000 }}
        showCloseButton={!isLoading}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-red-600" />
            </div>
            <DialogTitle className="text-base">{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-1">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm font-medium rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onConfirm()}
            className="px-4 py-2 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-2 transition-colors"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
