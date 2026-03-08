import { format } from 'date-fns';
import { PDFDocument, StandardFonts, rgb, RGB } from 'pdf-lib';

// Brand colors to match HTML letterhead (same table and logo format)
const COLORS = {
  orange: rgb(0.96, 0.64, 0),       // #F4A300
  navy: rgb(0.11, 0.16, 0.29),      // #1B2A4A
  white: rgb(1, 1, 1),
  text: rgb(0.11, 0.16, 0.29),      // #1B2A4A
  textMuted: rgb(0.4, 0.4, 0.45),
  border: rgb(0.93, 0.93, 0.93),
  cream: rgb(1, 0.99, 0.96),       // #FFFDF5
  creamBorder: rgb(1, 0.88, 0.51),  // #FFE082
  balanceBg: rgb(1, 0.97, 0.88),    // #FFF8E1
  green: rgb(0.22, 0.63, 0.41),     // balance due accent
} as const;

const formatCurrency = (n: number) => `$${n.toFixed(2)}`;

/** Truncate text to fit within maxWidth at given font size; append "..." if truncated. */
function truncateToWidth(
  text: string,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  size: number,
  maxWidth: number,
  ellipsis = '...'
): string {
  const full = String(text).trim();
  if (full.length === 0) return full;
  if (font.widthOfTextAtSize(full, size) <= maxWidth) return full;
  let lo = 0;
  let hi = full.length;
  while (lo < hi - 1) {
    const mid = Math.ceil((lo + hi) / 2);
    const sub = full.slice(0, mid) + ellipsis;
    if (font.widthOfTextAtSize(sub, size) <= maxWidth) lo = mid;
    else hi = mid;
  }
  const out = full.slice(0, lo) + ellipsis;
  return font.widthOfTextAtSize(out, size) <= maxWidth ? out : full.slice(0, Math.max(0, lo - 1)) + ellipsis;
}

/** Safe currency for unknown values (undefined, null, NaN). */
const safeFormatCurrency = (n: unknown): string => {
  const x = Number(n);
  return Number.isNaN(x) ? '$0.00' : `$${x.toFixed(2)}`;
};

const safeFormatDate = (value: unknown, pattern: string): string | null => {
  if (value === undefined || value === null) return null;
  try {
    const d = value instanceof Date ? value : new Date(value as string);
    if (Number.isNaN(d.getTime())) return null;
    return format(d, pattern);
  } catch {
    return null;
  }
};

/** Normalize order from DB (may have missing or different shapes). */
function normalizeOrderForQuote(order: Record<string, unknown>): {
  customer: { name: string; email: string; phone: string; address?: string };
  event: Record<string, unknown>;
  lineItems: Array<Record<string, unknown>>;
  orderNumber: string;
  subtotal: number;
  discount: number;
  discountType: string;
  tax: number;
  taxRate: number;
  deliveryFee: number;
  total: number;
  advancePayment: number;
  balanceDue: number;
  adminNotes?: string;
} {
  const rawCustomer = order.customer;
  const customer =
    rawCustomer && typeof rawCustomer === 'object' && !Array.isArray(rawCustomer)
      ? (rawCustomer as Record<string, unknown>)
      : {};
  const event = (order.event && typeof order.event === 'object' && !Array.isArray(order.event)
    ? order.event
    : {}) as Record<string, unknown>;
  const lineItems = Array.isArray(order.lineItems) ? order.lineItems : [];
  return {
    customer: {
      name: String(customer.name ?? '—'),
      email: String(customer.email ?? '—'),
      phone: String(customer.phone ?? '—'),
      address: customer.address != null ? String(customer.address) : undefined,
    },
    event,
    lineItems: lineItems.map((item) =>
      item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
    ),
    orderNumber: String(order.orderNumber ?? 'Quote'),
    subtotal: Number(order.subtotal) || 0,
    discount: Number(order.discount) || 0,
    discountType: String(order.discountType ?? 'flat'),
    tax: Number(order.tax) || 0,
    taxRate: Number(order.taxRate) || 0,
    deliveryFee: Number(order.deliveryFee) || 0,
    total: Number(order.total) || 0,
    advancePayment: Number(order.advancePayment) || 0,
    balanceDue: Number(order.balanceDue) || 0,
    adminNotes: order.adminNotes != null ? String(order.adminNotes) : undefined,
  };
}

