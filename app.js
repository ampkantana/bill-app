const STORAGE_KEY = "kantana-erp-v1";
const PIN_KEY = "kantana-erp-session";

const defaultState = {
  settings: {
    businessName: "กันตนา วัดสง่า",
    taxId: "1100400498763",
    address: "341/9 ถนน บ้านหม้อ แขวง วังบูรพาภิรมย์ เขตพระนคร กรุงเทพ",
    phone: "094-416-5426",
    email: "kantana.amp@gmail.com",
    bankName: "ธนาคารไทยพาณิชย์",
    bankAccountName: "กันตนา วัดสง่า",
    bankAccountNumber: "402-823-5536",
    qrCodeImage: "",
    defaultWithholdingPercent: 3,
    pin: "1234",
  },
  counters: {
    QT: 1,
    INV: 1,
    RC: 1,
  },
  customers: [
    {
      id: "cus_kring",
      name: "K.GRING TONE CLUB",
      taxId: "",
      address: "",
      phone: "",
      email: "",
      note: "",
      createdAt: new Date().toISOString(),
    },
  ],
  services: [
    { id: "svc_reception", name: "RECEPTION AREA VIEW", description: "RECEPTION AREA VIEW 1,3", unit: "ภาพ", unitPrice: 4000, category: "Render", active: true },
    { id: "svc_pirates", name: "PIRATES AREA VIEW", description: "PIRATES AREA VIEW 4,6", unit: "ภาพ", unitPrice: 4000, category: "Render", active: true },
    { id: "svc_dressing", name: "DRESSING ROOM VIEW", description: "DRESSING ROOM VIEW 7,<11,12>", unit: "ภาพ", unitPrice: 3000, category: "Render", active: true },
    { id: "svc_exterior", name: "EXTERIOR VIEW", description: "EXTERIOR VIEW", unit: "ภาพ", unitPrice: 4000, category: "Render", active: true },
  ],
  quotes: [],
  invoices: [],
  payments: [],
  receipts: [],
  activities: [],
};

let state = loadState();
let activeView = "dashboard";
let selectedCustomerId = state.customers[0]?.id || null;
let selectedDocument = null;

const navItems = [
  ["dashboard", "Dashboard"],
  ["customers", "ลูกค้า"],
  ["quotes", "ใบเสนอราคา"],
  ["invoices", "ใบแจ้งหนี้"],
  ["payments", "รับเงิน"],
  ["receipts", "ใบเสร็จ"],
  ["reports", "รายงาน"],
  ["settings", "ตั้งค่า"],
];

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return structuredClone(defaultState);
    const parsed = JSON.parse(saved);
    const base = structuredClone(defaultState);
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...(parsed.settings || {}) },
      counters: { ...base.counters, ...(parsed.counters || {}) },
      customers: parsed.customers || base.customers,
      services: parsed.services || base.services,
      quotes: parsed.quotes || base.quotes,
      invoices: parsed.invoices || base.invoices,
      payments: parsed.payments || base.payments,
      receipts: parsed.receipts || base.receipts,
      activities: parsed.activities || base.activities,
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function isLoggedIn() {
  return sessionStorage.getItem(PIN_KEY) === "ok";
}

function money(value) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function thaiDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function startOfCurrentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function isInDateRange(value, startDate, endDate) {
  if (!value) return false;
  return (!startDate || value >= startDate) && (!endDate || value <= endDate);
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadTextFile(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function nextNumber(prefix) {
  const year = new Date().getFullYear();
  const next = state.counters[prefix] || 1;
  state.counters[prefix] = next + 1;
  return `${prefix}-${year}-${String(next).padStart(4, "0")}`;
}

function calculate(items, withholdingEnabled = true, withholdingPercent = state.settings.defaultWithholdingPercent) {
  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const withholdingAmount = withholdingEnabled ? Math.round((subtotal * Number(withholdingPercent || 0)) / 100) : 0;
  return {
    subtotal,
    withholdingEnabled,
    withholdingPercent: Number(withholdingPercent || 0),
    withholdingAmount,
    totalDue: subtotal - withholdingAmount,
  };
}

function customerById(id) {
  return state.customers.find((customer) => customer.id === id);
}

function serviceById(id) {
  return state.services.find((service) => service.id === id);
}

function blankLineItem() {
  return { serviceId: "", description: "", quantity: 1, unitPrice: 0, amount: 0 };
}

function cleanLineItems(items) {
  return items.filter((item) => String(item.description || "").trim() || Number(item.amount || 0) > 0);
}

function invoicePayments(invoiceId) {
  return state.payments.filter((payment) => payment.invoiceId === invoiceId);
}

function recalcInvoice(invoice) {
  const paidAmount = invoicePayments(invoice.id).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const balanceDue = Math.max(Number(invoice.totalDue || 0) - paidAmount, 0);
  invoice.paidAmount = paidAmount;
  invoice.balanceDue = balanceDue;
  if (invoice.status !== "cancelled") {
    invoice.status = paidAmount <= 0 ? "open" : balanceDue > 0 ? "partial" : "paid";
  }
  return invoice;
}

function addActivity(entityType, entityId, message) {
  state.activities.unshift({
    id: uid("act"),
    entityType,
    entityId,
    message,
    createdAt: new Date().toISOString(),
  });
}

function statusText(status) {
  return {
    draft: "ร่าง",
    sent: "ส่งแล้ว",
    confirmed: "คอนเฟิร์มแล้ว",
    cancelled: "ยกเลิก",
    open: "ยังไม่ชำระ",
    partial: "ชำระบางส่วน",
    paid: "ชำระครบ",
  }[status] || status || "-";
}

function documentTypeMeta(type) {
  return {
    quote: { title: "ใบเสนอราคา", label: "Quotation" },
    invoice: { title: "INVOICE", label: "Invoice" },
    receipt: { title: "RECEIPT", label: "Receipt" },
  }[type] || { title: "DOCUMENT", label: "Document" };
}

function documentDateHtml(type, doc, base) {
  const validUntil = type === "quote" ? doc.expiryDate : base?.dueDate;
  const secondLabel = type === "quote" ? "ใช้ได้ถึง" : "กำหนดชำระ";
  return `<strong>วันที่</strong><br>${thaiDate(doc.issueDate)}${validUntil ? `<br><br><strong>${secondLabel}</strong><br>${thaiDate(validUntil)}` : ""}`;
}

function documentCustomerHtml(doc, customer) {
  return `
    ${doc.projectName ? `<p class="project-label">Project</p><p class="project-name">${doc.projectName}</p>` : ""}
    <p class="customer-label">ถึง</p>
    <p class="customer-name">${customer?.name || "-"}</p>
    <dl class="document-details">
      <div><dt>หมายเลขผู้เสียภาษี</dt><dd>${customer?.taxId || "-"}</dd></div>
      <div><dt>ที่อยู่</dt><dd>${customer?.address || "-"}</dd></div>
      <div><dt>โทร</dt><dd>${customer?.phone || "-"}</dd></div>
      ${customer?.email ? `<div><dt>E-mail</dt><dd>${customer.email}</dd></div>` : ""}
    </dl>
  `;
}

function documentSellerHtml() {
  return `
    <p class="seller-label">ข้าพเจ้า</p>
    <p class="seller-name">${state.settings.businessName}</p>
    <dl class="document-details">
      <div><dt>หมายเลขผู้เสียภาษี</dt><dd>${state.settings.taxId || "-"}</dd></div>
      <div><dt>ที่อยู่ปัจจุบัน</dt><dd>${state.settings.address || "-"}</dd></div>
      <div><dt>โทร</dt><dd>${state.settings.phone || "-"}</dd></div>
      <div><dt>E-mail</dt><dd>${state.settings.email || "-"}</dd></div>
    </dl>
  `;
}

function documentNumberHtml(type, doc) {
  if (type === "quote") return "";
  const number = doc.invoiceNumber || doc.receiptNumber || "";
  return number ? `<p>${number}</p>` : "";
}

function documentNoteHtml(doc) {
  const note = String(doc.note || "").trim();
  return note ? `<div class="document-box note-box"><strong>หมายเหตุ</strong><br>${note}</div>` : "";
}

function paymentInfoHtml() {
  return `
    <div class="payment-panel">
      <div>
        <strong>Payment to</strong>
        <p>${state.settings.bankName}<br>${state.settings.bankAccountName}<br>${state.settings.bankAccountNumber}</p>
      </div>
      ${state.settings.qrCodeImage ? `<img class="qr-code" src="${state.settings.qrCodeImage}" alt="Payment QR Code">` : ""}
    </div>
  `;
}

function app() {
  if (!isLoggedIn()) {
    renderLogin();
    return;
  }
  renderShell();
}

function renderLogin() {
  document.querySelector("#app").innerHTML = `
    <main class="login-screen">
      <form class="login-card" id="loginForm">
        <p class="eyebrow">Kantana ERP</p>
        <h1>เข้าสู่ระบบ</h1>
        <p>ใส่ PIN เพื่อเข้าโปรแกรมออกเอกสารและติดตามยอดรับเงิน</p>
        <label>
          PIN
          <input id="pinInput" type="password" inputmode="numeric" autocomplete="current-password" placeholder="ค่าเริ่มต้น 1234" />
        </label>
        <div class="actions" style="margin-top: 16px">
          <button class="button primary" type="submit">เข้าสู่ระบบ</button>
        </div>
      </form>
    </main>
  `;
  document.querySelector("#loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (document.querySelector("#pinInput").value === state.settings.pin) {
      sessionStorage.setItem(PIN_KEY, "ok");
      app();
    } else {
      alert("PIN ไม่ถูกต้อง");
    }
  });
}

