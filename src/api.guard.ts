import { CanActivate, Injectable, ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { config } from './config';

@Injectable()
export class ApiGuard implements CanActivate {
  constructor() {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) return false;

    if (apiKey === config.apiKey) {
      return true;
    }

    throw new ForbiddenException('Invalid API key');
  }
}
