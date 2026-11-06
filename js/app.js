/**
 * Invoice Builder Core Application Logic
 * Reactive state management, live DOM two-way binding, auto-calculations,
 * GST engine, UPI QR generation, local storage persistence, responsive scaling,
 * and robust PDF export & sharing integration.
 */

import { defaultInvoiceData } from "./sample-data.js";
import { amountToWords } from "./words.js";
import { downloadPDF, downloadDOC, sharePdfInvoice, shareViaWhatsApp, printInvoice } from "./export.js";

// Global Application State
let state = JSON.parse(JSON.stringify(defaultInvoiceData));
let autoSaveTimeout = null;

// Initialize Application on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  loadSavedState();
  initFormInputs();
  initEventListeners();
  initZoomControls();
  initShareModal();
  renderItemsEditor();
  calculateAndRender();
});

/**
 * Load draft from localStorage or fallback to default sample data
 */
function loadSavedState() {
  try {
    const saved = localStorage.getItem("invoice_builder_draft");
    if (saved) {
      const parsed = JSON.parse(saved);
      state = Object.assign({}, defaultInvoiceData, parsed);
    }
  } catch (e) {
    console.warn("Could not load draft from localStorage:", e);
    state = JSON.parse(JSON.stringify(defaultInvoiceData));
  }
}

/**
 * Save current state to localStorage (debounced)
 */
function triggerAutoSave() {
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(() => {
    try {
      localStorage.setItem("invoice_builder_draft", JSON.stringify(state));
    } catch (e) {
      console.warn("AutoSave failed:", e);
    }
  }, 400);
}

/**
 * Populate form input fields with initial state values
 */
function initFormInputs() {
  // Theme & Currency
  const templateSelect = document.getElementById("template-select");
  if (templateSelect) templateSelect.value = state.template || "classic";

  const currencySelect = document.getElementById("currency-select");
  if (currencySelect) currencySelect.value = state.currency || "₹";

  // Invoice Details
  setValue("input-invoice-title", state.invoiceTitle);
  setValue("input-invoice-number", state.invoiceNumber);
  setValue("input-invoice-date", state.invoiceDate);
  setValue("input-due-date", state.dueDate);

  // Company Details
  setValue("input-company-name", state.company.name);
  setValue("input-company-address", state.company.address);
  setValue("input-company-phone", state.company.phone);
  setValue("input-company-email", state.company.email);
  setValue("input-company-gstin", state.company.gstin);
  setValue("input-company-pan", state.company.pan);

  // Client Details
  setValue("input-client-name", state.client.name);
  setValue("input-client-address", state.client.address);
  setValue("input-client-phone", state.client.phone);
  setValue("input-client-gstin", state.client.gstin);

  // Tax & GST
  const toggleGst = document.getElementById("toggle-gst");
  if (toggleGst) toggleGst.checked = !!state.tax.enabled;

  const selectGstRate = document.getElementById("select-gst-rate");
  if (selectGstRate) {
    const rate = String(state.tax.rate);
    const hasOption = Array.from(selectGstRate.options).some((o) => o.value === rate);
    if (hasOption) {
      selectGstRate.value = rate;
      toggleCustomGstWrap(false);
    } else {
      selectGstRate.value = "custom";
      toggleCustomGstWrap(true);
      setValue("input-custom-gst", state.tax.rate);
    }
  }

  const selectGstMode = document.getElementById("select-gst-mode");
  if (selectGstMode) selectGstMode.value = state.tax.mode || "intra";

  const checkTaxInclusive = document.getElementById("check-tax-inclusive");
  if (checkTaxInclusive) checkTaxInclusive.checked = !!state.tax.isInclusive;

  setValue("input-discount-val", state.tax.discountValue || "");
  const selectDiscountType = document.getElementById("select-discount-type");
  if (selectDiscountType) selectDiscountType.value = state.tax.discountType || "flat";

  const checkRoundOff = document.getElementById("check-round-off");
  if (checkRoundOff) checkRoundOff.checked = state.tax.roundOff !== false;

  // Notes & Signoff
  setValue("input-notes", state.notes);
  setValue("input-query-banner", state.queryBanner);
  setValue("input-thank-you", state.thankYouMessage);
  setValue("input-signatory", state.signatoryText || state.company.name);

  // Bank & UPI Details
  const toggleBank = document.getElementById("toggle-bank");
  if (toggleBank) toggleBank.checked = !!state.bank.enabled;
  setValue("input-bank-name", state.bank.bankName);
  setValue("input-account-number", state.bank.accountNumber);
  setValue("input-ifsc-code", state.bank.ifscCode);
  setValue("input-upi-id", state.bank.upiId);

  updateBankControlsVisibility();
}

/**
 * Register all event listeners for inputs, buttons, and responsive tabs
 */
