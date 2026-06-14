import "reflect-metadata";
import { RouteDefinition } from "../interfaces/RouteDefinition";

export const Delete = (path: string): MethodDecorator => {
  return (
    target: object,
    propertyKey: string | symbol
  ): void => {
    const routes: RouteDefinition[] =
      Reflect.getMetadata("routes", target.constructor) ?? [];

    routes.push({
      requestMethod: "delete",
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