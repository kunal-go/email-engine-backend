export type JwtPayload = {
  userId: string;
};

export function createAccessToken(payload: JwtPayload): string {
  return payload.userId;
}

export function validateAccessToken(token: string): JwtPayload {
  return { userId: token };
}
