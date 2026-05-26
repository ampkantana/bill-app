const STORAGE_KEY = "kantana-erp-v1";
const SESSION_KEY = "kantana-erp-session";
const SESSION_MODE_CLOUD = "cloud";
const CLOUD_CONFIG_KEY = "kantana-erp-cloud-config-v1";
const CLOUD_TABLE = "app_states";
const DEFAULT_BILL_NOTE = `-ปรับแก้จำนวน 2 ครั้ง หลังจากส่งครั้งแรก รวมจะได้ภาพไฟนอล ทั้งหมด 3 ครั้ง
-มัดจำ 70% ก่อนส่งงานครั้งแรก
-ส่วนที่เหลือหลัง จากแก้ไข้ตามรายละเอียดอีกที`;
const DEFAULT_DOCUMENT_LABELS = {
  date: "Date",
  project: "Project",
  from: "From",
  billTo: "Bill To",
  taxId: "Tax ID",
  address: "Address",
  phone: "Phone",
  email: "E-mail",
  item: "ITEM",
  particulars: "PARTICULARS",
  quantity: "QUANTITY",
  unitPrice: "UNIT PRICE",
  amount: "AMOUNT",
  note: "NOTE",
  paymentTo: "PAYMENT TO",
  accountName: "Account name",
  savingsAccountNo: "Savings account no.",
  contact: "Contact",
  subtotal: "SUBTOTAL",
  withholdingTax: "WITHHOLDING TAX",
  paid: "PAID",
  totalDue: "TOTAL DUE",
  reference: "Reference",
  paymentMethod: "Payment method",
  attachment: "Attachment",
};

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
    documentLabels: { ...DEFAULT_DOCUMENT_LABELS },
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
let cloudClient = null;
let cloudUser = null;
let cloudSyncTimer = null;
let cloudStatusMessage = "";

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

const documentLabelGroups = [
  ["หัวข้อด้านบน", [
    ["date", "วันที่"],
    ["from", "ผู้ขาย"],
    ["billTo", "ลูกค้า"],
    ["project", "โปรเจกต์"],
  ]],
  ["ข้อมูลติดต่อ", [
    ["taxId", "เลขผู้เสียภาษี"],
    ["address", "ที่อยู่"],
    ["phone", "โทร"],
    ["email", "อีเมล"],
  ]],
  ["ตารางรายการ", [
    ["item", "ลำดับ"],
    ["particulars", "รายละเอียด"],
    ["quantity", "จำนวน"],
    ["unitPrice", "ราคาต่อหน่วย"],
    ["amount", "จำนวนเงิน"],
  ]],
  ["สรุปและชำระเงิน", [
    ["note", "หมายเหตุ"],
    ["paymentTo", "ช่องทางชำระเงิน"],
    ["accountName", "ชื่อบัญชี"],
    ["savingsAccountNo", "เลขบัญชี"],
    ["contact", "ติดต่อ"],
    ["subtotal", "รวมราคา"],
    ["withholdingTax", "หัก ณ ที่จ่าย"],
    ["paid", "ชำระแล้ว"],
    ["totalDue", "จำนวนที่ต้องชำระ"],
  ]],
  ["ใบเสร็จ", [
    ["reference", "อ้างอิง"],
    ["paymentMethod", "วิธีชำระ"],
    ["attachment", "หลักฐาน"],
  ]],
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
      settings: mergeSettings(base.settings, parsed.settings),
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

function normalizeState(incoming = {}) {
  const base = structuredClone(defaultState);
  return {
    ...base,
    ...incoming,
    settings: mergeSettings(base.settings, incoming.settings),
    counters: { ...base.counters, ...(incoming.counters || {}) },
    customers: incoming.customers || base.customers,
    services: incoming.services || base.services,
    quotes: incoming.quotes || base.quotes,
    invoices: incoming.invoices || base.invoices,
    payments: incoming.payments || base.payments,
    receipts: incoming.receipts || base.receipts,
    activities: incoming.activities || base.activities,
  };
}

function mergeSettings(baseSettings, incomingSettings = {}) {
  return {
    ...baseSettings,
    ...incomingSettings,
    documentLabels: {
      ...baseSettings.documentLabels,
      ...(incomingSettings.documentLabels || {}),
    },
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  scheduleCloudSave();
}

function loadCloudConfig() {
  try {
    const config = JSON.parse(localStorage.getItem(CLOUD_CONFIG_KEY) || "{}");
    return {
      supabaseUrl: normalizeSupabaseUrl(config.supabaseUrl || ""),
      supabaseAnonKey: isSecretSupabaseKey(config.supabaseAnonKey) ? "" : String(config.supabaseAnonKey || "").trim(),
    };
  } catch {
    return {};
  }
}

function normalizeSupabaseUrl(value) {
  return String(value || "").trim().replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
}

function isSecretSupabaseKey(value) {
  return String(value || "").trim().startsWith("sb_secret_");
}

function validateCloudConfig(config) {
  const supabaseUrl = normalizeSupabaseUrl(config.supabaseUrl);
  const supabaseAnonKey = String(config.supabaseAnonKey || "").trim();
  if (!/^https:\/\/[^/]+\.supabase\.co$/.test(supabaseUrl)) {
    throw new Error("Supabase URL ต้องเป็นรูปแบบ https://PROJECT.supabase.co ไม่ต้องใส่ /rest/v1");
  }
  if (isSecretSupabaseKey(supabaseAnonKey)) {
    throw new Error("ห้ามใช้ sb_secret key บนหน้าเว็บ ให้ใช้ Publishable key หรือ anon public key เท่านั้น");
  }
  if (!supabaseAnonKey || (!supabaseAnonKey.startsWith("sb_publishable_") && !supabaseAnonKey.startsWith("eyJ"))) {
    throw new Error("Supabase key ต้องเป็น Publishable key หรือ anon public key");
  }
  return { supabaseUrl, supabaseAnonKey };
}

function validateCloudCredentials(values) {
  const email = String(values.email || "").trim();
  const password = String(values.password || "");
  if (!email || !password) {
    throw new Error("กรอก Email และ Password ก่อน");
  }
  return { email, password };
}

function saveCloudConfig(config) {
  const cleanConfig = validateCloudConfig(config);
  localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(cleanConfig));
  cloudClient = null;
  return cleanConfig;
}

function hasCloudConfig() {
  const config = loadCloudConfig();
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}

function getSupabaseFactory() {
  return globalThis.supabase?.createClient ? globalThis.supabase : null;
}

function initCloudClient() {
  if (cloudClient) return cloudClient;
  const config = loadCloudConfig();
  const factory = getSupabaseFactory();
  if (!factory || !config.supabaseUrl || !config.supabaseAnonKey) return null;
  cloudClient = factory.createClient(config.supabaseUrl, config.supabaseAnonKey);
  return cloudClient;
}

function cloudStatusText() {
  if (!hasCloudConfig()) return "Cloud ยังไม่ตั้งค่า";
  if (cloudUser?.email) return `Cloud: ${cloudUser.email}`;
  return cloudStatusMessage || "Cloud ready";
}

function setCloudStatus(message) {
  cloudStatusMessage = message;
}

async function cloudSignIn(email, password) {
  const client = initCloudClient();
  if (!client) throw new Error("missing-cloud-config");
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  cloudUser = data.user;
  return data.user;
}

async function cloudSignUp(email, password) {
  const client = initCloudClient();
  if (!client) throw new Error("missing-cloud-config");
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  cloudUser = data.user;
  return data.user;
}

async function cloudSignOut() {
  const client = initCloudClient();
  if (client) await client.auth.signOut();
  cloudUser = null;
  sessionStorage.removeItem(SESSION_KEY);
}

async function restoreCloudSession() {
  const client = initCloudClient();
  if (!client) return false;
  const { data, error } = await client.auth.getSession();
  if (error || !data.session?.user) return false;
  cloudUser = data.session.user;
  sessionStorage.setItem(SESSION_KEY, SESSION_MODE_CLOUD);
  await loadCloudState();
  return true;
}

async function loadCloudState() {
  const client = initCloudClient();
  if (!client || !cloudUser?.id) return false;
  const { data, error } = await client
    .from(CLOUD_TABLE)
    .select("data")
    .eq("user_id", cloudUser.id)
    .maybeSingle();
  if (error) throw error;
  if (data?.data) {
    state = normalizeState(data.data);
    selectedCustomerId = state.customers[0]?.id || null;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setCloudStatus("โหลดข้อมูลจาก Cloud แล้ว");
    return true;
  }
  await saveCloudStateNow();
  setCloudStatus("สร้างฐานข้อมูล Cloud แล้ว");
  return false;
}

async function saveCloudStateNow() {
  const client = initCloudClient();
  if (!client || !cloudUser?.id) return false;
  const { error } = await client.from(CLOUD_TABLE).upsert({
    user_id: cloudUser.id,
    data: state,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  setCloudStatus("บันทึกขึ้น Cloud แล้ว");
  return true;
}

function scheduleCloudSave() {
  if (!cloudUser?.id || !initCloudClient()) return;
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => {
    saveCloudStateNow().catch((error) => {
      console.error(error);
      setCloudStatus("Cloud sync ไม่สำเร็จ");
    });
  }, 700);
}

async function migrateLocalDataToCloud() {
  if (!cloudUser?.id) throw new Error("not-signed-in");
  await saveCloudStateNow();
}

function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === SESSION_MODE_CLOUD;
}

function isCloudSession() {
  return sessionStorage.getItem(SESSION_KEY) === SESSION_MODE_CLOUD;
}

async function boot() {
  if (!isLoggedIn() && hasCloudConfig()) {
    await restoreCloudSession().catch(() => false);
  }
  if (isCloudSession() && !cloudUser?.id) {
    const restored = await restoreCloudSession().catch(() => false);
    if (!restored) sessionStorage.removeItem(SESSION_KEY);
  }
  app();
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
    quote: { title: "QUOTATION", label: "Quotation" },
    invoice: { title: "INVOICE", label: "Invoice" },
    receipt: { title: "RECEIPT", label: "Receipt" },
  }[type] || { title: "DOCUMENT", label: "Document" };
}

