import { MetaData } from "@/shared/models/apiResponse";

export type Power = {
  id: string;
  displayName: string;
  powerName: string;
  description: string;
}

export type UserAccount = {
  id: string;
  userName: string;
  userEmail: string;
  userPassword: string;
  description: string | null;
  available: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
  isNewAccount: boolean;
  powers: Power[];
}

export type CookieData = {
  token: string;
  user: Omit<UserAccount, 'userPassword' | 'powers'> | null;
}

export type RecoveryData = {
  email?: string;
  shouldComplete?: Date | null;
  modePage?: 'verify' | 'recovery';
}

export type AuthRequestOptions = {
  skipLoading?: boolean;
}

export type LoginRequest = {
  email: string;
  password: string;
}

export type LoginResponse = {
  token: string;
  user: UserAccount;
}

export type RecoveryRequest = {
  email: string;
}

export type RecoveryResponse = {
  ttl: string;
}

export type ChangePasswordRequest = {
  newPassword: string;
  oldPassword: string;
}

export type ChangePasswordWithCodeRequest = {
  userEmail: string;
  newPassword: string;
}

export type VerifyCodeRequest = {
  userEmail: string;
  code: string;
}

export type AppConfig = {
  menuOpen: boolean;
  recoveryData: RecoveryData | null;
}

export type AuthState = {
  isAuthenticated: boolean;
  token: string | null;
  powers: string[];
  userAccount: Omit<UserAccount, 'userPassword' | 'powers'> | null;
}

export type ConfigState = {
  menuOpen: boolean;
  recoveryData: RecoveryData | null;
}

export type PowerResponse = {
  powers: Power[];
}

export type ApiSuccess<T> = {
  type: 'success';
  success: true;
  data: T;
  metadata?: MetaData;
}

export type ApiError = {
  message: string;
  param?: string;
}

export type ApiErrorResult = {
  type: 'error';
  errors?: ApiError[];
}

export type AuthResult<T> = {
  success: boolean;
  data: T | null;
  metadata?: MetaData;
}

export type ResponseWithMeta<T> = {
  data: T[];
  meta: MetaData;
}

export type ApiEmpty = {
  type: 'empty';
  success: true;
  data: null;
}

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiResult<T> = ApiSuccess<T> | ApiErrorResult | ApiEmpty;