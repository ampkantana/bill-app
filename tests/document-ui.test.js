const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("app.js", "utf8").replace(/\nboot\(\);\s*$/, "");
const cssSource = fs.readFileSync("styles.css", "utf8");
const htmlSource = fs.readFileSync("index.html", "utf8");
const schemaSource = fs.readFileSync("supabase/schema.sql", "utf8");
assert.match(htmlSource, /Cormorant\+Garamond/);
assert.match(htmlSource, /Montserrat/);
assert.match(htmlSource, /Sarabun/);
assert.match(htmlSource, /supabase-js/);
assert.match(htmlSource, /html2canvas/);
assert.match(htmlSource, /jspdf/);
assert.match(cssSource, /--font-display: "Cormorant Garamond"/);
assert.match(cssSource, /--font-sans: "Montserrat"/);
assert.match(cssSource, /--font-thai: "Sarabun"/);
assert.doesNotMatch(source, /\["services", "บริการ"\]/);
assert.doesNotMatch(source, /เพิ่มจากบริการ/);
assert.doesNotMatch(source, /servicePicker|invoiceServicePicker/);
const sandbox = {
  console,
  structuredClone,
  Intl,
  Date,
  Math,
  Number,
  String,
  URLSearchParams,
  Blob: class Blob {},
  URL: { createObjectURL: () => "blob:test", revokeObjectURL: () => {} },
  localStorage: { getItem: () => null, setItem: () => {} },
  sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  document: { createElement: () => ({ click: () => {} }), querySelector: () => null, querySelectorAll: () => [] },
  alert: () => {},
  confirm: () => true,
};

vm.createContext(sandbox);
vm.runInContext(`${source}
globalThis.__exports = {
  defaultState,
  state,
  documentTypeMeta,
  documentDateHtml,
  documentCustomerHtml,
  documentSellerHtml,
  documentNoteHtml,
  documentLabel,
  documentNumberHtml,
  deleteCustomer,
  deleteQuote,
  deleteInvoice,
  deletePayment,
  deleteReceipt,
  paymentInfoHtml,
  documentPrintTitle,
  documentPrintFitClass,
  calculatePdfContentScale,
  filteredReceiptHistory,
  passwordRecoveryRedirectUrl,
  isPasswordRecoveryUrl,
  validateNewPassword,
  renderDocumentLabelInputs,
  renderOriginalDocumentItems,
};`, sandbox);

const { defaultState, state, documentTypeMeta, documentDateHtml, documentCustomerHtml, documentSellerHtml, documentNoteHtml, documentLabel, documentNumberHtml, deleteCustomer, deleteQuote, deleteInvoice, deletePayment, deleteReceipt, paymentInfoHtml, documentPrintTitle, documentPrintFitClass, calculatePdfContentScale, filteredReceiptHistory, passwordRecoveryRedirectUrl, isPasswordRecoveryUrl, validateNewPassword, renderDocumentLabelInputs, renderOriginalDocumentItems } = sandbox.__exports;
const plain = (value) => JSON.parse(JSON.stringify(value));

assert.equal(defaultState.settings.qrCodeImage, "");
assert.equal(defaultState.settings.documentLabels.billTo, "Bill To");
assert.equal(documentLabel("billTo"), "Bill To");

