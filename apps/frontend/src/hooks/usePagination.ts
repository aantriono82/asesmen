"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface PaginationOptions {
  page: number;
  limit: number;
}

interface PaginationResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  refresh: () => Promise<void>;
}

interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function usePagination<T>(
  fetchFn: (options: PaginationOptions) => Promise<PaginatedResponse<T>>,
  options: PaginationOptions
): PaginationResult<PaginatedResponse<T>> {
  const [page, setPage] = useState(options.page);
  const [data, setData] = useState<PaginatedResponse<T> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchFnRef = useRef(fetchFn);

  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFnRef.current({ page, limit: options.limit });
      setData(result);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Gagal memuat data");
    } finally {
      setIsLoading(false);
    }
  }, [options.limit, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    data,
    isLoading,
    error,
    page,
    totalPages: data?.totalPages ?? 1,
    goToPage: setPage,
    nextPage: () => setPage((current) => current + 1),
    prevPage: () => setPage((current) => Math.max(1, current - 1)),
    refresh: load
  };
}
