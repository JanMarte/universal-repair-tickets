import React, { useEffect, useState, useRef } from 'react'; // Added useRef
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { TicketLabel } from '../components/TicketLabel';

export default function PrintLabel() {
    const { id } = useParams();
    const [ticket, setTicket] = useState(null);
    const printedRef = useRef(false); // FLAG: Tracks if we already printed

    useEffect(() => {
        const fetchTicket = async () => {
            const { data } = await supabase.from('tickets').select('*').eq('id', id).single();
            if (data) setTicket(data);
        };
        fetchTicket();
    }, [id]);

    useEffect(() => {
        if (ticket && !printedRef.current) {
            // Lock it so it doesn't fire again
            printedRef.current = true;

            setTimeout(() => {
                window.print();
                // window.close(); // Uncomment if you want it to close auto
            }, 500);
        }
    }, [ticket]);

    if (!ticket) return <div className="p-10 font-bold">Loading Label...</div>;

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100 p-0">

            {/* Helper bar (Hidden when printing) */}
            <div className="fixed top-0 left-0 w-full bg-indigo-600 text-white p-2 text-center print:hidden z-50 text-sm">
                Generating Label for Ticket #{ticket.id}... Check your print dialog.
            </div>

            {/* The Label Component */}
            <TicketLabel ticket={ticket} />
        </div>
    );
}