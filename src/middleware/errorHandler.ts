import { Request, Response, NextFunction } from "express";

interface CustomError extends Error {
  status?: number;
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

  console.error("ERROR =>", error);

  let statusCode = error.status || 500;
  let message = error.message || "Internal Server Error";

  // JWT Errors
  if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid Token";
  }

  if (error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token Expired";
  }

  // Validation Error (Joi)
  if (error.name === "ValidationError") {
    statusCode = 400;
    message = error.message;
  }

  // MySQL Duplicate Entry
  if (error.code === "ER_DUP_ENTRY") {
    statusCode = 409;
    message = "Record already exists";
  }

  // MySQL Foreign Key Error
  if (
    error.code === "ER_NO_REFERENCED_ROW_2" ||
    error.code === "ER_ROW_IS_REFERENCED_2"
  ) {
    statusCode = 400;
    message = "Related record not found";
  }

  // TypeORM Entity Not Found
  if (error.name === "EntityNotFoundError") {
    statusCode = 404;
    message = "Record not found";
  }

  // Database Error
  if (error.sqlMessage) {
    statusCode = 500;
    message =
      process.env.NODE_ENV === "production"
        ? "Database Error"
        : error.sqlMessage;
  }

  const response: any = {
    success: false,
    statusCode,
    message,
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV !== "production") {
    response.error = {
      name: error.name,
      stack: error.stack,
      details: error.details || null,
    };
  }

  res.status(statusCode).json(response);
};

export default errorHandler;