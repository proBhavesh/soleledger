"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder of the exact same size to prevent layout shift
    return <div style={{ visibility: "hidden" }}>{children}</div>;
  }

  return (
    <NextThemesProvider
      {...props}
      forcedTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