function renderShell() {
  document.querySelector("#app").innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <strong>Kantana ERP</strong>
          <span>Quote to cash workflow</span>
        </div>
        <nav class="nav-list">${renderNav()}</nav>
      </aside>
      <main class="main">
        <div id="view"></div>
      </main>
      <nav class="mobile-tabs">${renderMobileNav()}</nav>
    </div>
  `;
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      activeView = button.dataset.view;
      selectedDocument = null;
      renderShell();
    });
  });
  renderView();
}

function renderNav() {
  return navItems
    .map(([view, label]) => `<button class="nav-button ${activeView === view ? "active" : ""}" data-view="${view}" type="button">${label}</button>`)
    .join("");
}

function renderMobileNav() {
  return [
    ["dashboard", "หน้าแรก"],
    ["customers", "ลูกค้า"],
    ["quotes", "เอกสาร"],
    ["payments", "รับเงิน"],
    ["reports", "รายงาน"],
  ]
    .map(([view, label]) => `<button class="nav-button ${activeView === view ? "active" : ""}" data-view="${view}" type="button">${label}</button>`)
    .join("");
}

function page(title, subtitle, actions = "", body = "") {
  document.querySelector("#view").innerHTML = `
    <header class="topbar">
      <div class="page-title">
        <p class="eyebrow">ERP Billing</p>
        <h1>${title}</h1>
        <p>${subtitle}</p>
      </div>
      <div class="actions">${actions}</div>
    </header>
    ${body}
  `;
}

function renderView() {
  const renderers = {
    dashboard: renderDashboard,
    customers: renderCustomers,
    quotes: renderQuotes,
    invoices: renderInvoices,
    payments: renderPayments,
    receipts: renderReceipts,
    reports: renderReports,
    settings: renderSettings,
  };
  renderers[activeView]();
}

function totals() {
  state.invoices.forEach(recalcInvoice);
  const invoices = state.invoices.filter((invoice) => invoice.status !== "cancelled");
  const totalInvoiced = invoices.reduce((sum, invoice) => sum + invoice.totalDue, 0);
  const totalPaid = invoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0);
  const totalOutstanding = invoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0);
  const openQuotes = state.quotes.filter((quote) => quote.status === "sent").length;
  return { totalInvoiced, totalPaid, totalOutstanding, openQuotes };
}

function renderDashboard() {
  const t = totals();
  const unpaidInvoices = state.invoices.filter((invoice) => ["open", "partial"].includes(recalcInvoice(invoice).status));
  const monthlyPayments = buildMonthlyPayments();
  const topCustomers = buildTopCustomers();
  const topServices = buildTopServices();
  const actionItems = [
    ...unpaidInvoices.map((invoice) => ({
      label: `${invoice.invoiceNumber} - ${customerById(invoice.customerId)?.name || "-"}`,
      detail: `ค้าง ${money(invoice.balanceDue)} บาท`,
      action: "รับเงิน",
      onClick: `receive:${invoice.id}`,
    })),
    ...state.quotes.filter((quote) => quote.status === "sent").map((quote) => ({
      label: `${quote.quoteNumber} - ${customerById(quote.customerId)?.name || "-"}`,
      detail: `รอคอนเฟิร์ม ${money(quote.totalDue)} บาท`,
      action: "คอนเฟิร์ม",
      onClick: `confirm:${quote.id}`,
    })),
  ].slice(0, 6);

  page(
    "Dashboard",
    "ภาพรวมงานที่ต้องติดตามและยอดรับเงิน",
    `<button class="button primary" data-action="new-quote">สร้างใบเสนอราคา</button>
     <button class="button" data-action="new-invoice">สร้างใบแจ้งหนี้</button>
     <button class="button" data-action="new-customer">เพิ่มลูกค้า</button>`,
    `
      <section class="grid cols-4">
        ${metric("ยอด invoice รวม", `${money(t.totalInvoiced)} บาท`)}
        ${metric("รับแล้ว", `${money(t.totalPaid)} บาท`)}
        ${metric("ค้างรับ", `${money(t.totalOutstanding)} บาท`)}
        ${metric("Quote รอคอนเฟิร์ม", `${t.openQuotes} ใบ`)}
      </section>
      <section class="grid cols-2" style="margin-top: 16px">
        <div class="card">
          <h2>งานที่ต้องติดตาม</h2>
          ${actionItems.length ? actionItems.map(renderActionItem).join("") : `<div class="empty">ยังไม่มีงานค้างติดตาม</div>`}
        </div>
        <div class="card">
          <h2>รับเงินล่าสุด</h2>
          ${state.payments.length ? table(["วันที่", "ลูกค้า", "จำนวน"], state.payments.slice(0, 5).map((payment) => {
            const invoice = state.invoices.find((item) => item.id === payment.invoiceId);
            return [thaiDate(payment.paymentDate), customerById(invoice?.customerId)?.name || "-", `${money(payment.amount)} บาท`];
          })) : `<div class="empty">ยังไม่มีรายการรับเงิน</div>`}
        </div>
      </section>
      <section class="grid cols-3" style="margin-top: 16px">
        <div class="card span-2">
          <h2>รายรับ 6 เดือนล่าสุด</h2>
          ${renderBarChart(monthlyPayments, "ยังไม่มีข้อมูลรับเงิน")}
        </div>
        <div class="card">
          <h2>ใบแจ้งหนี้ค้างรับ</h2>
          ${unpaidInvoices.length ? table(["Invoice", "ลูกค้า", "ค้าง"], unpaidInvoices.slice(0, 5).map((invoice) => [invoice.invoiceNumber, customerById(invoice.customerId)?.name || "-", `${money(invoice.balanceDue)} บาท`])) : `<div class="empty">ไม่มี invoice ค้างรับ</div>`}
        </div>
      </section>
      <section class="grid cols-2" style="margin-top: 16px">
        <div class="card"><h2>ลูกค้ายอดสูงสุด</h2>${topCustomers.length ? table(["ลูกค้า", "ยอด invoice"], topCustomers.slice(0, 5).map((item) => [item.name, `${money(item.amount)} บาท`])) : `<div class="empty">ยังไม่มีข้อมูลลูกค้า</div>`}</div>
        <div class="card"><h2>รายการยอดสูงสุด</h2>${topServices.length ? table(["รายการ", "ยอด"], topServices.slice(0, 5).map((item) => [item.name, `${money(item.amount)} บาท`])) : `<div class="empty">ยังไม่มีข้อมูลรายการ</div>`}</div>
      </section>
    `
  );
  bindDashboardActions();
}

function metric(label, value) {
  return `<div class="card metric"><span>${label}</span><strong>${value}</strong></div>`;
}

function renderActionItem(item) {
  return `
    <div class="timeline-item">
      <strong>${item.label}</strong>
      <div style="color: var(--muted); margin: 5px 0 10px">${item.detail}</div>
      <button class="button primary" data-workflow="${item.onClick}" type="button">${item.action}</button>
    </div>
  `;
}

function bindDashboardActions() {
  document.querySelector('[data-action="new-quote"]')?.addEventListener("click", () => showQuoteEditor());
  document.querySelector('[data-action="new-invoice"]')?.addEventListener("click", () => showInvoiceEditor());
  document.querySelector('[data-action="new-customer"]')?.addEventListener("click", () => showCustomerForm());
  document.querySelectorAll("[data-workflow]").forEach((button) => {
    const [type, id] = button.dataset.workflow.split(":");
    button.addEventListener("click", () => {
      if (type === "confirm") confirmQuote(id);
      if (type === "receive") showPaymentForm(id);
    });
  });
}

function buildMonthlyPayments() {
  const monthNames = [];
  const now = new Date();
  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    monthNames.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("th-TH", { month: "short" }).format(date),
      amount: 0,
    });
  }
  state.payments.forEach((payment) => {
    const month = monthNames.find((item) => payment.paymentDate?.startsWith(item.key));
    if (month) month.amount += Number(payment.amount || 0);
  });
  return monthNames;
}

function buildTopCustomers(invoices = state.invoices) {
  const byCustomer = new Map();
  invoices.forEach((invoice) => {
    const current = byCustomer.get(invoice.customerId) || { name: customerById(invoice.customerId)?.name || "-", amount: 0 };
    current.amount += Number(invoice.totalDue || 0);
    byCustomer.set(invoice.customerId, current);
  });
  return [...byCustomer.values()].sort((a, b) => b.amount - a.amount);
}

function buildTopServices(invoices = state.invoices) {
  const byService = new Map();
  invoices.forEach((invoice) => {
    invoice.items?.forEach((item) => {
      const key = item.serviceId || item.description;
      const current = byService.get(key) || { name: item.description || "-", amount: 0 };
      current.amount += Number(item.amount || 0);
      byService.set(key, current);
    });
  });
  return [...byService.values()].sort((a, b) => b.amount - a.amount);
}

function renderBarChart(items, emptyText) {
  const max = Math.max(...items.map((item) => item.amount), 0);
  if (!max) return `<div class="empty">${emptyText}</div>`;
  return `
    <div class="bar-chart">
      ${items.map((item) => `
        <div class="bar-item">
          <div class="bar-label"><span>${item.label}</span><strong>${money(item.amount)}</strong></div>
          <div class="bar-track"><span style="width:${Math.max((item.amount / max) * 100, 4)}%"></span></div>
        </div>
      `).join("")}
    </div>
  `;
}

function table(headers, rows) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
        <tbody>${rows
          .map((row) => `<tr>${row.map((cell, index) => `<td data-label="${headers[index]}">${cell}</td>`).join("")}</tr>`)
          .join("")}</tbody>
      </table>
    </div>
  `;
}

