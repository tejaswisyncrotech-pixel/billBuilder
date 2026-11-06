/**
 * Universal Invoice Export & Sharing Suite
 * - Reliable A4 PDF generation (centered, no clipping, balanced margins)
 * - Rock-solid Word (.doc) export (UTF-8, Word XML compliant, never blank)
 * - Direct PDF File Sharing via Web Share API
 * - Interactive Share Modal with WhatsApp, Email & Clipboard
 * - Direct Print Engine with guaranteed visibility
 */

/**
 * Creates an exact A4 staging container placed at (0,0) in the viewport.
 * html2canvas captures this clean clone with symmetric left and right padding,
 * ensuring no content is clipped and all elements are centered on the page.
 */
function createStagingContainer(invoiceElement) {
  const wrapper = document.createElement("div");
  wrapper.id = "pdf-staging-wrapper";
  wrapper.style.position = "fixed";
  wrapper.style.left = "0";
  wrapper.style.top = "0";
  wrapper.style.width = "760px";
  wrapper.style.backgroundColor = "#ffffff";
  wrapper.style.zIndex = "999999";
  wrapper.style.overflow = "visible";
  wrapper.style.margin = "0";
  wrapper.style.padding = "0";
  wrapper.style.boxSizing = "border-box";

  // Clone the invoice element
  const clone = invoiceElement.cloneNode(true);
  clone.id = "invoice-clone-render";
  clone.className = "invoice-paper template-classic";

  // Reset any mobile responsive scale/margins on the clone
  clone.style.transform = "none";
  clone.style.margin = "0";
  clone.style.marginBottom = "0";
  clone.style.width = "760px";
  clone.style.minHeight = "1060px";
  // Balanced symmetric padding on both left and right (36px each)
  clone.style.padding = "36px 36px 40px 36px";
  clone.style.boxShadow = "none";
  clone.style.border = "none";
  clone.style.background = "#ffffff";
  clone.style.color = "#0f172a";
  clone.style.display = "flex";
  clone.style.flexDirection = "column";
  clone.style.justifyContent = "space-between";
  clone.style.boxSizing = "border-box";

  wrapper.appendChild(clone);
  return wrapper;
}

/**
 * Standard html2pdf options for centered A4 vector output
 * Uses balanced 8mm margins on left and right to center content perfectly.
 */
function getPdfOptions(safeFilename) {
  return {
    margin: [8, 8, 8, 8],
    filename: safeFilename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      letterRendering: true,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0
    },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  };
}

/**
 * Generate PDF Blob from invoice element (used for sharing)
 * @returns {Promise<Blob|null>}
 */
export async function generatePdfBlob(invoiceElement, invoiceNumber = "Invoice") {
  const safeFilename = `Invoice_${String(invoiceNumber).replace(/[\/\\: ]/g, "_")}.pdf`;

  if (typeof window.html2pdf !== "function") {
    console.warn("html2pdf library is not loaded.");
    return null;
  }

  // Preserve scroll position to avoid coordinate offset
  const prevScrollX = window.scrollX || window.pageXOffset || 0;
  const prevScrollY = window.scrollY || window.pageYOffset || 0;
  window.scrollTo(0, 0);

  const staging = createStagingContainer(invoiceElement);
  document.body.appendChild(staging);

  try {
    // Allow browser a brief tick to layout the staging DOM
    await new Promise((r) => setTimeout(r, 150));

    const opt = getPdfOptions(safeFilename);
    const worker = window.html2pdf().set(opt).from(staging.firstElementChild);

    let blob = null;
    try {
      blob = await worker.output("blob");
    } catch (e1) {
      // Fallback via toPdf().get('pdf')
      const pdfObj = await worker.toPdf().get("pdf");
      blob = pdfObj.output("blob");
    }

    return blob;
  } catch (err) {
    console.error("PDF Blob generation failed:", err);
    return null;
  } finally {
    if (staging && staging.parentNode) {
      staging.parentNode.removeChild(staging);
    }
    window.scrollTo(prevScrollX, prevScrollY);
  }
}

/**
 * Download PDF file to user's device
 */
