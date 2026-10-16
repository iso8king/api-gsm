import nodemailer from 'nodemailer'
import { responseError } from "../error/response-error.js";

export const sendAccAndInvoice = async (email, username, password, kode_invoice) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `PT GSM`,
      to: email,
      subject: "Akun dan Invoice",
      html: `
        <h3>Halo!</h3>
        <p>Berikut adalah kredensial untuk login ke https://example.com</p>
        <h5>username : ${username}</h5>
        <h5>Password : ${password}</h5>

        <hr> <br>
        <p> Dan Anda memiliki Invoice yang bisa dilihat di web kami dengan kode:
        </p>

        <h5>${kode_invoice}</h5>
         `,
    });
  } catch (e) {
    console.log(e.message);
    throw new responseError(500, "Gagal Send email , silahkan cek log server");
  }
};

export const sendInvoiceOnly = async (email, kode_invoice) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `PT GSM`,
      to: email,
      subject: "Invoice Terbit",
      html: `
        <h3>Halo!</h3>
        <p> Anda memiliki Invoice yang bisa dilihat di web kami dengan kode:
        </p>

        <h5>${kode_invoice}</h5>
         `,
    });
  } catch (e) {
    console.log(e.message);
    throw new responseError(500, "Gagal Send email , silahkan cek log server");
  }
};

