import { UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

export type JwtPayload = {
  userId: string;
};

const ISSUER = 'email-engine-backend-service';
const SUBJECT = 'user-access-token';
const SECRET = 'my-secret-key'; // should be stored in environment variable

export function createAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, {
    issuer: ISSUER,
    expiresIn: `12h`,
    subject: SUBJECT,
  });
}

export function validateAccessToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, SECRET, {
      issuer: ISSUER,
      subject: SUBJECT,
    }) as JwtPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedException('Access token expired');
    }
    throw err;
  }
}
