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
  ["services", "บริการ"],
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
    return { ...structuredClone(defaultState), ...JSON.parse(saved) };
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
    services: renderServices,
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
  const actionItems = [
    ...state.invoices.filter((invoice) => ["open", "partial"].includes(invoice.status)).map((invoice) => ({
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
  document.querySelector('[data-action="new-customer"]')?.addEventListener("click", () => showCustomerForm());
  document.querySelectorAll("[data-workflow]").forEach((button) => {
    const [type, id] = button.dataset.workflow.split(":");
    button.addEventListener("click", () => {
      if (type === "confirm") confirmQuote(id);
      if (type === "receive") showPaymentForm(id);
    });
  });
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
  page(
    customer.name,
    "Customer ledger และประวัติเอกสาร",
    `<button class="button" data-action="back-customers">กลับ</button>
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
      <section class="card" style="margin-top:16px"><h2>Payment history</h2>${payments.length ? table(["วันที่", "จำนวน", "วิธี"], payments.map((p) => [thaiDate(p.paymentDate), `${money(p.amount)} บาท`, p.paymentMethod])) : `<div class="empty">ยังไม่มีการรับเงิน</div>`}</section>
    `
  );
  document.querySelector('[data-action="back-customers"]').addEventListener("click", renderCustomers);
  document.querySelector('[data-action="quote-for-customer"]').addEventListener("click", () => showQuoteEditor({ customerId }));
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
    quote.quoteNumber,
    customerById(quote.customerId)?.name || "-",
    thaiDate(quote.issueDate),
    `<span class="status ${quote.status}">${statusText(quote.status)}</span>`,
    `${money(quote.totalDue)} บาท`,
    `<button class="button" data-view-quote="${quote.id}">ดู</button>
     ${quote.status !== "confirmed" ? `<button class="button primary" data-confirm-quote="${quote.id}">คอนเฟิร์ม</button>` : ""}`,
  ]);
  page(
    "ใบเสนอราคา",
    "สร้างและคอนเฟิร์มใบเสนอราคาเป็นใบแจ้งหนี้",
    `<button class="button primary" data-action="add-quote">สร้างใบเสนอราคา</button>`,
    rows.length ? table(["เลข", "ลูกค้า", "วันที่", "สถานะ", "ยอด", "จัดการ"], rows) : `<div class="empty">ยังไม่มีใบเสนอราคา</div>`
  );
  document.querySelector('[data-action="add-quote"]').addEventListener("click", () => showQuoteEditor());
  document.querySelectorAll("[data-confirm-quote]").forEach((button) => button.addEventListener("click", () => confirmQuote(button.dataset.confirmQuote)));
  document.querySelectorAll("[data-view-quote]").forEach((button) => button.addEventListener("click", () => renderDocument("quote", button.dataset.viewQuote)));
}

function showQuoteEditor(options = {}) {
  const draft = {
    customerId: options.customerId || state.customers[0]?.id || "",
    issueDate: today(),
    expiryDate: today(),
    withholdingEnabled: true,
    withholdingPercent: state.settings.defaultWithholdingPercent,
    note: "",
    items: [],
  };
  renderQuoteEditor(draft);
}

function renderQuoteEditor(draft) {
  const calc = calculate(draft.items, draft.withholdingEnabled, draft.withholdingPercent);
  page(
    "สร้างใบเสนอราคา",
    "เลือกบริการจาก catalog แล้วระบบคำนวณยอดให้อัตโนมัติ",
    `<button class="button" data-action="back-quotes">กลับ</button>`,
    `
      <form class="split" id="quoteForm">
        <section class="card grid">
          <div class="form-grid">
            <label>ลูกค้า<select name="customerId">${state.customers.map((c) => `<option value="${c.id}" ${draft.customerId === c.id ? "selected" : ""}>${c.name}</option>`).join("")}</select></label>
            <label>วันที่<input name="issueDate" type="date" value="${draft.issueDate}"></label>
            <label>หัก ณ ที่จ่าย %<input name="withholdingPercent" type="number" min="0" value="${draft.withholdingPercent}"></label>
            <label>หมายเหตุ<input name="note" value="${draft.note || ""}"></label>
          </div>
          <div>
            <h3>รายการ</h3>
            <div class="line-editor" id="quoteLines">${draft.items.map((item, index) => renderLine(item, index)).join("")}</div>
            <div class="actions" style="margin-top:10px">
              <select id="servicePicker">${state.services.map((s) => `<option value="${s.id}">${s.name} - ${money(s.unitPrice)}</option>`).join("")}</select>
              <button class="button" id="addServiceLine" type="button">เพิ่มจากบริการ</button>
              <button class="button" id="addCustomLine" type="button">เพิ่มรายการเอง</button>
            </div>
          </div>
          <div class="actions">
            <button class="button primary" type="submit">บันทึกใบเสนอราคา</button>
          </div>
        </section>
        <aside class="card">
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
  form.addEventListener("input", (event) => {
    if (event.target.dataset.line !== undefined) {
      const item = draft.items[Number(event.target.dataset.line)];
      const field = event.target.dataset.field;
      item[field] = field === "description" ? event.target.value : Number(event.target.value || 0);
      if (field === "quantity" || field === "unitPrice") item.amount = Number(item.quantity || 0) * Number(item.unitPrice || 0);
      renderQuoteEditor({ ...draft, ...Object.fromEntries(new FormData(form).entries()) });
    }
  });
  document.querySelectorAll("[data-remove-line]").forEach((button) => button.addEventListener("click", () => {
    draft.items.splice(Number(button.dataset.removeLine), 1);
    renderQuoteEditor({ ...draft, ...Object.fromEntries(new FormData(form).entries()) });
  }));
  document.querySelector("#addServiceLine").addEventListener("click", () => {
    const service = serviceById(document.querySelector("#servicePicker").value);
    draft.items.push({ serviceId: service.id, description: service.description, quantity: 1, unitPrice: service.unitPrice, amount: service.unitPrice });
    renderQuoteEditor({ ...draft, ...Object.fromEntries(new FormData(form).entries()) });
  });
  document.querySelector("#addCustomLine").addEventListener("click", () => {
    draft.items.push({ serviceId: "", description: "", quantity: 1, unitPrice: 0, amount: 0 });
    renderQuoteEditor({ ...draft, ...Object.fromEntries(new FormData(form).entries()) });
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(form).entries());
    const calc = calculate(draft.items, true, Number(formData.withholdingPercent || 0));
    const quote = {
      id: uid("qt"),
      quoteNumber: nextNumber("QT"),
      customerId: formData.customerId,
      issueDate: formData.issueDate,
      expiryDate: formData.issueDate,
      status: "sent",
      note: formData.note,
      items: draft.items,
      ...calc,
      createdAt: new Date().toISOString(),
    };
    state.quotes.unshift(quote);
    addActivity("quote", quote.id, `สร้างใบเสนอราคา ${quote.quoteNumber}`);
    addActivity("customer", quote.customerId, `สร้างใบเสนอราคา ${quote.quoteNumber}`);
    saveState();
    renderQuotes();
  });
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

function confirmQuote(quoteId) {
  const quote = state.quotes.find((item) => item.id === quoteId);
  if (!quote || quote.status === "confirmed") return;
  const invoice = {
    id: uid("inv"),
    invoiceNumber: nextNumber("INV"),
    quoteId: quote.id,
    customerId: quote.customerId,
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
    "",
    rows.length ? table(["เลข", "ลูกค้า", "วันที่", "สถานะ", "ค้างชำระ", "จัดการ"], rows) : `<div class="empty">ยังไม่มีใบแจ้งหนี้</div>`
  );
  document.querySelectorAll("[data-view-invoice]").forEach((button) => button.addEventListener("click", () => renderDocument("invoice", button.dataset.viewInvoice)));
  document.querySelectorAll("[data-receive]").forEach((button) => button.addEventListener("click", () => showPaymentForm(button.dataset.receive)));
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
  const title = type === "quote" ? "QUOTE" : type === "invoice" ? "INVOICE" : "RECEIPT";
  page(
    title,
    "Preview / print เอกสาร",
    `<button class="button no-print" data-action="back-docs">กลับ</button>
     <button class="button primary no-print" onclick="window.print()">พิมพ์ / บันทึก PDF</button>
     ${type === "quote" && doc.status !== "confirmed" ? `<button class="button success no-print" data-confirm-quote="${doc.id}">คอนเฟิร์มเป็น invoice</button>` : ""}
     ${type === "invoice" && doc.status !== "paid" ? `<button class="button primary no-print" data-receive="${doc.id}">รับเงิน</button>` : ""}`,
    `
      <article class="document">
        <header class="document-head">
          <div><h2>${title}</h2><p>${doc.quoteNumber || doc.invoiceNumber || doc.receiptNumber}</p></div>
          <div class="document-box"><strong>วันที่</strong><br>${thaiDate(doc.issueDate)}</div>
        </header>
        <section class="grid cols-2" style="margin-top: 20px">
          <div><h3>ผู้ขาย</h3><p>${state.settings.businessName}<br>${state.settings.address}<br>${state.settings.phone}<br>${state.settings.email}</p></div>
          <div><h3>ลูกค้า</h3><p>${customer?.name || "-"}<br>${customer?.address || ""}<br>${customer?.phone || ""}<br>${customer?.email || ""}</p></div>
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
      ${table(["รายละเอียด", "จำนวน", "ราคา", "จำนวนเงิน"], doc.items.map((item) => [item.description, money(item.quantity), money(item.unitPrice), `${money(item.amount)} บาท`]))}
      <div class="grid" style="justify-items:end;margin-top:18px">${summaryHtml(doc)}</div>
      <div class="document-box" style="margin-top:20px"><strong>การชำระ</strong><br>${state.settings.bankName} ${state.settings.bankAccountName}<br>${state.settings.bankAccountNumber}</div>
    </div>
  `;
}

function receiptBody(receipt, invoice) {
  const payment = state.payments.find((item) => item.id === receipt.paymentId);
  return `
    <section style="margin-top: 20px">
      ${table(["อ้างอิง", "วิธีชำระ", "จำนวนเงิน"], [[invoice?.invoiceNumber || "-", payment?.paymentMethod || "-", `${money(receipt.amount)} บาท`]])}
      <div class="document-box" style="margin-top:20px"><strong>หมายเหตุ</strong><br>${receipt.note || "-"}<br><br><strong>หลักฐาน</strong><br>${payment?.attachment?.name || "-"}</div>
    </section>
  `;
}

function renderReports() {
  const t = totals();
  const serviceSales = state.services.map((service) => {
    const amount = [...state.quotes, ...state.invoices].flatMap((doc) => doc.items || []).filter((item) => item.serviceId === service.id).reduce((sum, item) => sum + item.amount, 0);
    return [service.name, `${money(amount)} บาท`];
  });
  page(
    "รายงาน",
    "รายงานหลักสำหรับติดตามรายรับ ลูกค้า และบริการ",
    `<button class="button" data-export="csv">Export CSV</button>`,
    `
      <section class="grid cols-3">
        ${metric("ยอดรับเงิน", `${money(t.totalPaid)} บาท`)}
        ${metric("ยอดค้าง", `${money(t.totalOutstanding)} บาท`)}
        ${metric("หัก ณ ที่จ่ายรวม", `${money(state.invoices.reduce((s, i) => s + i.withholdingAmount, 0))} บาท`)}
      </section>
      <section class="grid cols-2" style="margin-top:16px">
        <div class="card"><h2>ยอดขายตามบริการ</h2>${table(["บริการ", "ยอด"], serviceSales)}</div>
        <div class="card"><h2>Invoice ค้างชำระ</h2>${table(["เลข", "ลูกค้า", "ค้าง"], state.invoices.filter((i) => recalcInvoice(i).balanceDue > 0).map((i) => [i.invoiceNumber, customerById(i.customerId)?.name || "-", `${money(i.balanceDue)} บาท`]))}</div>
      </section>
    `
  );
  document.querySelector("[data-export]")?.addEventListener("click", exportCsv);
}

function exportCsv() {
  const lines = [["invoice", "customer", "status", "total_due", "paid", "balance"].join(",")];
  state.invoices.forEach((invoice) => {
    recalcInvoice(invoice);
    lines.push([invoice.invoiceNumber, customerById(invoice.customerId)?.name || "", statusText(invoice.status), invoice.totalDue, invoice.paidAmount, invoice.balanceDue].join(","));
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "billing-report.csv";
  link.click();
  URL.revokeObjectURL(url);
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
        <label>เลขบัญชี<input name="bankAccountNumber" value="${state.settings.bankAccountNumber}"></label>
        <label>หัก ณ ที่จ่าย %<input name="defaultWithholdingPercent" type="number" value="${state.settings.defaultWithholdingPercent}"></label>
        <label>PIN<input name="pin" value="${state.settings.pin}"></label>
        <label class="span-2">ที่อยู่<textarea name="address">${state.settings.address}</textarea></label>
        <div class="actions span-2"><button class="button primary" type="submit">บันทึก</button><button class="button danger" type="button" id="logoutButton">ออกจากระบบ</button></div>
      </form>
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
}

app();
