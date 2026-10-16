import userService from "../service/user-service.js";

/**
 * @openapi
 * /api/users/create:
 *   post:
 *     summary: Registrasi user baru
 *     description: Membuat user/credential baru. Password akan di-hash dengan bcrypt sebelum disimpan.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *     responses:
 *       '200':
 *         description: User berhasil dibuat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/UserResponse'
 *       '400':
 *         description: Validasi gagal (body tidak sesuai skema Joi)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: Error server (mis. username/email sudah dipakai)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     description: >
 *       Memverifikasi username & password, lalu mengembalikan data user beserta JWT.
 *       Token juga diset sebagai httpOnly cookie `access_token` (berlaku 1 jam),
 *       sehingga client tidak perlu menyimpan token secara manual.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       '200':
 *         description: Login berhasil. Cookie `access_token` (httpOnly) ikut diset.
 *         headers:
 *           Set-Cookie:
 *             description: access_token={JWT}; HttpOnly; Path=/; Max-Age=3600; SameSite=Lax
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/LoginResponse'
 *       '400':
 *         description: Validasi gagal
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Username atau password salah
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: Error server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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