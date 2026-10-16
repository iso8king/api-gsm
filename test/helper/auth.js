import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prismaClient } from "../../src/application/database.js";

export const createTestUser = async ({
  username = "testuser",
  name = "Test User",
  email = "testuser@example.com",
  password = "password123",
  role = "admin",
} = {}) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prismaClient.user.create({
    data: {
      username,
      name,
      email,
      password: hashedPassword,
      role,
    },
  });

  const { password: _, ...safeUser } = user;
  const token = jwt.sign(safeUser, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1h",
  });

  return {
    user,
    token,
    cookie: `access_token=${token}`,
    rawPassword: password,
  };
};

export const createTestAdmin = async (overrides = {}) => {
  return createTestUser({
    username: "admin_test",
    name: "Admin Tester",
    email: "admin_test@example.com",
    role: "admin",
    ...overrides,
  });
};

export const createTestPartner = async (overrides = {}) => {
  return createTestUser({
    username: "partner_test",
    name: "Partner Tester",
    email: "partner_test@example.com",
    role: "partner",
    ...overrides,
  });
};