/** Normalized order type for quote builders */
type NormalizedOrder = ReturnType<typeof normalizeOrderForQuote>;

// ─── Letterhead template (standard background). Only placeholders are dynamic. ───
const QUOTE_LETTERHEAD_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Quote {{QUOTE_ORDER_NUMBER}}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1B2A4A; margin: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 3px solid #F4A300; padding-bottom: 20px; }
    .logo-section h1 { color: #F4A300; margin: 0; font-size: 28px; line-height: 1.2; }
    .logo-section p { color: #666; margin: 6px 0 4px; font-size: 13px; line-height: 1.4; }
    .quote-badge { background: #1B2A4A; color: #F4A300; padding: 12px 20px; border-radius: 8px; text-align: right; }
    .quote-badge h2 { margin: 0; font-size: 14px; letter-spacing: 1px; color: #fff; }
    .quote-badge .number { font-size: 22px; font-weight: 700; margin-top: 4px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 30px; margin-top: 28px; }
    .info-box { background: #FFFDF5; border: 1px solid #FFE082; border-radius: 8px; padding: 18px 16px 16px; }
    .info-box h3 { color: #F4A300; margin: 0 0 10px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; padding-top: 4px; }
    .info-box p { margin: 3px 0; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead th { background: #1B2A4A; color: #fff; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th:first-child { border-radius: 6px 0 0 0; }
    thead th:last-child { border-radius: 0 6px 0 0; text-align: right; }
    .totals { margin-left: auto; width: 320px; }
    .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .totals .row.total { border-top: 2px solid #1B2A4A; margin-top: 8px; padding-top: 10px; font-size: 18px; font-weight: 700; color: #F4A300; }
    .totals .row.balance { background: #FFF8E1; padding: 8px 12px; border-radius: 6px; margin-top: 8px; font-weight: 600; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px; }
    .notes { background: #f9f9f9; border-left: 3px solid #F4A300; padding: 12px 16px; margin-bottom: 24px; font-size: 13px; color: #555; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-section">
      <h1>🪔 Nidhi Catering</h1>
      <p>Authentic Indian Catering · Dallas, TX</p>
      <p>Email: nidhi.catering@gmail.com</p>
    </div>
    <div class="quote-badge">
      <h2>QUOTE</h2>
      <div class="number">{{QUOTE_ORDER_NUMBER}}</div>
      <div style="color:#ccc;font-size:12px;margin-top:4px;">Date: {{QUOTE_DATE}}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h3>Customer Details</h3>
      {{QUOTE_BILL_TO}}
    </div>
    <div class="info-box">
      <h3>Event Details</h3>
      {{QUOTE_EVENT_DETAILS}}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px;">#</th>
        <th>Item</th>
        <th style="text-align:center;">Size</th>
        <th style="text-align:center;">Qty</th>
        <th style="text-align:right;">Price</th>
        <th style="text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      {{QUOTE_LINE_ITEMS}}
    </tbody>
  </table>

  {{QUOTE_NOTES}}

  <div class="totals">
    {{QUOTE_TOTALS}}
  </div>

  <div class="footer">
    <p>Thank you for choosing Nidhi Catering! This quote is valid for 7 days.</p>
    <p>Questions? Contact us at nidhi.catering@gmail.com</p>
  </div>
</body>
</html>`;

/** Build Bill To block (customer) for the letterhead */
function buildQuoteBillTo(o: NormalizedOrder): string {
  const { customer } = o;
  return `
      <p><strong>${customer.name}</strong></p>
      <p>${customer.email}</p>
      <p>${customer.phone}</p>
      ${customer.address ? `<p>${customer.address}</p>` : ''}`;
}

/** Build Event Details block for the letterhead */
function buildQuoteEventDetails(o: NormalizedOrder): string {
  const { event } = o;
  const eventDateLong = safeFormatDate(event.eventDate, 'EEEE, MMMM d, yyyy');
  const deliveryType = String(event.deliveryType ?? 'pickup');
  const deliveryLabel =
    deliveryType === 'delivery'
      ? 'Delivery'
      : deliveryType === 'pickup'
      ? 'Pickup'
      : 'Live Catering (On-site)';
  const showDeliveryAddress =
    (deliveryType === 'delivery' || deliveryType === 'live') &&
    event.deliveryAddress != null;
  return `
      <p><strong>Date:</strong> ${eventDateLong ?? '—'}</p>
      ${event.eventTime ? `<p><strong>Time:</strong> ${event.eventTime}</p>` : ''}
      ${event.eventType ? `<p><strong>Type:</strong> ${event.eventType}</p>` : ''}
      ${event.guestCount != null ? `<p><strong>Guests:</strong> ${event.guestCount}</p>` : ''}
      <p><strong>${deliveryLabel}</strong></p>
      ${showDeliveryAddress ? `<p>${event.deliveryAddress}</p>` : ''}`;
}

/** Build line items table rows for the letterhead (dynamic table content) */
function buildQuoteLineItemsTable(o: NormalizedOrder): string {
  return o.lineItems
    .map((item, i) => {
      const name = String(item.menuItemName ?? '—');
      const menuType = String(item.menuType ?? '');
      const category = String(item.category ?? '');
      const sizeOption = String(item.sizeOption ?? '');
      const qty = Number(item.quantity) || 0;
      const unit = String(item.unit ?? '');
      const unitPrice = Number(item.unitPrice) || 0;
      const lineTotal = Number(item.lineTotal) || 0;
      const isQuoteBased = Boolean(item.isQuoteBased);
      const notes = item.notes != null ? String(item.notes) : '';
      return `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#444;">${i + 1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">
        <strong>${name}</strong>
        <br/><span style="color:#888;font-size:12px;">${menuType} › ${category}</span>
        ${notes ? `<br/><span style="color:#666;font-size:11px;font-style:italic;">Note: ${notes}</span>` : ''}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${sizeOption}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${qty} ${unit}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${isQuoteBased ? 'TBD' : safeFormatCurrency(unitPrice)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${isQuoteBased ? 'Quote' : safeFormatCurrency(lineTotal)}</td>
    </tr>`;
    })
    .join('');
}

/** Build notes block (optional) */
function buildQuoteNotes(o: NormalizedOrder): string {
  if (!o.adminNotes) return '';
  return `<div class="notes"><strong>Notes:</strong> ${o.adminNotes}</div>`;
}

/** Build totals section for the letterhead */
function buildQuoteTotals(o: NormalizedOrder): string {
  const discountAmount =
    o.discount > 0 && o.discountType === 'percent'
      ? (o.subtotal * o.discount) / 100
      : o.discount;
  return `
    <div class="row"><span>Subtotal</span><span>${safeFormatCurrency(o.subtotal)}</span></div>
    ${o.discount > 0 ? `<div class="row"><span>Discount ${o.discountType === 'percent' ? `(${o.discount}%)` : ''}</span><span style="color:#e53e3e;">-${safeFormatCurrency(discountAmount)}</span></div>` : ''}
    <div class="row"><span>Tax (${o.taxRate}%)</span><span>${safeFormatCurrency(o.tax)}</span></div>
    ${o.deliveryFee > 0 ? `<div class="row"><span>Delivery Fee</span><span>${safeFormatCurrency(o.deliveryFee)}</span></div>` : ''}
    <div class="row total"><span>Total</span><span>${safeFormatCurrency(o.total)}</span></div>
    ${o.advancePayment > 0 ? `<div class="row"><span>Advance Paid</span><span style="color:#38a169;">-${safeFormatCurrency(o.advancePayment)}</span></div>` : ''}
    <div class="row balance"><span>Balance Due</span><span>${safeFormatCurrency(o.balanceDue)}</span></div>`;
}

/**
 * Generate quote HTML for an order (for PDF/view and email attachment).
 * Uses a fixed letterhead template and injects dynamic table + customer/event/totals.
 */
export function getQuoteHTML(order: Record<string, unknown>): string {
  const o = normalizeOrderForQuote(order);

  const replacements: Record<string, string> = {
    '{{QUOTE_ORDER_NUMBER}}': o.orderNumber,
    '{{QUOTE_DATE}}': format(new Date(), 'MMM d, yyyy'),
    '{{QUOTE_BILL_TO}}': buildQuoteBillTo(o),
    '{{QUOTE_EVENT_DETAILS}}': buildQuoteEventDetails(o),
    '{{QUOTE_LINE_ITEMS}}': buildQuoteLineItemsTable(o),
    '{{QUOTE_NOTES}}': buildQuoteNotes(o),
    '{{QUOTE_TOTALS}}': buildQuoteTotals(o),
  };

  let html = QUOTE_LETTERHEAD_TEMPLATE;
  for (const [placeholder, value] of Object.entries(replacements)) {
    html = html.split(placeholder).join(value);
  }
  return html;
}

/**
 * Generate quote as PDF buffer for email attachment.
 * Matches HTML letterhead: same logo/header, table columns (#, Item, Size, Qty, Price, Total), and totals block.
 */
export async function getQuotePDFBuffer(order: Record<string, unknown>): Promise<Buffer> {
  const o = normalizeOrderForQuote(order);
  const { customer, event, lineItems, orderNumber } = o;

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([595, 842]);
  const { width, height } = page.getSize();
  const left = 50;
  const right = width - 50;
  const tableWidth = right - left;
  const lineHeight = 12;
  const small = 9;

  // Table column positions: give Item and Size enough width to avoid truncation/overlap
  const col = {
    num: left,
    item: left + 30,
    size: left + 218,
    qty: left + 318,
    price: left + 368,
    total: right - 62,
  };
  const colWidths = {
    item: col.size - col.item - 6,
    size: col.qty - col.size - 6,
    qty: col.price - col.qty - 4,
  };

  let y = height - 45;

  // ─── Header (same as HTML): logo left, quote badge right ───
  page.drawText('Nidhi Catering', { x: left, y, size: 22, font: fontBold, color: COLORS.orange });
  y -= 26;
  page.drawText('Authentic Indian Catering · Dallas, TX', { x: left, y, size: 10, font, color: COLORS.textMuted });
  y -= 14;
  page.drawText('Email: nidhi.catering@gmail.com', { x: left, y, size: 10, font, color: COLORS.textMuted });
  y -= 14;

  const badgeRight = right;
  const badgeLeft = right - 110;
  const badgeTop = height - 42;
  const badgeH = 44;
  page.drawRectangle({
    x: badgeLeft,
    y: badgeTop - badgeH,
    width: badgeRight - badgeLeft,
    height: badgeH,
    color: COLORS.navy,
  });
  page.drawText('QUOTE', { x: badgeLeft + 8, y: badgeTop - 14, size: 10, font: fontBold, color: COLORS.white });
  page.drawText(orderNumber, { x: badgeLeft + 8, y: badgeTop - 28, size: 16, font: fontBold, color: COLORS.orange });
  page.drawText('Date: ' + format(new Date(), 'MMM d, yyyy'), { x: badgeLeft + 8, y: badgeTop - 40, size: 9, font, color: COLORS.textMuted });

  // Orange line under header: place clearly below email and quote badge (no overlap)
  y = height - 108;
  page.drawRectangle({
    x: left,
    y: y - 3,
    width: tableWidth,
    height: 3,
    color: COLORS.orange,
  });
  y -= 36; // extra space between line and Customer/Event boxes so headers don't feel cramped

  // ─── Info grid: Customer Details (left) and Event Details (right) ───
  const boxWidth = (tableWidth - 20) / 2;
  const boxHeight = 72;
  const boxY = y - boxHeight;

  page.drawRectangle({ x: left, y: boxY, width: boxWidth, height: boxHeight, color: COLORS.cream, borderColor: COLORS.creamBorder, borderWidth: 1 });
  page.drawRectangle({ x: left + boxWidth + 20, y: boxY, width: boxWidth, height: boxHeight, color: COLORS.cream, borderColor: COLORS.creamBorder, borderWidth: 1 });

  const boxPadTop = 14; // space between top of box and "CUSTOMER DETAILS" / "EVENT DETAILS"
  let yBox = y - boxPadTop;
  page.drawText('CUSTOMER DETAILS', { x: left + 10, y: yBox, size: 9, font: fontBold, color: COLORS.orange });
  yBox -= 11;
  page.drawText(customer.name, { x: left + 10, y: yBox, size: 10, font: fontBold, color: COLORS.text });
  yBox -= 11;
  page.drawText(customer.email + '  ·  ' + customer.phone, { x: left + 10, y: yBox, size: small, font, color: COLORS.text });
  if (customer.address) {
    yBox -= 10;
    page.drawText(String(customer.address).slice(0, 45), { x: left + 10, y: yBox, size: small, font, color: COLORS.text });
  }

  const eventDateLong = safeFormatDate(event.eventDate, 'EEEE, MMMM d, yyyy');
  const deliveryType = String(event.deliveryType ?? 'pickup');
  const deliveryLabel = deliveryType === 'delivery' ? 'Delivery' : deliveryType === 'pickup' ? 'Pickup' : 'Live Catering (On-site)';
  yBox = y - boxPadTop;
  page.drawText('EVENT DETAILS', { x: left + boxWidth + 30, y: yBox, size: 9, font: fontBold, color: COLORS.orange });
  yBox -= 11;
  page.drawText('Date: ' + (eventDateLong ?? '—'), { x: left + boxWidth + 30, y: yBox, size: small, font, color: COLORS.text });
  yBox -= 10;
  if (event.eventTime) {
    page.drawText('Time: ' + String(event.eventTime), { x: left + boxWidth + 30, y: yBox, size: small, font, color: COLORS.text });
    yBox -= 10;
  }
  if (event.eventType) {
    page.drawText('Type: ' + String(event.eventType), { x: left + boxWidth + 30, y: yBox, size: small, font, color: COLORS.text });
    yBox -= 10;
  }
  page.drawText(deliveryLabel, { x: left + boxWidth + 30, y: yBox, size: small, font: fontBold, color: COLORS.text });

  y = boxY - 20;

  // ─── Table (same as HTML: #, Item, Size, Qty, Price, Total) ───
  const headerRowHeight = 20;
  page.drawRectangle({
    x: left,
    y: y - headerRowHeight,
    width: tableWidth,
    height: headerRowHeight,
    color: COLORS.navy,
  });
  page.drawText('#', { x: col.num + 4, y: y - 14, size: 9, font: fontBold, color: COLORS.white });
  page.drawText('Item', { x: col.item, y: y - 14, size: 9, font: fontBold, color: COLORS.white });
  page.drawText('Size', { x: col.size + 4, y: y - 14, size: 9, font: fontBold, color: COLORS.white });
  page.drawText('Qty', { x: col.qty + 4, y: y - 14, size: 9, font: fontBold, color: COLORS.white });
  page.drawText('Price', { x: col.price, y: y - 14, size: 9, font: fontBold, color: COLORS.white });
  page.drawText('Total', { x: col.total, y: y - 14, size: 9, font: fontBold, color: COLORS.white });
  y -= headerRowHeight;

  const rowH = 16;
  for (let i = 0; i < lineItems.length; i++) {
    if (y < 180) break;
    const item = lineItems[i];
    const nameRaw = String(item.menuItemName ?? '—');
    const sizeOptionRaw = String(item.sizeOption ?? '');
    const name = truncateToWidth(nameRaw, font, small, colWidths.item);
    const sizeOption = truncateToWidth(sizeOptionRaw, font, small, colWidths.size);
    const qty = Number(item.quantity) || 0;
    const unit = String(item.unit ?? '').slice(0, 8);
    const isQuoteBased = Boolean(item.isQuoteBased);
    page.drawRectangle({ x: left, y: y - rowH, width: tableWidth, height: rowH, borderColor: COLORS.border, borderWidth: 0.5 });
    page.drawText(String(i + 1), { x: col.num + 4, y: y - 12, size: small, font, color: COLORS.text });
    page.drawText(name, { x: col.item + 2, y: y - 12, size: small, font, color: COLORS.text });
    page.drawText(sizeOption, { x: col.size + 2, y: y - 12, size: small, font, color: COLORS.text });
    page.drawText(String(qty) + (unit ? ' ' + unit : ''), { x: col.qty + 2, y: y - 12, size: small, font, color: COLORS.text });
    page.drawText(isQuoteBased ? 'TBD' : safeFormatCurrency(item.unitPrice), { x: col.price, y: y - 12, size: small, font, color: COLORS.text });
    page.drawText(isQuoteBased ? 'Quote' : safeFormatCurrency(item.lineTotal), { x: col.total, y: y - 12, size: small, font: fontBold, color: COLORS.green });
    y -= rowH;
  }
  y -= 16;

  // ─── Totals (match HTML) ───
  const totalsLeft = right - 180;
  page.drawText('Subtotal', { x: totalsLeft, y, size: 10, font, color: COLORS.text });
  page.drawText(safeFormatCurrency(o.subtotal), { x: col.total, y, size: 10, font, color: COLORS.text });
  y -= lineHeight;
  if (o.discount > 0) {
    const discountAmount = o.discountType === 'percent' ? (o.subtotal * o.discount) / 100 : o.discount;
    page.drawText('Discount' + (o.discountType === 'percent' ? ` (${o.discount}%)` : ''), { x: totalsLeft, y, size: 10, font, color: COLORS.text });
    page.drawText('-' + safeFormatCurrency(discountAmount), { x: col.total, y, size: 10, font, color: COLORS.text });
    y -= lineHeight;
  }
  page.drawText('Tax (' + o.taxRate + '%)', { x: totalsLeft, y, size: 10, font, color: COLORS.text });
  page.drawText(safeFormatCurrency(o.tax), { x: col.total, y, size: 10, font, color: COLORS.text });
  y -= lineHeight;
  if (o.deliveryFee > 0) {
    page.drawText('Delivery Fee', { x: totalsLeft, y, size: 10, font, color: COLORS.text });
    page.drawText(safeFormatCurrency(o.deliveryFee), { x: col.total, y, size: 10, font, color: COLORS.text });
    y -= lineHeight;
  }
  page.drawText('Total', { x: totalsLeft, y, size: 14, font: fontBold, color: COLORS.text });
  page.drawText(safeFormatCurrency(o.total), { x: col.total - 10, y, size: 14, font: fontBold, color: COLORS.orange });
  y -= lineHeight + 4;
  if (o.advancePayment > 0) {
    page.drawText('Advance Paid', { x: totalsLeft, y, size: 10, font, color: COLORS.text });
    page.drawText('-' + safeFormatCurrency(o.advancePayment), { x: col.total, y, size: 10, font, color: COLORS.green });
    y -= lineHeight;
  }
  page.drawRectangle({ x: totalsLeft - 8, y: y - 20, width: 175, height: 22, color: COLORS.balanceBg });
  page.drawText('Balance Due', { x: totalsLeft, y: y - 6, size: 10, font: fontBold, color: COLORS.text });
  page.drawText(safeFormatCurrency(o.balanceDue), { x: col.total, y: y - 6, size: 10, font: fontBold, color: COLORS.text });
  y -= 28;

  // ─── Footer (same as HTML) ───
  page.drawRectangle({ x: left, y: y, width: tableWidth, height: 1, color: COLORS.border });
  y -= 16;
  page.drawText('Thank you for choosing Nidhi Catering! This quote is valid for 7 days.', { x: left, y, size: small, font, color: COLORS.textMuted });
  y -= 10;
  page.drawText('Questions? Contact us at nidhi.catering@gmail.com', { x: left, y, size: small, font, color: COLORS.textMuted });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