function renderCustomers() {
  const rows = state.customers.map((customer) => {
    const invoices = state.invoices.filter((invoice) => invoice.customerId === customer.id);
    invoices.forEach(recalcInvoice);
    const paid = invoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0);
    const outstanding = invoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0);
    return [
      `<strong>${customer.name}</strong><br><small>${customer.phone || customer.email || "-"}</small>`,
      `${money(paid)} บาท`,
      `${money(outstanding)} บาท`,
      `<button class="button" data-customer-detail="${customer.id}">ประวัติ</button>
       <button class="button primary" data-customer-quote="${customer.id}">New Quote</button>`,
    ];
  });
  page(
    "ลูกค้า",
    "จัดการลูกค้าและดูประวัติยอดค้างรายคน",
    `<button class="button primary" data-action="add-customer">เพิ่มลูกค้า</button>`,
    `<div class="grid">${table(["ลูกค้า", "ชำระแล้ว", "ค้างชำระ", "จัดการ"], rows)}</div>`
  );
  document.querySelector('[data-action="add-customer"]').addEventListener("click", () => showCustomerForm());
  document.querySelectorAll("[data-customer-quote]").forEach((button) => button.addEventListener("click", () => showQuoteEditor({ customerId: button.dataset.customerQuote })));
  document.querySelectorAll("[data-customer-detail]").forEach((button) => button.addEventListener("click", () => renderCustomerDetail(button.dataset.customerDetail)));
}

function showCustomerForm(customerId) {
  const customer = customerId ? customerById(customerId) : { name: "", taxId: "", address: "", phone: "", email: "", note: "" };
  page(
    customerId ? "แก้ไขลูกค้า" : "เพิ่มลูกค้า",
    "บันทึกข้อมูลลูกค้าเพื่อใช้ซ้ำในเอกสาร",
    `<button class="button" data-action="back-customers">กลับ</button>`,
    `
      <form class="card form-grid" id="customerForm">
        <label>ชื่อ<input name="name" required value="${customer.name || ""}"></label>
        <label>เลขผู้เสียภาษี<input name="taxId" value="${customer.taxId || ""}"></label>
        <label>โทร<input name="phone" type="tel" value="${customer.phone || ""}"></label>
        <label>อีเมล<input name="email" type="email" value="${customer.email || ""}"></label>
        <label class="span-2">ที่อยู่<textarea name="address">${customer.address || ""}</textarea></label>
        <label class="span-2">หมายเหตุ<textarea name="note">${customer.note || ""}</textarea></label>
        <div class="actions span-2"><button class="button primary" type="submit">บันทึก</button></div>
      </form>
    `
  );
  document.querySelector('[data-action="back-customers"]').addEventListener("click", renderCustomers);
  document.querySelector("#customerForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target).entries());
    if (customerId) {
      Object.assign(customer, data);
      addActivity("customer", customer.id, `แก้ไขข้อมูลลูกค้า ${customer.name}`);
    } else {
      const created = { id: uid("cus"), createdAt: new Date().toISOString(), ...data };
      state.customers.unshift(created);
      addActivity("customer", created.id, `เพิ่มลูกค้า ${created.name}`);
    }
    saveState();
    renderCustomers();
  });
}

function renderCustomerDetail(customerId) {
  selectedCustomerId = customerId;
  const customer = customerById(customerId);
  const quotes = state.quotes.filter((quote) => quote.customerId === customerId);
  const invoices = state.invoices.filter((invoice) => invoice.customerId === customerId).map(recalcInvoice);
  const payments = state.payments.filter((payment) => invoices.some((invoice) => invoice.id === payment.invoiceId));
  const activities = state.activities.filter((activity) => activity.entityId === customerId || invoices.some((invoice) => invoice.id === activity.entityId) || quotes.some((quote) => quote.id === activity.entityId));
  const serviceHistory = buildCustomerServiceHistory(invoices);
  const attachments = payments.filter((payment) => payment.attachment);
  page(
    customer.name,
    "Customer ledger และประวัติเอกสาร",
    `<button class="button" data-action="back-customers">กลับ</button>
     <button class="button" data-export-customer="${customerId}">Export Statement</button>
     <button class="button primary" data-action="quote-for-customer">New Quote</button>`,
    `
      <section class="grid cols-4">
        ${metric("Quote", `${quotes.length} ใบ`)}
        ${metric("Invoice", `${invoices.length} ใบ`)}
        ${metric("ชำระแล้ว", `${money(invoices.reduce((s, i) => s + i.paidAmount, 0))} บาท`)}
        ${metric("ค้างชำระ", `${money(invoices.reduce((s, i) => s + i.balanceDue, 0))} บาท`)}
      </section>
      <section class="grid cols-2" style="margin-top: 16px">
        <div class="card"><h2>เอกสาร</h2>${table(["เลขเอกสาร", "ประเภท", "สถานะ", "ยอด"], [
          ...quotes.map((quote) => [quote.quoteNumber, "Quote", `<span class="status ${quote.status}">${statusText(quote.status)}</span>`, `${money(quote.totalDue)} บาท`]),
          ...invoices.map((invoice) => [invoice.invoiceNumber, "Invoice", `<span class="status ${invoice.status}">${statusText(invoice.status)}</span>`, `${money(invoice.balanceDue)} บาท`]),
        ])}</div>
        <div class="card"><h2>Timeline</h2><div class="timeline">${activities.length ? activities.map((activity) => `<div class="timeline-item">${activity.message}<br><small>${new Date(activity.createdAt).toLocaleString("th-TH")}</small></div>`).join("") : `<div class="empty">ยังไม่มีประวัติ</div>`}</div></div>
      </section>
      <section class="grid cols-2" style="margin-top:16px">
        <div class="card"><h2>Payment history</h2>${payments.length ? table(["วันที่", "จำนวน", "วิธี", "หลักฐาน"], payments.map((p) => [thaiDate(p.paymentDate), `${money(p.amount)} บาท`, p.paymentMethod, p.attachment?.name || "-"])) : `<div class="empty">ยังไม่มีการรับเงิน</div>`}</div>
        <div class="card"><h2>ประวัติรายการ</h2>${serviceHistory.length ? table(["รายการ", "จำนวน", "ยอด"], serviceHistory.map((item) => [item.name, money(item.quantity), `${money(item.amount)} บาท`])) : `<div class="empty">ยังไม่มีประวัติรายการ</div>`}</div>
      </section>
      <section class="card" style="margin-top:16px">
        <h2>Attachments</h2>
        ${attachments.length ? table(["วันที่", "ไฟล์", "จำนวนเงิน"], attachments.map((p) => [thaiDate(p.paymentDate), p.attachment.name, `${money(p.amount)} บาท`])) : `<div class="empty">ยังไม่มีหลักฐานรับเงิน</div>`}
      </section>
    `
  );
  document.querySelector('[data-action="back-customers"]').addEventListener("click", renderCustomers);
  document.querySelector('[data-action="quote-for-customer"]').addEventListener("click", () => showQuoteEditor({ customerId }));
  document.querySelector("[data-export-customer]").addEventListener("click", () => exportCustomerStatementCsv(customerId));
}

