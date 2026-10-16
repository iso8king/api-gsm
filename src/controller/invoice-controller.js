import { responseError } from "../error/response-error.js";
import invoiceService from "../service/invoice-service.js";

/**
 * @openapi
 * /api/invoice/create:
 *   post:
 *     summary: Buat invoice baru
 *     description: >
 *       Membuat invoice baru beserta file PDF (multipart/form-data).
 *       Jika email pelanggan belum terdaftar, otomatis dibuatkan akun (role `partner`)
 *       dan kredensial dikirim ke email pelanggan bersama kode invoice.
 *       Jika email sudah terdaftar, invoice langsung diasosiasikan ke akun yang ada
 *       dan hanya kode invoice yang dikirim ke email.
 *     tags: [Invoices]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [invoiceNumber, customerName, email, total, issueDate, pdf]
 *             properties:
 *               invoiceNumber:
 *                 type: string
 *                 example: INV-0003/0009
 *               customerName:
 *                 type: string
 *                 maxLength: 100
 *                 example: Budi Santoso
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 100
 *                 example: budi@example.com
 *               total:
 *                 type: number
 *                 format: double
 *                 example: 1500000
 *               issueDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-10-16
 *               status:
 *                 type: string
 *                 enum: [lunas, belum_lunas]
 *                 default: belum_lunas
 *               pdf:
 *                 type: string
 *                 format: binary
 *                 description: File PDF invoice.
 *     responses:
 *       200:
 *         description: Invoice berhasil dibuat. Jika akun pelanggan baru dibuat, kredensial dikirim via email.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/InvoiceResponse'
 *       400:
 *         description: Payload tidak valid (validasi Joi atau file PDF tidak ada).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Belum login / token tidak valid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Bukan admin (endpoint hanya untuk role admin).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Invoice number, email, atau username sudah ada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Kesalahan server.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
const createInvoiceC = async(req,res,next) => {
    try {
        const payload = req.body;
        payload.pdf = req.file.filename;
        const adminId = req.user.id;

        const result = await invoiceService.createInvoice(payload, adminId);
         res.status(200).json({
            data : result
        });
    } catch (e) {
        next(e);        
    }
}

export default{
    createInvoiceC
}