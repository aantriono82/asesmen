export interface PaginationQuery {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function resolvePagination(page?: number, limit?: number): PaginationQuery {
  const safePage = Number.isFinite(page) && page && page > 0 ? Math.floor(page) : 1;
  const safeLimit = Number.isFinite(limit) && limit && limit > 0 ? Math.min(Math.floor(limit), 100) : 10;

  return {
    page: safePage,
    limit: safeLimit
  };
}

export function toPaginatedResult<T>(items: T[], total: number, query: PaginationQuery): PaginatedResult<T> {
  return {
    items,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.max(1, Math.ceil(total / query.limit))
  };
}
