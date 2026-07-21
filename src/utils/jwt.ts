import jwt, { JwtPayload, SignOptions, Secret } from "jsonwebtoken";

export const generateToken = (
  payload: string | object | Buffer,
  expiresIn: string | number = "1d" // Short-lived access token
): string => {
  const secret: Secret = (process.env.JWT_SECRET || "") as Secret;
  const options: SignOptions = { expiresIn } as SignOptions;
  return jwt.sign(payload as any, secret, options);
};

export const generateRefreshToken = (
  payload: string | object | Buffer,
  expiresIn: string | number = "7d" // Long-lived refresh token
): string => {
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!refreshSecret) {
    throw new Error("JWT_REFRESH_SECRET environment variable is not set. Cannot generate refresh tokens.");
  }
  const secret: Secret = refreshSecret as Secret;
  const options: SignOptions = { expiresIn } as SignOptions;
  return jwt.sign(payload as any, secret, options);
};

export const verifyToken = (
  token: string
): JwtPayload | string => {
  const secret: Secret = (process.env.JWT_SECRET || "") as Secret;
  return jwt.verify(token, secret) as JwtPayload | string;
};

export const verifyRefreshToken = (
  token: string
): JwtPayload | string => {
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!refreshSecret) {
    throw new Error("JWT_REFRESH_SECRET environment variable is not set. Cannot verify refresh tokens.");
  }
  const secret: Secret = refreshSecret as Secret;
  return jwt.verify(token, secret) as JwtPayload | string;
};

export const decodeToken = (token: string): JwtPayload | string | null => {
  return jwt.decode(token) as JwtPayload | string | null;
};