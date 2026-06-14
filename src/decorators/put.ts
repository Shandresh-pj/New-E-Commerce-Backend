import { RouteDefinition } from "../interfaces/RouteDefinition";
import "reflect-metadata";

export const Put = (path: string): MethodDecorator => {
  return (
    target: Object,
    propertyKey: string | symbol,
    _descriptor: PropertyDescriptor
  ): void => {
    const routes: RouteDefinition[] =
      Reflect.getMetadata("routes", target.constructor) || [];

    routes.push({
      requestMethod: "put",
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