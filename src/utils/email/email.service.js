import nodemailer from 'nodemailer';
import { resetPasswordTemplate , inviteCodeTemplate, orderStatusTemplate} from './email.template.js';

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || "smpt.gmail.com",
            port: process.env.SMTP_PORT ||  587,
            service: process.env.SMPT_SERVICE || "gmail" ,
            secure: true,
            auth: {
                user: process.env.SMTP_USER || "developer.xircular@gmail.com",
                pass: process.env.SMTP_PASS || "ruds shyk iuif rouz"
            },
            tls:{
                rejectUnauthorized: true
            }
        });
    }

    async sendResetPasswordEmail(email, otp, userName = '') {
        const mailOptions = {
            from: process.env.SMTP_USER || "developer.xircular@gmail.com",
            to: email,
            subject: 'Password Reset Request',
            html: resetPasswordTemplate(otp, userName)
        };

        const info = await this.transporter.sendMail(mailOptions);
        return info;
    }

    // Send Invite mail
    async sendInviteEmail(email, name, inviteCode , tokenExpiry) {
        const mailOptions = {
            from: process.env.SMTP_USER || "developer.xircular@gmail.com",
            to: email,
            subject: 'Welcome to Our Platform - Your Exclusive Invite ',
            html: inviteCodeTemplate(name, inviteCode, tokenExpiry)
        };

        const info = await this.transporter.sendMail(mailOptions);
        return info;
    }

    // Send Order status mail
    async sendOrderStatus(email, subject, message) {
        const mailOptions = {
            from: process.env.SMTP_USER || "developer.xircular@gmail.com",
            to: email,
            subject: subject,
            html: orderStatusTemplate(message)
        };

        const info = await this.transporter.sendMail(mailOptions);
        return info;
    }

}

export default EmailService;