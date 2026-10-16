import userService from "../service/user-service.js";

const createCredentialC = async(req, res, next) => {
    try {
        const result = await userService.createCredential(req.body);
        res.status(200).json({
            data : result
        });
    } catch (e) {
        next(e);        
    }
}

const loginC = async(req, res, next)=> {
    try {
        const result = await userService.login(req.body);

        res.cookie("access_token", result.token_access, {
            httpOnly : true,
            secure : false,
            sameSite: 'lax',
            maxAge : 60 * 60 * 1000,
            path : "/"
        });

        res.status(200).json({
            data: result
        })
    } catch (e) {
        next(e);        
    }
}

export default{
    createCredentialC,
    loginC
}