function initEventListeners() {
  // Responsive Mobile/Tablet Tabs
  const tabEditor = document.getElementById("tab-btn-editor");
  const tabPreview = document.getElementById("tab-btn-preview");
  const editorPane = document.getElementById("editor-pane");
  const previewPane = document.getElementById("preview-pane");

  if (tabEditor && tabPreview && editorPane && previewPane) {
    tabEditor.addEventListener("click", () => {
      editorPane.classList.remove("hidden");
      previewPane.classList.add("hidden");
      tabEditor.className = "py-2 text-xs font-bold rounded-lg transition-all text-sky-700 bg-white shadow-sm flex items-center justify-center gap-1.5";
      tabPreview.className = "py-2 text-xs font-bold rounded-lg transition-all text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5";
    });

    tabPreview.addEventListener("click", () => {
      editorPane.classList.add("hidden");
      previewPane.classList.remove("hidden");
      tabPreview.className = "py-2 text-xs font-bold rounded-lg transition-all text-sky-700 bg-white shadow-sm flex items-center justify-center gap-1.5";
      tabEditor.className = "py-2 text-xs font-bold rounded-lg transition-all text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5";
      
      // Auto-fit on mobile screens when switching to preview
      if (window.innerWidth < 768) {
        applyZoom("fit");
      }
      calculateAndRender();
    });
  }

  // Template Theme Switcher
  const templateSelect = document.getElementById("template-select");
  if (templateSelect) {
    templateSelect.addEventListener("change", (e) => {
      state.template = e.target.value;
      const preview = document.getElementById("invoice-preview");
      if (preview) {
        preview.className = `invoice-paper template-${state.template}`;
      }
      triggerAutoSave();
    });
  }

  // Currency Switcher
  const currencySelect = document.getElementById("currency-select");
  if (currencySelect) {
    currencySelect.addEventListener("change", (e) => {
      state.currency = e.target.value;
      triggerAutoSave();
      calculateAndRender();
    });
  }

  // Invoice Details
  bindInput("input-invoice-title", (val) => (state.invoiceTitle = val));
  bindInput("input-invoice-number", (val) => (state.invoiceNumber = val));
  bindInput("input-invoice-date", (val) => (state.invoiceDate = val));
  bindInput("input-due-date", (val) => (state.dueDate = val));

  // Company Details
  bindInput("input-company-name", (val) => (state.company.name = val));
  bindInput("input-company-address", (val) => (state.company.address = val));
  bindInput("input-company-phone", (val) => (state.company.phone = val));
  bindInput("input-company-email", (val) => (state.company.email = val));
  bindInput("input-company-gstin", (val) => (state.company.gstin = val));
  bindInput("input-company-pan", (val) => (state.company.pan = val));

  // Client Details
  bindInput("input-client-name", (val) => (state.client.name = val));
  bindInput("input-client-address", (val) => (state.client.address = val));
  bindInput("input-client-phone", (val) => (state.client.phone = val));
  bindInput("input-client-gstin", (val) => (state.client.gstin = val));

  // Logo Upload
  const logoInput = document.getElementById("input-company-logo");
  if (logoInput) {
    logoInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          state.company.logo = event.target.result;
          triggerAutoSave();
          calculateAndRender();
          showToast("Company logo updated");
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Signature Upload
  const sigInput = document.getElementById("input-signature-img");
  if (sigInput) {
    sigInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          state.signatureImage = event.target.result;
          triggerAutoSave();
          calculateAndRender();
          showToast("Signature updated");
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Add Item Button
  const btnAddItem = document.getElementById("btn-add-item");
  if (btnAddItem) {
    btnAddItem.addEventListener("click", () => {
      state.items.push({
        id: "item-" + Date.now(),
        description: "",
        hsn: "",
        rate: 0,
        quantity: 1,
        taxPercent: 0
      });
      renderItemsEditor();
      triggerAutoSave();
      calculateAndRender();
    });
  }

  // Tax & GST Controls
  const toggleGst = document.getElementById("toggle-gst");
  if (toggleGst) {
    toggleGst.addEventListener("change", (e) => {
      state.tax.enabled = e.target.checked;
      triggerAutoSave();
      calculateAndRender();
      showToast(state.tax.enabled ? "GST calculations enabled" : "GST disabled");
    });
  }

  const selectGstRate = document.getElementById("select-gst-rate");
  if (selectGstRate) {
    selectGstRate.addEventListener("change", (e) => {
      if (e.target.value === "custom") {
        toggleCustomGstWrap(true);
        const customInput = document.getElementById("input-custom-gst");
        state.tax.rate = parseFloat(customInput.value) || 0;
      } else {
        toggleCustomGstWrap(false);
        state.tax.rate = parseFloat(e.target.value) || 0;
      }
      triggerAutoSave();
      calculateAndRender();
    });
  }

  bindInput("input-custom-gst", (val) => {
    state.tax.rate = parseFloat(val) || 0;
  });

  const selectGstMode = document.getElementById("select-gst-mode");
  if (selectGstMode) {
    selectGstMode.addEventListener("change", (e) => {
      state.tax.mode = e.target.value;
      triggerAutoSave();
      calculateAndRender();
    });
  }

  const checkTaxInclusive = document.getElementById("check-tax-inclusive");
  if (checkTaxInclusive) {
    checkTaxInclusive.addEventListener("change", (e) => {
      state.tax.isInclusive = e.target.checked;
      triggerAutoSave();
      calculateAndRender();
    });
  }

  bindInput("input-discount-val", (val) => {
    state.tax.discountValue = parseFloat(val) || 0;
  });

  const selectDiscountType = document.getElementById("select-discount-type");
  if (selectDiscountType) {
    selectDiscountType.addEventListener("change", (e) => {
      state.tax.discountType = e.target.value;
      triggerAutoSave();
      calculateAndRender();
    });
  }

  const checkRoundOff = document.getElementById("check-round-off");
  if (checkRoundOff) {
    checkRoundOff.addEventListener("change", (e) => {
      state.tax.roundOff = e.target.checked;
      triggerAutoSave();
      calculateAndRender();
    });
  }

  // Notes, Query, Closing, Signatory
  bindInput("input-notes", (val) => (state.notes = val));
  bindInput("input-query-banner", (val) => (state.queryBanner = val));
  bindInput("input-thank-you", (val) => (state.thankYouMessage = val));
  bindInput("input-signatory", (val) => (state.signatoryText = val));

  // Bank & UPI Controls
  const toggleBank = document.getElementById("toggle-bank");
  if (toggleBank) {
    toggleBank.addEventListener("change", (e) => {
      state.bank.enabled = e.target.checked;
      updateBankControlsVisibility();
      triggerAutoSave();
      calculateAndRender();
    });
  }

  bindInput("input-bank-name", (val) => (state.bank.bankName = val));
  bindInput("input-account-number", (val) => (state.bank.accountNumber = val));
  bindInput("input-ifsc-code", (val) => (state.bank.ifscCode = val));
  bindInput("input-upi-id", (val) => (state.bank.upiId = val));

  // Reset to Sample Data
  const btnReset = document.getElementById("btn-reset-sample");
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      if (confirm("Reset invoice data to original Syncrotech sample?")) {
        state = JSON.parse(JSON.stringify(defaultInvoiceData));
        initFormInputs();
        renderItemsEditor();
        triggerAutoSave();
        calculateAndRender();
        showToast("Reset to sample invoice");
      }
    });
  }

  // Export Buttons: PDF, DOC, Print, Share
  const previewElement = document.getElementById("invoice-preview");

  const handlePdfDownload = async () => {
    showToast("Generating crisp A4 PDF...", "⏳");
    const success = await downloadPDF(previewElement, state.invoiceNumber);
    if (success) showToast("PDF downloaded successfully!");
  };

  const handleDocDownload = () => {
    const calc = getCalculations();
    downloadDOC(state, calc);
    showToast("Word DOC file exported!");
  };

  const handleShare = async () => {
    const calc = getCalculations();
    showToast("Preparing PDF to share...", "⏳");
    const result = await sharePdfInvoice(previewElement, state, calc);
    if (result.success && result.method === "native_file") {
      showToast("Sharing PDF...");
    }
  };

  // Bind desktop, mobile & bottom editor export triggers
  bindClick("btn-download-pdf", handlePdfDownload);
  bindClick("mobile-btn-pdf", handlePdfDownload);
  bindClick("btn-bottom-pdf", handlePdfDownload);

  bindClick("btn-download-doc", handleDocDownload);
  bindClick("mobile-btn-doc", handleDocDownload);
  bindClick("btn-bottom-doc", handleDocDownload);

  bindClick("btn-share", handleShare);
  bindClick("mobile-btn-share", handleShare);
  bindClick("btn-bottom-share", handleShare);

  bindClick("btn-bottom-save", () => {
    const saveBtn = document.getElementById("btn-save-current");
    if (saveBtn) saveBtn.click();
    else showToast("Draft saved!");
  });

  bindClick("btn-print-direct", printInvoice);

  // History Modal Listeners
  initHistoryModal();
}

