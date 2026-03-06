import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { secret, message_id } = req.body;
    if (secret !== process.env.SMS_SECRET_KEY) return res.status(401).json({ error: 'Unauthorized' });

    try {
        await supabase
            .from('global_sms')
            .update({ status: 'delivered' })
            .eq('id', message_id);

        return res.status(200).json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}