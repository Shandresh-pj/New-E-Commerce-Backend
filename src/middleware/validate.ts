import {
  Request,
  Response,
  NextFunction,
} from "express";
import { plainToInstance } from "class-transformer";
import {
  validate as classValidate,
} from "class-validator";

import { ApiError } from "../exceptions/ApiError";

export default function validate(dtoClass: any) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const dto = plainToInstance(
        dtoClass,
        req.body
      );

      const errors = await classValidate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      if (errors.length > 0) {
        const validationErrors: Record<
          string,
          string[]
        > = {};

        errors.forEach((error) => {
          if (error.constraints) {
            validationErrors[error.property] =
              Object.values(error.constraints);
          }
        });

        return next(
          new ApiError(
            422,
            "Validation Failed",
            validationErrors
          )
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}