/**
 * Initialize Responsive Zoom & Fit Controls
 */
function initZoomControls() {
  const btnZoomFit = document.getElementById("btn-zoom-fit");
  const btnZoom100 = document.getElementById("btn-zoom-100");

  if (btnZoomFit) btnZoomFit.addEventListener("click", () => applyZoom("fit"));
  if (btnZoom100) btnZoom100.addEventListener("click", () => applyZoom("100"));

  // Auto-adapt on window resize
  window.addEventListener("resize", () => {
    if (window.innerWidth < 768) {
      applyZoom("fit");
    }
  });

  if (window.innerWidth < 768) {
    applyZoom("fit");
  }
}

function applyZoom(mode) {
  const preview = document.getElementById("invoice-preview");
  const wrapper = document.getElementById("paper-wrapper");
  const btnZoomFit = document.getElementById("btn-zoom-fit");
  const btnZoom100 = document.getElementById("btn-zoom-100");

  if (!preview || !wrapper) return;

  if (mode === "fit") {
    const availableWidth = wrapper.clientWidth - 20;
    const a4WidthPx = 794; // 210mm in standard 96dpi pixels
    if (availableWidth < a4WidthPx) {
      const scale = Math.max(0.38, Math.min(1, availableWidth / a4WidthPx));
      preview.style.transform = `scale(${scale})`;
      preview.style.marginBottom = `-${(1 - scale) * (preview.offsetHeight || 1120)}px`;
    } else {
      preview.style.transform = "none";
      preview.style.marginBottom = "0";
    }

    if (btnZoomFit) btnZoomFit.className = "px-2 py-0.5 rounded hover:bg-slate-100 transition-colors bg-slate-100 text-sky-700 font-bold";
    if (btnZoom100) btnZoom100.className = "px-2 py-0.5 rounded hover:bg-slate-100 transition-colors text-slate-600";
  } else {
    preview.style.transform = "none";
    preview.style.marginBottom = "0";

    if (btnZoom100) btnZoom100.className = "px-2 py-0.5 rounded hover:bg-slate-100 transition-colors bg-slate-100 text-sky-700 font-bold";
    if (btnZoomFit) btnZoomFit.className = "px-2 py-0.5 rounded hover:bg-slate-100 transition-colors text-slate-600";
  }
}

