import supertest from "supertest";
import { web } from "../src/application/web.js";
import { clearDatabase, disconnectDatabase } from "./helper/db.js";
import { prismaClient } from "../src/application/database.js";
import bcrypt from "bcrypt";

describe("POST /api/users/create", () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  it("should successfully register a new user with default role partner", async () => {
    const res = await supertest(web)
      .post("/api/users/create")
      .send({
        email: "john@example.com",
        username: "johndoe",
        password: "secretpassword",
        name: "John Doe",
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.username).toBe("johndoe");
    expect(res.body.data.email).toBe("john@example.com");
    expect(res.body.data.name).toBe("John Doe");
    expect(res.body.data.role).toBe("partner");

    // Check password is encrypted with bcrypt
    const passwordMatch = await bcrypt.compare(
      "secretpassword",
      res.body.data.password
    );
    expect(passwordMatch).toBe(true);

    // Verify persisted in database
    const userInDb = await prismaClient.user.findUnique({
      where: { username: "johndoe" },
    });
    expect(userInDb).not.toBeNull();
  });

  it("should successfully register a user with role admin", async () => {
    const res = await supertest(web)
      .post("/api/users/create")
      .send({
        email: "admin@example.com",
        username: "adminuser",
        password: "adminpassword",
        name: "Admin Person",
        role: "admin",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe("admin");
  });

  it("should reject when payload is invalid (missing email)", async () => {
    const res = await supertest(web)
      .post("/api/users/create")
      .send({
        username: "baduser",
        password: "secretpassword",
        name: "Bad User",
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors).toContain('"email" is required');
  });

  it("should reject when email format is invalid", async () => {
    const res = await supertest(web)
      .post("/api/users/create")
      .send({
        email: "invalid-email",
        username: "baduser",
        password: "secretpassword",
        name: "Bad User",
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors).toContain('"email" must be a valid email');
  });

  it("should reject when role is not valid", async () => {
    const res = await supertest(web)
      .post("/api/users/create")
      .send({
        email: "valid@example.com",
        username: "baduser",
        password: "secretpassword",
        name: "Bad User",
        role: "superadmin",
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toContain('"role" must be one of [admin, partner]');
  });

  it("should reject when username or email is duplicated", async () => {
    // First registration
    await supertest(web)
      .post("/api/users/create")
      .send({
        email: "duplicate@example.com",
        username: "duplicateuser",
        password: "password123",
        name: "Duplicate User",
      });

    // Second registration with same username and email
    const res = await supertest(web)
      .post("/api/users/create")
      .send({
        email: "duplicate@example.com",
        username: "duplicateuser",
        password: "password123",
        name: "Duplicate User 2",
      });

    expect(res.status).toBe(500);
    expect(res.body.errors).toBeDefined();
  });
});
