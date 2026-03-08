import nodemailer from 'nodemailer';
import { checkRateLimit } from '@/lib/redis';
import { OrderService } from '@/lib/services/OrderService';
import { getQuoteHTML, getQuotePDFBuffer } from '@/lib/services/QuoteService';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export class EmailService {
  /** Uses GROQ_API_KEY from .env for AI-generated quote email subject and body. */
  static async composeWithAI(orderData: {
    orderNumber: string;
    customerName: string;
    eventDate: string;
    eventType?: string;
    total: number;
    itemCount: number;
  }): Promise<{ subject: string; body: string }> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return this.composeDefault(orderData);
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-70b-versatile',
          max_tokens: 500,
          temperature: 0.4,
          messages: [
            {
              role: 'system',
              content:
                'You are a professional email composer for Nidhi Catering, an Indian catering business in Dallas, TX. Write warm, professional quote emails. Always respond with STRICT JSON: {"subject": "...", "body": "..."}. The body must be plain text with line breaks, no markdown.',
            },
            {
              role: 'user',
              content: `Compose a quote email for:
- Order: ${orderData.orderNumber}
- Customer: ${orderData.customerName}
- Event Date: ${orderData.eventDate}
- Event Type: ${orderData.eventType || 'Event'}
- Total: $${orderData.total.toFixed(2)}
- Items: ${orderData.itemCount} items

The email should: thank them for choosing Nidhi Catering, reference the attached quote PDF, mention they can contact us for any changes, and sign off warmly.`,
            },
          ],
        }),
      });

      if (!response.ok) {
        return this.composeDefault(orderData);
      }

      const data = await response.json();
      const text: string = data.choices?.[0]?.message?.content || '';
      const clean = text.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return this.composeDefault(orderData);
    }
  }

  static composeDefault(orderData: {
    orderNumber: string;
    customerName: string;
    eventDate: string;
    eventType?: string;
    total: number;
  }): { subject: string; body: string } {
    return {
      subject: `Nidhi Catering - Quote ${orderData.orderNumber} for Your ${orderData.eventType || 'Event'}`,
      body: `Dear ${orderData.customerName},

Thank you for choosing Nidhi Catering for your upcoming ${orderData.eventType || 'event'} on ${orderData.eventDate}.

Please find attached the detailed quote (${orderData.orderNumber}) totaling $${orderData.total.toFixed(2)}.

If you have any questions or would like to make changes to your order, please don't hesitate to reach out. We're happy to customize the menu to your preferences.

We look forward to making your event special!

Warm regards,
Nidhi Catering
Dallas, TX
`,
    };
  }

  static async send(options: {
    to: string;
    subject: string;
    body: string;
    orderId: string;
    attachQuote?: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    // Rate limit check - prevent duplicate sends
    const allowed = await checkRateLimit(`email:order:${options.orderId}`, 60);
    if (!allowed) {
      return {
        success: false,
        error: 'Email was already sent recently. Please wait 60 seconds before resending.',
      };
    }

    try {
      const attachments: { filename: string; content: Buffer }[] = [];

      if (options.attachQuote) {
        const order = await OrderService.getById(options.orderId);
        if (order) {
          const orderNumber = String((order as { orderNumber?: string }).orderNumber ?? 'Quote');
          try {
            const pdfBuffer = await getQuotePDFBuffer(order as unknown as Record<string, unknown>);
            attachments.push({
              filename: `Nidhi-Catering-Quote-${orderNumber}.pdf`,
              content: pdfBuffer,
            });
          } catch (pdfError) {
            console.warn('Quote PDF generation failed, attaching HTML:', pdfError);
            const quoteHTML = getQuoteHTML(order as unknown as Record<string, unknown>);
            attachments.push({
              filename: `Nidhi-Catering-Quote-${orderNumber}.html`,
              content: Buffer.from(quoteHTML, 'utf-8'),
            });
          }
        }
      }

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'Nidhi Catering <nidhi@example.com>',
        to: options.to,
        subject: options.subject,
        text: options.body,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      };
    }
  }
}