assert.deepEqual(plain(documentTypeMeta("quote")), { title: "QUOTATION", label: "Quotation" });
assert.deepEqual(plain(documentTypeMeta("invoice")), { title: "INVOICE", label: "Invoice" });
assert.deepEqual(plain(documentTypeMeta("receipt")), { title: "RECEIPT", label: "Receipt" });
assert.equal(documentPrintTitle("invoice", { issueDate: "2026-05-12", projectName: "Tone club" }, { name: "K.GRING TONE CLUB" }), "2026.05.12InvoiceToneclub");
assert.equal(documentPrintTitle("quote", { issueDate: "2026-05-12" }, { name: "K.GRING TONE CLUB" }), "2026.05.12QuotationKGRINGTONECLUB");
assert.equal(documentPrintTitle("receipt", { issueDate: "2026-05-12", receiptNumber: "RC-2026-0001" }, null), "2026.05.12ReceiptRC20260001");
assert.equal(documentPrintFitClass("quote", { items: [{}, {}] }), "document-fit-spacious");
assert.equal(documentPrintFitClass("invoice", { items: Array.from({ length: 6 }, () => ({})) }), "document-fit-compact");
assert.equal(documentPrintFitClass("invoice", { items: Array.from({ length: 10 }, () => ({})) }), "document-fit-dense");
assert.equal(documentPrintFitClass("invoice", { items: Array.from({ length: 15 }, () => ({})) }), "document-fit-micro");
assert.equal(documentPrintFitClass("receipt", {}), "document-fit-receipt");
assert.equal(calculatePdfContentScale(900, 1000), 1);
assert.equal(calculatePdfContentScale(1200, 1000), 0.825);
assert.equal(passwordRecoveryRedirectUrl({ origin: "https://ampkantana.github.io", pathname: "/bill-app/", search: "", hash: "" }), "https://ampkantana.github.io/bill-app/?reset-password=1");
assert.equal(isPasswordRecoveryUrl({ search: "?reset-password=1", hash: "" }), true);
assert.equal(isPasswordRecoveryUrl({ search: "", hash: "#access_token=abc&type=recovery" }), true);
assert.deepEqual(plain(validateNewPassword({ password: "newpass123", confirmPassword: "newpass123" })), { password: "newpass123" });
assert.throws(() => validateNewPassword({ password: "123", confirmPassword: "123" }), /อย่างน้อย 6 ตัว/);
assert.throws(() => validateNewPassword({ password: "newpass123", confirmPassword: "wrongpass" }), /ไม่ตรงกัน/);

assert.match(documentNumberHtml("quote", { quoteNumber: "QT-2026-0001" }), /QT-2026-0001/);
assert.match(documentNumberHtml("invoice", { invoiceNumber: "INV-2026-0001" }), /INV-2026-0001/);

const quoteDateHtml = documentDateHtml("quote", { issueDate: "2026-05-10", expiryDate: "2026-05-20" }, null);
assert.match(quoteDateHtml, /Date/);
assert.doesNotMatch(quoteDateHtml, /วันที่/);
assert.doesNotMatch(quoteDateHtml, /ใช้ได้ถึง/);
assert.doesNotMatch(quoteDateHtml, /กำหนดชำระ/);

const customerHtml = documentCustomerHtml({ projectName: "K.GRING RENOVATION" }, { name: "K.GRING TONE CLUB" });
assert.match(customerHtml, /Project/);
assert.match(customerHtml, /Bill To/);
assert.match(customerHtml, /K.GRING RENOVATION/);
assert.match(customerHtml, /K.GRING TONE CLUB/);
assert.match(documentCustomerHtml({}, { name: "K.GRING TONE CLUB", taxId: "123", address: "Bangkok", phone: "099" }), /Tax ID/);
assert.match(documentCustomerHtml({}, { name: "K.GRING TONE CLUB", taxId: "123", address: "Bangkok", phone: "099" }), /Address/);
assert.match(documentCustomerHtml({}, { name: "K.GRING TONE CLUB", taxId: "123", address: "Bangkok", phone: "099" }), /Phone/);
assert.ok(customerHtml.indexOf("K.GRING RENOVATION") < customerHtml.indexOf("K.GRING TONE CLUB"));

state.settings.documentLabels.billTo = "Client";
state.settings.documentLabels.taxId = "";
const customCustomerHtml = documentCustomerHtml({}, { name: "K.GRING TONE CLUB", taxId: "123", address: "Bangkok", phone: "099" });
assert.match(customCustomerHtml, /Client/);
assert.doesNotMatch(customCustomerHtml, /Tax ID/);
assert.match(customCustomerHtml, /123/);
state.settings.documentLabels = { ...defaultState.settings.documentLabels };

const sellerHtml = documentSellerHtml();
assert.match(sellerHtml, /From/);
assert.match(sellerHtml, /Tax ID/);
assert.match(sellerHtml, /Address/);
assert.match(sellerHtml, /Phone/);
assert.match(sellerHtml, /E-mail/);

assert.match(documentNoteHtml({ note: "แก้แบบได้ 2 ครั้ง" }), /NOTE/);
assert.match(documentNoteHtml({ note: "แก้แบบได้ 2 ครั้ง" }), /แก้แบบได้ 2 ครั้ง/);
assert.equal(documentNoteHtml({ note: "" }), "");

