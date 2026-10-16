import express from "express"
import userController from "../controller/user-controller.js";

const publicRouter = express.Router();

publicRouter.post("/api/users/create", userController.createCredentialC);
publicRouter.post('/api/auth/login', userController.loginC);

export{
    publicRouter
}