function buildCustomerServiceHistory(invoices) {
  const byService = new Map();
  invoices.forEach((invoice) => {
    invoice.items.forEach((item) => {
      const key = item.serviceId || item.description;
      const current = byService.get(key) || { name: item.description || "-", quantity: 0, amount: 0 };
      current.quantity += Number(item.quantity || 0);
      current.amount += Number(item.amount || 0);
      byService.set(key, current);
    });
  });
  return [...byService.values()].sort((a, b) => b.amount - a.amount);
}

function renderServices() {
  const rows = state.services.map((service) => [
    `<strong>${service.name}</strong><br><small>${service.description}</small>`,
    service.unit,
    `${money(service.unitPrice)} บาท`,
    service.category || "-",
    `<button class="button" data-edit-service="${service.id}">แก้ไข</button>`,
  ]);
  page(
    "บริการ",
    "สร้างรายการมูลค่าบริการเพื่อใช้ซ้ำในเอกสาร",
    `<button class="button primary" data-action="add-service">เพิ่มบริการ</button>`,
    table(["บริการ", "หน่วย", "ราคา", "หมวด", "จัดการ"], rows)
  );
  document.querySelector('[data-action="add-service"]').addEventListener("click", () => showServiceForm());
  document.querySelectorAll("[data-edit-service]").forEach((button) => button.addEventListener("click", () => showServiceForm(button.dataset.editService)));
}

function showServiceForm(serviceId) {
  const service = serviceId ? serviceById(serviceId) : { name: "", description: "", unit: "งาน", unitPrice: 0, category: "", active: true };
  page(
    serviceId ? "แก้ไขบริการ" : "เพิ่มบริการ",
    "บริการนี้จะถูกใช้เป็น master data ใน quote/invoice",
    `<button class="button" data-action="back-services">กลับ</button>`,
    `
      <form class="card form-grid" id="serviceForm">
        <label>ชื่อบริการ<input name="name" required value="${service.name || ""}"></label>
        <label>หมวดหมู่<input name="category" value="${service.category || ""}"></label>
        <label>หน่วย<input name="unit" value="${service.unit || ""}"></label>
        <label>ราคาต่อหน่วย<input name="unitPrice" type="number" min="0" value="${service.unitPrice || 0}"></label>
        <label class="span-2">รายละเอียด<textarea name="description">${service.description || ""}</textarea></label>
        <div class="actions span-2"><button class="button primary" type="submit">บันทึก</button></div>
      </form>
    `
  );
  document.querySelector('[data-action="back-services"]').addEventListener("click", renderServices);
  document.querySelector("#serviceForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target).entries());
    data.unitPrice = Number(data.unitPrice || 0);
    if (serviceId) {
      Object.assign(service, data);
      addActivity("service", service.id, `แก้ไขบริการ ${service.name}`);
    } else {
      const created = { id: uid("svc"), active: true, ...data };
      state.services.unshift(created);
      addActivity("service", created.id, `เพิ่มบริการ ${created.name}`);
    }
    saveState();
    renderServices();
  });
}

function renderQuotes() {
  const rows = state.quotes.map((quote) => [
    customerById(quote.customerId)?.name || "-",
    thaiDate(quote.issueDate),
    `<span class="status ${quote.status}">${statusText(quote.status)}</span>`,
    `${money(quote.totalDue)} บาท`,
    `<button class="button" data-view-quote="${quote.id}">ดู</button>
     ${quote.status === "draft" ? `<button class="button success" data-send-quote="${quote.id}">ส่งแล้ว</button>` : ""}
     ${quote.status === "sent" ? `<button class="button primary" data-confirm-quote="${quote.id}">คอนเฟิร์ม</button>` : ""}
     ${["draft", "sent"].includes(quote.status) ? `<button class="button danger" data-delete-quote="${quote.id}">ลบ</button>` : ""}`,
  ]);
  page(
    "ใบเสนอราคา",
    "สร้างและคอนเฟิร์มใบเสนอราคาเป็นใบแจ้งหนี้",
    `<button class="button primary" data-action="add-quote">สร้างใบเสนอราคา</button>`,
    rows.length ? table(["ลูกค้า", "วันที่", "สถานะ", "ยอด", "จัดการ"], rows) : `<div class="empty">ยังไม่มีใบเสนอราคา</div>`
  );
  document.querySelector('[data-action="add-quote"]').addEventListener("click", () => showQuoteEditor());
  document.querySelectorAll("[data-send-quote]").forEach((button) => button.addEventListener("click", () => markQuoteSent(button.dataset.sendQuote)));
  document.querySelectorAll("[data-confirm-quote]").forEach((button) => button.addEventListener("click", () => confirmQuote(button.dataset.confirmQuote)));
  document.querySelectorAll("[data-delete-quote]").forEach((button) => button.addEventListener("click", () => deleteQuote(button.dataset.deleteQuote)));
  document.querySelectorAll("[data-view-quote]").forEach((button) => button.addEventListener("click", () => renderDocument("quote", button.dataset.viewQuote)));
}

function showQuoteEditor(options = {}) {
  const draft = {
    customerId: options.customerId || state.customers[0]?.id || "",
    issueDate: today(),
    expiryDate: today(),
    projectName: "",
    withholdingEnabled: true,
    withholdingPercent: state.settings.defaultWithholdingPercent,
    note: "",
    items: [blankLineItem()],
  };
  renderQuoteEditor(draft);
}

function renderQuoteEditor(draft) {
  const calc = calculate(draft.items, draft.withholdingEnabled, draft.withholdingPercent);
  page(
    "สร้างใบเสนอราคา",
    "พิมพ์รายการเองเหมือนแบบบิลเดิม แล้วระบบคำนวณยอดให้อัตโนมัติ",
    `<button class="button" data-action="back-quotes">กลับ</button>`,
    `
      <form class="split" id="quoteForm">
        <section class="card grid">
          <div class="form-grid">
            <label>ลูกค้า<select name="customerId">${state.customers.map((c) => `<option value="${c.id}" ${draft.customerId === c.id ? "selected" : ""}>${c.name}</option>`).join("")}</select></label>
            <label>ชื่อโปรเจกต์<input name="projectName" value="${draft.projectName || ""}"></label>
            <label>วันที่<input name="issueDate" type="date" value="${draft.issueDate}"></label>
            <label>ใช้ได้ถึง<input name="expiryDate" type="date" value="${draft.expiryDate}"></label>
            <label>หัก ณ ที่จ่าย %<input name="withholdingPercent" type="number" min="0" value="${draft.withholdingPercent}"></label>
            <label class="span-2">หมายเหตุ<input name="note" value="${draft.note || ""}"></label>
          </div>
          <div class="actions">
            <button class="button" id="createInlineCustomer" type="button">เพิ่มลูกค้าใหม่ในหน้านี้</button>
          </div>
          <div class="qr-setting">
            <div>
              <strong>QR รับเงิน</strong>
              <p>เลือกรูป QR เพื่อแสดงในใบเสนอราคาและเอกสารตอนพิมพ์</p>
            </div>
            <div class="qr-setting-preview">
              ${state.settings.qrCodeImage ? `<img class="qr-code" src="${state.settings.qrCodeImage}" alt="Payment QR Code">` : `<div class="empty compact">ยังไม่มี QR</div>`}
              <label class="button file-button">เลือกรูป QR<input id="quoteQrInput" type="file" accept="image/*"></label>
            </div>
          </div>
          <div>
            <h3>รายการ</h3>
            <div class="line-editor" id="quoteLines">${draft.items.map((item, index) => renderLine(item, index)).join("")}</div>
            <div class="actions" style="margin-top:10px">
              <button class="button" id="addCustomLine" type="button">เพิ่มบรรทัด</button>
            </div>
          </div>
          <div class="actions">
            <button class="button" data-status="draft" type="submit">บันทึก Draft</button>
            <button class="button primary" data-status="sent" type="submit">บันทึกและส่งแล้ว</button>
          </div>
        </section>
        <aside class="card summary-panel">
          <h2>Summary</h2>
          ${summaryHtml(calc)}
        </aside>
      </form>
    `
  );
  document.querySelector('[data-action="back-quotes"]').addEventListener("click", renderQuotes);
  bindQuoteEditor(draft);
}

