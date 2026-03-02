import nodemailer from 'nodemailer';

export default async function handler(request, response) {
    // 1. Setup CORS (Allows your frontend to talk to this backend)
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle browser "pre-flight" check
    if (request.method === 'OPTIONS') {
        response.status(200).end();
        return;
    }

    // 2. Extract Data from the Frontend Request
    const { to, subject, html } = request.body;

    try {
        // 3. Configure the Gmail Transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD
            }
        });

        // 4. Send the Email
        const info = await transporter.sendMail({
            from: `"University Vac & Sew" <${process.env.EMAIL_USER}>`,
            to: to, // Now you can send to ANY email address!
            subject: subject,
            html: html,
        });

        response.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error("Email Error:", error);
        response.status(500).json({ error: error.message });
    }
}