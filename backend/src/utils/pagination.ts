/**
 * Pagination helpers shared by all list endpoints.
 */
export interface PageParams {
  page: number;
  pageSize: number;
}

export function toPrismaPage(p: PageParams): { skip: number; take: number } {
  return { skip: (p.page - 1) * p.pageSize, take: p.pageSize };
}

export function buildPageMeta(
  total: number,
  p: PageParams,
): { page: number; pageSize: number; total: number; totalPages: number } {
  return {
    page: p.page,
    pageSize: p.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / p.pageSize)),
  };
}
