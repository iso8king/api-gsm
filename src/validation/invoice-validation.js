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

export const invoiceCodeValidation = Joi.string().required();