state.customers = [{ id: "cus_delete", name: "Delete Me" }, { id: "cus_keep", name: "Keep Me" }];
state.quotes = [{ id: "qt_customer_delete", customerId: "cus_delete", quoteNumber: "QT-2026-0001" }];
state.invoices = [{ id: "inv_customer_delete", customerId: "cus_delete", invoiceNumber: "INV-2026-0001", totalDue: 5000 }];
state.payments = [{ id: "pay_customer_delete", invoiceId: "inv_customer_delete", customerId: "cus_delete", amount: 3000 }];
state.receipts = [{ id: "rc_customer_delete", invoiceId: "inv_customer_delete", customerId: "cus_delete", receiptNumber: "RC-2026-0001" }];
deleteCustomer("cus_delete");
assert.deepEqual(state.customers.map((customer) => customer.id), ["cus_keep"]);
assert.equal(state.quotes.length, 0);
assert.equal(state.invoices.length, 0);
assert.equal(state.payments.length, 0);
assert.equal(state.receipts.length, 0);

state.quotes = [{ id: "qt_sent", status: "sent", quoteNumber: "QT-2026-0001", customerId: "cus_kring" }];
deleteQuote("qt_sent");
assert.equal(state.quotes.length, 0);

state.invoices = [{ id: "inv_delete", invoiceNumber: "INV-2026-0001", quoteId: "qt_confirmed", customerId: "cus_kring", totalDue: 5000, paidAmount: 1000, balanceDue: 4000, status: "partial" }];
state.quotes = [{ id: "qt_confirmed", status: "confirmed", createdInvoiceId: "inv_delete", quoteNumber: "QT-2026-0001", customerId: "cus_kring" }];
state.payments = [{ id: "pay_delete_with_invoice", invoiceId: "inv_delete", customerId: "cus_kring", amount: 1000, paymentDate: "2026-05-10" }];
state.receipts = [{ id: "rc_delete_with_invoice", receiptNumber: "RC-2026-0001", invoiceId: "inv_delete", paymentId: "pay_delete_with_invoice", customerId: "cus_kring" }];
deleteInvoice("inv_delete");
assert.equal(state.invoices.length, 0);
assert.equal(state.payments.length, 0);
assert.equal(state.receipts.length, 0);
assert.equal(state.quotes[0].status, "sent");
assert.equal(state.quotes[0].createdInvoiceId, "");

state.invoices = [{ id: "inv_payment", invoiceNumber: "INV-2026-0002", customerId: "cus_kring", totalDue: 5000, paidAmount: 3000, balanceDue: 2000, status: "partial" }];
state.payments = [{ id: "pay_delete", invoiceId: "inv_payment", customerId: "cus_kring", amount: 3000, paymentDate: "2026-05-10" }];
state.receipts = [{ id: "rc_delete_with_payment", receiptNumber: "RC-2026-0002", invoiceId: "inv_payment", paymentId: "pay_delete", customerId: "cus_kring" }];
deletePayment("pay_delete");
assert.equal(state.payments.length, 0);
assert.equal(state.receipts.length, 0);
assert.equal(state.invoices[0].paidAmount, 0);
assert.equal(state.invoices[0].balanceDue, 5000);
assert.equal(state.invoices[0].status, "open");

state.invoices = [{ id: "inv_receipt", invoiceNumber: "INV-2026-0003", customerId: "cus_kring", totalDue: 5000, paidAmount: 3000, balanceDue: 2000, status: "partial" }];
state.payments = [{ id: "pay_keep", invoiceId: "inv_receipt", customerId: "cus_kring", amount: 3000, paymentDate: "2026-05-10" }];
state.receipts = [{ id: "rc_delete", receiptNumber: "RC-2026-0003", invoiceId: "inv_receipt", paymentId: "pay_keep", customerId: "cus_kring" }];
deleteReceipt("rc_delete");
assert.equal(state.receipts.length, 0);
assert.equal(state.payments.length, 1);
assert.equal(state.invoices[0].paidAmount, 3000);

