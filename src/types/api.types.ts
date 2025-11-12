export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface FileUploadResponse {
  url: string;
  key: string;
  bucket: string;
  size: number;
  mimeType: string;
}

// Utility type to convert Date fields to string for API responses
export type DateToString<T> = {
  [K in keyof T]: T[K] extends Date 
    ? string 
    : T[K] extends Date | null 
    ? string | null 
    : T[K] extends Date | undefined 
    ? string | undefined 
    : T[K] extends (infer U)[] 
    ? U extends object ? DateToString<U>[] : T[K]
    : T[K] extends object | null | undefined
    ? T[K] extends null 
      ? null 
      : T[K] extends undefined 
      ? undefined 
      : DateToString<T[K]>
    : T[K];
};