/**
 * Initialize Share Modal Listeners
 */
function initShareModal() {
  const modal = document.getElementById("modal-share");
  const btnClose = document.getElementById("btn-close-share");
  const btnWhatsApp = document.getElementById("btn-share-whatsapp");
  const btnDownloadAgain = document.getElementById("btn-share-download-pdf");
  const btnCopy = document.getElementById("btn-copy-summary");

  if (!modal) return;

  if (btnClose) {
    btnClose.addEventListener("click", () => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    });
  }

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }
  });

  if (btnWhatsApp) {
    btnWhatsApp.addEventListener("click", () => {
      shareViaWhatsApp(state, getCalculations());
    });
  }

  if (btnDownloadAgain) {
    btnDownloadAgain.addEventListener("click", () => {
      const preview = document.getElementById("invoice-preview");
      downloadPDF(preview, state.invoiceNumber);
    });
  }

  if (btnCopy) {
    btnCopy.addEventListener("click", () => {
      const summaryEl = document.getElementById("share-modal-summary");
      if (summaryEl) {
        summaryEl.select();
        navigator.clipboard.writeText(summaryEl.value).then(() => {
          showToast("Summary copied to clipboard!");
        });
      }
    });
  }
}

/**
 * Render editable item rows in the Editor card
 */
