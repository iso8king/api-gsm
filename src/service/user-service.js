import { prismaClient } from "../application/database.js";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { validate } from "../validation/validate.js";
import { responseError } from "../error/response-error.js";
import { createUserValidation, loginUserValidation } from "../validation/user-validation.js";

const generateJWT = (data, secret_token, duration) => {
    return jwt.sign(data, secret_token, { expiresIn : duration })
}

const createCredential = async(payload) => {
    payload = validate(createUserValidation, payload);

    payload.role  = payload.role.toLowerCase();
    payload.password = await bcrypt.hash(payload.password, 10);

    return prismaClient.user.create({
        data : payload
    });
}

const login = async(payload) => {
    payload = validate(loginUserValidation, payload);

    const user = await prismaClient.user.findUnique({
        where : {
            username : payload.username
        }
    });

    if (!user) throw new responseError(401, "Credentials Wrong!");

    const passwordCheck = await bcrypt.compare(payload.password, user.password);

    if(!passwordCheck) throw new responseError(401, "Credentials Wrong!");

    const {password, ...safeUser} = user;

    const tokenAccess = generateJWT(safeUser, process.env.ACCESS_TOKEN_SECRET, "1h");
    safeUser.token_access = tokenAccess;

    return safeUser;
}

export default {
    createCredential,
    login
}