"use client";
import { Button } from "./Button";
import { Sheet } from "./Sheet";

export function ConfirmSheet({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "확인",
  danger,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title} size="sm">
      {message && <p className="text-[0.9375rem] text-fg-2 leading-relaxed">{message}</p>}
      <div className="mt-5 flex gap-2">
        <Button variant="secondary" full onClick={onClose}>
          취소
        </Button>
        <Button
          variant={danger ? "danger" : "primary"}
          full
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}
