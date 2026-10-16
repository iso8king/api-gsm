import swaggerJsdoc from "swagger-jsdoc";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "API GSM",
    version: "1.0.0",
    description:
      "API untuk sistem invoice GSM. Saat ini menyediakan endpoint registrasi user dan autentikasi (login) berbasis JWT via httpOnly cookie.",
    contact: {
      name: "Ridho Firdaus",
    },
    license: { name: "ISC" },
  },
  servers: [
    {
      url: "http://localhost:7038",
      description: "Local development",
    },
  ],
  tags: [
    { name: "Users", description: "Manajemen user" },
    { name: "Auth", description: "Autentikasi & token" },
  ],
  components: {
    schemas: {
      CreateUserRequest: {
        type: "object",
        required: ["email", "username", "password", "name"],
        properties: {
          email: {
            type: "string",
            format: "email",
            maxLength: 100,
            example: "budi@example.com",
          },
          username: {
            type: "string",
            maxLength: 100,
            example: "budi",
          },
          password: {
            type: "string",
            format: "password",
            maxLength: 100,
            example: "rahasia123",
          },
          name: {
            type: "string",
            maxLength: 100,
            example: "Budi Santoso",
          },
          role: {
            type: "string",
            enum: ["admin", "partner"],
            default: "partner",
            description: "Opsional. Default `partner`.",
          },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["username", "password"],
        properties: {
          username: {
            type: "string",
            example: "budi",
          },
          password: {
            type: "string",
            format: "password",
            example: "rahasia123",
          },
        },
      },
      UserResponse: {
        type: "object",
        properties: {
          id: { type: "string", example: "clxxxxxxx" },
          email: { type: "string", format: "email", example: "budi@example.com" },
          username: { type: "string", example: "budi" },
          name: { type: "string", example: "Budi Santoso" },
          role: { type: "string", enum: ["admin", "partner"], example: "partner" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          id: { type: "string", example: "clxxxxxxx" },
          email: { type: "string", format: "email", example: "budi@example.com" },
          username: { type: "string", example: "budi" },
          name: { type: "string", example: "Budi Santoso" },
          role: { type: "string", enum: ["admin", "partner"], example: "partner" },
          createdAt: { type: "string", format: "date-time" },
          token_access: {
            type: "string",
            description: "JWT, berlaku 1 jam. Juga diset sebagai httpOnly cookie `access_token`.",
            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          errors: {
            type: "string",
            example: "Credentials Wrong!",
          },
        },
      },
    },
  },
};

const options = {
  definition: swaggerDefinition,
  // Semua anotasi JSDoc @openapi ditaruh di file/route di bawah src/
  apis: ["./src/routes/*.js", "./src/controller/*.js"],
};

export const swaggerSpec = swaggerJsdoc(options);