function renderItemsEditor() {
  const container = document.getElementById("items-container");
  if (!container) return;

  container.innerHTML = "";

  state.items.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "p-3 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2 text-xs";
    row.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <span class="font-bold text-slate-700">Item #${index + 1}</span>
        <div class="flex items-center gap-1">
          <button type="button" class="btn-dup-item p-1 text-slate-500 hover:text-sky-600 rounded hover:bg-slate-200" title="Duplicate item" data-index="${index}">
            📋
          </button>
          <button type="button" class="btn-del-item p-1 text-slate-500 hover:text-rose-600 rounded hover:bg-slate-200 ${state.items.length === 1 ? "opacity-30 cursor-not-allowed" : ""}" title="Delete item" data-index="${index}">
            🗑️
          </button>
        </div>
      </div>

      <div>
        <label class="form-label text-[11px]">Description / Product</label>
        <input type="text" class="item-desc form-input text-xs" placeholder="e.g. Laptop (i5 256 GB SSD, with charger)" value="${escapeHtml(item.description)}">
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div>
          <label class="form-label text-[11px]">Rate / Price (${state.currency})</label>
          <input type="number" inputmode="decimal" class="item-rate form-input text-xs" min="0" step="any" placeholder="0" value="${item.rate}">
        </div>
        <div>
          <label class="form-label text-[11px]">Quantity</label>
          <input type="number" inputmode="decimal" class="item-qty form-input text-xs text-center" min="0" step="any" placeholder="1" value="${item.quantity}">
        </div>
        <div>
          <label class="form-label text-[11px]">Total (${state.currency})</label>
          <div class="item-total-display px-2 py-1.5 font-bold text-slate-800 bg-white border border-slate-200 rounded text-right truncate">
            ${formatCurrency(item.rate * item.quantity, state.currency)}
          </div>
        </div>
      </div>
    `;

    // Dynamic row input events
    const descInput = row.querySelector(".item-desc");
    const rateInput = row.querySelector(".item-rate");
    const qtyInput = row.querySelector(".item-qty");

    descInput.addEventListener("input", (e) => {
      state.items[index].description = e.target.value;
      triggerAutoSave();
      calculateAndRender();
    });

    rateInput.addEventListener("input", (e) => {
      state.items[index].rate = parseFloat(e.target.value) || 0;
      row.querySelector(".item-total-display").textContent = formatCurrency(
        state.items[index].rate * state.items[index].quantity,
        state.currency
      );
      triggerAutoSave();
      calculateAndRender();
    });

    qtyInput.addEventListener("input", (e) => {
      state.items[index].quantity = parseFloat(e.target.value) || 0;
      row.querySelector(".item-total-display").textContent = formatCurrency(
        state.items[index].rate * state.items[index].quantity,
        state.currency
      );
      triggerAutoSave();
      calculateAndRender();
    });

    // Duplicate button
    row.querySelector(".btn-dup-item").addEventListener("click", () => {
      const copy = JSON.parse(JSON.stringify(state.items[index]));
      copy.id = "item-" + Date.now();
      state.items.splice(index + 1, 0, copy);
      renderItemsEditor();
      triggerAutoSave();
      calculateAndRender();
    });

    // Delete button
    row.querySelector(".btn-del-item").addEventListener("click", () => {
      if (state.items.length <= 1) return;
      state.items.splice(index, 1);
      renderItemsEditor();
      triggerAutoSave();
      calculateAndRender();
    });

    container.appendChild(row);
  });
}

/**
 * Perform all financial and GST calculations
 */
function getCalculations() {
  const currency = state.currency || "₹";

  // Subtotal (Sum of line items)
  const subtotal = state.items.reduce((sum, item) => {
    return sum + (Number(item.rate) || 0) * (Number(item.quantity) || 0);
  }, 0);

  // Discount
  let discountAmount = 0;
  if (state.tax.discountValue > 0) {
    if (state.tax.discountType === "percent") {
      discountAmount = (subtotal * state.tax.discountValue) / 100;
    } else {
      discountAmount = Math.min(subtotal, state.tax.discountValue);
    }
  }

  const taxableBase = Math.max(0, subtotal - discountAmount);

  // GST Calculation
  let taxAmount = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  const gstRate = state.tax.enabled ? Number(state.tax.rate) || 0 : 0;

  if (state.tax.enabled && gstRate > 0) {
    if (state.tax.isInclusive) {
      taxAmount = taxableBase - taxableBase / (1 + gstRate / 100);
    } else {
      taxAmount = (taxableBase * gstRate) / 100;
    }

    if (state.tax.mode === "intra") {
      cgst = taxAmount / 2;
      sgst = taxAmount / 2;
      igst = 0;
    } else {
      cgst = 0;
      sgst = 0;
      igst = taxAmount;
    }
  }

  const rawGrandTotal = state.tax.isInclusive
    ? taxableBase
    : taxableBase + taxAmount;

  let grandTotal = rawGrandTotal;
  let roundOffDiff = 0;

  if (state.tax.roundOff) {
    grandTotal = Math.round(rawGrandTotal);
    roundOffDiff = grandTotal - rawGrandTotal;
  }

  const words = amountToWords(grandTotal, currency);

  return {
    subtotal,
    discountAmount,
    taxableBase,
    gstRate,
    taxAmount,
    cgst,
    sgst,
    igst,
    rawGrandTotal,
    roundOffDiff,
    grandTotal,
    amountInWords: words
  };
}

/**
 * Main update function: synchronizes calculated figures and preview DOM
 */
function calculateAndRender() {
  const calc = getCalculations();
  const curr = state.currency || "₹";

  // Synchronize Text Fields on Preview
  setText("preview-title", state.invoiceTitle || "Invoice");
  setText("preview-invoice-no", state.invoiceNumber || "");
  setText("preview-invoice-date", formatDisplayDate(state.invoiceDate));

  // Due Date
  const dueDateWrap = document.getElementById("preview-due-date-wrap");
  if (dueDateWrap) {
    if (state.dueDate) {
      dueDateWrap.classList.remove("hidden");
      setText("preview-due-date", formatDisplayDate(state.dueDate));
    } else {
      dueDateWrap.classList.add("hidden");
    }
  }

  // Company Information
  setText("preview-company-name", state.company.name || "COMPANY NAME");
  setText("preview-company-address", state.company.address || "");
  setText("preview-company-phone", state.company.phone || "");
  setText("preview-company-email", state.company.email || "");

  toggleWrap(
    "preview-company-phone-wrap",
    state.company.phone && state.company.phone.trim().length > 0
  );
  toggleWrap(
    "preview-company-email-wrap",
    state.company.email && state.company.email.trim().length > 0
  );

  const compGstinWrap = document.getElementById("preview-company-gstin-wrap");
  if (compGstinWrap) {
    if (state.company.gstin && state.company.gstin.trim().length > 0) {
      compGstinWrap.classList.remove("hidden");
      setText("preview-company-gstin", state.company.gstin);
    } else {
      compGstinWrap.classList.add("hidden");
    }
  }

  // Company Logo
  const logoWrap = document.getElementById("preview-logo-wrap");
  const logoImg = document.getElementById("preview-logo-img");
  if (logoWrap && logoImg) {
    if (state.company.logo) {
      logoImg.src = state.company.logo;
      logoWrap.classList.remove("hidden");
    } else {
      logoWrap.classList.add("hidden");
    }
  }

  // Client Details
  setText("preview-client-name", state.client.name || "CLIENT NAME");
  setText("preview-client-address", state.client.address || "");

  const clientPhoneWrap = document.getElementById("preview-client-phone-wrap");
  if (clientPhoneWrap) {
    if (state.client.phone && state.client.phone.trim().length > 0) {
      clientPhoneWrap.classList.remove("hidden");
      setText("preview-client-phone", state.client.phone);
    } else {
      clientPhoneWrap.classList.add("hidden");
    }
  }

  const clientGstinWrap = document.getElementById("preview-client-gstin-wrap");
  if (clientGstinWrap) {
    if (state.client.gstin && state.client.gstin.trim().length > 0) {
      clientGstinWrap.classList.remove("hidden");
      setText("preview-client-gstin", state.client.gstin);
    } else {
      clientGstinWrap.classList.add("hidden");
    }
  }

  // Render Preview Items Table Body
  renderPreviewTableBody(curr);

  // Render Preview Table Foot (Totals, Taxes, GST)
  renderPreviewTableFoot(calc, curr);

  // Amount in Words
  const wordsWrap = document.getElementById("preview-amount-words-wrap");
  if (wordsWrap) {
    if (calc.amountInWords) {
      wordsWrap.classList.remove("hidden");
      setText("preview-amount-words", calc.amountInWords);
    } else {
      wordsWrap.classList.add("hidden");
    }
  }

  // Notes
  const notesWrap = document.getElementById("preview-notes-wrap");
  if (notesWrap) {
    if (state.notes && state.notes.trim().length > 0) {
      notesWrap.classList.remove("hidden");
      setText("preview-notes-content", state.notes);
    } else {
      notesWrap.classList.add("hidden");
    }
  }

  // Query Banner
  const queryWrap = document.getElementById("preview-query-banner-wrap");
  if (queryWrap) {
    if (state.queryBanner && state.queryBanner.trim().length > 0) {
      queryWrap.classList.remove("hidden");
      setText("preview-query-banner", state.queryBanner);
    } else {
      queryWrap.classList.add("hidden");
    }
  }

  // Thank You & Signatory
  setText(
    "preview-thank-you",
    state.thankYouMessage || "THANK YOU FOR YOUR BUSINESS...!"
  );
  setText(
    "preview-for-company",
    "For " + (state.company.name || "COMPANY")
  );
  setText(
    "preview-signatory-name",
    state.signatoryText || state.company.name || "Authorized Signatory"
  );

  // Signature Stamp Image
  const sigWrap = document.getElementById("preview-signature-img-wrap");
  const sigImg = document.getElementById("preview-signature-img");
  if (sigWrap && sigImg) {
    if (state.signatureImage) {
      sigImg.src = state.signatureImage;
      sigWrap.classList.remove("hidden");
    } else {
      sigWrap.classList.add("hidden");
    }
  }

  // Bank & UPI QR Render
  renderBankAndUpi(calc);
}

/**
 * Render line item rows in the preview paper
 */
function renderPreviewTableBody(curr) {
  const tbody = document.getElementById("preview-table-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  // Render actual line items
  state.items.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="text-left font-medium text-slate-800">
        <div>${escapeHtml(item.description || "Item")}</div>
        ${item.hsn ? `<div class="text-[10px] text-slate-500 font-mono">HSN: ${escapeHtml(item.hsn)}</div>` : ""}
      </td>
      <td class="text-right whitespace-nowrap text-slate-800">${curr} ${formatNumber(item.rate)}</td>
      <td class="text-center font-medium text-slate-800">${item.quantity}</td>
      <td class="text-right whitespace-nowrap font-semibold text-slate-900">${curr} ${formatNumber(item.rate * item.quantity)}</td>
    `;
    tbody.appendChild(tr);
  });

  // Render empty spacer rows to match authentic classic sample aesthetic
  const emptyRowCount = Math.max(1, 3 - state.items.length);
  for (let i = 0; i < emptyRowCount; i++) {
    const emptyTr = document.createElement("tr");
    emptyTr.innerHTML = `
      <td class="empty-row-cell">&nbsp;</td>
      <td class="empty-row-cell">&nbsp;</td>
      <td class="empty-row-cell">&nbsp;</td>
      <td class="empty-row-cell">&nbsp;</td>
    `;
    tbody.appendChild(emptyTr);
  }
}

