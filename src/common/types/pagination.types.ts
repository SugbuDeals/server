/**
 * Pagination options interface for consistent pagination across services
 */
export interface PaginationOptions {
  skip?: number;
  take?: number;
}

/**
 * Paginated response wrapper
 * Generic interface for consistent paginated responses across all endpoints
 * 
 * @template T - The type of data being paginated
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    skip: number;
    take: number;
    total: number;
  };
}
