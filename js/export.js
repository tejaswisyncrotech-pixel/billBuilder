/**
 * Export and Sharing utilities:
 * - High-resolution A4 PDF Generation
 * - Microsoft Word (.doc) Generation
 * - Direct Print Engine Trigger
 * - Web Share API & WhatsApp Sharing
 */

/**
 * Trigger print dialog with print-specific stylesheet
 */
export function printInvoice() {
  window.print();
}

/**
 * Generate and download PDF of the invoice
 * @param {HTMLElement} invoiceElement - The DOM element containing the rendered A4 invoice
 * @param {string} invoiceNumber - Invoice number for filename
 */
export async function downloadPDF(invoiceElement, invoiceNumber = "Invoice") {
  const safeFilename = `Invoice_${String(invoiceNumber).replace(/[\/\\: ]/g, "_")}.pdf`;

  // Check if html2pdf is available
  if (typeof window.html2pdf === "function") {
    const opt = {
      margin: 0,
      filename: safeFilename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
        windowWidth: 1024
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };

    try {
      await window.html2pdf().set(opt).from(invoiceElement).save();
      return true;
    } catch (err) {
      console.warn("html2pdf failed, falling back to window.print():", err);
      window.print();
      return false;
    }
  } else {
    // Fallback if CDN is offline or blocked
    window.print();
    return false;
  }
}

/**
 * Generate and download Microsoft Word / Google Docs compatible (.doc) file
 * @param {Object} data - The invoice data state
 * @param {Object} calc - The calculated totals
 */
