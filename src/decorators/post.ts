import "reflect-metadata";
import { RouteDefinition } from "../interfaces/RouteDefinition";

export const Post = (path: string): MethodDecorator => {
  return (
    target: object,
    propertyKey: string | symbol,
    _descriptor: PropertyDescriptor
  ): void => {
    const routes: RouteDefinition[] =
      Reflect.getMetadata("routes", target.constructor) ?? [];

    routes.push({
      requestMethod: "post",
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