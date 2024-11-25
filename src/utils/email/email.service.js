import nodemailer from 'nodemailer';
import { resetPasswordTemplate } from './email.template.js';

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            service: process.env.SMPT_SERVICE,
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            tls:{
                rejectUnauthorized: true
            }
        });
    }

    async sendResetPasswordEmail(email, otp, userName = '') {
        try {
            const mailOptions = {
                from: process.env.SMTP_USER,
                to: email,
                subject: 'Password Reset Request',
                html: resetPasswordTemplate(otp, userName)
            };

            const info = await this.transporter.sendMail(mailOptions);
            return info;
        } catch (error) {
            console.error('Email sending failed:', error);
        }
    }

    // Add other email methods here (verification, welcome emails, etc.)
}

export default EmailService;