function documentPrintTitle(type, doc = {}, customer = null) {
  const typeName = documentTypeMeta(type).label;
  const datePart = String(doc.issueDate || today()).replaceAll("-", ".");
  const nameSource = doc.projectName || customer?.name || doc.quoteNumber || doc.invoiceNumber || doc.receiptNumber || "Document";
  const namePart = String(nameSource).replace(/[^A-Za-z0-9ก-๙]/g, "");
  return `${datePart}${typeName}${namePart || "Document"}`;
}

function documentLabel(key) {
  const labels = state.settings.documentLabels || {};
  return Object.prototype.hasOwnProperty.call(labels, key) ? String(labels[key]).trim() : DEFAULT_DOCUMENT_LABELS[key] || "";
}

function labeledText(labelKey, value) {
  const label = documentLabel(labelKey);
  return label ? `<strong>${label}</strong> ${value}` : value;
}

function detailRow(labelKey, value) {
  const label = documentLabel(labelKey);
  return `<div>${label ? `<dt>${label}</dt>` : ""}<dd>${value || "-"}</dd></div>`;
}

function labelParagraph(labelKey, className) {
  const label = documentLabel(labelKey);
  return label ? `<p class="${className}">${label}</p>` : "";
}

function documentDateHtml(type, doc, base) {
  return labeledText("date", thaiDate(doc.issueDate));
}

function documentCustomerHtml(doc, customer) {
  return `
    ${doc.projectName ? `${labelParagraph("project", "project-label")}<p class="project-name">${doc.projectName}</p>` : ""}
    ${labelParagraph("billTo", "customer-label")}
    <p class="customer-name">${customer?.name || "-"}</p>
    <dl class="document-details">
      ${detailRow("taxId", customer?.taxId)}
      ${detailRow("address", customer?.address)}
      ${detailRow("phone", customer?.phone)}
      ${customer?.email ? detailRow("email", customer.email) : ""}
    </dl>
  `;
}

function documentSellerHtml() {
  return `
    ${labelParagraph("from", "seller-label")}
    <p class="seller-name">${state.settings.businessName}</p>
    <dl class="document-details">
      ${detailRow("taxId", state.settings.taxId)}
      ${detailRow("address", state.settings.address)}
      ${detailRow("phone", state.settings.phone)}
      ${detailRow("email", state.settings.email)}
    </dl>
  `;
}

