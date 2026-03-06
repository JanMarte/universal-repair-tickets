import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { secret, phone, text } = req.body;

    // Security Check: Prevents hackers from spamming your inbox
    if (secret !== process.env.SMS_SECRET_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // 1. Save to the Global Inbox
        await supabase.from('global_sms').insert([{
            phone_number: phone,
            message_text: text,
            direction: 'inbound',
            is_read: false,
            status: 'delivered'
        }]);

        // 2. SMART ROUTING: Find active tickets for this phone number
        const { data: activeTickets } = await supabase
            .from('tickets')
            .select('id, brand, model')
            .eq('phone', phone)
            .neq('status', 'completed');

        if (activeTickets && activeTickets.length > 0) {
            // Duplicate the text into the active ticket's chat tab!
            const messagesToInsert = activeTickets.map(t => ({
                ticket_id: t.id,
                sender_name: 'Customer (via SMS)',
                // Add a warning if they have multiple devices in the shop
                message_text: activeTickets.length > 1
                    ? `⚠️ [Customer has multiple active repairs] \n\n${text}`
                    : text,
                is_internal: false
            }));
            await supabase.from('ticket_messages').insert(messagesToInsert);
        }

        return res.status(200).json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}