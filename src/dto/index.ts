import "reflect-metadata";
import { validationMetadatasToSchemas } from "class-validator-jsonschema";
import { getMetadataStorage } from "class-validator";

export * from "./register.dto";
export * from "./otp.dto";
export * from "./products.dto";
export * from "./order.dto";
export * from "./coupon.dto";
export * from "./stock.dto";
export * from "./payment.dto";

/**
 * Swagger schema generator fix
 */
export const AllSchemas = validationMetadatasToSchemas({
  classValidatorMetadataStorage: getMetadataStorage(),
  refPointerPrefix: "#/components/schemas/",
});