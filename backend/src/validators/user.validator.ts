import { z } from 'zod';
import { UserRole, UserStatus } from '@prisma/client';
import { listQuerySchema } from './common.validator';

export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  role: z.nativeEnum(UserRole).default('SALES_REP'),
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    role: z.nativeEnum(UserRole),
    status: z.nativeEnum(UserStatus),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'At least one field must be provided');

export const listUsersSchema = listQuerySchema.extend({
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
