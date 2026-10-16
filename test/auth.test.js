import supertest from "supertest";
import { web } from "../src/application/web.js";
import { clearDatabase, disconnectDatabase } from "./helper/db.js";
import { createTestUser } from "./helper/auth.js";

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  it("should successfully log in and return access_token in cookie and body", async () => {
    await createTestUser({
      username: "loginuser",
      password: "secretpassword",
      email: "loginuser@example.com",
      name: "Login User",
      role: "admin",
    });

    const res = await supertest(web)
      .post("/api/auth/login")
      .send({
        username: "loginuser",
        password: "secretpassword",
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.username).toBe("loginuser");
    expect(res.body.data.token_access).toBeDefined();

    // Verify Set-Cookie header contains access_token and HttpOnly
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    const tokenCookie = cookies.find((c) => c.startsWith("access_token="));
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie).toContain("HttpOnly");
  });

  it("should reject login when password is wrong", async () => {
    await createTestUser({
      username: "loginuser",
      password: "correctpassword",
    });

    const res = await supertest(web)
      .post("/api/auth/login")
      .send({
        username: "loginuser",
        password: "wrongpassword",
      });

    expect(res.status).toBe(401);
    expect(res.body.errors).toBe("Credentials Wrong!");
  });

  it("should reject login when user does not exist", async () => {
    const res = await supertest(web)
      .post("/api/auth/login")
      .send({
        username: "nonexistentuser",
        password: "anyPassword123",
      });

    expect(res.status).toBe(401);
    expect(res.body.errors).toBe("Credentials Wrong!");
  });

  it("should reject when username is missing", async () => {
    const res = await supertest(web)
      .post("/api/auth/login")
      .send({
        password: "somepassword",
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toContain('"username" is required');
  });

  it("should reject when password is missing", async () => {
    const res = await supertest(web)
      .post("/api/auth/login")
      .send({
        username: "someuser",
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toContain('"password" is required');
  });
});
