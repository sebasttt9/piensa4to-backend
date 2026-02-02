import { Request } from 'express';
import type { UserEntity } from '../../users/entities/user.entity';

export interface AuthenticatedRequest extends Request {
  user: Omit<UserEntity, 'passwordHash'>;
}
