import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';

export const TicketLabel = ({ ticket }) => {
    if (!ticket) {
        return (
            <div className="p-10 text-center font-bold">Loading Ticket...</div>
        );
    }

    const ticketId = ticket.id || '???';
    const ticketUrl = `${window.location.origin}/ticket/${ticketId}`;

    return (
        <div className="print-wrapper">
            <style type="text/css" media="print">
                {`
          /* 1. RESET THE PAGE */
          @page {
            margin: 0; /* Kill default browser margins */
            size: auto; /* Adapt to whatever paper is selected */
          }
          
          body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            width: 100%;
            overflow: hidden; /* STRICTLY prevent a second page */
          }

          /* 2. MAKE CONTAINER FILL THE PAGE */
          .print-wrapper {
            width: 100vw;  /* Full Width of paper */
            height: 100vh; /* Full Height of paper */
            padding: 5vmin; /* Dynamic padding based on size */
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between; /* Space items evenly */
            font-family: sans-serif;
            background: white;
          }

          /* 3. DYNAMIC TEXT SIZES (Using 'vmin' scales text with paper size) */
          .header { 
            text-align: center; 
            border-bottom: 2px solid black; 
            width: 100%; 
            padding-bottom: 1vmin; 
            margin-bottom: 2vmin; 
          }
          
          .title { 
            font-size: 8vmin; /* Huge on big paper, small on labels */
            font-weight: 900; 
            margin: 0; 
            line-height: 1;
          }
          
          .subtitle { 
            font-size: 3.5vmin; 
            margin: 0.5vmin 0 0; 
          }
          
          .details { 
            width: 100%; 
            border-top: 2px solid black; 
            padding-top: 2vmin; 
            flex-grow: 0;
          }
          
          .row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 1vmin; 
            font-size: 4vmin; 
            font-weight: bold; 
          }

          .model-container {
            text-align: center;
            margin: 2vmin 0;
          }

          .model { 
            font-size: 6vmin; 
            font-weight: 900; 
            text-transform: uppercase; 
            line-height: 1.1;
          }

          /* QR Code Container - Flex Grow to take available space */
          .qr-section { 
            flex-grow: 1; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            width: 100%;
            padding: 2vmin;
          }
          
          .footer { 
            font-size: 3vmin; 
            text-align: center; 
          }
        `}
            </style>

            {/* --- CONTENT --- */}
            <div className="header">
                <h1 className="title">TICKET #{ticketId}</h1>
                <p className="subtitle">{format(new Date(), 'MMM dd, yyyy h:mm a')}</p>
            </div>

            <div className="details">
                <div className="row">
                    <span>CUST:</span>
                    <span>{ticket.customer_name || 'Unknown'}</span>
                </div>
                <div className="row">
                    <span>PH:</span>
                    <span>{ticket.phone || 'N/A'}</span>
                </div>
            </div>

            <div className="model-container">
                <div className="model">{ticket.brand || ''}</div>
                <div className="model">{ticket.model || ''}</div>
            </div>

            <div className="qr-section">
                {/* QR Code scales to 60% of the smallest side of the paper */}
                <QRCodeSVG value={ticketUrl} size={null} style={{ width: '50vmin', height: '50vmin' }} level={"H"} />
            </div>

            <div className="footer">
                <p>Scan to view status or update ticket</p>
                <p style={{ fontWeight: 'bold' }}>REPAIR SHOP POS</p>
            </div>
        </div>
    );
};