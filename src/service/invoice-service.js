import { prismaClient } from "../application/database.js";
import { validate } from "../validation/validate.js";
import { responseError } from "../error/response-error.js";
import { createInvoiceValidation, getAllValidation, invoiceCodeValidation, updateInvoiceValidation } from "../validation/invoice-validation.js";
import { sendAccAndInvoice, sendInvoiceOnly } from "../application/mailer.js";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pdfDirInvoice = path.join(__dirname, '../../assets/invoice');

const generateBytes = (length) =>
    crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);

const createInvoice = async (payload, adminId) => {
    payload = validate(createInvoiceValidation, payload);

    try {
        return await prismaClient.$transaction(
            async (tx) => {
                let customer = await tx.user.findUnique({
                    where: { email: payload.email },
                    select: { id: true },
                });

                let credentials = null;

                if (!customer) {
                    const username = generateBytes(8);
                    const password = generateBytes(12);
                    const hashedPassword = await bcrypt.hash(password, 10);

                    customer = await tx.user.create({
                        data: {
                            email: payload.email,
                            username,
                            password: hashedPassword,
                            name: payload.customerName,
                            role: "partner",
                        },
                        select: { id: true },
                    });

                    credentials = { username, password };
                }

                const invoice = await tx.invoice.create({
                    data: {
                        ...payload,
                        createdById: adminId,
                        customerId: customer.id,
                    },
                });

                const invoiceCode = `${invoice.invoiceNumber}.${Math.trunc(Number(invoice.total))}`;;

                if (credentials) {
                    await sendAccAndInvoice(
                        payload.email,
                        credentials.username,
                        credentials.password,
                        invoiceCode
                    );
                } else {
                    await sendInvoiceOnly(payload.email, invoiceCode);
                }

                return invoice;
            },
            { timeout: 20000 } 
        );
    } catch (e) {
        if (e.code === "P2002") {
            throw new responseError(409, "Invoice number, email, or username already exists");
        }
        throw e;
    }
};

const getInvoice = async(searhQuery, user) => {
    searhQuery = validate(invoiceCodeValidation, searhQuery);

    const idx = searhQuery.lastIndexOf(".");

    if (idx === -1) throw new responseError(404, "Invoice code not valid!");

    const invoiceNumber = searhQuery.slice(0, idx);
    const nominal = Number(searhQuery.slice(idx + 1));

    if(!Number.isInteger(nominal)) throw new responseError(404, "Invoice code not valid!");

    const where = {
            invoiceNumber,
            total : {gte : nominal, lt : nominal + 1}
    }

    if(user.role !== "admin") where.customerId = user.id;


    const invoice = await prismaClient.invoice.findFirst({
        where, 
        include : {
            createdBy : {
                select : {
                    name : true
                }
            }
        }
    });

    if (!invoice) throw new responseError(404, "Invoice code not valid!");

    return invoice;
}

const getInvoicePdf = async (invoiceId, user) => {
    const invoice = await prismaClient.invoice.findUnique({
        where: { id: invoiceId },
        select: { invoiceNumber: true, pdf: true, customerId: true },
    });

    if (!invoice || (user.role !== "admin" && invoice.customerId !== user.id)) {
        throw new responseError(404, "Invoice not found!");
    }

    return invoice;
};

const deleteInvoice = async(invoiceId) => {
    const invoice = await prismaClient.invoice.count({
        where : { id : invoiceId }

    });

    if(!invoice) throw new responseError(404, "Invoice Not Valid!");

    await prismaClient.invoice.delete({
        where : {
            id : invoiceId
        }
    })
}

const getAllInvoice = async(payload) => {
    payload = validate(getAllValidation, payload);
    const skip = (payload.page - 1) * payload.size;

    const invoices = await prismaClient.invoice.findMany({
        include : {
            customer : {
                select : {
                    id : true,
                    name : true
                }
            }
        },
        take : payload.size,
        skip,
        orderBy : {
            createdAt : "desc"
        }
    });

    const totalItems = await prismaClient.invoice.count();

    return {
        paging : {
            page : payload.page,
            totalItems : totalItems,
            totalPage: Math.ceil(totalItems / payload.size),
        },
        data : invoices
    }
}

const updateInvoice = async (invoiceId, request) => {
    request.id = invoiceId;
    request = validate(updateInvoiceValidation, request);

    const invoice = await prismaClient.invoice.findUnique({
        where: { id: invoiceId },
    });
    if (!invoice) throw new responseError(404, "Invoice not found!");

    const data = {};
    const fields = ["invoiceNumber", "customerName", "email", "total", "issueDate", "status", "pdf"];

    for (const f of fields) {
        if (request[f] !== undefined && request[f] !== "undefined") {
            data[f] = request[f];
        }
    }

    const emailChanged = data.email !== undefined && data.email !== invoice.email;
    if (!emailChanged) delete data.email;

    if (Object.keys(data).length === 0) {
        throw new responseError(400, "No data to update!");
    }

    let updated;
    try {
        updated = await prismaClient.$transaction(
            async (tx) => {
                let credentials = null;

                if (emailChanged) {
                    const username = generateBytes(8);
                    const password = generateBytes(12);
                    const hashedPassword = await bcrypt.hash(password, 10);

                    await tx.user.update({
                        where: { id: invoice.customerId },
                        data: {
                            email: data.email,
                            username,
                            password: hashedPassword,
                            name: data.customerName ?? invoice.customerName,
                        },
                    });

                    credentials = { username, password };
                }

                const result = await tx.invoice.update({
                    where: { id: invoiceId },
                    data,
                });

                if (credentials) {
                    const kodeInvoice = `${result.invoiceNumber}.${Math.trunc(Number(result.total))}`;
                    await sendAccAndInvoice(
                        result.email,
                        credentials.username,
                        credentials.password,
                        kodeInvoice
                    );
                }

                return result;
            },
            { timeout: 20000 }
        );
    } catch (e) {
        if (e.code === "P2002") {
            throw new responseError(409, "Invoice number, email, or username already exists");
        }
        throw e;
    }

    if (data.pdf && data.pdf !== invoice.pdf) {
        fs.unlink(path.join(pdfDirInvoice, path.basename(invoice.pdf)), () => {});
    }

    return updated;
};

export default { 
    createInvoice,
    getInvoice,
    getInvoicePdf,
    deleteInvoice,
    getAllInvoice,
    updateInvoice
}