state.customers = [{ id: "cus_a", name: "K.GRING" }, { id: "cus_b", name: "Oak House" }];
state.invoices = [
  { id: "inv_a", invoiceNumber: "INV-2026-0001", customerId: "cus_a", projectName: "Tone Club" },
  { id: "inv_b", invoiceNumber: "INV-2026-0002", customerId: "cus_b", projectName: "Office Lobby" },
];
state.receipts = [
  { id: "rc_a", receiptNumber: "RC-2026-0001", invoiceId: "inv_a", customerId: "cus_a", issueDate: "2026-05-05", amount: 3000 },
  { id: "rc_b", receiptNumber: "RC-2026-0002", invoiceId: "inv_b", customerId: "cus_b", issueDate: "2026-05-20", amount: 8000 },
];
assert.deepEqual(filteredReceiptHistory({}).map((entry) => entry.receipt.id), ["rc_b", "rc_a"]);
assert.deepEqual(filteredReceiptHistory({ query: "tone" }).map((entry) => entry.receipt.id), ["rc_a"]);
assert.deepEqual(filteredReceiptHistory({ query: "RC-2026-0002" }).map((entry) => entry.receipt.id), ["rc_b"]);
assert.deepEqual(filteredReceiptHistory({ startDate: "2026-05-10", endDate: "2026-05-30" }).map((entry) => entry.receipt.id), ["rc_b"]);