function documentNumberHtml(type, doc) {
  const number = doc.quoteNumber || doc.invoiceNumber || doc.receiptNumber || "";
  return number ? `<p>${number}</p>` : "";
}

function documentNoteHtml(doc) {
  const note = String(doc.note || "").trim();
  const label = documentLabel("note");
  return note ? `<div class="document-box note-box">${label ? `<strong>${label}</strong><br>` : ""}${note}</div>` : "";
}

function paymentInfoHtml() {
  return `
    <div class="payment-panel">
      <div class="document-payment-grid">
        <div class="payment-bank">
          ${documentLabel("paymentTo") ? `<strong>${documentLabel("paymentTo")}</strong>` : ""}
          <p>${state.settings.bankName}<br>${state.settings.bankAccountName}<br>${state.settings.bankAccountNumber}</p>
        </div>
        <div class="payment-contact">
          ${documentLabel("contact") ? `<strong>${documentLabel("contact")}</strong>` : ""}
          <p>${state.settings.phone || "-"}<br>${state.settings.email || "-"}</p>
        </div>
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
  const cloudConfig = loadCloudConfig();
  const cloudConfigured = hasCloudConfig();
  document.querySelector("#app").innerHTML = `
    <main class="login-screen">
      <section class="login-card">
        <p class="eyebrow">Kantana ERP</p>
        <h1>เข้าสู่ระบบ</h1>
        <p>${cloudConfigured ? "เข้าสู่ระบบด้วยอีเมลเพื่อใช้ฐานข้อมูล Cloud" : "ตั้งค่า Supabase ก่อนเพื่อใช้งานข้อมูลออนไลน์"}</p>
        ${cloudConfigured ? `
          <div class="cloud-config-summary">
            <span>Cloud พร้อมใช้งาน</span>
            <button class="button ghost" type="button" id="editCloudConfigButton">แก้ไข Cloud config</button>
          </div>
        ` : ""}
        <form class="cloud-config-form ${cloudConfigured ? "hidden" : ""}" id="cloudConfigForm">
          <label>Supabase URL<input name="supabaseUrl" value="${cloudConfig.supabaseUrl || ""}" placeholder="https://xxxx.supabase.co"></label>
          <label>Publishable / anon key<input name="supabaseAnonKey" value="${cloudConfig.supabaseAnonKey || ""}" placeholder="sb_publishable_... หรือ eyJ..."></label>
          <button class="button" type="submit">บันทึกค่า Cloud</button>
        </form>
        <form class="cloud-login-form" id="cloudLoginForm">
          <label>Email<input class="cloud-email" name="email" type="email" autocomplete="email" placeholder="you@email.com"></label>
          <label>Password<input class="cloud-password" name="password" type="password" autocomplete="current-password"></label>
          <div class="actions">
            <button class="button primary" type="submit">เข้าสู่ระบบด้วยอีเมล</button>
            <button class="button" type="button" id="cloudSignUpButton">สร้างผู้ใช้ใหม่</button>
          </div>
        </form>
      </section>
    </main>
  `;
  document.querySelector("#editCloudConfigButton")?.addEventListener("click", () => {
    document.querySelector("#cloudConfigForm")?.classList.remove("hidden");
    document.querySelector(".cloud-config-summary")?.classList.add("hidden");
  });
  document.querySelector("#cloudConfigForm").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      saveCloudConfig(Object.fromEntries(new FormData(event.target).entries()));
      alert("บันทึกค่า Cloud แล้ว");
      renderLogin();
    } catch (error) {
      alert(error.message || error);
    }
  });
  document.querySelector("#cloudLoginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const formValues = validateCloudCredentials(Object.fromEntries(new FormData(event.target).entries()));
      await cloudSignIn(formValues.email, formValues.password);
      await loadCloudState();
      sessionStorage.setItem(SESSION_KEY, SESSION_MODE_CLOUD);
      app();
    } catch (error) {
      alert(`เข้าสู่ระบบ Cloud ไม่สำเร็จ: ${error.message || error}`);
    }
  });
  document.querySelector("#cloudSignUpButton").addEventListener("click", async () => {
    const form = document.querySelector("#cloudLoginForm");
    try {
      const formValues = validateCloudCredentials(Object.fromEntries(new FormData(form).entries()));
      await cloudSignUp(formValues.email, formValues.password);
      await loadCloudState();
      sessionStorage.setItem(SESSION_KEY, SESSION_MODE_CLOUD);
      alert("สร้างผู้ใช้แล้ว ถ้า Supabase เปิด email confirmation อาจต้องยืนยันอีเมลก่อน");
      app();
    } catch (error) {
      alert(`สร้างผู้ใช้ไม่สำเร็จ: ${error.message || error}`);
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
          <small class="cloud-status">${cloudStatusText()}</small>
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
       <button class="button primary" data-customer-quote="${customer.id}">New Quote</button>
       <button class="button danger" data-delete-customer="${customer.id}">ลบ</button>`,
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
  document.querySelectorAll("[data-delete-customer]").forEach((button) => button.addEventListener("click", () => deleteCustomer(button.dataset.deleteCustomer)));
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

function deleteCustomer(customerId) {
  const customer = customerById(customerId);
  if (!customer) return false;
  const relatedInvoiceIds = new Set(state.invoices.filter((invoice) => invoice.customerId === customerId).map((invoice) => invoice.id));
  const relatedPaymentIds = new Set(state.payments.filter((payment) => payment.customerId === customerId || relatedInvoiceIds.has(payment.invoiceId)).map((payment) => payment.id));
  if (!confirm(`ลบลูกค้า ${customer.name} ใช่ไหม? ใบเสนอราคา ใบแจ้งหนี้ รับเงิน และใบเสร็จของลูกค้านี้จะถูกลบด้วย`)) return false;
  state.customers = state.customers.filter((item) => item.id !== customerId);
  state.quotes = state.quotes.filter((quote) => quote.customerId !== customerId);
  state.invoices = state.invoices.filter((invoice) => invoice.customerId !== customerId);
  state.payments = state.payments.filter((payment) => payment.customerId !== customerId && !relatedInvoiceIds.has(payment.invoiceId));
  state.receipts = state.receipts.filter((receipt) => receipt.customerId !== customerId && !relatedInvoiceIds.has(receipt.invoiceId) && !relatedPaymentIds.has(receipt.paymentId));
  state.activities = state.activities.filter((activity) => !(activity.entityType === "customer" && activity.entityId === customerId));
  if (selectedCustomerId === customerId) selectedCustomerId = state.customers[0]?.id || null;
  addActivity("customer", customerId, `ลบลูกค้า ${customer.name}`);
  saveState();
  if (document.querySelector("#view")) renderCustomers();
  return true;
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
     <button class="button primary" data-action="quote-for-customer">New Quote</button>
     <button class="button danger" data-delete-customer="${customerId}">ลบลูกค้า</button>`,
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
  document.querySelector("[data-delete-customer]").addEventListener("click", () => deleteCustomer(customerId));
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
     <button class="button" data-edit-quote="${quote.id}">แก้ไข</button>
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
  document.querySelectorAll("[data-edit-quote]").forEach((button) => button.addEventListener("click", () => showQuoteEditor({ quoteId: button.dataset.editQuote })));
}

function showQuoteEditor(options = {}) {
  const existing = options.quoteId ? state.quotes.find((quote) => quote.id === options.quoteId) : null;
  if (existing) {
    renderQuoteEditor({ ...structuredClone(existing), editing: true });
    return;
  }
  const draft = {
    customerId: options.customerId || state.customers[0]?.id || "",
    issueDate: today(),
    expiryDate: today(),
    projectName: "",
    withholdingEnabled: true,
    withholdingPercent: state.settings.defaultWithholdingPercent,
    note: DEFAULT_BILL_NOTE,
    items: [blankLineItem()],
  };
  renderQuoteEditor(draft);
}

function renderQuoteEditor(draft) {
  const calc = calculate(draft.items, draft.withholdingEnabled, draft.withholdingPercent);
  const isEditing = Boolean(draft.editing || draft.id);
  const isConfirmed = draft.status === "confirmed";
  page(
    isEditing ? "แก้ไขใบเสนอราคา" : "สร้างใบเสนอราคา",
    isConfirmed ? "แก้ไขใบเสนอราคาที่คอนเฟิร์มแล้ว ระบบจะอัปเดต invoice ที่เกี่ยวข้องให้ด้วย" : "พิมพ์รายการเองเหมือนแบบบิลเดิม แล้วระบบคำนวณยอดให้อัตโนมัติ",
    `<button class="button" data-action="back-quotes">กลับ</button>`,
    `
      <form class="split" id="quoteForm">
        <section class="card grid">
          <div class="form-grid">
            <label>ลูกค้า<select name="customerId">${state.customers.map((c) => `<option value="${c.id}" ${draft.customerId === c.id ? "selected" : ""}>${c.name}</option>`).join("")}</select></label>
            <label>ชื่อโปรเจกต์<input name="projectName" value="${draft.projectName || ""}"></label>
            <label>วันที่<input name="issueDate" type="date" value="${draft.issueDate}"></label>
            <label>หัก ณ ที่จ่าย %<input name="withholdingPercent" type="number" min="0" value="${draft.withholdingPercent}"></label>
            <label class="span-2">หมายเหตุ<textarea name="note">${draft.note || DEFAULT_BILL_NOTE}</textarea></label>
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
            ${isEditing ? `<button class="button primary" data-status="${draft.status || "draft"}" type="submit">บันทึกการแก้ไข</button>` : `<button class="button" data-status="draft" type="submit">บันทึก Draft</button>`}
            ${!isConfirmed ? `<button class="button primary" data-status="sent" type="submit">บันทึกและส่งแล้ว</button>` : ""}
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
    if (draft.id) {
      const quote = state.quotes.find((item) => item.id === draft.id);
      if (!quote) return;
      Object.assign(quote, {
        customerId: formData.customerId,
        projectName: formData.projectName,
        issueDate: formData.issueDate,
        expiryDate: formData.expiryDate || formData.issueDate,
        status: quote.status === "confirmed" ? "confirmed" : status,
        note: formData.note,
        items,
        ...calc,
        updatedAt: new Date().toISOString(),
      });
      syncInvoiceFromQuote(quote);
      addActivity("quote", quote.id, `แก้ไขใบเสนอราคา ${quote.quoteNumber}`);
      addActivity("customer", quote.customerId, `แก้ไขใบเสนอราคา ${quote.quoteNumber}`);
      saveState();
      renderQuotes();
      return;
    }
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

function syncInvoiceFromQuote(quote) {
  const invoice = state.invoices.find((item) => item.id === quote.createdInvoiceId || item.quoteId === quote.id);
  if (!invoice) return null;
  Object.assign(invoice, {
    customerId: quote.customerId,
    projectName: quote.projectName || "",
    note: quote.note,
    items: structuredClone(quote.items),
    subtotal: quote.subtotal,
    withholdingEnabled: quote.withholdingEnabled,
    withholdingPercent: quote.withholdingPercent,
    withholdingAmount: quote.withholdingAmount,
    totalDue: quote.totalDue,
    updatedAt: new Date().toISOString(),
  });
  recalcInvoice(invoice);
  addActivity("invoice", invoice.id, `อัปเดตจากใบเสนอราคา ${quote.quoteNumber}`);
  return invoice;
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
     ${invoice.status !== "paid" ? `<button class="button primary" data-receive="${invoice.id}">รับเงิน</button>` : ""}
     ${Number(invoice.paidAmount || 0) > 0 ? `<button class="button success" data-receipt-invoice="${invoice.id}">ใบเสร็จ</button>` : ""}
     <button class="button danger" data-delete-invoice="${invoice.id}">ลบ</button>`,
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
  document.querySelectorAll("[data-receipt-invoice]").forEach((button) => button.addEventListener("click", () => openReceiptForInvoice(button.dataset.receiptInvoice)));
  document.querySelectorAll("[data-delete-invoice]").forEach((button) => button.addEventListener("click", () => deleteInvoice(button.dataset.deleteInvoice)));
}

function deleteInvoice(invoiceId) {
  const invoice = state.invoices.find((item) => item.id === invoiceId);
  if (!invoice) return false;
  if (!confirm(`ลบใบแจ้งหนี้ ${invoice.invoiceNumber || ""} ใช่ไหม? รายการรับเงินและใบเสร็จที่เกี่ยวข้องจะถูกลบด้วย`)) return false;
  state.invoices = state.invoices.filter((item) => item.id !== invoiceId);
  state.payments = state.payments.filter((payment) => payment.invoiceId !== invoiceId);
  state.receipts = state.receipts.filter((receipt) => receipt.invoiceId !== invoiceId);
  const quote = state.quotes.find((item) => item.createdInvoiceId === invoiceId || item.id === invoice.quoteId);
  if (quote) {
    quote.status = "sent";
    quote.createdInvoiceId = "";
  }
  addActivity("invoice", invoiceId, `ลบใบแจ้งหนี้ ${invoice.invoiceNumber || ""}`);
  if (invoice.customerId) addActivity("customer", invoice.customerId, `ลบใบแจ้งหนี้ ${invoice.invoiceNumber || ""}`);
  saveState();
  if (document.querySelector("#view")) renderInvoices();
  return true;
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
    const receipt = createReceiptForPayment(invoice, payment);
    addActivity("payment", payment.id, `รับเงิน ${money(payment.amount)} บาท จาก ${invoice.invoiceNumber}`);
    addActivity("invoice", invoice.id, `รับเงิน ${money(payment.amount)} บาท`);
    addActivity("customer", invoice.customerId, `รับเงิน ${money(payment.amount)} บาท และออกใบเสร็จ ${receipt.receiptNumber}`);
    saveState();
    renderDocument("receipt", receipt.id);
  });
}

function createReceiptForPayment(invoice, payment) {
  const existing = state.receipts.find((receipt) => receipt.paymentId === payment.id);
  if (existing) return existing;
  const receipt = {
    id: uid("rc"),
    receiptNumber: nextNumber("RC"),
    invoiceId: invoice.id,
    paymentId: payment.id,
    customerId: invoice.customerId,
    issueDate: payment.paymentDate,
    amount: payment.amount,
    note: payment.note,
    createdAt: new Date().toISOString(),
  };
  state.receipts.unshift(receipt);
  return receipt;
}

function openReceiptForInvoice(invoiceId) {
  const invoice = state.invoices.find((item) => item.id === invoiceId);
  if (!invoice) return;
  let receipt = state.receipts.find((item) => item.invoiceId === invoiceId);
  if (!receipt) {
    const payment = invoicePayments(invoiceId)[0];
    if (!payment) {
      alert("ยังไม่มีรายการรับเงินสำหรับออกใบเสร็จ");
      return;
    }
    receipt = createReceiptForPayment(invoice, payment);
    saveState();
  }
  renderDocument("receipt", receipt.id);
}

function renderPayments() {
  const rows = state.payments.map((payment) => {
    const invoice = state.invoices.find((item) => item.id === payment.invoiceId);
    return [
      thaiDate(payment.paymentDate),
      invoice?.invoiceNumber || "-",
      customerById(payment.customerId)?.name || "-",
      payment.paymentMethod,
      `${money(payment.amount)} บาท`,
      payment.attachment?.name || "-",
      `<button class="button danger" data-delete-payment="${payment.id}">ลบ</button>`,
    ];
  });
  page("รับเงิน", "ประวัติการรับเงินและหลักฐาน", "", rows.length ? table(["วันที่", "Invoice", "ลูกค้า", "วิธี", "จำนวน", "หลักฐาน", "จัดการ"], rows) : `<div class="empty">ยังไม่มีการรับเงิน</div>`);
  document.querySelectorAll("[data-delete-payment]").forEach((button) => button.addEventListener("click", () => deletePayment(button.dataset.deletePayment)));
}

function deletePayment(paymentId) {
  const payment = state.payments.find((item) => item.id === paymentId);
  if (!payment) return false;
  const invoice = state.invoices.find((item) => item.id === payment.invoiceId);
  if (!confirm(`ลบรายการรับเงิน ${money(payment.amount)} บาท ใช่ไหม? ใบเสร็จที่ผูกกับรายการนี้จะถูกลบด้วย`)) return false;
  state.payments = state.payments.filter((item) => item.id !== paymentId);
  state.receipts = state.receipts.filter((receipt) => receipt.paymentId !== paymentId);
  if (invoice) recalcInvoice(invoice);
  addActivity("payment", paymentId, `ลบรายการรับเงิน ${money(payment.amount)} บาท`);
  if (invoice) addActivity("invoice", invoice.id, `ลบรายการรับเงิน ${money(payment.amount)} บาท`);
  if (payment.customerId) addActivity("customer", payment.customerId, `ลบรายการรับเงิน ${money(payment.amount)} บาท`);
  saveState();
  if (document.querySelector("#view")) renderPayments();
  return true;
}

function filteredReceiptHistory(filters = {}) {
  const query = String(filters.query || "").trim().toLowerCase();
  return state.receipts
    .map((receipt) => {
      const invoice = state.invoices.find((item) => item.id === receipt.invoiceId);
      const customer = customerById(receipt.customerId);
      return { receipt, invoice, customer };
    })
    .filter(({ receipt }) => isInDateRange(receipt.issueDate, filters.startDate, filters.endDate))
    .filter(({ receipt, invoice, customer }) => {
      if (!query) return true;
      return [receipt.receiptNumber, invoice?.invoiceNumber, invoice?.projectName, customer?.name]
        .some((value) => String(value || "").toLowerCase().includes(query));
    })
    .sort((left, right) => String(right.receipt.issueDate || "").localeCompare(String(left.receipt.issueDate || "")) || String(right.receipt.receiptNumber || "").localeCompare(String(left.receipt.receiptNumber || "")));
}

function renderReceipts(filters = {}) {
  const entries = filteredReceiptHistory(filters);
  const rows = entries.map(({ receipt, invoice, customer }) => [
    receipt.receiptNumber,
    customer?.name || "-",
    invoice?.projectName || "-",
    thaiDate(receipt.issueDate),
    `${money(receipt.amount)} บาท`,
    `<button class="button" data-view-receipt="${receipt.id}">ดู</button>
     <button class="button danger" data-delete-receipt="${receipt.id}">ลบ</button>`,
  ]);
  page(
    "ใบเสร็จ",
    "ประวัติใบเสร็จย้อนหลังและเอกสารรับเงินที่ออกแล้ว",
    "",
    `
      <form class="card filter-card receipt-filter-card" id="receiptHistoryFilterForm">
        <label>ค้นหา<input name="query" value="${filters.query || ""}" placeholder="ค้นหาเลขใบเสร็จ ลูกค้า หรือโปรเจกต์"></label>
        <label>ตั้งแต่<input name="startDate" type="date" value="${filters.startDate || ""}"></label>
        <label>ถึงวันที่<input name="endDate" type="date" value="${filters.endDate || ""}"></label>
        <button class="button primary" type="submit">ค้นหา</button>
        <button class="button" type="button" data-clear-receipt-filters>ล้าง</button>
      </form>
      <section style="margin-top:16px">
        ${rows.length ? table(["เลข", "ลูกค้า", "โปรเจกต์", "วันที่", "จำนวน", "จัดการ"], rows) : `<div class="empty">ไม่พบใบเสร็จตามที่ค้นหา</div>`}
      </section>
    `
  );
  document.querySelector("#receiptHistoryFilterForm").addEventListener("submit", (event) => {
    event.preventDefault();
    renderReceipts(Object.fromEntries(new FormData(event.target).entries()));
  });
  document.querySelector("[data-clear-receipt-filters]").addEventListener("click", () => renderReceipts());
  document.querySelectorAll("[data-view-receipt]").forEach((button) => button.addEventListener("click", () => renderDocument("receipt", button.dataset.viewReceipt)));
  document.querySelectorAll("[data-delete-receipt]").forEach((button) => button.addEventListener("click", () => deleteReceipt(button.dataset.deleteReceipt)));
}

function deleteReceipt(receiptId) {
  const receipt = state.receipts.find((item) => item.id === receiptId);
  if (!receipt) return false;
  if (!confirm(`ลบใบเสร็จ ${receipt.receiptNumber || ""} ใช่ไหม? รายการรับเงินจะยังอยู่`)) return false;
  state.receipts = state.receipts.filter((item) => item.id !== receiptId);
  const invoice = state.invoices.find((item) => item.id === receipt.invoiceId);
  if (invoice) recalcInvoice(invoice);
  addActivity("receipt", receiptId, `ลบใบเสร็จ ${receipt.receiptNumber || ""}`);
  if (receipt.customerId) addActivity("customer", receipt.customerId, `ลบใบเสร็จ ${receipt.receiptNumber || ""}`);
  saveState();
  if (document.querySelector("#view")) renderReceipts();
  return true;
}

function renderDocument(type, id) {
  const doc = type === "quote" ? state.quotes.find((item) => item.id === id) : type === "invoice" ? state.invoices.find((item) => item.id === id) : state.receipts.find((item) => item.id === id);
  if (type === "invoice") recalcInvoice(doc);
  const invoiceForReceipt = type === "receipt" ? state.invoices.find((invoice) => invoice.id === doc.invoiceId) : null;
  const base = type === "receipt" ? invoiceForReceipt : doc;
  const customer = customerById(doc.customerId);
  const meta = documentTypeMeta(type);
  const printTitle = documentPrintTitle(type, base || doc, customer);
  const fitClass = documentPrintFitClass(type, base || doc);
  page(
    meta.title,
    "Preview / print เอกสาร",
    `<button class="button no-print" data-action="back-docs">กลับ</button>
     <button class="button primary no-print" data-action="export-document-pdf">บันทึก PDF เต็มหน้า</button>
     <button class="button no-print" data-action="print-document">พิมพ์</button>
     ${type === "quote" ? `<button class="button no-print" data-edit-quote="${doc.id}">แก้ไข</button>` : ""}
     ${type === "quote" && doc.status !== "confirmed" ? `<button class="button success no-print" data-confirm-quote="${doc.id}">คอนเฟิร์มเป็น invoice</button>` : ""}
     ${type === "invoice" && doc.status !== "paid" ? `<button class="button primary no-print" data-receive="${doc.id}">รับเงิน</button>` : ""}
     ${type === "invoice" && Number(doc.paidAmount || 0) > 0 ? `<button class="button success no-print" data-receipt-invoice="${doc.id}">ใบเสร็จ</button>` : ""}
     ${type === "invoice" ? `<button class="button danger no-print" data-delete-invoice="${doc.id}">ลบใบแจ้งหนี้</button>` : ""}
     ${type === "receipt" ? `<button class="button danger no-print" data-delete-receipt="${doc.id}">ลบใบเสร็จ</button>` : ""}`,
    `
      <article class="document classic-bill ${fitClass}">
        <div class="bill-content">
          <header class="classic-bill-head">
            <h2>${meta.title}</h2>
            <div class="bill-date-block">
              <p>${documentDateHtml(type, doc, base)}</p>
              ${documentNumberHtml(type, doc)}
            </div>
          </header>
          <section class="bill-party-freeform">
            <div class="bill-party">${documentSellerHtml()}</div>
            <div class="bill-party">${documentCustomerHtml(base, customer)}</div>
          </section>
          ${type === "receipt" ? receiptBody(doc, invoiceForReceipt) : documentItems(base)}
        </div>
      </article>
    `
  );
  document.querySelector('[data-action="back-docs"]').addEventListener("click", () => (type === "quote" ? renderQuotes() : type === "invoice" ? renderInvoices() : renderReceipts()));
  document.querySelector("[data-confirm-quote]")?.addEventListener("click", () => confirmQuote(doc.id));
  document.querySelector("[data-receive]")?.addEventListener("click", () => showPaymentForm(doc.id));
  document.querySelector("[data-edit-quote]")?.addEventListener("click", () => showQuoteEditor({ quoteId: doc.id }));
  document.querySelector("[data-receipt-invoice]")?.addEventListener("click", () => openReceiptForInvoice(doc.id));
  document.querySelector("[data-delete-invoice]")?.addEventListener("click", () => deleteInvoice(doc.id));
  document.querySelector("[data-delete-receipt]")?.addEventListener("click", () => deleteReceipt(doc.id));
  document.querySelector('[data-action="print-document"]').addEventListener("click", () => printDocument(printTitle));
  document.querySelector('[data-action="export-document-pdf"]').addEventListener("click", () => exportDocumentPdf(printTitle));
}

function documentPrintFitClass(type, doc = {}) {
  if (type === "receipt") return "document-fit-receipt";
  const itemCount = (doc.items || []).length;
  if (itemCount >= 15) return "document-fit-micro";
  if (itemCount >= 10) return "document-fit-dense";
  if (itemCount >= 6) return "document-fit-compact";
  return "document-fit-spacious";
}

function calculatePdfContentScale(contentHeight, availableHeight) {
  if (!contentHeight || !availableHeight || contentHeight <= availableHeight) return 1;
  return Number(Math.max(0.35, (availableHeight - 10) / contentHeight).toFixed(4));
}

function fitDocumentForPdfExport(printable) {
  const content = printable.querySelector(".bill-content");
  if (!content) return 1;
  content.style.removeProperty("--pdf-content-scale");
  const computedStyle = window.getComputedStyle(printable);
  const verticalPadding = Number.parseFloat(computedStyle.paddingTop || 0) + Number.parseFloat(computedStyle.paddingBottom || 0);
  const availableHeight = Math.max(0, printable.clientHeight - verticalPadding);
  const scale = calculatePdfContentScale(content.scrollHeight, availableHeight);
  content.style.setProperty("--pdf-content-scale", String(scale));
  return scale;
}

function printDocument(printTitle = "Kantana Billing ERP") {
  const printable = document.querySelector(".classic-bill");
  if (!printable) {
    alert("ยังไม่พบเอกสารสำหรับพิมพ์");
    return;
  }
  const originalTitle = document.title;
  document.title = printTitle;
  const cleanupPrintTitle = () => {
    document.body.classList.remove("is-printing-document");
    document.title = originalTitle;
    window.removeEventListener("afterprint", cleanupPrintTitle);
  };
  window.addEventListener("afterprint", cleanupPrintTitle);
  document.body.classList.add("is-printing-document");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print();
      setTimeout(cleanupPrintTitle, 1200);
    });
  });
}

async function exportDocumentPdf(printTitle = "Kantana Billing ERP") {
  const printable = document.querySelector(".classic-bill");
  const htmlToCanvas = window.html2canvas;
  const jsPDF = window.jspdf?.jsPDF;
  if (!printable) {
    alert("ยังไม่พบเอกสารสำหรับบันทึก PDF");
    return;
  }
  if (!htmlToCanvas || !jsPDF) {
    alert("โหลดตัวสร้าง PDF ยังไม่สำเร็จ ลองรีเฟรชหน้าเว็บแล้วกดอีกครั้ง");
    return;
  }
  document.body.classList.add("is-exporting-pdf");
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  try {
    fitDocumentForPdfExport(printable);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const canvas = await htmlToCanvas(printable, {
      backgroundColor: null,
      scale: Math.min(3, Math.max(2, window.devicePixelRatio || 2)),
      useCORS: true,
      logging: false,
      width: printable.offsetWidth,
      height: printable.offsetHeight,
      windowWidth: printable.scrollWidth,
      windowHeight: printable.scrollHeight,
    });
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.98), "JPEG", 0, 0, 210, 297, undefined, "FAST");
    pdf.save(`${printTitle}.pdf`);
  } catch (error) {
    console.error(error);
    alert("บันทึก PDF ไม่สำเร็จ ลองรีเฟรชหน้าเว็บแล้วกดอีกครั้ง");
  } finally {
    printable.querySelector(".bill-content")?.style.removeProperty("--pdf-content-scale");
    document.body.classList.remove("is-exporting-pdf");
  }
}

function documentItems(doc) {
  return `
    <div class="bill-body">
      ${renderOriginalDocumentItems(doc)}
    </div>
  `;
}

function paymentLineHtml() {
  const accountNameLabel = documentLabel("accountName");
  const accountNoLabel = documentLabel("savingsAccountNo");
  const accountNameText = accountNameLabel ? ` ${accountNameLabel} ${state.settings.bankAccountName}` : ` ${state.settings.bankAccountName}`;
  const accountNoText = accountNoLabel ? `${accountNoLabel} ${state.settings.bankAccountNumber}` : state.settings.bankAccountNumber;
  return `
    <strong>${[documentLabel("paymentTo"), state.settings.bankName].filter(Boolean).join(" : ")}${accountNameText}</strong><br>
    ${accountNoText}
  `;
}

function renderOriginalDocumentItems(doc) {
  const itemCount = (doc.items || []).length;
  const densityClass = itemCount <= 2 ? "bill-lines-spacious" : itemCount <= 4 ? "bill-lines-standard" : itemCount <= 7 ? "bill-lines-compact" : "bill-lines-dense";
  const rows = [...(doc.items || [])];
  while (rows.length < 4) rows.push(null);
  const calc = calculate(doc.items || [], doc.withholdingEnabled !== false, doc.withholdingPercent ?? state.settings.defaultWithholdingPercent);
  const subtotal = doc.subtotal ?? calc.subtotal;
  const withholdingPercent = doc.withholdingPercent ?? calc.withholdingPercent;
  const withholdingAmount = doc.withholdingAmount ?? calc.withholdingAmount;
  const totalDue = doc.totalDue ?? calc.totalDue;
  const paidAmount = Number(doc.paidAmount || 0);
  const note = String(doc.note || "").trim() || DEFAULT_BILL_NOTE;
  const qrHtml = state.settings.qrCodeImage ? `<img class="bill-payment-qr qr-code" src="${state.settings.qrCodeImage}" alt="Payment QR Code">` : "";
  return `
    <table class="bill-line-table ${densityClass}">
      <colgroup>
        <col class="bill-col-item">
        <col class="bill-col-desc">
        <col class="bill-col-qty">
        <col class="bill-col-price">
        <col class="bill-col-amount">
      </colgroup>
      <thead>
        <tr>
          <th>${documentLabel("item")}</th>
          <th>${documentLabel("particulars")}</th>
          <th>${documentLabel("quantity")}</th>
          <th>${documentLabel("unitPrice")}</th>
          <th>${documentLabel("amount")}</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((item, index) => `
          <tr class="${item ? "bill-row-item" : "bill-row-filler"}">
            <td>${item ? `${index + 1}.` : ""}</td>
            <td>${item?.description || ""}</td>
            <td>${item ? money(item.quantity) : ""}</td>
            <td>${item ? money(item.unitPrice) : ""}</td>
            <td>${item ? `${money(item.amount)} บาท` : ""}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    <table class="bill-footer-table">
      <colgroup>
        <col class="bill-col-item">
        <col class="bill-col-desc">
        <col class="bill-col-qty">
        <col class="bill-col-price">
        <col class="bill-col-amount">
      </colgroup>
      <tr>
        <td class="bill-note-cell" colspan="3" rowspan="3">
          ${documentLabel("note") ? `<strong>${documentLabel("note")} :</strong>` : ""}
          <div>${note}</div>
        </td>
        <th>${documentLabel("subtotal")}</th>
        <td>${money(subtotal)} บาท</td>
      </tr>
      <tr>
        <th>${documentLabel("withholdingTax") ? `${documentLabel("withholdingTax")} ${money(withholdingPercent)}%` : ""}</th>
        <td>${money(withholdingAmount)} บาท</td>
      </tr>
      <tr>
        <th>${documentLabel("paid")}</th>
        <td>${paidAmount ? `${money(paidAmount)} บาท` : "-"}</td>
      </tr>
      <tr>
        <td class="bill-payment-cell" colspan="3" rowspan="2">
          <div class="bill-payment-content">
            <div>
              ${paymentLineHtml()}
            </div>
            ${qrHtml}
          </div>
        </td>
        <th>${documentLabel("totalDue")}</th>
        <td></td>
      </tr>
      <tr>
        <th>${documentLabel("amount")}</th>
        <td>${money(totalDue)} บาท</td>
      </tr>
    </table>
  `;
}

function receiptBody(receipt, invoice) {
  const payment = state.payments.find((item) => item.id === receipt.paymentId);
  return `
    <section style="margin-top: 20px">
      ${table([documentLabel("reference"), documentLabel("paymentMethod"), documentLabel("amount")], [[invoice?.invoiceNumber || "-", payment?.paymentMethod || "-", `${money(receipt.amount)} บาท`]])}
      <div class="document-box" style="margin-top:20px">
        ${documentLabel("note") ? `<strong>${documentLabel("note")}</strong><br>` : ""}${receipt.note || "-"}<br><br>
        ${documentLabel("attachment") ? `<strong>${documentLabel("attachment")}</strong><br>` : ""}${payment?.attachment?.name || "-"}
      </div>
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
      <section class="card document-label-settings" style="margin-top:16px">
        <div class="section-head compact">
          <div>
            <h2>Document labels</h2>
            <p>แก้ชื่อหัวข้อบนใบเอกสารได้ทั้งหมด ถ้าไม่อยากแสดงหัวข้อไหนให้ลบข้อความในช่องนั้นแล้วบันทึก</p>
          </div>
          <button class="button" type="button" id="resetDocumentLabels">คืนค่าเริ่มต้น</button>
        </div>
        <form class="form-grid" id="documentLabelsForm">
          ${renderDocumentLabelInputs()}
          <div class="actions span-2"><button class="button primary" type="submit">บันทึกหัวข้อ</button></div>
        </form>
      </section>
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
      <section class="card cloud-tools" style="margin-top:16px">
        <div>
          <h2>Cloud database</h2>
          <p>${cloudStatusText()} - ข้อมูลจะ sync ด้วย Supabase เมื่อเข้าสู่ระบบด้วยอีเมล</p>
        </div>
        <div class="actions">
          <button class="button primary" type="button" id="migrateCloudButton">ย้าย/บันทึกข้อมูลนี้ขึ้น Cloud</button>
          <button class="button" type="button" id="reloadCloudButton">โหลดข้อมูลจาก Cloud</button>
        </div>
      </section>
    `
  );
  document.querySelector("#settingsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const formValues = Object.fromEntries(new FormData(event.target).entries());
    Object.assign(state.settings, formValues);
    state.settings.defaultWithholdingPercent = Number(formValues.defaultWithholdingPercent || 0);
    saveState();
    alert("บันทึกแล้ว");
  });
  document.querySelector("#documentLabelsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const formValues = Object.fromEntries(new FormData(event.target).entries());
    state.settings.documentLabels = { ...state.settings.documentLabels };
    Object.entries(formValues).forEach(([key, value]) => {
      state.settings.documentLabels[key.replace("documentLabels.", "")] = String(value);
    });
    saveState();
    alert("บันทึกหัวข้อแล้ว");
  });
  document.querySelector("#resetDocumentLabels").addEventListener("click", () => {
    if (!confirm("คืนค่าหัวข้อเอกสารเป็นค่าเริ่มต้นทั้งหมดใช่ไหม?")) return;
    state.settings.documentLabels = { ...DEFAULT_DOCUMENT_LABELS };
    saveState();
    renderSettings();
  });
  document.querySelector("#logoutButton").addEventListener("click", () => {
    cloudSignOut().finally(app);
  });
  document.querySelector("#qrCodeInput").addEventListener("change", updateQrCodeImage);
  document.querySelector("#removeQrButton")?.addEventListener("click", () => {
    state.settings.qrCodeImage = "";
    saveState();
    renderSettings();
  });
  document.querySelector("#exportBackupButton").addEventListener("click", exportBackup);
  document.querySelector("#importBackupInput").addEventListener("change", importBackup);
  document.querySelector("#migrateCloudButton").addEventListener("click", async () => {
    try {
      await migrateLocalDataToCloud();
      alert("ย้ายข้อมูลขึ้น Cloud แล้ว");
      renderSettings();
    } catch (error) {
      alert(`ยังย้ายขึ้น Cloud ไม่สำเร็จ: ${error.message || error}`);
    }
  });
  document.querySelector("#reloadCloudButton").addEventListener("click", async () => {
    try {
      await loadCloudState();
      alert("โหลดข้อมูลจาก Cloud แล้ว");
      renderSettings();
    } catch (error) {
      alert(`โหลดจาก Cloud ไม่สำเร็จ: ${error.message || error}`);
    }
  });
}

function renderDocumentLabelInputs() {
  return documentLabelGroups.map(([groupName, labels]) => `
    <div class="span-2 label-group-title">${groupName}</div>
    ${labels.map(([key, thaiHint]) => `
      <label>${thaiHint}<input name="documentLabels.${key}" value="${documentLabel(key)}" placeholder="ไม่แสดงถ้าปล่อยว่าง"></label>
    `).join("")}
  `).join("");
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
      settings: mergeSettings(base.settings, incoming.settings),
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

boot();