function renderLine(item, index) {
  return `
    <div class="line-row">
      <label>รายละเอียด<input data-line="${index}" data-field="description" value="${item.description || ""}"></label>
      <label>จำนวน<input data-line="${index}" data-field="quantity" type="number" min="0" value="${item.quantity || 1}"></label>
      <label>ราคา<input data-line="${index}" data-field="unitPrice" type="number" min="0" value="${item.unitPrice || 0}"></label>
      <label>จำนวนเงิน<input data-line="${index}" data-field="amount" type="number" min="0" value="${item.amount || 0}"></label>
      <button class="button danger" data-remove-line="${index}" type="button">ลบ</button>
    </div>
  `;
}

function bindQuoteEditor(draft) {
  const form = document.querySelector("#quoteForm");
  document.querySelector("#createInlineCustomer").addEventListener("click", () => {
    const name = prompt("ชื่อลูกค้าใหม่");
    if (!name) return;
    const customer = {
      id: uid("cus"),
      name,
      taxId: "",
      address: "",
      phone: "",
      email: "",
      note: "",
      createdAt: new Date().toISOString(),
    };
    state.customers.unshift(customer);
    addActivity("customer", customer.id, `เพิ่มลูกค้า ${customer.name} จากหน้า quote`);
    saveState();
    renderQuoteEditor({ ...draft, ...Object.fromEntries(new FormData(form).entries()), customerId: customer.id });
  });
  document.querySelector("#quoteQrInput")?.addEventListener("change", updateQrCodeImage);
  form.addEventListener("input", (event) => {
    if (event.target.dataset.line !== undefined) {
      const lineIndex = Number(event.target.dataset.line);
      const item = draft.items[lineIndex];
      const field = event.target.dataset.field;
      item[field] = field === "description" ? event.target.value : Number(event.target.value || 0);
      if (field === "quantity" || field === "unitPrice") {
        item.amount = Number(item.quantity || 0) * Number(item.unitPrice || 0);
        const amountInput = form.querySelector(`[data-line="${lineIndex}"][data-field="amount"]`);
        if (amountInput) amountInput.value = item.amount;
      }
      updateSummaryPanel(form, draft);
    } else if (event.target.name === "withholdingPercent") {
      updateSummaryPanel(form, draft);
    }
  });
  document.querySelectorAll("[data-remove-line]").forEach((button) => button.addEventListener("click", () => {
    draft.items.splice(Number(button.dataset.removeLine), 1);
    renderQuoteEditor({ ...draft, ...Object.fromEntries(new FormData(form).entries()) });
  }));
  document.querySelector("#addCustomLine").addEventListener("click", () => {
    draft.items.push(blankLineItem());
    renderQuoteEditor({ ...draft, ...Object.fromEntries(new FormData(form).entries()) });
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(form).entries());
    const items = cleanLineItems(draft.items);
    if (!items.length) {
      alert("กรุณาเพิ่มรายการอย่างน้อย 1 บรรทัด");
      return;
    }
    const calc = calculate(items, true, Number(formData.withholdingPercent || 0));
    const status = event.submitter?.dataset.status || "draft";
    const quote = {
      id: uid("qt"),
      quoteNumber: nextNumber("QT"),
      customerId: formData.customerId,
      projectName: formData.projectName,
      issueDate: formData.issueDate,
      expiryDate: formData.expiryDate || formData.issueDate,
      status,
      note: formData.note,
      items,
      ...calc,
      createdAt: new Date().toISOString(),
    };
    state.quotes.unshift(quote);
    addActivity("quote", quote.id, `สร้างใบเสนอราคา ${quote.quoteNumber} (${statusText(status)})`);
    addActivity("customer", quote.customerId, `สร้างใบเสนอราคา ${quote.quoteNumber} (${statusText(status)})`);
    saveState();
    renderQuotes();
  });
}

function markQuoteSent(quoteId) {
  const quote = state.quotes.find((item) => item.id === quoteId);
  if (!quote || quote.status !== "draft") return;
  quote.status = "sent";
  addActivity("quote", quote.id, `เปลี่ยนสถานะ ${quote.quoteNumber} เป็นส่งแล้ว`);
  addActivity("customer", quote.customerId, `ใบเสนอราคา ${quote.quoteNumber} ส่งแล้ว`);
  saveState();
  renderQuotes();
}

function deleteQuote(quoteId) {
  const quote = state.quotes.find((item) => item.id === quoteId);
  if (!quote || !["draft", "sent"].includes(quote.status)) return;
  if (typeof confirm === "function" && !confirm("ลบใบเสนอราคานี้ใช่ไหม?")) return;
  state.quotes = state.quotes.filter((item) => item.id !== quoteId);
  state.activities = state.activities.filter((activity) => activity.entityId !== quoteId);
  addActivity("customer", quote.customerId, "ลบใบเสนอราคา");
  saveState();
  if (document.querySelector("#view")) renderQuotes();
}

function summaryHtml(calc) {
  return `
    <table class="summary">
      <tr><th>ยอดรวม</th><td class="num">${money(calc.subtotal)} บาท</td></tr>
      <tr><th>หัก ณ ที่จ่าย ${calc.withholdingPercent}%</th><td class="num">${money(calc.withholdingAmount)} บาท</td></tr>
      <tr><th>ยอดรับจริง</th><td class="num"><strong>${money(calc.totalDue)} บาท</strong></td></tr>
    </table>
  `;
}

function updateSummaryPanel(form, draft) {
  const panel = form.querySelector(".summary-panel");
  if (!panel) return;
  const formData = Object.fromEntries(new FormData(form).entries());
  panel.innerHTML = `<h2>Summary</h2>${summaryHtml(calculate(draft.items, true, Number(formData.withholdingPercent || 0)))}`;
}

function confirmQuote(quoteId) {
  const quote = state.quotes.find((item) => item.id === quoteId);
  if (!quote || quote.status === "confirmed") return;
  const invoice = {
    id: uid("inv"),
    invoiceNumber: nextNumber("INV"),
    quoteId: quote.id,
    customerId: quote.customerId,
    projectName: quote.projectName || "",
    issueDate: today(),
    dueDate: today(),
    status: "open",
    note: quote.note,
    items: structuredClone(quote.items),
    subtotal: quote.subtotal,
    withholdingEnabled: quote.withholdingEnabled,
    withholdingPercent: quote.withholdingPercent,
    withholdingAmount: quote.withholdingAmount,
    totalDue: quote.totalDue,
    paidAmount: 0,
    balanceDue: quote.totalDue,
    createdAt: new Date().toISOString(),
  };
  quote.status = "confirmed";
  quote.createdInvoiceId = invoice.id;
  state.invoices.unshift(invoice);
  addActivity("quote", quote.id, `คอนเฟิร์ม ${quote.quoteNumber} เป็น ${invoice.invoiceNumber}`);
  addActivity("invoice", invoice.id, `สร้างใบแจ้งหนี้ ${invoice.invoiceNumber}`);
  addActivity("customer", invoice.customerId, `คอนเฟิร์ม quote เป็น invoice ${invoice.invoiceNumber}`);
  saveState();
  renderDocument("invoice", invoice.id);
}

function renderInvoices() {
  state.invoices.forEach(recalcInvoice);
  const rows = state.invoices.map((invoice) => [
    invoice.invoiceNumber,
    customerById(invoice.customerId)?.name || "-",
    thaiDate(invoice.issueDate),
    `<span class="status ${invoice.status}">${statusText(invoice.status)}</span>`,
    `${money(invoice.balanceDue)} บาท`,
    `<button class="button" data-view-invoice="${invoice.id}">ดู</button>
     ${invoice.status !== "paid" ? `<button class="button primary" data-receive="${invoice.id}">รับเงิน</button>` : ""}`,
  ]);
  page(
    "ใบแจ้งหนี้",
    "ติดตามยอดค้างและรับเงินจากใบแจ้งหนี้",
    `<button class="button primary" data-action="add-invoice">สร้างใบแจ้งหนี้</button>`,
    rows.length ? table(["เลข", "ลูกค้า", "วันที่", "สถานะ", "ค้างชำระ", "จัดการ"], rows) : `<div class="empty">ยังไม่มีใบแจ้งหนี้</div>`
  );
  document.querySelector('[data-action="add-invoice"]').addEventListener("click", () => showInvoiceEditor());
  document.querySelectorAll("[data-view-invoice]").forEach((button) => button.addEventListener("click", () => renderDocument("invoice", button.dataset.viewInvoice)));
  document.querySelectorAll("[data-receive]").forEach((button) => button.addEventListener("click", () => showPaymentForm(button.dataset.receive)));
}

