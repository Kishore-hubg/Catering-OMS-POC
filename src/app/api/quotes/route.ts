import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/lib/services/OrderService';
import { getQuoteHTML } from '@/lib/services/QuoteService';

export const dynamic = 'force-dynamic';

const HTML_ERROR_PAGE = (message: string) => `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Quote</title><style>
  body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 480px; margin: 2rem auto; color: #333; }
  h1 { font-size: 1.25rem; color: #8B1A1A; }
  p { color: #666; line-height: 1.5; }
</style></head>
<body><h1>Quote could not be loaded</h1><p>${message}</p></body></html>`;

export async function GET(request: NextRequest) {
  const htmlHeaders = { 'Content-Type': 'text/html' };

  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return new NextResponse(HTML_ERROR_PAGE('Missing order ID. Please open this from an order page.'), {
        status: 400,
        headers: htmlHeaders,
      });
    }

    const order = await OrderService.getById(orderId);
    if (!order) {
      return new NextResponse(HTML_ERROR_PAGE('Order not found. It may have been deleted or the link is invalid.'), {
        status: 404,
        headers: htmlHeaders,
      });
    }

    const html = getQuoteHTML(order as unknown as Record<string, unknown>);
    return new NextResponse(html, { headers: htmlHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';
    console.error('Quote API error:', message, stack);
    const detail =
      process.env.NODE_ENV === 'development'
        ? ` (${message})`
        : '';
    return new NextResponse(
      HTML_ERROR_PAGE(
        `Something went wrong while generating the quote. Please try again later.${detail}`
      ),
      { status: 500, headers: htmlHeaders }
    );
  }
}
