import jwt, { JwtPayload, SignOptions, Secret } from "jsonwebtoken";

export const generateToken = (
  payload: string | object | Buffer,
  expiresIn: string | number = "1d"
): string => {
  const secret: Secret = (process.env.JWT_SECRET || "") as Secret;
  const options: SignOptions = { expiresIn } as SignOptions;
  return jwt.sign(payload as any, secret, options);
};

export const verifyToken = (
  token: string
): JwtPayload | string => {
  const secret: Secret = (process.env.JWT_SECRET || "") as Secret;
  return jwt.verify(token, secret) as JwtPayload | string;
};

export const decodeToken = (token: string): JwtPayload | string | null => {
  return jwt.decode(token) as JwtPayload | string | null;
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
};