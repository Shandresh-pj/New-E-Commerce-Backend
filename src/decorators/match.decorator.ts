import { IsString, MinLength, Validate, Matches } from "class-validator";
import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";

// Custom decorator to match password and confirmPassword
export function Match(property: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "Match",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          return value === relatedValue;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} and ${args.constraints[0]} do not match`;
        },
      },
    });
  };
}