export async function downloadPDF(invoiceElement, invoiceNumber = "Invoice") {
  const safeFilename = `Invoice_${String(invoiceNumber).replace(/[\/\\: ]/g, "_")}.pdf`;

  if (typeof window.html2pdf === "function") {
    const prevScrollX = window.scrollX || window.pageXOffset || 0;
    const prevScrollY = window.scrollY || window.pageYOffset || 0;
    window.scrollTo(0, 0);

    const staging = createStagingContainer(invoiceElement);
    document.body.appendChild(staging);

    try {
      await new Promise((r) => setTimeout(r, 150));
      const opt = getPdfOptions(safeFilename);
      await window.html2pdf().set(opt).from(staging.firstElementChild).save();
      return true;
    } catch (err) {
      console.warn("html2pdf save failed, falling back to window.print():", err);
      printInvoice();
      return false;
    } finally {
      if (staging && staging.parentNode) {
        staging.parentNode.removeChild(staging);
      }
      window.scrollTo(prevScrollX, prevScrollY);
    }
  } else {
    // Direct browser print engine fallback
    printInvoice();
    return false;
  }
}

/**
 * Share PDF directly via Web Share API or open Share Modal
 */
export async function sharePdfInvoice(invoiceElement, data, calc, onStatusChange) {
  const filename = `Invoice_${String(data.invoiceNumber || "Invoice").replace(/[\/\\: ]/g, "_")}.pdf`;
  const shareText = formatShareSummary(data, calc);

  if (onStatusChange) onStatusChange("Generating PDF for sharing...", true);

  // 1. Generate the PDF Blob
  const blob = await generatePdfBlob(invoiceElement, data.invoiceNumber);

  if (onStatusChange) onStatusChange("", false);

  if (blob) {
    // 2. Check if browser can share files directly (iOS Safari, Android Chrome, etc.)
    const pdfFile = new File([blob], filename, { type: "application/pdf" });

    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          title: `${data.invoiceTitle || "Invoice"} #${data.invoiceNumber}`,
          text: shareText,
          files: [pdfFile]
        });
        return { success: true, method: "native_file" };
      } catch (err) {
        if (err.name === "AbortError") {
          return { success: false, method: "cancelled" };
        }
        console.warn("Native file share failed, opening share modal:", err);
      }
    }

    // 3. Fallback: Save PDF and open Share Modal with WhatsApp & Email options
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);

    openShareModal(data, calc, filename, true);
    return { success: true, method: "modal_with_download" };
  } else {
    // Fallback if Blob creation fails
    openShareModal(data, calc, filename, false);
    return { success: false, method: "modal_fallback" };
  }
}

/**
 * Open the user-friendly Share Modal
 */
