import swaggerJsDoc from "swagger-jsdoc";

const baseUrl = process.env.APP_URL || "http://localhost:3000/api";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "SVK DTH WORLD",
      version: "1.0.0",
      description: "E-Commerce API"
    },

    servers: [
      {
        url: baseUrl,
        description: process.env.NODE_ENV || "development"
      }
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    },

    security: [
      {
        bearerAuth: []
      }
    ]
  },

  apis: ["./src/routes/**/*.ts", "./src/controllers/**/*.ts"]
};

export const swaggerSpec = swaggerJsDoc(options);