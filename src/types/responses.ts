export interface DbStatusResponse {
  status: string
}

export interface DbErrorResponse {
  error: string
  details: string
}

export interface PaginationMeta {
  totalItems: number
  totalPages: number
  currentPage: number
  itemsPerPage: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface PaginatedListResponse<T> {
  items: T[]
  pagination: PaginationMeta
}