/**
 * Render footer totals (Subtotal, GST CGST/SGST/IGST, Discount, Round-off, Grand Total)
 */
function renderPreviewTableFoot(calc, curr) {
  const tfoot = document.getElementById("preview-table-foot");
  if (!tfoot) return;

  let footHtml = "";
  const isTaxOrDiscountActive = state.tax.enabled || calc.discountAmount > 0;
  const subtotalLabel = isTaxOrDiscountActive ? "Subtotal (Taxable Value)" : "Total";

  // Base Total / Subtotal row
  footHtml += `
    <tr>
      <td colspan="3" class="text-left font-bold text-slate-900 text-[13.5px]">${subtotalLabel}</td>
      <td class="text-right font-bold text-slate-900 text-[13.5px] whitespace-nowrap">${curr} ${formatNumber(calc.subtotal)}</td>
    </tr>
  `;

  // Discount row (if any)
  if (calc.discountAmount > 0) {
    footHtml += `
      <tr class="text-slate-700 text-[12px]">
        <td colspan="3" class="text-right font-semibold">Discount:</td>
        <td class="text-right font-semibold whitespace-nowrap">- ${curr} ${formatNumber(calc.discountAmount)}</td>
      </tr>
    `;
  }

  // GST Breakdown (if enabled)
  if (state.tax.enabled && calc.taxAmount > 0) {
    if (state.tax.mode === "intra") {
      const halfRate = (calc.gstRate / 2).toFixed(1);
      footHtml += `
        <tr class="text-slate-700 text-[12px]">
          <td colspan="3" class="text-right font-semibold">CGST (${halfRate}%):</td>
          <td class="text-right font-semibold whitespace-nowrap">${curr} ${formatNumber(calc.cgst)}</td>
        </tr>
        <tr class="text-slate-700 text-[12px]">
          <td colspan="3" class="text-right font-semibold">SGST (${halfRate}%):</td>
          <td class="text-right font-semibold whitespace-nowrap">${curr} ${formatNumber(calc.sgst)}</td>
        </tr>
      `;
    } else {
      footHtml += `
        <tr class="text-slate-700 text-[12px]">
          <td colspan="3" class="text-right font-semibold">IGST (${calc.gstRate}%):</td>
          <td class="text-right font-semibold whitespace-nowrap">${curr} ${formatNumber(calc.igst)}</td>
        </tr>
      `;
    }
  }

  // Round Off row
  if (calc.roundOffDiff !== 0) {
    footHtml += `
      <tr class="text-slate-700 text-[11.5px]">
        <td colspan="3" class="text-right font-semibold">Round Off:</td>
        <td class="text-right font-semibold whitespace-nowrap">${calc.roundOffDiff > 0 ? "+" : ""}${curr} ${formatNumber(calc.roundOffDiff)}</td>
      </tr>
    `;
  }

  // Grand Total row (if taxes or discounts are active)
  if (isTaxOrDiscountActive) {
    footHtml += `
      <tr class="bg-slate-50">
        <td colspan="3" class="text-left font-bold text-slate-900 text-[14.5px]">Grand Total</td>
        <td class="text-right font-bold text-slate-900 text-[14.5px] whitespace-nowrap">${curr} ${formatNumber(calc.grandTotal)}</td>
      </tr>
    `;
  }

  tfoot.innerHTML = footHtml;
}

