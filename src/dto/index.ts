import "reflect-metadata";
import { validationMetadatasToSchemas } from "class-validator-jsonschema";
import { getMetadataStorage } from "class-validator";


export * from "./Attendance.dto";
export * from "./branch.dto";
export * from "./branchStock.dto";
export * from "./category.dto"
export * from "./coupon.dto";
export * from "./CreateBreakSetting.Dto";
export * from "./delivery.dto";
export * from "./forgetPassword.dto";
export * from "./Employee.dto";
export * from "./leave.dto";
export * from "./order.dto";
export * from "./otp.dto";
export * from "./payment.dto";
export * from "./productAttribute.dto";
export * from "./products.dto";
export * from "./register.dto";
export * from "./role-access.dto";
export * from "./salary.dto";
export * from "./stock.dto";
export * from "./company.dto";
export * from "./contact.dto";



// export * from ".";
// export * from ".";
// export * from ".";
// export * from ".";

/**
 * Swagger schema generator fix
 */
export const AllSchemas = validationMetadatasToSchemas({
  classValidatorMetadataStorage: getMetadataStorage(),
  refPointerPrefix: "#/components/schemas/",
});