function showInvoiceEditor(options = {}) {
  const draft = {
    customerId: options.customerId || state.customers[0]?.id || "",
    issueDate: today(),
    dueDate: today(),
    withholdingPercent: state.settings.defaultWithholdingPercent,
    note: "",
    items: [blankLineItem()],
  };
  renderInvoiceEditor(draft);
}

function renderInvoiceEditor(draft) {
  const calc = calculate(draft.items, true, draft.withholdingPercent);
  page(
    "สร้างใบแจ้งหนี้",
    "สร้าง invoice โดยตรงโดยไม่ต้องผ่าน quote",
    `<button class="button" data-action="back-invoices">กลับ</button>`,
    `
      <form class="split" id="invoiceForm">
        <section class="card grid">
          <div class="form-grid">
            <label>ลูกค้า<select name="customerId">${state.customers.map((c) => `<option value="${c.id}" ${draft.customerId === c.id ? "selected" : ""}>${c.name}</option>`).join("")}</select></label>
            <label>วันที่<input name="issueDate" type="date" value="${draft.issueDate}"></label>
            <label>กำหนดชำระ<input name="dueDate" type="date" value="${draft.dueDate}"></label>
            <label>หัก ณ ที่จ่าย %<input name="withholdingPercent" type="number" min="0" value="${draft.withholdingPercent}"></label>
            <label class="span-2">หมายเหตุ<input name="note" value="${draft.note || ""}"></label>
          </div>
          <div>
            <h3>รายการ</h3>
            <div class="line-editor">${draft.items.map((item, index) => renderLine(item, index)).join("")}</div>
            <div class="actions" style="margin-top:10px">
              <button class="button" id="addInvoiceCustomLine" type="button">เพิ่มบรรทัด</button>
            </div>
          </div>
          <div class="actions"><button class="button primary" type="submit">บันทึกใบแจ้งหนี้</button></div>
        </section>
        <aside class="card summary-panel"><h2>Summary</h2>${summaryHtml(calc)}</aside>
      </form>
    `
  );
  document.querySelector('[data-action="back-invoices"]').addEventListener("click", renderInvoices);
  bindInvoiceEditor(draft);
}

function bindInvoiceEditor(draft) {
  const form = document.querySelector("#invoiceForm");
  form.addEventListener("input", (event) => {
    if (event.target.dataset.line !== undefined) {
      const lineIndex = Number(event.target.dataset.line);
      const item = draft.items[lineIndex];
      const field = event.target.dataset.field;
      item[field] = field === "description" ? event.target.value : Number(event.target.value || 0);
      if (field === "quantity" || field === "unitPrice") {
        item.amount = Number(item.quantity || 0) * Number(item.unitPrice || 0);
        const amountInput = form.querySelector(`[data-line="${lineIndex}"][data-field="amount"]`);
        if (amountInput) amountInput.value = item.amount;
      }
      updateSummaryPanel(form, draft);
    } else if (event.target.name === "withholdingPercent") {
      updateSummaryPanel(form, draft);
    }
  });
  document.querySelectorAll("[data-remove-line]").forEach((button) => button.addEventListener("click", () => {
    draft.items.splice(Number(button.dataset.removeLine), 1);
    renderInvoiceEditor({ ...draft, ...Object.fromEntries(new FormData(form).entries()) });
  }));
  document.querySelector("#addInvoiceCustomLine").addEventListener("click", () => {
    draft.items.push(blankLineItem());
    renderInvoiceEditor({ ...draft, ...Object.fromEntries(new FormData(form).entries()) });
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(form).entries());
    const items = cleanLineItems(draft.items);
    if (!items.length) {
      alert("กรุณาเพิ่มรายการอย่างน้อย 1 บรรทัด");
      return;
    }
    const calc = calculate(items, true, Number(formData.withholdingPercent || 0));
    const invoice = {
      id: uid("inv"),
      invoiceNumber: nextNumber("INV"),
      quoteId: null,
      customerId: formData.customerId,
      issueDate: formData.issueDate,
      dueDate: formData.dueDate,
      status: "open",
      note: formData.note,
      items,
      ...calc,
      paidAmount: 0,
      balanceDue: calc.totalDue,
      createdAt: new Date().toISOString(),
    };
    state.invoices.unshift(invoice);
    addActivity("invoice", invoice.id, `สร้างใบแจ้งหนี้ ${invoice.invoiceNumber}`);
    addActivity("customer", invoice.customerId, `สร้างใบแจ้งหนี้ ${invoice.invoiceNumber}`);
    saveState();
    renderDocument("invoice", invoice.id);
  });
}

function showPaymentForm(invoiceId) {
  const invoice = recalcInvoice(state.invoices.find((item) => item.id === invoiceId));
  page(
    "รับเงิน",
    `${invoice.invoiceNumber} - ${customerById(invoice.customerId)?.name || ""}`,
    `<button class="button" data-action="back-invoices">กลับ</button>`,
    `
      <form class="card form-grid" id="paymentForm">
        <label>วันที่รับเงิน<input name="paymentDate" type="date" value="${today()}"></label>
        <label>จำนวนเงิน<input name="amount" type="number" min="0" value="${invoice.balanceDue}"></label>
        <label>วิธีชำระ<select name="paymentMethod"><option>โอนเงิน</option><option>เงินสด</option><option>อื่น ๆ</option></select></label>
        <label>หลักฐานรับเงิน<input name="attachment" type="file" accept="image/*,.pdf"></label>
        <label class="span-2">หมายเหตุ<textarea name="note"></textarea></label>
        <div class="actions span-2"><button class="button primary" type="submit">บันทึกรับเงินและออกใบเสร็จ</button></div>
      </form>
    `
  );
  document.querySelector('[data-action="back-invoices"]').addEventListener("click", renderInvoices);
  document.querySelector("#paymentForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target).entries());
    const file = event.target.attachment.files?.[0];
    const attachment = file ? { name: file.name, type: file.type, size: file.size } : null;
    const payment = {
      id: uid("pay"),
      invoiceId,
      customerId: invoice.customerId,
      paymentDate: data.paymentDate,
      amount: Number(data.amount || 0),
      paymentMethod: data.paymentMethod,
      note: data.note,
      attachment,
      createdAt: new Date().toISOString(),
    };
    state.payments.unshift(payment);
    recalcInvoice(invoice);
    const receipt = {
      id: uid("rc"),
      receiptNumber: nextNumber("RC"),
      invoiceId,
      paymentId: payment.id,
      customerId: invoice.customerId,
      issueDate: data.paymentDate,
      amount: payment.amount,
      note: payment.note,
      createdAt: new Date().toISOString(),
    };
    state.receipts.unshift(receipt);
    addActivity("payment", payment.id, `รับเงิน ${money(payment.amount)} บาท จาก ${invoice.invoiceNumber}`);
    addActivity("invoice", invoice.id, `รับเงิน ${money(payment.amount)} บาท`);
    addActivity("customer", invoice.customerId, `รับเงิน ${money(payment.amount)} บาท และออกใบเสร็จ ${receipt.receiptNumber}`);
    saveState();
    renderDocument("receipt", receipt.id);
  });
}

function renderPayments() {
  const rows = state.payments.map((payment) => {
    const invoice = state.invoices.find((item) => item.id === payment.invoiceId);
    return [thaiDate(payment.paymentDate), invoice?.invoiceNumber || "-", customerById(payment.customerId)?.name || "-", payment.paymentMethod, `${money(payment.amount)} บาท`, payment.attachment?.name || "-"];
  });
  page("รับเงิน", "ประวัติการรับเงินและหลักฐาน", "", rows.length ? table(["วันที่", "Invoice", "ลูกค้า", "วิธี", "จำนวน", "หลักฐาน"], rows) : `<div class="empty">ยังไม่มีการรับเงิน</div>`);
}

function renderReceipts() {
  const rows = state.receipts.map((receipt) => [
    receipt.receiptNumber,
    customerById(receipt.customerId)?.name || "-",
    thaiDate(receipt.issueDate),
    `${money(receipt.amount)} บาท`,
    `<button class="button" data-view-receipt="${receipt.id}">ดู</button>`,
  ]);
  page("ใบเสร็จ", "เอกสารรับเงินที่ออกแล้ว", "", rows.length ? table(["เลข", "ลูกค้า", "วันที่", "จำนวน", "จัดการ"], rows) : `<div class="empty">ยังไม่มีใบเสร็จ</div>`);
  document.querySelectorAll("[data-view-receipt]").forEach((button) => button.addEventListener("click", () => renderDocument("receipt", button.dataset.viewReceipt)));
}

