import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../constants/roles.enum';

const ROLE_ACCESS: Record<UserRole, UserRole[]> = {
  [UserRole.User]: [UserRole.User],
  [UserRole.Admin]: [UserRole.User, UserRole.Admin],
  [UserRole.SuperAdmin]: [UserRole.SuperAdmin],
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as { role?: UserRole } | undefined;
    if (!user) {
      return false;
    }

    const userRole = user.role ?? UserRole.User;
    const accessible = ROLE_ACCESS[userRole] ?? [];

    return requiredRoles.some((role) => accessible.includes(role));
  }
}