export function openShareModal(data, calc, filename, pdfDownloaded = false) {
  const modal = document.getElementById("modal-share");
  if (!modal) {
    shareViaWhatsApp(data, calc);
    return;
  }

  const titleEl = document.getElementById("share-modal-title");
  const noteEl = document.getElementById("share-modal-note");
  const summaryEl = document.getElementById("share-modal-summary");

  if (titleEl) titleEl.textContent = `Share Invoice #${data.invoiceNumber || ""}`;
  if (noteEl) {
    if (pdfDownloaded) {
      noteEl.innerHTML = `✅ <strong>${filename}</strong> downloaded to your device! You can now send it on WhatsApp or Email.`;
      noteEl.classList.remove("hidden");
    } else {
      noteEl.classList.add("hidden");
    }
  }

  if (summaryEl) {
    summaryEl.value = formatShareSummary(data, calc);
  }

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

/**
 * Generate Microsoft Word / Google Docs compatible (.doc) file
 * Uses full HTML5/Word XML with UTF-8 BOM, safe blob creation,
 * and 60-second URL lifetime so downloads never fail or arrive blank.
 */
export function downloadDOC(data, calc) {
  const safeTitle = (data.invoiceTitle || "Invoice").replace(/[\/\\: ]/g, "_");
  const safeNo = (data.invoiceNumber || "Draft").replace(/[\/\\: ]/g, "_");
  const filename = `${safeTitle}_${safeNo}.doc`;

  const currency = data.currency || "₹";
  const items = Array.isArray(data.items) ? data.items : [];

  // Build items rows safely
  const itemsHtml = items
    .map((item) => {
      const rate = Number(item.rate) || 0;
      const qty = Number(item.quantity) || 0;
      const total = rate * qty;
      return `
      <tr>
        <td style="border: 1px solid #333333; padding: 8px 10px; font-size: 10.5pt; text-align: left; vertical-align: top;">
          ${escapeHtml(item.description || "Item")}
          ${item.hsn ? `<br><span style="font-size: 9pt; color: #64748b;">HSN/SAC: ${escapeHtml(item.hsn)}</span>` : ""}
        </td>
        <td style="border: 1px solid #333333; padding: 8px 10px; font-size: 10.5pt; text-align: right; vertical-align: top; white-space: nowrap;">
          ${currency} ${formatNumber(rate)}
        </td>
        <td style="border: 1px solid #333333; padding: 8px 10px; font-size: 10.5pt; text-align: center; vertical-align: top;">
          ${qty}
        </td>
        <td style="border: 1px solid #333333; padding: 8px 10px; font-size: 10.5pt; text-align: right; vertical-align: top; font-weight: bold; white-space: nowrap;">
          ${currency} ${formatNumber(total)}
        </td>
      </tr>`;
    })
    .join("");

  // Empty spacer rows matching sample aesthetic
  const emptyRows = `
    <tr>
      <td style="border: 1px solid #333333; height: 26px;">&nbsp;</td>
      <td style="border: 1px solid #333333;">&nbsp;</td>
      <td style="border: 1px solid #333333;">&nbsp;</td>
      <td style="border: 1px solid #333333;">&nbsp;</td>
    </tr>
    <tr>
      <td style="border: 1px solid #333333; height: 26px;">&nbsp;</td>
      <td style="border: 1px solid #333333;">&nbsp;</td>
      <td style="border: 1px solid #333333;">&nbsp;</td>
      <td style="border: 1px solid #333333;">&nbsp;</td>
    </tr>
  `;

  // Tax rows
  let taxHtml = "";
  if (data.tax && data.tax.enabled && calc && calc.taxAmount > 0) {
    if (data.tax.mode === "intra") {
      const halfRate = (calc.gstRate / 2).toFixed(1);
      taxHtml = `
        <tr>
          <td colspan="3" style="border: 1px solid #333333; padding: 6px 10px; text-align: right; font-size: 10pt;">CGST (${halfRate}%):</td>
          <td style="border: 1px solid #333333; padding: 6px 10px; text-align: right; font-size: 10pt; font-weight: bold;">${currency} ${formatNumber(calc.cgst)}</td>
        </tr>
        <tr>
          <td colspan="3" style="border: 1px solid #333333; padding: 6px 10px; text-align: right; font-size: 10pt;">SGST (${halfRate}%):</td>
          <td style="border: 1px solid #333333; padding: 6px 10px; text-align: right; font-size: 10pt; font-weight: bold;">${currency} ${formatNumber(calc.sgst)}</td>
        </tr>
      `;
    } else {
      taxHtml = `
        <tr>
          <td colspan="3" style="border: 1px solid #333333; padding: 6px 10px; text-align: right; font-size: 10pt;">IGST (${calc.gstRate}%):</td>
          <td style="border: 1px solid #333333; padding: 6px 10px; text-align: right; font-size: 10pt; font-weight: bold;">${currency} ${formatNumber(calc.igst)}</td>
        </tr>
      `;
    }
  }

  const isTaxOrDiscountActive = (data.tax && data.tax.enabled) || (calc && calc.discountAmount > 0);
  const totalLabel = isTaxOrDiscountActive ? "Subtotal (Taxable Value)" : "Total";
  const subtotalVal = calc ? calc.subtotal : 0;
  const grandTotalVal = calc ? calc.grandTotal : subtotalVal;

  const wordContent = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>${escapeHtml(data.invoiceTitle || "Invoice")}</title>
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
    @page {
      size: 21.0cm 29.7cm;
      margin: 2.0cm 2.0cm 2.0cm 2.0cm;
      mso-page-orientation: portrait;
    }
    body {
      font-family: Arial, 'Segoe UI', Helvetica, sans-serif;
      font-size: 10pt;
      color: #111111;
      line-height: 1.4;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
    }
    h1 {
      font-size: 22pt;
      font-weight: normal;
      text-align: center;
      margin: 0 0 16pt 0;
      color: #000000;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10pt;
      margin-bottom: 10pt;
    }
    .header-table td {
      border: none;
      vertical-align: top;
      padding: 0;
    }
    .items-table {
      width: 100%;
      border: 1px solid #222222;
      border-collapse: collapse;
      margin-top: 12pt;
      margin-bottom: 12pt;
    }
    .items-table th {
      background-color: #dbeafe;
      border: 1px solid #222222;
      padding: 7pt 8pt;
      font-size: 9.5pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #0f172a;
    }
    .items-table td {
      border: 1px solid #222222;
      padding: 7pt 8pt;
      font-size: 10pt;
    }
    .query-box {
      background-color: #dbeafe;
      border: 1px solid #bfdbfe;
      color: #0369a1;
      padding: 8pt 12pt;
      font-size: 9.5pt;
      font-weight: bold;
      margin-top: 14pt;
      margin-bottom: 14pt;
    }
    .notes-box {
      margin-top: 10pt;
      font-size: 9.5pt;
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(data.invoiceTitle || "Invoice")}</h1>

  <!-- Header Info -->
  <table class="header-table" style="width: 100%; margin-bottom: 18pt;">
    <tr>
      <td style="width: 55%; vertical-align: top;">
        <div style="font-weight: bold; font-size: 11pt; text-transform: uppercase; margin-bottom: 3pt;">${escapeHtml(data.company.name || "")}</div>
        <div style="white-space: pre-line; color: #333333;">${escapeHtml(data.company.address || "")}</div>
        ${data.company.phone ? `<div style="margin-top: 3pt;">Mob. No: ${escapeHtml(data.company.phone)}</div>` : ""}
        ${data.company.email ? `<div>E-mail: ${escapeHtml(data.company.email)}</div>` : ""}
        ${data.company.gstin ? `<div>GSTIN: ${escapeHtml(data.company.gstin)}</div>` : ""}
      </td>
      <td style="width: 45%; vertical-align: top; text-align: right;">
        <table style="width: auto; margin-left: auto; border: none;">
          <tr>
            <td style="font-weight: bold; padding: 2pt 6pt; text-align: right; border: none;">Invoice No:</td>
            <td style="padding: 2pt 6pt; text-align: right; border: none;">${escapeHtml(data.invoiceNumber || "")}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; padding: 2pt 6pt; text-align: right; border: none;">Date:</td>
            <td style="padding: 2pt 6pt; text-align: right; border: none;">${formatDisplayDate(data.invoiceDate)}</td>
          </tr>
          ${data.dueDate ? `
          <tr>
            <td style="font-weight: bold; padding: 2pt 6pt; text-align: right; border: none;">Due Date:</td>
            <td style="padding: 2pt 6pt; text-align: right; border: none;">${formatDisplayDate(data.dueDate)}</td>
          </tr>` : ""}
        </table>
      </td>
    </tr>
  </table>

  <!-- Bill To -->
  <div style="margin-bottom: 14pt;">
    <div style="font-weight: bold; font-size: 10.5pt; margin-bottom: 2pt;">Bill To:</div>
    <div style="font-weight: bold; font-size: 10pt;">${escapeHtml(data.client.name || "")}</div>
    <div style="white-space: pre-line; color: #333333;">${escapeHtml(data.client.address || "")}</div>
    ${data.client.phone ? `<div>Contact: ${escapeHtml(data.client.phone)}</div>` : ""}
    ${data.client.gstin ? `<div>GSTIN: ${escapeHtml(data.client.gstin)}</div>` : ""}
  </div>

  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="text-align: left; width: 50%;">DESCRIPTION</th>
        <th style="text-align: right; width: 17%;">Amount</th>
        <th style="text-align: center; width: 13%;">Quantity</th>
        <th style="text-align: right; width: 20%;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
      ${emptyRows}
      <tr>
        <td colspan="3" style="font-weight: bold; font-size: 10.5pt;">${totalLabel}</td>
        <td style="font-weight: bold; font-size: 10.5pt; text-align: right;">${currency} ${formatNumber(subtotalVal)}</td>
      </tr>
      ${taxHtml}
      ${calc && calc.discountAmount > 0 ? `
      <tr>
        <td colspan="3" style="text-align: right; font-size: 10pt;">Discount:</td>
        <td style="text-align: right; font-size: 10pt; font-weight: bold;">- ${currency} ${formatNumber(calc.discountAmount)}</td>
      </tr>` : ""}
      ${calc && calc.roundOffDiff !== 0 ? `
      <tr>
        <td colspan="3" style="text-align: right; font-size: 9.5pt;">Round Off:</td>
        <td style="text-align: right; font-size: 9.5pt;">${calc.roundOffDiff > 0 ? "+" : ""}${currency} ${formatNumber(calc.roundOffDiff)}</td>
      </tr>` : ""}
      ${isTaxOrDiscountActive ? `
      <tr style="background-color: #f8fafc;">
        <td colspan="3" style="font-weight: bold; font-size: 11pt;">Grand Total</td>
        <td style="font-weight: bold; font-size: 11pt; text-align: right;">${currency} ${formatNumber(grandTotalVal)}</td>
      </tr>` : ""}
    </tbody>
  </table>

  <!-- Amount in Words -->
  ${calc && calc.amountInWords ? `
  <div style="font-size: 9.5pt; color: #475569; font-style: italic; margin-top: 4pt; margin-bottom: 12pt;">
    <strong style="font-style: normal; color: #1e293b;">Amount in Words:</strong> ${escapeHtml(calc.amountInWords)}
  </div>` : ""}

  <!-- Notes -->
  ${data.notes ? `
  <div class="notes-box">
    <div style="font-weight: bold; margin-bottom: 2pt;">Note :</div>
    <div style="margin-left: 15pt; white-space: pre-line;">${escapeHtml(data.notes)}</div>
  </div>` : ""}

  <!-- Query Box -->
  ${data.queryBanner ? `
  <div class="query-box">
    ${escapeHtml(data.queryBanner)}
  </div>` : ""}

  <!-- Signoff Section -->
  <table style="width: 100%; border: none; margin-top: 25pt;">
    <tr>
      <td style="width: 50%; vertical-align: bottom; border: none;">
        <div style="font-weight: bold; font-size: 10pt;">${escapeHtml(data.thankYouMessage || "THANK YOU FOR YOUR BUSINESS...!")}</div>
      </td>
      <td style="width: 50%; vertical-align: bottom; text-align: right; border: none;">
        <div style="font-size: 9pt; color: #666666; margin-bottom: 20pt;">For ${escapeHtml(data.company.name || "")}</div>
        <div style="font-weight: bold; font-size: 10.5pt;">${escapeHtml(data.signatoryText || data.company.name || "")}</div>
        <div style="font-size: 8.5pt; color: #777777;">Authorized Signatory</div>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Safe Blob creation with UTF-8 BOM
  const blob = new Blob(["\ufeff", wordContent], {
    type: "application/msword"
  });

  // Long-lived object URL to prevent premature revocation and 0-byte blank downloads
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    if (a.parentNode) a.parentNode.removeChild(a);
    URL.revokeObjectURL(url);
  }, 60000);
}

