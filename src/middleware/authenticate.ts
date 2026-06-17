import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

const authenticateMiddleware = (req: any, res: any, next: any) => {
  try {
    console.log("AUTH HEADER:", req.headers.authorization);

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Token missing"
      });
    }

    const token = authHeader.split(" ")[1];

    console.log("TOKEN:", token);

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    );

    console.log("DECODED:", decoded);

    req.user = decoded;

    next();

  } catch (err) {
    console.log(err);

    return res.status(401).json({
      success: false,
      message: "Unauthorized"
    });
  }
};

export default authenticateMiddleware;