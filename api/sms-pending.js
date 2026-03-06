import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') return res.status(200).end();

    const secret = req.query.secret || req.body.secret;
    if (secret !== process.env.SMS_SECRET_KEY) return res.status(401).json({ error: 'Unauthorized' });

    try {
        // Grab the oldest message that hasn't been sent yet
        const { data, error } = await supabase
            .from('global_sms')
            .select('*')
            .eq('direction', 'outbound')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        // If there is a message, return it to the phone. Otherwise, return null.
        return res.status(200).json({ message: data || null });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}