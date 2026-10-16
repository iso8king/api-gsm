import { prismaClient } from "../../src/application/database.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDirInvoice = path.join(__dirname, "../../assets/invoice");

export const clearDatabase = async () => {
  await prismaClient.invoice.deleteMany();
  await prismaClient.user.deleteMany();
};

export const clearUploads = () => {
  if (fs.existsSync(uploadDirInvoice)) {
    const files = fs.readdirSync(uploadDirInvoice);
    for (const file of files) {
      const filePath = path.join(uploadDirInvoice, file);
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      }
    }
  }
};

export const disconnectDatabase = async () => {
  await prismaClient.$disconnect();
};
