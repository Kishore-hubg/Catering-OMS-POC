import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/lib/services/OrderService';

/**
 * POST /api/whatsapp
 * Send quote link via WhatsApp using Twilio WhatsApp Sandbox or Business API.
 *
 * Required .env configuration:
 *   TWILIO_ACCOUNT_SID  - From https://console.twilio.com
 *   TWILIO_AUTH_TOKEN   - From Twilio console
 *   TWILIO_WHATSAPP_FROM - WhatsApp sender, e.g. whatsapp:+14155238886 (sandbox) or whatsapp:+1234567890 (your number)
 *   NEXT_PUBLIC_APP_URL - App base URL for the quote link (e.g. https://yourapp.com)
 *
 * To enable WhatsApp Sandbox (testing):
 *   1. Go to https://console.twilio.com → Messaging → Try it out → Send a WhatsApp message
 *   2. Join the sandbox by sending the code to the Twilio number
 *   3. Use the sandbox "From" number as TWILIO_WHATSAPP_FROM (e.g. whatsapp:+14155238886)
 *
 * For production: Use Twilio WhatsApp Business API with your approved business number.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const orderId = body.orderId as string | undefined;
    const to = (body.to as string | undefined)?.trim();

    if (!orderId || !to) {
      return NextResponse.json(
        { success: false, error: 'orderId and to (WhatsApp number) are required' },
        { status: 400 }
      );
    }

    const order = await OrderService.getById(orderId);
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (!accountSid || !authToken || !from) {
      return NextResponse.json(
        {
          success: false,
          error:
            'WhatsApp is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM to .env. See README for setup.',
        },
        { status: 503 }
      );
    }

    // Normalize "to": ensure whatsapp: prefix and country code (e.g. +1 for US)
    const toNumber = to.startsWith('+') ? to : `+1${to.replace(/\D/g, '')}`;
    const toWhatsApp = toNumber.startsWith('whatsapp:') ? toNumber : `whatsapp:${toNumber}`;

    const quoteUrl = `${appUrl.replace(/\/$/, '')}/api/quotes?orderId=${orderId}`;
    const orderNumber = (order as { orderNumber?: string }).orderNumber ?? orderId;
    const messageBody = `Hi! Here is your Nidhi Catering quote (Order ${orderNumber}). View or download your quote: ${quoteUrl}. Thank you!`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const params = new URLSearchParams();
    params.set('To', toWhatsApp);
    params.set('From', from.startsWith('whatsapp:') ? from : `whatsapp:${from}`);
    params.set('Body', messageBody);

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      },
      body: params.toString(),
    });

    const twilioData = await twilioRes.json();

    if (!twilioRes.ok) {
      const errMsg = twilioData?.message || twilioRes.statusText;
      return NextResponse.json(
        { success: false, error: `WhatsApp send failed: ${errMsg}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('WhatsApp API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send WhatsApp message' },
      { status: 500 }
    );
  }
}
