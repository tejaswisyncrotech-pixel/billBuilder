/**
 * Sample Invoice Data matching the user's attached invoice (Syncrotech Technologies LLP)
 */
export const defaultInvoiceData = {
  template: "classic", // "classic", "modern", "minimal"
  currency: "₹",
  invoiceTitle: "Invoice",
  invoiceNumber: "26/01/10",
  invoiceDate: "2026-01-19",
  dueDate: "",
  poNumber: "",

  // Company Details
  company: {
    name: "SYNCROTECH TECHNOLOGIES LLP",
    address: "Shitala Nagar 2\nDehuraod, Pune 412101",
    phone: "+919834265385",
    email: "info@syncrotech.in",
    gstin: "",
    pan: "",
    logo: ""
  },

  // Bill To (Client) Details
  client: {
    name: "Elysian Elevators",
    address: "Moshi Pradhikaran 411026",
    phone: "",
    email: "",
    gstin: "",
    state: "Maharashtra"
  },

  // Line items
  items: [
    {
      id: "item-1",
      description: "Laptop (i5 256 GB SSD, with charger)",
      hsn: "8471",
      rate: 17000,
      quantity: 2,
      taxPercent: 0
    }
  ],

  // Tax & Financial Settings
  tax: {
    enabled: false,       // Set to true when GST is applied
    mode: "intra",        // "intra" (CGST + SGST) or "inter" (IGST)
    rate: 18,             // 18% standard GST
    isInclusive: false,   // tax added on top
    discountType: "flat", // "flat" or "percent"
    discountValue: 0,
    roundOff: true
  },

  // Bank & UPI Details (Optional)
  bank: {
    enabled: false,
    bankName: "HDFC Bank",
    accountNumber: "50200012345678",
    ifscCode: "HDFC0001234",
    branch: "Pune",
    upiId: "9834265385@upi"
  },

  // Notes & Footer
  notes: "15 Days Laptop Warranty.\n6 Month charger warranty",
  queryBanner: "If you have any query, please reach out to us on (+91) 9834265385 or info@syncrotech.in",
  thankYouMessage: "THANK YOU FOR YOUR BUSINESS...!",
  signatoryText: "Syncrotech Technologies LLP",
  signatureImage: ""
};

