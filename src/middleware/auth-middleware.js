
import jwt from 'jsonwebtoken'
import { responseError } from '../error/response-error.js';

export const authMiddleware = async(req,res,next)=>{
    const cookie = req.cookies.access_token;

    if(!cookie) {
        return res.status(403).json({
            errors : "JWT not valid!"
        })
    }

    try {
        const tokenDecrypt = jwt.verify(cookie, process.env.ACCESS_TOKEN_SECRET);
        req.user = tokenDecrypt;
        req.user.access_token = cookie;
        next();
    } catch (e) {
        console.log(e);
        return res.status(403).json({
            errors : "JWT Not Valid!"
        });
    }

    
}

export const roleMiddleware = (roleAllowed = []) =>{
    return (req,res,next)=>{
        const role = req.user.role;
        if(!roleAllowed.includes(role)){
            throw new responseError(403 , "Unathorized!");
        }
        next();
    }
}