import { Injectable } from '@angular/core';
import { CrudService } from '../../core/api/crud.service';
import type { UserRole } from '../../core/models/auth.model';
import type { ManagedUser, UserStatus } from '../../core/models/user.model';

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserPayload {
  name?: string;
  role?: UserRole;
  status?: UserStatus;
  password?: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService extends CrudService<ManagedUser, CreateUserPayload, UpdateUserPayload> {
  protected readonly path = '/users';
}