assert.match(source, /id="quoteQrInput"/);
assert.match(source, /name="projectName"/);
assert.doesNotMatch(source, /name="expiryDate"/);
assert.match(source, /renderOriginalDocumentItems/);
assert.match(source, /CLOUD_CONFIG_KEY/);
assert.match(source, /app_states/);
assert.match(source, /signInWithPassword/);
assert.match(source, /resetPasswordForEmail/);
assert.match(source, /updateUser\(\{ password/);
assert.match(source, /if \(\s*hasCloudConfig\(\) && isPasswordRecoveryUrl\(\)\s*\)\s*\{[\s\S]*renderLogin\(\);[\s\S]*return;[\s\S]*\}[\s\S]*restoreCloudSession/);
assert.match(source, /id="forgotPasswordButton"/);
assert.match(source, /id="resetPasswordForm"/);
assert.match(source, /migrateLocalDataToCloud/);
assert.match(source, /cloud-email/);
assert.match(source, /cloud-password/);
assert.match(source, /loadCloudState/);
assert.match(source, /SESSION_MODE_CLOUD/);
assert.match(source, /restoreCloudSession/);
assert.match(source, /boot\(\)/);
assert.match(source, /normalizeSupabaseUrl/);
assert.match(source, /validateCloudConfig/);
assert.match(source, /validateCloudCredentials/);
assert.match(source, /กรอก Email และ Password ก่อน/);
assert.match(source, /sb_secret_/);
assert.match(source, /Publishable \/ anon key/);
assert.match(source, /แก้ไข Cloud config/);
assert.match(source, /cloud-config-summary/);
assert.doesNotMatch(source, /SESSION_MODE_LOCAL/);
assert.doesNotMatch(source, /pinInput/);
assert.doesNotMatch(source, /เข้าแบบ local\/PIN เดิม/);
assert.match(schemaSource, /create table if not exists public\.app_states/);
assert.match(schemaSource, /enable row level security/);
assert.match(schemaSource, /auth\.uid\(\) = user_id/);
assert.match(source, /classic-bill/);
assert.match(source, /bill-party-freeform/);
assert.doesNotMatch(source, /<section class="bill-party-grid"/);
assert.match(source, /bill-line-table/);
assert.match(source, /bill-footer-table/);
assert.match(source, /data-edit-quote/);
assert.match(source, /syncInvoiceFromQuote/);
assert.match(source, /data-receipt-invoice/);
assert.match(source, /id="receiptHistoryFilterForm"/);
assert.match(source, /ค้นหาเลขใบเสร็จ ลูกค้า หรือโปรเจกต์/);
assert.match(source, /data-action="print-document"/);
assert.match(source, /data-action="export-document-pdf"/);
assert.match(source, /function printDocument/);
assert.match(source, /async function exportDocumentPdf/);
assert.match(source, /pdf\.save\(`\$\{printTitle\}\.pdf`\)/);
assert.match(source, /calculatePdfContentScale/);
assert.match(source, /fitDocumentForPdfExport/);
assert.match(source, /documentPrintTitle/);
assert.match(source, /documentPrintFitClass/);
assert.match(source, /classic-bill \$\{fitClass\}/);
assert.match(source, /bill-content/);
assert.match(source, /document.title = printTitle/);
assert.doesNotMatch(source, /onclick="window\.print\(\)"/);
assert.doesNotMatch(cssSource, /classic-bill::before/);
assert.doesNotMatch(cssSource, /classic-bill::after/);
assert.match(cssSource, /--bill-paper: var\(--page-bg\)/);
assert.match(cssSource, /--bill-ink: var\(--ink\)/);
assert.match(cssSource, /--bill-line: var\(--line-strong\)/);
assert.match(cssSource, /--page-bg: #fbf4ef/);
assert.match(cssSource, /--bg: #f6ebe2/);
assert.match(cssSource, /@media print[\s\S]*background: var\(--page-bg\)/);
assert.match(cssSource, /@media print[\s\S]*height: 297mm/);
assert.match(cssSource, /@media print[\s\S]*overflow: hidden/);
assert.match(cssSource, /@media print[\s\S]*\.classic-bill[\s\S]*padding: 20mm 14mm 14mm/);
assert.match(cssSource, /@media print[\s\S]*print-color-adjust: exact/);
assert.match(cssSource, /@media print[\s\S]*--print-fit-font: 11px/);
assert.match(cssSource, /@media print[\s\S]*max-height: 297mm/);
assert.match(cssSource, /@media print[\s\S]*overflow: hidden/);
assert.match(cssSource, /@media print[\s\S]*break-after: avoid/);
assert.match(cssSource, /@media print[\s\S]*\.classic-bill h2[\s\S]*font-size: 56px/);
assert.match(cssSource, /@media print[\s\S]*\.bill-line-table td[\s\S]*height: 46px/);
assert.match(cssSource, /@media print[\s\S]*\.bill-payment-qr[\s\S]*width: 70px/);
assert.match(cssSource, /\.bill-lines-spacious[\s\S]*font-size: 17px/);
assert.match(cssSource, /\.bill-lines-dense[\s\S]*font-size: 11px/);
assert.match(cssSource, /\.bill-row-filler:last-child td\s*\{[\s\S]*height: 290px/);
assert.match(cssSource, /\.bill-footer-table\s*\{[\s\S]*margin-top: 0/);
assert.match(cssSource, /\.bill-footer-table\s*\{[\s\S]*border-top: 0/);
assert.match(cssSource, /@media print[\s\S]*\.bill-lines-spacious[\s\S]*font-size: 14px/);
assert.match(cssSource, /@media print[\s\S]*\.bill-lines-dense[\s\S]*font-size: 8px/);
assert.match(cssSource, /@media print[\s\S]*\.bill-row-filler:last-child td\s*\{[\s\S]*height: 230px/);
assert.match(cssSource, /@media print[\s\S]*\.document-fit-spacious \.bill-row-filler:last-child td\s*\{[\s\S]*height: 254px/);
assert.match(cssSource, /@media print[\s\S]*\.document-fit-compact[\s\S]*padding-top: 16mm/);
assert.match(cssSource, /@media print[\s\S]*\.document-fit-dense[\s\S]*padding: 12mm 12mm 8mm/);
assert.match(cssSource, /@media print[\s\S]*\.document-fit-micro \.bill-line-table td[\s\S]*font-size: 6\.7px/);
assert.match(cssSource, /@media print[\s\S]*\.document-fit-receipt[\s\S]*padding-top: 18mm/);
assert.match(cssSource, /@media print[\s\S]*table\s*\{[\s\S]*display: table/);
assert.match(cssSource, /@media print[\s\S]*thead\s*\{[\s\S]*display: table-header-group/);
assert.match(cssSource, /@media print[\s\S]*td::before\s*\{[\s\S]*content: none/);
assert.match(cssSource, /@media \(max-width: 980px\)[\s\S]*\.document table\s*\{[\s\S]*display: table/);
assert.match(cssSource, /@media \(max-width: 980px\)[\s\S]*\.document td::before\s*\{[\s\S]*content: none/);
assert.match(cssSource, /border-left: 0/);
assert.match(cssSource, /border-right: 0/);
assert.match(cssSource, /\.is-exporting-pdf[\s\S]*background: var\(--page-bg\)/);
assert.match(cssSource, /\.is-exporting-pdf \.classic-bill[\s\S]*width: 210mm/);
assert.match(cssSource, /\.is-exporting-pdf \.classic-bill[\s\S]*height: 297mm/);
assert.match(cssSource, /\.is-exporting-pdf \.bill-content[\s\S]*--pdf-content-scale/);
assert.match(cssSource, /\.is-exporting-pdf \.payment-panel[\s\S]*display: flex/);
assert.match(cssSource, /\.is-exporting-pdf \.document-payment-grid[\s\S]*grid-template-columns:/);

let paymentInfo = paymentInfoHtml();
assert.match(paymentInfo, /ธนาคารไทยพาณิชย์/);
assert.match(paymentInfo, /กันตนา วัดสง่า/);
assert.match(paymentInfo, /402-823-5536/);
assert.doesNotMatch(paymentInfo, /<img/);

state.settings.qrCodeImage = "data:image/png;base64,qr-test";
paymentInfo = paymentInfoHtml();
assert.match(paymentInfo, /<img/);
assert.match(paymentInfo, /data:image\/png;base64,qr-test/);

const billTable = renderOriginalDocumentItems({
  items: [{ description: "RECEPTION AREA VIEW 1,3", quantity: 2, unitPrice: 4000, amount: 4000 }],
  note: "แก้แบบได้ 2 ครั้ง",
  subtotal: 4000,
  withholdingAmount: 120,
  totalDue: 3880,
});
assert.match(billTable, /bill-line-table bill-lines-spacious/);
assert.match(billTable, /bill-row-filler/);
assert.match(billTable, /ITEM/);
assert.doesNotMatch(billTable, /ลำดับที่/);
assert.match(billTable, /PARTICULARS/);
assert.match(billTable, /NOTE/);
assert.match(billTable, /PAYMENT TO/);
assert.match(billTable, /SUBTOTAL/);
assert.match(billTable, /WITHHOLDING TAX 3%/);
assert.match(billTable, /TOTAL DUE/);

const denseBillTable = renderOriginalDocumentItems({
  items: Array.from({ length: 9 }, (_, index) => ({ description: `ITEM ${index + 1}`, quantity: 1, unitPrice: 1000, amount: 1000 })),
});
assert.match(denseBillTable, /bill-line-table bill-lines-dense/);
assert.doesNotMatch(denseBillTable, /bill-row-filler/);

const calculatedBillTable = renderOriginalDocumentItems({
  items: [{ description: "EXTERIOR VIEW", quantity: 1, unitPrice: 4000, amount: 4000 }],
  note: "",
});
assert.match(calculatedBillTable, /ปรับแก้จำนวน 2 ครั้ง/);
assert.match(calculatedBillTable, /มัดจำ 70% ก่อนส่งงานครั้งแรก/);
assert.match(calculatedBillTable, /ส่วนที่เหลือหลัง/);
assert.match(calculatedBillTable, /SUBTOTAL[\s\S]*4,000 บาท/);
assert.match(calculatedBillTable, /WITHHOLDING TAX 3%[\s\S]*120 บาท/);
assert.match(calculatedBillTable, /AMOUNT[\s\S]*3,880 บาท/);

state.settings.qrCodeImage = "data:image/png;base64,qr-test";
state.settings.documentLabels.item = "#";
state.settings.documentLabels.particulars = "Description";
state.settings.documentLabels.note = "";
const customBillTable = renderOriginalDocumentItems({
  items: [{ description: "EXTERIOR VIEW", quantity: 1, unitPrice: 4000, amount: 4000 }],
  note: "แก้แบบได้ 2 ครั้ง",
});
assert.match(customBillTable, />#<\/th>/);
assert.match(customBillTable, /Description/);
assert.doesNotMatch(customBillTable, /NOTE/);
assert.match(customBillTable, /แก้แบบได้ 2 ครั้ง/);
assert.match(renderDocumentLabelInputs(), /name="documentLabels\.billTo"/);
state.settings.documentLabels = { ...defaultState.settings.documentLabels };

assert.match(renderOriginalDocumentItems({ items: [], subtotal: 0, withholdingAmount: 0, totalDue: 0 }), /bill-payment-qr/);