/**
 * Render optional Bank Details and dynamic UPI QR code
 */
function renderBankAndUpi(calc) {
  const bankSection = document.getElementById("preview-bank-section");
  if (!bankSection) return;

  if (state.bank && state.bank.enabled) {
    bankSection.classList.remove("hidden");
    setText("preview-bank-name", state.bank.bankName || "Bank");
    setText("preview-account-number", state.bank.accountNumber || "N/A");
    setText("preview-ifsc-code", state.bank.ifscCode || "N/A");
    setText("preview-upi-id", state.bank.upiId || "N/A");

    // Generate UPI QR Code if UPI ID is present and QRCode library is loaded
    const qrContainer = document.getElementById("preview-upi-qr");
    if (qrContainer) {
      qrContainer.innerHTML = "";
      if (state.bank.upiId && typeof window.QRCode === "function") {
        const upiUri = `upi://pay?pa=${encodeURIComponent(state.bank.upiId)}&pn=${encodeURIComponent(state.company.name || "Vendor")}&am=${calc.grandTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent("Invoice " + (state.invoiceNumber || ""))}`;
        try {
          new window.QRCode(qrContainer, {
            text: upiUri,
            width: 76,
            height: 76,
            colorDark: "#0f172a",
            colorLight: "#ffffff",
            correctLevel: window.QRCode.CorrectLevel.M
          });
        } catch (e) {
          console.warn("Could not generate UPI QR code:", e);
        }
      }
    }
  } else {
    bankSection.classList.add("hidden");
  }
}

/**
 * History & Saved Drafts Management Modal
 */
