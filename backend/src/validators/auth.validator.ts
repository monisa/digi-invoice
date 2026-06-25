import { z } from 'zod';

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long');

const subdomain = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Subdomain must be at least 3 characters')
  .max(63, 'Subdomain is too long')
  .regex(
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
    'Subdomain may contain only lowercase letters, numbers and hyphens',
  );

const email = z.string().trim().toLowerCase().email('A valid email is required');

export const signupSchema = z.object({
  companyName: z.string().trim().min(1, 'Company name is required').max(200),
  subdomain,
  adminName: z.string().trim().min(1, 'Admin name is required').max(120),
  adminEmail: email,
  password,
});

export const loginSchema = z.object({
  subdomain,
  email,
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
