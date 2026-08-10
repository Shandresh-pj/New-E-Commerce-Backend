import path from "path";
import swaggerJsDoc from "swagger-jsdoc";

const baseUrl = process.env.APP_URL || "http://localhost:3000/api";

const toGlobPath = (relativePath: string) =>
  path.join(__dirname, relativePath).replace(/\\/g, "/");

const cwdGlobPath = (relativePath: string) =>
  path.join(process.cwd(), relativePath).replace(/\\/g, "/");

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

  apis: [
    toGlobPath("../routes/**/*.{ts,js}"),
    toGlobPath("../controllers/**/*.{ts,js}"),
    cwdGlobPath("src/routes/**/*.{ts,js}"),
    cwdGlobPath("src/controllers/**/*.{ts,js}"),
    cwdGlobPath("dist/routes/**/*.{js,ts}"),
    cwdGlobPath("dist/controllers/**/*.{js,ts}"),
    "./src/routes/**/*.{ts,js}",
    "./src/controllers/**/*.{ts,js}",
    "./dist/routes/**/*.{js,ts}",
    "./dist/controllers/**/*.{js,ts}"
  ]
};

export const swaggerSpec = swaggerJsDoc(options);