export function downloadDOC(data, calc) {
  const filename = `Invoice_${String(data.invoiceNumber || "Invoice").replace(/[\/\\: ]/g, "_")}.doc`;

  // Build clean Word-compatible HTML table representation
  const itemsRows = data.items
    .map(
      (item) => `
    <tr>
      <td style="border: 1px solid #333; padding: 8px 10px; font-size: 11pt;">${escapeHtml(item.description || "Item")}</td>
      <td style="border: 1px solid #333; padding: 8px 10px; text-align: right; font-size: 11pt;">${data.currency} ${formatNumber(item.rate)}</td>
      <td style="border: 1px solid #333; padding: 8px 10px; text-align: center; font-size: 11pt;">${item.quantity}</td>
      <td style="border: 1px solid #333; padding: 8px 10px; text-align: right; font-size: 11pt; font-weight: bold;">${data.currency} ${formatNumber(item.rate * item.quantity)}</td>
    </tr>`
    )
    .join("");

  // Optional empty rows to match classic aesthetic
  const emptyRows = `
    <tr>
      <td style="border: 1px solid #333; padding: 14px 10px;">&nbsp;</td>
      <td style="border: 1px solid #333; padding: 14px 10px;">&nbsp;</td>
      <td style="border: 1px solid #333; padding: 14px 10px;">&nbsp;</td>
      <td style="border: 1px solid #333; padding: 14px 10px;">&nbsp;</td>
    </tr>
    <tr>
      <td style="border: 1px solid #333; padding: 14px 10px;">&nbsp;</td>
      <td style="border: 1px solid #333; padding: 14px 10px;">&nbsp;</td>
      <td style="border: 1px solid #333; padding: 14px 10px;">&nbsp;</td>
      <td style="border: 1px solid #333; padding: 14px 10px;">&nbsp;</td>
    </tr>
  `;

  // Tax rows
  let taxRows = "";
  if (data.tax.enabled && calc.taxAmount > 0) {
    if (data.tax.mode === "intra") {
      const halfRate = (data.tax.rate / 2).toFixed(1);
      taxRows = `
        <tr>
          <td colspan="3" style="border: 1px solid #333; padding: 6px 10px; text-align: right; font-size: 10pt;">CGST (${halfRate}%):</td>
          <td style="border: 1px solid #333; padding: 6px 10px; text-align: right; font-size: 10pt;">${data.currency} ${formatNumber(calc.cgst)}</td>
        </tr>
        <tr>
          <td colspan="3" style="border: 1px solid #333; padding: 6px 10px; text-align: right; font-size: 10pt;">SGST (${halfRate}%):</td>
          <td style="border: 1px solid #333; padding: 6px 10px; text-align: right; font-size: 10pt;">${data.currency} ${formatNumber(calc.sgst)}</td>
        </tr>
      `;
    } else {
      taxRows = `
        <tr>
          <td colspan="3" style="border: 1px solid #333; padding: 6px 10px; text-align: right; font-size: 10pt;">IGST (${data.tax.rate}%):</td>
          <td style="border: 1px solid #333; padding: 6px 10px; text-align: right; font-size: 10pt;">${data.currency} ${formatNumber(calc.igst)}</td>
        </tr>
      `;
    }
  }

  const wordContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 595.3pt 841.9pt; /* A4 */
          margin: 40pt 45pt 40pt 45pt;
          mso-header-margin: 36pt;
          mso-footer-margin: 36pt;
          mso-paper-source: 0;
        }
        div.Section1 { page: Section1; }
        body {
          font-family: 'Calibri', 'Arial', sans-serif;
          color: #111;
          background: #ffffff;
          line-height: 1.3;
        }
        h1 { font-size: 24pt; margin: 0 0 10pt 0; text-align: center; font-weight: normal; }
        table { border-collapse: collapse; width: 100%; margin-top: 12pt; }
        .meta-table td { border: none; padding: 2px 4px; font-size: 10pt; }
        .query-box {
          background-color: #d8edf8;
          border: 1px solid #bce8f1;
          color: #0c5460;
          padding: 8pt 12pt;
          font-size: 9.5pt;
          font-weight: bold;
          margin-top: 20pt;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        <h1>${escapeHtml(data.invoiceTitle || "Invoice")}</h1>

        <table style="width: 100%; border: none; margin-bottom: 25pt;">
          <tr>
            <td style="width: 55%; vertical-align: top; border: none; font-size: 10pt;">
              <p style="font-weight: bold; font-size: 11pt; margin: 0 0 4pt 0;">${escapeHtml(data.company.name)}</p>
              <p style="margin: 0; white-space: pre-line;">${escapeHtml(data.company.address)}</p>
              ${data.company.phone ? `<p style="margin: 2pt 0 0 0;">Mob. No: ${escapeHtml(data.company.phone)}</p>` : ""}
              ${data.company.email ? `<p style="margin: 2pt 0 0 0;">E-mail: ${escapeHtml(data.company.email)}</p>` : ""}
              ${data.company.gstin ? `<p style="margin: 2pt 0 0 0;">GSTIN: ${escapeHtml(data.company.gstin)}</p>` : ""}
            </td>
            <td style="width: 45%; vertical-align: top; border: none; text-align: right; font-size: 10pt;">
              <table style="width: auto; float: right; border: none;">
                <tr>
                  <td style="text-align: right; font-weight: bold; padding: 2pt 6pt; border: none;">Invoice No:</td>
                  <td style="text-align: right; padding: 2pt 6pt; border: none;">${escapeHtml(data.invoiceNumber)}</td>
                </tr>
                <tr>
                  <td style="text-align: right; font-weight: bold; padding: 2pt 6pt; border: none;">Date:</td>
                  <td style="text-align: right; padding: 2pt 6pt; border: none;">${formatDisplayDate(data.invoiceDate)}</td>
                </tr>
                ${data.dueDate ? `
                <tr>
                  <td style="text-align: right; font-weight: bold; padding: 2pt 6pt; border: none;">Due Date:</td>
                  <td style="text-align: right; padding: 2pt 6pt; border: none;">${formatDisplayDate(data.dueDate)}</td>
                </tr>` : ""}
              </table>
            </td>
          </tr>
        </table>

        <div style="margin-bottom: 16pt;">
          <p style="font-weight: bold; font-size: 11pt; margin: 0 0 4pt 0;">Bill To:</p>
          <p style="font-weight: bold; font-size: 10pt; margin: 0;">${escapeHtml(data.client.name)}</p>
          <p style="margin: 2pt 0 0 0; font-size: 10pt; white-space: pre-line;">${escapeHtml(data.client.address)}</p>
          ${data.client.phone ? `<p style="margin: 2pt 0 0 0; font-size: 10pt;">Contact: ${escapeHtml(data.client.phone)}</p>` : ""}
          ${data.client.gstin ? `<p style="margin: 2pt 0 0 0; font-size: 10pt;">GSTIN: ${escapeHtml(data.client.gstin)}</p>` : ""}
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #e6f2f8;">
              <th style="border: 1px solid #333; padding: 8px 10px; text-align: left; font-size: 10pt; text-transform: uppercase;">DESCRIPTION</th>
              <th style="border: 1px solid #333; padding: 8px 10px; text-align: right; font-size: 10pt; width: 110pt;">Amount</th>
              <th style="border: 1px solid #333; padding: 8px 10px; text-align: center; font-size: 10pt; width: 75pt;">Quantity</th>
              <th style="border: 1px solid #333; padding: 8px 10px; text-align: right; font-size: 10pt; width: 110pt;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
            ${emptyRows}
            <tr>
              <td colspan="3" style="border: 1px solid #333; padding: 8px 10px; text-align: left; font-weight: bold; font-size: 11pt;">Total</td>
              <td style="border: 1px solid #333; padding: 8px 10px; text-align: right; font-weight: bold; font-size: 11pt;">${data.currency} ${formatNumber(calc.subtotal)}</td>
            </tr>
            ${taxRows}
            ${calc.discountAmount > 0 ? `
            <tr>
              <td colspan="3" style="border: 1px solid #333; padding: 6px 10px; text-align: right; font-size: 10pt;">Discount:</td>
              <td style="border: 1px solid #333; padding: 6px 10px; text-align: right; font-size: 10pt;">- ${data.currency} ${formatNumber(calc.discountAmount)}</td>
            </tr>` : ""}
            ${calc.roundOffDiff !== 0 ? `
            <tr>
              <td colspan="3" style="border: 1px solid #333; padding: 6px 10px; text-align: right; font-size: 10pt;">Round Off:</td>
              <td style="border: 1px solid #333; padding: 6px 10px; text-align: right; font-size: 10pt;">${calc.roundOffDiff > 0 ? "+" : ""}${data.currency} ${formatNumber(calc.roundOffDiff)}</td>
            </tr>` : ""}
            ${data.tax.enabled || calc.discountAmount > 0 ? `
            <tr style="background-color: #f7fafc;">
              <td colspan="3" style="border: 1px solid #333; padding: 8px 10px; text-align: left; font-weight: bold; font-size: 11.5pt;">Grand Total</td>
              <td style="border: 1px solid #333; padding: 8px 10px; text-align: right; font-weight: bold; font-size: 11.5pt;">${data.currency} ${formatNumber(calc.grandTotal)}</td>
            </tr>` : ""}
          </tbody>
        </table>

        ${calc.amountInWords ? `
        <p style="margin: 6pt 0 16pt 0; font-size: 9.5pt; color: #444; font-style: italic;">
          <strong>Amount in Words:</strong> ${escapeHtml(calc.amountInWords)}
        </p>` : ""}

        ${data.notes ? `
        <div style="margin-top: 14pt;">
          <p style="font-weight: bold; font-size: 10pt; margin: 0 0 4pt 0;">Note :</p>
          <div style="margin-left: 20pt; font-size: 9.5pt; line-height: 1.4; white-space: pre-line;">${escapeHtml(data.notes)}</div>
        </div>` : ""}

        ${data.queryBanner ? `
        <div class="query-box">
          ${escapeHtml(data.queryBanner)}
        </div>` : ""}

        <table style="width: 100%; border: none; margin-top: 30pt;">
          <tr>
            <td style="width: 50%; vertical-align: bottom; border: none;">
              <p style="font-weight: bold; font-size: 10pt; margin: 0;">${escapeHtml(data.thankYouMessage || "THANK YOU FOR YOUR BUSINESS...!")}</p>
            </td>
            <td style="width: 50%; vertical-align: bottom; text-align: right; border: none;">
              <p style="margin: 0 0 25pt 0; font-size: 9.5pt; color: #666;">For ${escapeHtml(data.company.name)}</p>
              <p style="font-size: 10pt; font-weight: bold; margin: 0;">${escapeHtml(data.signatoryText || data.company.name)}</p>
              <p style="font-size: 8.5pt; color: #777; margin: 2pt 0 0 0;">Authorized Signatory</p>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", wordContent], {
    type: "application/msword;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Native Web Share or WhatsApp Share
 */
export async function shareInvoice(data, calc, invoiceElement) {
  const message = `📄 *${data.invoiceTitle || "INVOICE"}: ${data.invoiceNumber}*
📅 *Date:* ${formatDisplayDate(data.invoiceDate)}
🏢 *From:* ${data.company.name}
👤 *To:* ${data.client.name}
💰 *Total Amount:* ${data.currency} ${formatNumber(calc.grandTotal)}

${data.thankYouMessage || "Thank you for your business!"}`;

  // Try Native Share API
  if (navigator.share) {
    try {
      await navigator.share({
        title: `${data.invoiceTitle || "Invoice"} ${data.invoiceNumber}`,
        text: message
      });
      return;
    } catch (err) {
      if (err.name !== "AbortError") {
        console.log("Web share was cancelled or failed:", err);
      }
    }
  }

  // Fallback to WhatsApp
  shareViaWhatsApp(data, calc);
}

/**
 * Share direct to WhatsApp via web link
 */
export function shareViaWhatsApp(data, calc) {
  const text = `📄 *${data.invoiceTitle || "INVOICE"}: ${data.invoiceNumber}*
📅 *Date:* ${formatDisplayDate(data.invoiceDate)}
🏢 *From:* ${data.company.name}
👤 *To:* ${data.client.name}
💰 *Total Amount:* ${data.currency} ${formatNumber(calc.grandTotal)}

${data.thankYouMessage || "Thank you for your business!"}`;

  const phone = (data.client.phone || "").replace(/[^0-9]/g, "");
  const url = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

  window.open(url, "_blank");
}

// Utility Helpers
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatNumber(num) {
  if (num === undefined || num === null || isNaN(num)) return "0.00";
  return Number(num).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}
