import { Resend } from 'resend';

// Initialize Resend with the key from environment variables
const resend = new Resend(process.env.VITE_RESEND_API_KEY);

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
        // 3. Send the Email via Resend
        const data = await resend.emails.send({
            from: 'Vacuum Shop <onboarding@resend.dev>', // Use this for testing. Later change to 'updates@yourdomain.com'
            to: [to], // In 'Testing Mode', this can ONLY be the email you signed up with.
            subject: subject,
            html: html,
        });

        response.status(200).json(data);
    } catch (error) {
        console.error(error);
        response.status(500).json({ error: error.message });
    }
}