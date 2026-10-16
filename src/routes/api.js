import express from "express";
import { uploadInvoice } from "../application/multer.js";
import { authMiddleware, roleMiddleware } from "../middleware/auth-middleware.js";
import invoiceController from "../controller/invoice-controller.js";

const invoiceRouter = express.Router();

invoiceRouter.post('/api/invoice/create', [authMiddleware, roleMiddleware(['admin']), uploadInvoice.single("pdf")], invoiceController.createInvoiceC)

export {
    invoiceRouter
}