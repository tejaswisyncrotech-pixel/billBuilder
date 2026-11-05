# 🧾 Invoice Builder Web App (GST Ready & Responsive)

A modern, fast, and fully responsive web application to create, customize, and share professional invoices. It features automatic Indian GST calculation (CGST/SGST/IGST), pixel-perfect A4 PDF export, Microsoft Word (.doc) export, UPI payment QR code generation, local auto-save, and zero-cost hosting on **GitHub Pages**.

---

## ✨ Features

- **📱 Fully Responsive**:
  - **Desktop (> 1024px)**: Side-by-side split screen (Live Editor on the left, Real-time A4 Invoice Preview on the right).
  - **Mobile & Tablet (< 1024px)**: Convenient segmented tab switcher (**Edit Mode** ⇄ **Live Preview**) + floating quick action bar.
- **📄 Sample Invoice Layout Match**: Replicates the layout, typography, and structure of the **Syncrotech Technologies LLP** invoice:
  - Header: Company Details (Name, Address, Mobile, Email, Logo).
  - Invoice Meta: Number, Date, and optional Due Date.
  - Client Details: "Bill To" section with Name, Address, Contact, and GSTIN.
  - Table: Dynamic line items (Description, Amount/Rate, Quantity, Row Total).
  - Notes: Warranty clauses ("15 Days Laptop Warranty", "6 Month charger warranty").
  - Query Banner: Highlighted contact box for client inquiries.
  - Closing & Signatory: "THANK YOU FOR YOUR BUSINESS...!" + Authorized Signatory.
- **🧮 Automated GST & Financial Engine**:
  - Automatically calculates line item totals ($\text{Rate} \times \text{Quantity}$).
  - **Intra-State GST**: Automatically splits into **CGST** (e.g. 9%) + **SGST** (e.g. 9%).
  - **Inter-State GST**: Direct **IGST** (e.g. 18%).
  - Slabs: 0%, 5%, 12%, 18%, 28%, or Custom %.
  - Supports **Tax Exclusive** and **Tax Inclusive** unit pricing.
  - Optional Discounts (flat ₹ or % off).
  - Automatic Paise Round-off.
  - **Amount in Words Generator**: Automatically converts numbers to words (e.g. *Rupees Thirty-Four Thousand Only*).
- **💳 Bank Details & Scannable UPI QR Code**:
  - Enter your UPI ID (e.g. `9834265385@upi`) to auto-generate a scannable payment QR code directly on the invoice for instant payments via Google Pay, PhonePe, and Paytm.
- **💾 Offline-First & Draft History**:
  - Auto-saves edits to browser `localStorage` in real time.
  - History Manager: Save drafts, load past invoices, or export/import JSON backups.
- **📤 Export & Sharing**:
  - **Download PDF**: Vector-crisp A4 print export.
  - **Download Word DOC**: Editable `.doc` file formatted for Microsoft Word and Google Docs.
  - **Mobile Share**: Direct WhatsApp sharing and native iOS/Android share sheet.
  - **Direct Print**: Print-ready stylesheet hiding all interface controls.

---

## 🚀 How to Run Locally

Because this application uses standard modern web technologies without any heavy build step, you can run it immediately:

### Option 1: Using Python (Built-in)
```bash
cd Invoice-builder
python3 -m http.server 8000
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

### Option 2: Using Node.js `npx serve`
```bash
cd Invoice-builder
npx serve .
```

---

## 🌐 How to Host on GitHub Pages (Step-by-Step)

This app is 100% static and requires zero server configuration.

### Method 1: Automatic via GitHub Pages Settings (Easiest)
1. Initialize git and commit your files:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Invoice Builder"
   ```
2. Create a new repository on [GitHub](https://github.com/new) (e.g., `invoice-builder`).
3. Link your remote repository and push:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<your-username>/invoice-builder.git
   git push -u origin main
   ```
4. On GitHub, go to your repository:
   - Click **Settings** $\rightarrow$ **Pages** (on the left sidebar).
   - Under **Build and deployment** $\rightarrow$ **Source**, choose **Deploy from a branch**.
   - Under **Branch**, select `main` and folder `/ (root)`.
   - Click **Save**.
5. Your app will be live at:
   `https://<your-username>.github.io/invoice-builder/`

### Method 2: Automated GitHub Actions
The repository includes `.github/workflows/deploy.yml`. When you push to the `main` branch, GitHub Actions will automatically deploy the site.

---

## 📁 File Structure

```
Invoice-builder/
├── index.html                 # Main single-page web application
├── css/
│   └── style.css              # A4 simulation, responsive layout, print rules
├── js/
│   ├── app.js                 # Reactive state, calculation engine, DOM binding
│   ├── words.js               # Indian currency number-to-words converter
│   ├── export.js              # PDF, Word DOC, and Share utilities
│   └── sample-data.js         # Default Syncrotech sample invoice data
├── .github/
│   └── workflows/
│       └── deploy.yml         # GitHub Pages automated deployment workflow
└── README.md                  # Documentation and hosting guide
```
