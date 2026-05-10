const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("app.js", "utf8").replace(/\napp\(\);\s*$/, "");
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
  documentNumberHtml,
  deleteQuote,
  paymentInfoHtml,
};`, sandbox);

const { defaultState, state, documentTypeMeta, documentDateHtml, documentCustomerHtml, documentSellerHtml, documentNoteHtml, documentNumberHtml, deleteQuote, paymentInfoHtml } = sandbox.__exports;
const plain = (value) => JSON.parse(JSON.stringify(value));

assert.equal(defaultState.settings.qrCodeImage, "");

assert.deepEqual(plain(documentTypeMeta("quote")), { title: "ใบเสนอราคา", label: "Quotation" });
assert.deepEqual(plain(documentTypeMeta("invoice")), { title: "INVOICE", label: "Invoice" });
assert.deepEqual(plain(documentTypeMeta("receipt")), { title: "RECEIPT", label: "Receipt" });

assert.equal(documentNumberHtml("quote", { quoteNumber: "QT-2026-0001" }), "");
assert.match(documentNumberHtml("invoice", { invoiceNumber: "INV-2026-0001" }), /INV-2026-0001/);

const quoteDateHtml = documentDateHtml("quote", { issueDate: "2026-05-10", expiryDate: "2026-05-20" }, null);
assert.match(quoteDateHtml, /วันที่/);
assert.match(quoteDateHtml, /ใช้ได้ถึง/);
assert.doesNotMatch(quoteDateHtml, /กำหนดชำระ/);

const customerHtml = documentCustomerHtml({ projectName: "K.GRING RENOVATION" }, { name: "K.GRING TONE CLUB" });
assert.match(customerHtml, /Project/);
assert.match(customerHtml, /K.GRING RENOVATION/);
assert.match(customerHtml, /K.GRING TONE CLUB/);
assert.match(documentCustomerHtml({}, { name: "K.GRING TONE CLUB", taxId: "123", address: "Bangkok", phone: "099" }), /หมายเลขผู้เสียภาษี/);
assert.match(documentCustomerHtml({}, { name: "K.GRING TONE CLUB", taxId: "123", address: "Bangkok", phone: "099" }), /ที่อยู่/);
assert.match(documentCustomerHtml({}, { name: "K.GRING TONE CLUB", taxId: "123", address: "Bangkok", phone: "099" }), /โทร/);
assert.ok(customerHtml.indexOf("K.GRING RENOVATION") < customerHtml.indexOf("K.GRING TONE CLUB"));

const sellerHtml = documentSellerHtml();
assert.match(sellerHtml, /ข้าพเจ้า/);
assert.match(sellerHtml, /หมายเลขผู้เสียภาษี/);
assert.match(sellerHtml, /ที่อยู่ปัจจุบัน/);
assert.match(sellerHtml, /โทร/);
assert.match(sellerHtml, /E-mail/);

assert.match(documentNoteHtml({ note: "แก้แบบได้ 2 ครั้ง" }), /หมายเหตุ/);
assert.match(documentNoteHtml({ note: "แก้แบบได้ 2 ครั้ง" }), /แก้แบบได้ 2 ครั้ง/);
assert.equal(documentNoteHtml({ note: "" }), "");

state.quotes = [{ id: "qt_sent", status: "sent", quoteNumber: "QT-2026-0001", customerId: "cus_kring" }];
deleteQuote("qt_sent");
assert.equal(state.quotes.length, 0);

assert.match(source, /id="quoteQrInput"/);
assert.match(source, /name="projectName"/);
assert.match(source, /renderOriginalDocumentItems/);

let paymentInfo = paymentInfoHtml();
assert.match(paymentInfo, /ธนาคารไทยพาณิชย์/);
assert.match(paymentInfo, /กันตนา วัดสง่า/);
assert.match(paymentInfo, /402-823-5536/);
assert.doesNotMatch(paymentInfo, /<img/);

state.settings.qrCodeImage = "data:image/png;base64,qr-test";
paymentInfo = paymentInfoHtml();
assert.match(paymentInfo, /<img/);
assert.match(paymentInfo, /data:image\/png;base64,qr-test/);
