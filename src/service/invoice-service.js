import { prismaClient } from "../application/database.js";
import { validate } from "../validation/validate.js";
import { responseError } from "../error/response-error.js";
import { createInvoiceValidation, invoiceCodeValidation } from "../validation/invoice-validation.js";
import { sendAccAndInvoice, sendInvoiceOnly } from "../application/mailer.js";
import crypto from "crypto";
import bcrypt from "bcrypt";

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

const getInvoice = async(searhQuery, id_user) => {
    searhQuery = validate(invoiceCodeValidation, searhQuery);

    const idx = searhQuery.lastIndexOf(".");

    if (idx === -1) throw new responseError(404, "Invoice code not valid!");

    const invoiceNumber = searhQuery.slice(0, idx);
    const nominal = Number(searhQuery.slice(idx + 1));

    if(!Number.isInteger(nominal)) throw new responseError(404, "Invoice code not valid!");

    const invoice = await prismaClient.invoice.findFirst({
        where : {
            invoiceNumber,
            customerId : id_user,
            total : {gte : nominal, lt : nominal + 1}
        }, include : {
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

export default { 
    createInvoice,
    getInvoice,
    getInvoicePdf
}