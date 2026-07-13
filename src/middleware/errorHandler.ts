import { Request, Response, NextFunction } from "express";

interface CustomError extends Error {
  status?: number;
  statusCode?: number;
  errors?: any;
  code?: string;
  sqlMessage?: string;
  details?: any;
}

const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {

  const isProd = process.env.NODE_ENV === "production";

  console.error("❌ ERROR:", {
    name: error.name,
    message: error.message,
    path: req.originalUrl,
    method: req.method,
  });

  let statusCode = 500;
  let message = "Internal Server Error";

  /* =========================
     BASE ERROR
  ========================= */
  if (error.status || error.statusCode) {
    statusCode = error.status || error.statusCode || statusCode;
    message = error.message;
  }

  /* =========================
     JWT ERRORS
  ========================= */
  if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid Token";
  }

  if (error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token Expired";
  }

  /* =========================
     VALIDATION ERROR
  ========================= */
  if (error.name === "ValidationError") {
    statusCode = 400;
    message = error.message;
  }

  /* =========================
     MYSQL ERRORS
  ========================= */
  if (error.code === "ER_DUP_ENTRY" || error.code === "23505") {
    statusCode = 409;
    message = "Duplicate record found";
  }

  if (
    error.code === "ER_NO_REFERENCED_ROW_2" ||
    error.code === "ER_ROW_IS_REFERENCED_2"
  ) {
    statusCode = 400;
    message = "Foreign key constraint failed";
  }

  /* =========================
     TYPEORM ERRORS
  ========================= */
  if (error.name === "EntityNotFoundError") {
    statusCode = 404;
    message = "Record not found";
  }

  /* =========================
     DATABASE ERROR
  ========================= */
  if (error.sqlMessage) {
    statusCode = 500;
    message = isProd
      ? "Database Error"
      : error.sqlMessage;
  }

  /* =========================
     FINAL RESPONSE FORMAT
  ========================= */
  const response: any = {
    success: false,
    statusCode,
    message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
  };

  if (error.errors) {
    response.errors = error.errors;
  }

  /* =========================
     DEV ONLY DEBUG INFO
  ========================= */
  if (!isProd) {
    response.error = {
      name: error.name,
      stack: error.stack,
      code: error.code || null,
      details: error.details || null,
    };
  }

  res.status(statusCode).json(response);
};

export default errorHandler;