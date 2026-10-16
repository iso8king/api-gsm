import Joi from "joi";

export const createUserValidation = Joi.object({
    email : Joi.string().max(100).required().email(),
    username : Joi.string().max(100).required(),
    password : Joi.string().max(100).required(),
    name : Joi.string().max(100).required(),
    role : Joi.string().valid("admin", "partner").optional().default("partner")
})

export const loginUserValidation = Joi.object({
    username : Joi.string().max(100).required(),
    password : Joi.string().max(100).required()
})