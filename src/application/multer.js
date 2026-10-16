import multer from "multer";
import fs from 'fs';
import { responseError } from "../error/response-error.js";
import path from "path";
import { fileURLToPath } from 'url';
import crypto from "crypto"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDirInvoice = path.join(__dirname, '../../assets/invoice');

if(!fs.existsSync(uploadDirInvoice)){
    fs.mkdirSync(uploadDirInvoice, {recursive : true});  
}

const storage = multer.diskStorage({
    destination : (req,file,cb) => {
        cb(null, uploadDirInvoice)
    }, filename : (req, file, cb) => {
        const extension = path.extname(file.originalname);
        cb(null, crypto.randomBytes(32).toString('hex') + extension);
    }
});

const allowExt = (req,file,cb)=>{
    const allowMimes = ['application/pdf'];
    if(allowMimes.includes(file.mimetype)){
        cb(null, true);
    } else{
        cb(new responseError(400, "wrong extension"));
    }
}

export const uploadInvoice = multer({
    storage,
    limits : {
        fileSize : 2 * 1024 * 1024
    }, fileFilter : allowExt
});