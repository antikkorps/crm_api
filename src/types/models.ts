export interface User {
  id: string
  email: string
  password: string
  firstName: string
  lastName: string
  isActive: boolean
  isSuperAdmin: boolean
  roleId: string
  tenantId: string
  avatarUrl?: string | null
  phone?: string | null
  jobTitle?: string | null
  bio?: string | null
  lastLoginAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface UserResponse {
  id: string
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  isSuperAdmin: boolean
  roleId: string
  tenantId: string
  avatarUrl?: string | null
  phone?: string | null
  jobTitle?: string | null
  bio?: string | null
  lastLoginAt?: string | null
  createdAt: string
  updatedAt: string
  Role?: any
  Tenant?: any
}

export interface UpdatePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface UpdatePasswordResponse {
  message: string
  success: boolean
}

export interface UpdateProfileRequest {
  firstName: string
  lastName: string
  phone?: string | null
  jobTitle?: string | null
  bio?: string | null
}

export interface UpdateProfileResponse {
  message: string
  success: boolean
  user: UserResponse
}