function renderDocument(type, id) {
  const doc = type === "quote" ? state.quotes.find((item) => item.id === id) : type === "invoice" ? state.invoices.find((item) => item.id === id) : state.receipts.find((item) => item.id === id);
  if (type === "invoice") recalcInvoice(doc);
  const invoiceForReceipt = type === "receipt" ? state.invoices.find((invoice) => invoice.id === doc.invoiceId) : null;
  const base = type === "receipt" ? invoiceForReceipt : doc;
  const customer = customerById(doc.customerId);
  const meta = documentTypeMeta(type);
  page(
    meta.title,
    "Preview / print เอกสาร",
    `<button class="button no-print" data-action="back-docs">กลับ</button>
     <button class="button primary no-print" onclick="window.print()">พิมพ์ / บันทึก PDF</button>
     ${type === "quote" && doc.status !== "confirmed" ? `<button class="button success no-print" data-confirm-quote="${doc.id}">คอนเฟิร์มเป็น invoice</button>` : ""}
     ${type === "invoice" && doc.status !== "paid" ? `<button class="button primary no-print" data-receive="${doc.id}">รับเงิน</button>` : ""}`,
    `
      <article class="document">
        <header class="document-head">
          <div>
            <p class="document-label">${meta.label}</p>
            <h2>${meta.title}</h2>
          </div>
        </header>
        <section class="document-parties">
          <div class="document-party document-seller">${documentSellerHtml()}</div>
          <div class="document-party document-customer">${documentCustomerHtml(base, customer)}</div>
          <div class="document-party document-meta">
            ${documentNumberHtml(type, doc)}
            <p>${documentDateHtml(type, doc, base)}</p>
          </div>
        </section>
        ${type === "receipt" ? receiptBody(doc, invoiceForReceipt) : documentItems(base)}
      </article>
    `
  );
  document.querySelector('[data-action="back-docs"]').addEventListener("click", () => (type === "quote" ? renderQuotes() : type === "invoice" ? renderInvoices() : renderReceipts()));
  document.querySelector("[data-confirm-quote]")?.addEventListener("click", () => confirmQuote(doc.id));
  document.querySelector("[data-receive]")?.addEventListener("click", () => showPaymentForm(doc.id));
}

function documentItems(doc) {
  return `
    <div style="margin-top: 20px">
      ${renderOriginalDocumentItems(doc)}
      <div class="grid" style="justify-items:end;margin-top:18px">${summaryHtml(doc)}</div>
      ${documentNoteHtml(doc)}
      ${paymentInfoHtml()}
    </div>
  `;
}

function renderOriginalDocumentItems(doc) {
  return table(
    ["ลำดับที่<br>ITEM", "รายละเอียด<br>PARTICULARS", "จำนวน<br>QUANTITY", "ราคาหน่วย<br>UNIT PRICE", "จำนวนเงิน<br>AMOUNT"],
    doc.items.map((item, index) => [
      `${index + 1}.`,
      item.description,
      money(item.quantity),
      money(item.unitPrice),
      `${money(item.amount)} บาท`,
    ])
  );
}

function receiptBody(receipt, invoice) {
  const payment = state.payments.find((item) => item.id === receipt.paymentId);
  return `
    <section style="margin-top: 20px">
      ${table(["อ้างอิง", "วิธีชำระ", "จำนวนเงิน"], [[invoice?.invoiceNumber || "-", payment?.paymentMethod || "-", `${money(receipt.amount)} บาท`]])}
      <div class="document-box" style="margin-top:20px"><strong>หมายเหตุ</strong><br>${receipt.note || "-"}<br><br><strong>หลักฐาน</strong><br>${payment?.attachment?.name || "-"}</div>
      ${paymentInfoHtml()}
    </section>
  `;
}

function reportDefaults(filters = {}) {
  return {
    startDate: filters.startDate || startOfCurrentMonth(),
    endDate: filters.endDate || today(),
    customerId: filters.customerId || "all",
    status: filters.status || "all",
  };
}

function filteredReportData(filters) {
  const current = reportDefaults(filters);
  const invoices = state.invoices
    .map(recalcInvoice)
    .filter((invoice) => isInDateRange(invoice.issueDate, current.startDate, current.endDate))
    .filter((invoice) => current.customerId === "all" || invoice.customerId === current.customerId)
    .filter((invoice) => current.status === "all" || invoice.status === current.status);
  const payments = state.payments
    .filter((payment) => isInDateRange(payment.paymentDate, current.startDate, current.endDate))
    .filter((payment) => current.customerId === "all" || payment.customerId === current.customerId);
  const quotes = state.quotes
    .filter((quote) => isInDateRange(quote.issueDate, current.startDate, current.endDate))
    .filter((quote) => current.customerId === "all" || quote.customerId === current.customerId);
  return { filters: current, invoices, payments, quotes };
}

function renderReports(filters = {}) {
  const report = filteredReportData(filters);
  const invoiceTotal = report.invoices.reduce((sum, invoice) => sum + Number(invoice.totalDue || 0), 0);
  const paidTotal = report.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const outstandingTotal = report.invoices.reduce((sum, invoice) => sum + Number(invoice.balanceDue || 0), 0);
  const withholdingTotal = report.invoices.reduce((sum, invoice) => sum + Number(invoice.withholdingAmount || 0), 0);
  const topServices = buildTopServices(report.invoices);
  const topCustomers = buildTopCustomers(report.invoices);
  const confirmedQuotes = report.quotes.filter((quote) => quote.status === "confirmed").length;
  const conversionRate = report.quotes.length ? Math.round((confirmedQuotes / report.quotes.length) * 100) : 0;
  page(
    "รายงาน",
    "รายงานหลักสำหรับติดตามรายรับ ลูกค้า และรายการที่พิมพ์ในเอกสาร",
    `<button class="button" data-export="csv">Export CSV</button>`,
    `
      <form class="card filter-card" id="reportFilterForm">
        <label>ตั้งแต่<input name="startDate" type="date" value="${report.filters.startDate}"></label>
        <label>ถึงวันที่<input name="endDate" type="date" value="${report.filters.endDate}"></label>
        <label>ลูกค้า<select name="customerId">
          <option value="all">ลูกค้าทั้งหมด</option>
          ${state.customers.map((customer) => `<option value="${customer.id}" ${report.filters.customerId === customer.id ? "selected" : ""}>${customer.name}</option>`).join("")}
        </select></label>
        <label>สถานะ invoice<select name="status">
          <option value="all">ทุกสถานะ</option>
          ${["open", "partial", "paid", "cancelled"].map((status) => `<option value="${status}" ${report.filters.status === status ? "selected" : ""}>${statusText(status)}</option>`).join("")}
        </select></label>
        <button class="button primary" type="submit">ดูรายงาน</button>
      </form>
      <section class="grid cols-4" style="margin-top:16px">
        ${metric("ยอด invoice", `${money(invoiceTotal)} บาท`)}
        ${metric("ยอดรับเงิน", `${money(paidTotal)} บาท`)}
        ${metric("ยอดค้าง", `${money(outstandingTotal)} บาท`)}
        ${metric("หัก ณ ที่จ่าย", `${money(withholdingTotal)} บาท`)}
      </section>
      <section class="grid cols-2" style="margin-top:16px">
        <div class="card"><h2>ยอดตามรายการ</h2>${topServices.length ? table(["รายการ", "ยอด"], topServices.map((item) => [item.name, `${money(item.amount)} บาท`])) : `<div class="empty">ไม่มีข้อมูลรายการในช่วงนี้</div>`}</div>
        <div class="card"><h2>ยอดขายตามลูกค้า</h2>${topCustomers.length ? table(["ลูกค้า", "ยอด invoice"], topCustomers.map((item) => [item.name, `${money(item.amount)} บาท`])) : `<div class="empty">ไม่มีข้อมูลลูกค้าในช่วงนี้</div>`}</div>
      </section>
      <section class="grid cols-2" style="margin-top:16px">
        <div class="card"><h2>Invoice ค้างชำระ</h2>${report.invoices.filter((invoice) => invoice.balanceDue > 0).length ? table(["เลข", "ลูกค้า", "สถานะ", "ค้าง"], report.invoices.filter((invoice) => invoice.balanceDue > 0).map((invoice) => [invoice.invoiceNumber, customerById(invoice.customerId)?.name || "-", statusText(invoice.status), `${money(invoice.balanceDue)} บาท`])) : `<div class="empty">ไม่มี invoice ค้างในช่วงนี้</div>`}</div>
        <div class="card">
          <h2>Quote conversion</h2>
          <div class="metric"><span>คอนเฟิร์มแล้ว</span><strong>${conversionRate}%</strong></div>
          ${table(["สถานะ", "จำนวน"], [
            ["ร่าง", `${report.quotes.filter((quote) => quote.status === "draft").length} ใบ`],
            ["ส่งแล้ว", `${report.quotes.filter((quote) => quote.status === "sent").length} ใบ`],
            ["คอนเฟิร์มแล้ว", `${confirmedQuotes} ใบ`],
          ])}
        </div>
      </section>
      <section class="card" style="margin-top:16px">
        <h2>รับเงินในช่วงที่เลือก</h2>
        ${report.payments.length ? table(["วันที่", "Invoice", "ลูกค้า", "วิธี", "จำนวน"], report.payments.map((payment) => {
          const invoice = state.invoices.find((item) => item.id === payment.invoiceId);
          return [thaiDate(payment.paymentDate), invoice?.invoiceNumber || "-", customerById(payment.customerId)?.name || "-", payment.paymentMethod, `${money(payment.amount)} บาท`];
        })) : `<div class="empty">ยังไม่มีรายการรับเงินในช่วงนี้</div>`}
      </section>
    `
  );
  document.querySelector("#reportFilterForm").addEventListener("submit", (event) => {
    event.preventDefault();
    renderReports(Object.fromEntries(new FormData(event.target).entries()));
  });
  document.querySelector("[data-export]")?.addEventListener("click", () => exportReportCsv(report.filters));
}

