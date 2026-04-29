"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import type { ReactNode } from "react";

type CloseOrBackButtonProps = {
  fallbackHref?: string;
  className?: string;
  children?: ReactNode;
};

export default function CloseOrBackButton({
  fallbackHref = "/",
  className,
  children = "Close",
}: CloseOrBackButtonProps) {
  const router = useRouter();

  const onClick = useCallback(() => {
    // If this page is in a popup window, try to close it.
    if (typeof window !== "undefined") {
      const hasOpener = !!window.opener && !window.opener.closed;
      if (hasOpener) {
        window.close();
        // If the browser blocks window.close(), we still fall through.
      }
    }

    // If there's history, go back; otherwise go to a safe fallback.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }, [fallbackHref, router]);

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

