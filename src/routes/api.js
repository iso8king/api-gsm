import express from "express";
import { uploadInvoice } from "../application/multer.js";
import { authMiddleware, roleMiddleware } from "../middleware/auth-middleware.js";
import invoiceController from "../controller/invoice-controller.js";

const invoiceRouter = express.Router();

invoiceRouter.post('/api/invoice/create', [authMiddleware, roleMiddleware(['admin']), uploadInvoice.single("pdf")], invoiceController.createInvoiceC)
invoiceRouter.get('/api/invoice/get', [authMiddleware], invoiceController.getInvoiceC);
invoiceRouter.get('/api/invoice/download/:id', [authMiddleware], invoiceController.getInvoicePdfC);
invoiceRouter.get('/api/invoice/get/all', [authMiddleware], invoiceController.getAllInvoiceC);
invoiceRouter.delete('/api/invoice/:id/delete', [authMiddleware, roleMiddleware(['admin'])], invoiceController.deleteInvoiceC);
invoiceRouter.patch('/api/invoice/:id/update', [authMiddleware, roleMiddleware(['admin']), uploadInvoice.single("pdf")], invoiceController.updateInvoiceC);

export {
    invoiceRouter
}