function initHistoryModal() {
  const btnHistory = document.getElementById("btn-history");
  const modal = document.getElementById("modal-history");
  const btnClose = document.getElementById("btn-close-history");
  const listContainer = document.getElementById("history-list-container");
  const btnSaveCurrent = document.getElementById("btn-save-current");
  const btnExport = document.getElementById("btn-export-backup");
  const inputImport = document.getElementById("input-import-backup");

  if (!btnHistory || !modal || !btnClose) return;

  const openModal = () => {
    renderHistoryList();
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  };

  const closeModal = () => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  };

  btnHistory.addEventListener("click", openModal);
  btnClose.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  const getHistory = () => {
    try {
      return JSON.parse(localStorage.getItem("invoice_builder_history") || "[]");
    } catch (e) {
      return [];
    }
  };

  const setHistory = (arr) => {
    localStorage.setItem("invoice_builder_history", JSON.stringify(arr));
  };

  const renderHistoryList = () => {
    const list = getHistory();
    if (!listContainer) return;
    listContainer.innerHTML = "";

    if (list.length === 0) {
      listContainer.innerHTML = `
        <div class="text-center py-8 text-slate-400 text-xs">
          No saved invoices yet. Click "Save Current as Draft" below to archive this invoice.
        </div>
      `;
      return;
    }

    list.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs hover:border-sky-300 transition-colors";
      card.innerHTML = `
        <div>
          <div class="font-bold text-slate-800">#${escapeHtml(item.invoiceNumber || "Draft")} - ${escapeHtml(item.client?.name || "Client")}</div>
          <div class="text-[11px] text-slate-500">${formatDisplayDate(item.invoiceDate)} | ${item.currency || "₹"} ${formatNumber(item.cachedTotal || 0)}</div>
        </div>
        <div class="flex items-center gap-1.5">
          <button class="btn-load-history px-2 py-1 rounded bg-sky-600 text-white font-semibold hover:bg-sky-700" data-index="${index}">
            Load
          </button>
          <button class="btn-del-history p-1 text-slate-400 hover:text-rose-600 rounded" data-index="${index}">
            ✕
          </button>
        </div>
      `;

      card.querySelector(".btn-load-history").addEventListener("click", () => {
        if (confirm(`Load invoice #${item.invoiceNumber}? Current unsaved edits will be replaced.`)) {
          state = JSON.parse(JSON.stringify(item));
          initFormInputs();
          renderItemsEditor();
          triggerAutoSave();
          calculateAndRender();
          closeModal();
          showToast(`Loaded invoice #${item.invoiceNumber}`);
        }
      });

      card.querySelector(".btn-del-history").addEventListener("click", () => {
        const history = getHistory();
        history.splice(index, 1);
        setHistory(history);
        renderHistoryList();
      });

      listContainer.appendChild(card);
    });
  };

  if (btnSaveCurrent) {
    btnSaveCurrent.addEventListener("click", () => {
      const history = getHistory();
      const calc = getCalculations();
      const itemToSave = JSON.parse(JSON.stringify(state));
      itemToSave.cachedTotal = calc.grandTotal;
      itemToSave.savedAt = new Date().toISOString();

      history.unshift(itemToSave);
      setHistory(history.slice(0, 50));
      renderHistoryList();
      showToast("Invoice saved to history!");
    });
  }

  // Backup Export
  if (btnExport) {
    btnExport.addEventListener("click", () => {
      const backup = {
        draft: state,
        history: getHistory(),
        version: "1.0",
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice_Builder_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Backup Import
  if (inputImport) {
    inputImport.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          if (parsed.history) setHistory(parsed.history);
          if (parsed.draft) {
            state = parsed.draft;
            initFormInputs();
            renderItemsEditor();
            triggerAutoSave();
            calculateAndRender();
          }
          renderHistoryList();
          showToast("Backup imported successfully!");
        } catch (err) {
          alert("Invalid backup JSON file.");
        }
      };
      reader.readAsText(file);
    });
  }
}

/**
 * Toast Notification Helper
 */
function showToast(message, icon = "✓") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span class="font-bold">${icon}</span> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// UI Helpers
function bindInput(id, updater) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("input", (e) => {
    updater(e.target.value);
    triggerAutoSave();
    calculateAndRender();
  });
}

function bindClick(id, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener("click", handler);
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined && val !== null) el.value = val;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function toggleWrap(id, show) {
  const el = document.getElementById(id);
  if (el) el.style.display = show ? "" : "none";
}

function toggleCustomGstWrap(show) {
  const el = document.getElementById("custom-gst-wrap");
  if (el) {
    if (show) el.classList.remove("hidden");
    else el.classList.add("hidden");
  }
}

function updateBankControlsVisibility() {
  const controls = document.getElementById("bank-controls");
  const toggle = document.getElementById("toggle-bank");
  if (controls && toggle) {
    if (toggle.checked) controls.classList.remove("hidden");
    else controls.classList.add("hidden");
  }
}

function formatNumber(num) {
  if (num === undefined || num === null || isNaN(num)) return "0.00";
  return Number(num).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatCurrency(num, sym = "₹") {
  return `${sym} ${formatNumber(num)}`;
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

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
