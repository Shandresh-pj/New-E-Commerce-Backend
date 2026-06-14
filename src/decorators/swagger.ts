import { RouteDefinition } from '../interfaces/RouteDefinition';
import 'reflect-metadata'

export const Swagger = (description: string, req?: string, res?: string): MethodDecorator => {
  // `target` equals our class, `propertyKey` equals our decorated method name
  return (target:any, propertyKey: string|symbol, descriptor: PropertyDescriptor) => {
    let routeProperties = Reflect.getOwnMetadata(propertyKey, target);

    if (!routeProperties) {
      routeProperties = {};
    }
    routeProperties = {
      routeSwagger:{description:description,req:req,res:res},
      ...routeProperties,
    };
    Reflect.defineMetadata(propertyKey, routeProperties, target);
    // For class methods that are not arrow functions
    if (descriptor) {
      return descriptor;
    }
  };
};