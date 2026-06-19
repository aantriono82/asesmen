"use client";

import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false
  };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("UI crashed", error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-field px-6 dark:bg-slate-950">
          <div className="w-full max-w-lg rounded-lg border border-line bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-semibold text-brand dark:text-teal-400">ATIGA Assessment AI</p>
            <h1 className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">Halaman mengalami kesalahan.</h1>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Komponen gagal dimuat. Muat ulang halaman untuk menjalankan ulang state aplikasi.
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="mt-6 inline-flex h-11 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Muat Ulang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
