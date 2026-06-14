import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "SVK DTH WORLD",
      version: "1.0.0",
      description: "E-Commerce API Documentation",
    },
  },
  apis: [
    "./src/controllers/**/*.ts",
    "./src/routes/**/*.ts",
    "./src/**/*.ts"
  ],
};

export const swaggerSpec = swaggerJsDoc(options);
export { swaggerUi };