function exportReportCsv(filters = {}) {
  const report = filteredReportData(filters);
  const lines = [
    ["type", "date", "number", "customer", "status", "total_due", "paid", "balance", "withholding", "note"].map(csvCell).join(","),
  ];
  report.invoices.forEach((invoice) => {
    recalcInvoice(invoice);
    lines.push(["invoice", invoice.issueDate, invoice.invoiceNumber, customerById(invoice.customerId)?.name || "", statusText(invoice.status), invoice.totalDue, invoice.paidAmount, invoice.balanceDue, invoice.withholdingAmount, invoice.note || ""].map(csvCell).join(","));
  });
  report.payments.forEach((payment) => {
    const invoice = state.invoices.find((item) => item.id === payment.invoiceId);
    lines.push(["payment", payment.paymentDate, invoice?.invoiceNumber || "", customerById(payment.customerId)?.name || "", payment.paymentMethod, payment.amount, payment.amount, "", "", payment.note || ""].map(csvCell).join(","));
  });
  downloadTextFile(`billing-report-${filters.startDate || "all"}-${filters.endDate || "all"}.csv`, lines.join("\n"), "text/csv;charset=utf-8");
}

function exportCustomerStatementCsv(customerId) {
  const customer = customerById(customerId);
  const invoices = state.invoices.filter((invoice) => invoice.customerId === customerId).map(recalcInvoice);
  const invoiceIds = new Set(invoices.map((invoice) => invoice.id));
  const payments = state.payments.filter((payment) => invoiceIds.has(payment.invoiceId));
  const lines = [
    ["type", "date", "number", "customer", "status", "debit", "credit", "balance", "attachment"].map(csvCell).join(","),
  ];
  invoices.forEach((invoice) => {
    lines.push(["invoice", invoice.issueDate, invoice.invoiceNumber, customer?.name || "", statusText(invoice.status), invoice.totalDue, "", invoice.balanceDue, ""].map(csvCell).join(","));
  });
  payments.forEach((payment) => {
    const invoice = state.invoices.find((item) => item.id === payment.invoiceId);
    lines.push(["payment", payment.paymentDate, invoice?.invoiceNumber || "", customer?.name || "", payment.paymentMethod, "", payment.amount, "", payment.attachment?.name || ""].map(csvCell).join(","));
  });
  downloadTextFile(`customer-statement-${customer?.name || customerId}.csv`, lines.join("\n"), "text/csv;charset=utf-8");
}

function renderSettings() {
  page(
    "ตั้งค่า",
    "ข้อมูลผู้ขายและค่าเริ่มต้น",
    "",
    `
      <form class="card form-grid" id="settingsForm">
        <label>ชื่อผู้ขาย<input name="businessName" value="${state.settings.businessName}"></label>
        <label>เลขผู้เสียภาษี<input name="taxId" value="${state.settings.taxId}"></label>
        <label>โทร<input name="phone" value="${state.settings.phone}"></label>
        <label>อีเมล<input name="email" value="${state.settings.email}"></label>
        <label>ธนาคาร<input name="bankName" value="${state.settings.bankName}"></label>
        <label>ชื่อบัญชี<input name="bankAccountName" value="${state.settings.bankAccountName}"></label>
        <label>เลขบัญชี<input name="bankAccountNumber" value="${state.settings.bankAccountNumber}"></label>
        <label>หัก ณ ที่จ่าย %<input name="defaultWithholdingPercent" type="number" value="${state.settings.defaultWithholdingPercent}"></label>
        <label>PIN<input name="pin" value="${state.settings.pin}"></label>
        <label class="span-2">ที่อยู่<textarea name="address">${state.settings.address}</textarea></label>
        <div class="span-2 qr-setting">
          <div>
            <strong>QR รับเงิน</strong>
            <p>ใช้รูป QR พร้อมเพย์หรือ QR โอนเงิน เพื่อแสดงในเอกสารตอน print/PDF</p>
          </div>
          <div class="qr-setting-preview">
            ${state.settings.qrCodeImage ? `<img class="qr-code" src="${state.settings.qrCodeImage}" alt="Payment QR Code">` : `<div class="empty compact">ยังไม่มี QR</div>`}
            <div class="actions">
              <label class="button file-button">เลือกรูป QR<input id="qrCodeInput" type="file" accept="image/*"></label>
              ${state.settings.qrCodeImage ? `<button class="button danger" id="removeQrButton" type="button">ลบ QR</button>` : ""}
            </div>
          </div>
        </div>
        <div class="actions span-2"><button class="button primary" type="submit">บันทึก</button><button class="button danger" type="button" id="logoutButton">ออกจากระบบ</button></div>
      </form>
      <section class="card data-tools" style="margin-top:16px">
        <div>
          <h2>สำรองข้อมูล</h2>
          <p>ใช้สำหรับเก็บไฟล์ข้อมูลของโปรแกรมนี้ หรือย้ายข้อมูลกลับเข้ามาในเครื่องเดิม</p>
        </div>
        <div class="actions">
          <button class="button" type="button" id="exportBackupButton">Export JSON</button>
          <label class="button file-button">Import JSON<input id="importBackupInput" type="file" accept="application/json,.json"></label>
        </div>
      </section>
    `
  );
  document.querySelector("#settingsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    Object.assign(state.settings, Object.fromEntries(new FormData(event.target).entries()));
    state.settings.defaultWithholdingPercent = Number(state.settings.defaultWithholdingPercent || 0);
    saveState();
    alert("บันทึกแล้ว");
  });
  document.querySelector("#logoutButton").addEventListener("click", () => {
    sessionStorage.removeItem(PIN_KEY);
    app();
  });
  document.querySelector("#qrCodeInput").addEventListener("change", updateQrCodeImage);
  document.querySelector("#removeQrButton")?.addEventListener("click", () => {
    state.settings.qrCodeImage = "";
    saveState();
    renderSettings();
  });
  document.querySelector("#exportBackupButton").addEventListener("click", exportBackup);
  document.querySelector("#importBackupInput").addEventListener("change", importBackup);
}

function updateQrCodeImage(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  resizeImageFile(file, 720).then((dataUrl) => {
    state.settings.qrCodeImage = dataUrl;
    saveState();
    renderSettings();
  }).catch(() => alert("เลือกรูป QR ไม่สำเร็จ"));
}

function resizeImageFile(file, maxSize = 720) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(Math.round(image.width * scale), 1);
        canvas.height = Math.max(Math.round(image.height * scale), 1);
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function exportBackup() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: "Kantana ERP",
    data: state,
  };
  downloadTextFile(`kantana-erp-backup-${today()}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
}

async function importBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const incoming = parsed.data || parsed;
    const requiredArrays = ["customers", "services", "quotes", "invoices", "payments", "receipts", "activities"];
    const isValid = incoming.settings && requiredArrays.every((key) => Array.isArray(incoming[key]));
    if (!isValid) throw new Error("invalid");
    if (!confirm("นำเข้าข้อมูลนี้แทนข้อมูลปัจจุบันทั้งหมดใช่ไหม?")) {
      event.target.value = "";
      return;
    }
    const base = structuredClone(defaultState);
    state = {
      ...base,
      ...incoming,
      settings: { ...base.settings, ...(incoming.settings || {}) },
      counters: { ...base.counters, ...(incoming.counters || {}) },
    };
    saveState();
    alert("นำเข้าข้อมูลแล้ว");
    renderSettings();
  } catch {
    alert("ไฟล์นี้ไม่ใช่ backup ที่ถูกต้อง");
  } finally {
    event.target.value = "";
  }
}

app();
