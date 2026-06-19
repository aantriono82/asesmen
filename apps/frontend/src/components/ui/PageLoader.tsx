"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function PageLoader() {
  const pathname = usePathname();
  const initialRender = useRef(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }

    setVisible(true);
    const timeout = window.setTimeout(() => setVisible(false), 350);

    return () => window.clearTimeout(timeout);
  }, [pathname]);

  return (
    <div
      className={`fixed inset-x-0 top-0 z-50 h-1 bg-transparent transition-opacity ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <div className="h-full w-full origin-left animate-[page-loader_350ms_ease-out] bg-brand" />
    </div>
  );
}
