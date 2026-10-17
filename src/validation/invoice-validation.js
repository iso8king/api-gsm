import Joi from 'joi'

export const createInvoiceValidation = Joi.object({
    invoiceNumber : Joi.string().required(),
    customerName : Joi.string().max(100).required(),
    email : Joi.string().email().max(100).required(),
    total : Joi.number().positive().precision(2).required(),
    issueDate : Joi.date().required(),
    status : Joi.string().valid("lunas", "belum_lunas").default("belum_lunas"),
    pdf : Joi.string().required()
});

export const deleteInvoiceValidation = Joi.string().max(36).required();

export const invoiceCodeValidation = Joi.string().required();
export const getAllValidation = Joi.object({
    page : Joi.number().min(1).positive().default(1),
    size : Joi.number().min(1).max(100).default(10)
});

export const updateInvoiceValidation = Joi.object({
    id: Joi.string().required(),
    invoiceNumber: Joi.string().optional(),
    customerName: Joi.string().max(100).optional(),
    email: Joi.string().email().max(100).optional(),
    total: Joi.number().positive().precision(2).optional(),
    issueDate: Joi.date().optional(),
    status: Joi.string().valid("lunas", "belum_lunas").optional(),
    pdf: Joi.string().optional(),
});