import { jest } from "@jest/globals";
import path from "path";
import { fileURLToPath } from "url";

const mockSendAccAndInvoice = jest.fn();
const mockSendInvoiceOnly = jest.fn();

jest.unstable_mockModule("../src/application/mailer.js", () => ({
  sendAccAndInvoice: mockSendAccAndInvoice,
  sendInvoiceOnly: mockSendInvoiceOnly,
}));

const { web } = await import("../src/application/web.js");
const supertest = (await import("supertest")).default;
const { clearDatabase, clearUploads, disconnectDatabase } = await import(
  "./helper/db.js"
);
const { createTestAdmin, createTestPartner } = await import(
  "./helper/auth.js"
);
const { prismaClient } = await import("../src/application/database.js");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const samplePdfPath = path.join(__dirname, "fixtures/sample.pdf");
const invalidFilePath = path.join(__dirname, "fixtures/invalid.txt");

describe("POST /api/invoice/create", () => {
  let adminAuth;

  beforeEach(async () => {
    await clearDatabase();
    clearUploads();
    mockSendAccAndInvoice.mockClear();
    mockSendInvoiceOnly.mockClear();

    adminAuth = await createTestAdmin();
  });

  afterAll(async () => {
    await clearDatabase();
    clearUploads();
    await disconnectDatabase();
  });

  it("should create invoice and new partner account when customer email does not exist", async () => {
    const res = await supertest(web)
      .post("/api/invoice/create")
      .set("Cookie", [adminAuth.cookie])
      .field("invoiceNumber", "INV-2026-0001")
      .field("customerName", "Budi Baru")
      .field("email", "budibaru@example.com")
      .field("total", 1500000)
      .field("issueDate", "2026-10-16T00:00:00.000Z")
      .field("status", "belum_lunas")
      .attach("pdf", samplePdfPath);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.invoiceNumber).toBe("INV-2026-0001");
    expect(res.body.data.email).toBe("budibaru@example.com");
    expect(res.body.data.createdById).toBe(adminAuth.user.id);

    // Verify new partner user was created
    const createdUser = await prismaClient.user.findUnique({
      where: { email: "budibaru@example.com" },
    });
    expect(createdUser).not.toBeNull();
    expect(createdUser.role).toBe("partner");
    expect(createdUser.name).toBe("Budi Baru");
    expect(res.body.data.customerId).toBe(createdUser.id);

    // Verify sendAccAndInvoice was called with generated credentials
    expect(mockSendAccAndInvoice).toHaveBeenCalledTimes(1);
    expect(mockSendAccAndInvoice).toHaveBeenCalledWith(
      "budibaru@example.com",
      expect.any(String),
      expect.any(String),
      "INV-2026-0001.1500000"
    );
    expect(mockSendInvoiceOnly).not.toHaveBeenCalled();
  });

  it("should create invoice and associate existing customer without creating new account", async () => {
    const existingCustomer = await createTestPartner({
      username: "existingpartner",
      email: "existing@example.com",
      name: "Existing Partner",
    });

    const res = await supertest(web)
      .post("/api/invoice/create")
      .set("Cookie", [adminAuth.cookie])
      .field("invoiceNumber", "INV-2026-0002")
      .field("customerName", "Existing Partner")
      .field("email", "existing@example.com")
      .field("total", 750000)
      .field("issueDate", "2026-10-16T00:00:00.000Z")
      .attach("pdf", samplePdfPath);

    expect(res.status).toBe(200);
    expect(res.body.data.customerId).toBe(existingCustomer.user.id);

    // Verify sendInvoiceOnly was called
    expect(mockSendInvoiceOnly).toHaveBeenCalledTimes(1);
    expect(mockSendInvoiceOnly).toHaveBeenCalledWith(
      "existing@example.com",
      "INV-2026-0002.750000"
    );
    expect(mockSendAccAndInvoice).not.toHaveBeenCalled();
  });

  it("should reject with 403 when no auth cookie is provided", async () => {
    const res = await supertest(web)
      .post("/api/invoice/create")
      .field("invoiceNumber", "INV-2026-0003")
      .field("customerName", "Budi Santoso")
      .field("email", "budi@example.com")
      .field("total", 500000)
      .field("issueDate", "2026-10-16T00:00:00.000Z")
      .attach("pdf", samplePdfPath);

    expect(res.status).toBe(403);
    expect(res.body.errors).toBe("JWT not valid!");
  });

  it("should reject with 403 when user does not have admin role", async () => {
    const partnerAuth = await createTestPartner();

    const res = await supertest(web)
      .post("/api/invoice/create")
      .set("Cookie", [partnerAuth.cookie])
      .field("invoiceNumber", "INV-2026-0004")
      .field("customerName", "Budi Santoso")
      .field("email", "budi@example.com")
      .field("total", 500000)
      .field("issueDate", "2026-10-16T00:00:00.000Z")
      .attach("pdf", samplePdfPath);

    expect(res.status).toBe(403);
    expect(res.body.errors).toBe("Unathorized!");
  });

  it("should reject with 400 when uploaded file is not a PDF", async () => {
    const res = await supertest(web)
      .post("/api/invoice/create")
      .set("Cookie", [adminAuth.cookie])
      .field("invoiceNumber", "INV-2026-0005")
      .field("customerName", "Budi Santoso")
      .field("email", "budi@example.com")
      .field("total", 500000)
      .field("issueDate", "2026-10-16T00:00:00.000Z")
      .attach("pdf", invalidFilePath);

    expect(res.status).toBe(400);
    expect(res.body.errors).toBe("wrong extension");
  });

  it("should reject with 409 when invoiceNumber already exists", async () => {
    // First invoice
    await supertest(web)
      .post("/api/invoice/create")
      .set("Cookie", [adminAuth.cookie])
      .field("invoiceNumber", "INV-DUPLICATE")
      .field("customerName", "Customer 1")
      .field("email", "customer1@example.com")
      .field("total", 100000)
      .field("issueDate", "2026-10-16T00:00:00.000Z")
      .attach("pdf", samplePdfPath);

    // Second invoice with same invoiceNumber
    const res = await supertest(web)
      .post("/api/invoice/create")
      .set("Cookie", [adminAuth.cookie])
      .field("invoiceNumber", "INV-DUPLICATE")
      .field("customerName", "Customer 2")
      .field("email", "customer2@example.com")
      .field("total", 200000)
      .field("issueDate", "2026-10-16T00:00:00.000Z")
      .attach("pdf", samplePdfPath);

    expect(res.status).toBe(409);
    expect(res.body.errors).toBe(
      "Invoice number, email, or username already exists"
    );
  });

  it("should reject with 400 when total is negative or not a valid number", async () => {
    const res = await supertest(web)
      .post("/api/invoice/create")
      .set("Cookie", [adminAuth.cookie])
      .field("invoiceNumber", "INV-2026-0006")
      .field("customerName", "Budi Santoso")
      .field("email", "budi@example.com")
      .field("total", -50000)
      .field("issueDate", "2026-10-16T00:00:00.000Z")
      .attach("pdf", samplePdfPath);

    expect(res.status).toBe(400);
    expect(res.body.errors).toContain('"total" must be a positive number');
  });

  it("should reject with 400 when required fields are missing", async () => {
    const res = await supertest(web)
      .post("/api/invoice/create")
      .set("Cookie", [adminAuth.cookie])
      .field("invoiceNumber", "INV-2026-0007")
      .attach("pdf", samplePdfPath);

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
});
