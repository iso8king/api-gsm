import { responseError } from "../error/response-error.js";
import invoiceService from "../service/invoice-service.js";
import { fileURLToPath } from 'url';
import path from "path";
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pdfDirInvoice = path.join(__dirname, '../../assets/invoice');


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

/**
 * @openapi
 * /api/invoice/get:
 *   get:
 *     summary: Verifikasi kode invoice
 *     description: >
 *       Memverifikasi kode pembayaran invoice (format: `{invoiceNumber}.{nominal}`,
 *       contoh: `INV-0003/0009.1500000`). Invoice hanya dikembalikan jika
 *       invoiceNumber cocok, nominal cocok dengan total, DAN invoice tersebut
 *       milik user yang sedang login. Berguna untuk memvalidasi kode pembayaran
 *       yang dikirim ke email pelanggan.
 *     tags: [Invoices]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         required: true
 *         schema:
 *           type: string
 *         description: Kode invoice, format `{invoiceNumber}.{nominal}`.
 *         example: INV-0003/0009.1500000
 *     responses:
 *       200:
 *         description: Kode invoice valid. Data invoice dikembalikan beserta nama petugas pembuat.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/InvoiceResponse'
 *                     - type: object
 *                       properties:
 *                         createdBy:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                               example: Ridho Firdaus
 *       400:
 *         description: Parameter `search` tidak ada / tidak valid.
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
 *       404:
 *         description: "Invoice code not valid! — format kode salah, nominal tidak cocok, atau invoice bukan milik user ini."
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
const getInvoiceC = async(req,res,next) => {
    try {
        const id_user = req.user.id;
        const result = await invoiceService.getInvoice(req.query.search, id_user);

        res.status(200).json({
            data : result
        })
    } catch (e) {
        next(e);        
    }
}

/**
 * @openapi
 * /api/invoice/download/{id}:
 *   get:
 *     summary: Download PDF invoice
 *     description: >
 *       Mengunduh file PDF invoice berdasarkan ID. Admin dapat mengunduh invoice milik siapa saja,
 *       sedangkan partner hanya bisa mengunduh invoice miliknya sendiri (selain itu dianggap tidak ada).
 *       Respons sukses berupa file PDF (attachment) dengan nama `invoice-{invoiceNumber}.pdf`.
 *     tags: [Invoices]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID invoice.
 *         example: clxxxxxxx
 *     responses:
 *       200:
 *         description: File PDF invoice (attachment download).
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Belum login / token tidak valid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: "Invoice not found! / File not found! — ID tidak ada, bukan milik user (bukan admin), atau file PDF hilang dari storage."
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
const getInvoicePdfC = async(req,res,next) => {
    try {
        const invoice = await invoiceService.getInvoicePdf(req.params.id, req.user);

        const filePath = path.join(pdfDirInvoice, path.basename(invoice.pdf));

        if (!fs.existsSync(filePath)) {
            throw new responseError(404, "File not found!");
        }

        res.download(filePath, `invoice-${invoice.invoiceNumber}.pdf`);
    } catch (e) {
        next(e);        
    }
}

/**
 * @openapi
 * /api/invoice/{id}/delete:
 *   delete:
 *     summary: Hapus invoice
 *     description: Menghapus invoice berdasarkan ID. Hanya admin yang boleh menghapus.
 *     tags: [Invoices]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           maxLength: 36
 *         description: ID invoice yang akan dihapus.
 *         example: clxxxxxxx
 *     responses:
 *       200:
 *         description: Invoice berhasil dihapus.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: string
 *                   example: OK
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
 *       404:
 *         description: "Invoice Not Valid! — ID invoice tidak ditemukan."
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
const deleteInvoiceC = async(req,res,next) => {
    try {
        const result = await invoiceService.deleteInvoice(req.params.id);
        res.status(200).json({
            data : "OK"
        });
    } catch (e) {
        next(e);        
    }
}

/**
 * @openapi
 * /api/invoice/get/all:
 *   get:
 *     summary: Daftar semua invoice (paginated)
 *     description: >
 *       Mengambil daftar semua invoice dengan pagination, diurutkan dari yang terbaru
 *       (orderBy createdAt desc). Setiap item disertai data akun pelanggan (id & name).
 *     tags: [Invoices]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: size
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *     responses:
 *       200:
 *         description: Daftar invoice beserta info pagination.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InvoicePagingResponse'
 *       400:
 *         description: Query pagination tidak valid (mis. page < 1 atau size > 100).
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
 *       500:
 *         description: Kesalahan server.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
const getAllInvoiceC = async(req,res,next) => {
    try {
        const pagingConfig = {};
        pagingConfig.size = req.query.size;
        pagingConfig.page = req.query.page;
        const result = await invoiceService.getAllInvoice(pagingConfig);
        res.status(200).json({
            data : result
        });
    } catch (e) {
        next(e);        
    }
}

/**
 * @openapi
 * /api/invoice/{id}/update:
 *   patch:
 *     summary: Update invoice
 *     description: >
 *       Mengubah sebagian atau seluruh data invoice. Semua field opsional — hanya field
 *       yang dikirim yang diubah. Upload file PDF (multipart/form-data) opsional;
 *       jika di-upload, file lama otomatis dihapus dari storage.
 *       PERILAKU KHUSUS: jika field `email` diubah ke email yang berbeda, kredensial
 *       akun pelanggan di-reset (username & password baru digenerate) dan dikirim ke email baru.
 *     tags: [Invoices]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID invoice yang akan diubah.
 *         example: clxxxxxxx
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               invoiceNumber:
 *                 type: string
 *                 example: INV-0003/0010
 *               customerName:
 *                 type: string
 *                 maxLength: 100
 *                 example: Budi Santoso
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 100
 *                 description: Jika berubah, kredensial akun pelanggan di-reset & dikirim ke email baru.
 *                 example: budi-baru@example.com
 *               total:
 *                 type: number
 *                 format: double
 *                 example: 1750000
 *               issueDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-10-17
 *               status:
 *                 type: string
 *                 enum: [lunas, belum_lunas]
 *               pdf:
 *                 type: string
 *                 format: binary
 *                 description: File PDF baru (opsional). PDF lama akan dihapus.
 *     responses:
 *       200:
 *         description: Invoice berhasil diperbarui.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/InvoiceResponse'
 *       400:
 *         description: "Tidak ada data untuk diupdate / payload tidak valid (validasi Joi)."
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
 *       404:
 *         description: "Invoice not found! — ID invoice tidak ditemukan."
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
const updateInvoiceC = async(req,res,next) => {
    try {
        const request = req.body;
        if(req.file) request.pdf = req.file.filename;
        const result = await invoiceService.updateInvoice(req.params.id, request);
        res.status(200).json({ data: result }); 
    } catch (e) {
        next(e);        
    }
}

export default{
    createInvoiceC,
    getInvoiceC,
    getInvoicePdfC,
    deleteInvoiceC,
    getAllInvoiceC,
    updateInvoiceC
}