/**
 * Share directly to WhatsApp with pre-filled invoice message
 */
export function shareViaWhatsApp(data, calc) {
  const text = formatShareSummary(data, calc);
  const phone = (data.client.phone || "").replace(/[^0-9]/g, "");
  const url = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

  window.open(url, "_blank");
}

/**
 * Format invoice summary for text sharing
 */
export function formatShareSummary(data, calc) {
  let taxDetails = "";
  if (data.tax && data.tax.enabled && calc && calc.taxAmount > 0) {
    if (data.tax.mode === "intra") {
      taxDetails = `\nCGST: ${data.currency} ${formatNumber(calc.cgst)}\nSGST: ${data.currency} ${formatNumber(calc.sgst)}`;
    } else {
      taxDetails = `\nIGST (${calc.gstRate}%): ${data.currency} ${formatNumber(calc.igst)}`;
    }
  }

  const subtotal = calc ? calc.subtotal : 0;
  const grandTotal = calc ? calc.grandTotal : subtotal;

  return `📄 *${data.invoiceTitle || "INVOICE"} #${data.invoiceNumber || ""}*
📅 *Date:* ${formatDisplayDate(data.invoiceDate)}
🏢 *From:* ${data.company.name || ""}
👤 *Billed To:* ${data.client.name || ""}
━━━━━━━━━━━━━━━━━━
💰 *Subtotal:* ${data.currency} ${formatNumber(subtotal)}${taxDetails}
🏷️ *Grand Total:* ${data.currency} ${formatNumber(grandTotal)}
📝 *In Words:* ${calc?.amountInWords || ""}
━━━━━━━━━━━━━━━━━━
${data.queryBanner ? `${data.queryBanner}\n` : ""}${data.thankYouMessage || "THANK YOU FOR YOUR BUSINESS...!"}`;
}

/**
 * Trigger print dialog with print-specific stylesheet
 */
export function printInvoice() {
  window.print();
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
