import { UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { validateAccessToken } from './access-token';

export function authorizeRequest(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new UnauthorizedException('Authorization header is missing');
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new UnauthorizedException('Invalid authorization header value');
  }

  return validateAccessToken(token);
}
