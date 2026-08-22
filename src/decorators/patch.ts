import { RouteDefinition } from "../interfaces/RouteDefinition";
import "reflect-metadata";

export const Patch = (path: string): MethodDecorator => {
  return (
    target: Object,
    propertyKey: string | symbol,
    _descriptor: PropertyDescriptor
  ): void => {
    const routes: RouteDefinition[] =
      Reflect.getMetadata("routes", target.constructor) || [];

    routes.push({
      requestMethod: "patch",
      path,
      methodName: propertyKey.toString(),
    });

    Reflect.defineMetadata(
      "routes",
      routes,
      target.constructor
    );
  };
};
