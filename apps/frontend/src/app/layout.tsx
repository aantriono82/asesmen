import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppProviders } from "@components/providers/AppProviders";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "ATIGA Assessment AI",
  description: "Platform AI untuk membuat dan mengelola asesmen pembelajaran."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const stored = window.localStorage.getItem('atiga_theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const dark = stored ? stored === 'dark' : prefersDark;
                document.documentElement.classList.toggle('dark', dark);
              })();
            `
          }}
        />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
