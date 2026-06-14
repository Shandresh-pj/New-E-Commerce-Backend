// import { DefaultNamingStrategy } from "typeorm";

export function pascalCase(string:string) {
  return `${string}`
    .replace(new RegExp(/[-_]+/, 'g'), ' ')
    .replace(new RegExp(/[^\w\s]/, 'g'), '')
    .replace(
      new RegExp(/\s+(.)(\w+)/, 'g'),
      ($1, $2, $3) => `${$2.toUpperCase() + $3.toLowerCase()}`
    )
    .replace(new RegExp(/\s/, 'g'), '')
    .replace(new RegExp(/\w/), (s) => s.toUpperCase());
}

export function splitPascalCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Insert space between a lowercase letter followed by an uppercase letter
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2') // Handle case where two uppercase letters are followed by a lowercase letter
    .replace(/^./, (str) => str.toUpperCase()); // Capitalize the first letter
}



import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

export class PascalCaseNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  tableName(className: string, customName: string): string {
    return customName ? customName : pascalCase(className);
  }

  columnName(propertyName: string, customName: string, embeddedPrefixes: string[]): string {
    return customName ? customName : pascalCase(embeddedPrefixes.join('') + propertyName);
  }

  relationName(propertyName: string): string {
    return pascalCase(propertyName);
  }
}