# ERP Billing App Delivery Plan

## Planning Goal

สร้างระบบ billing ERP ขนาดเล็กที่ใช้งานจริงได้ลื่น ไม่ใช่แค่มีหน้าจอครบ โดยเริ่มจาก quote-to-cash workflow ให้จบหนึ่งรอบก่อน แล้วค่อยขยาย dashboard, reports, และ mobile polish

Core workflow:

`Customer -> Quote -> Confirm -> Invoice -> Payment -> Receipt -> Customer Ledger`

## Delivery Principles

- Build vertical slices before broad modules
- ให้ data model และ money rules ถูกตั้งแต่ต้น
- ทุก action สำคัญต้องเขียน activity log
- ยอดเงินและสถานะเอกสารต้อง derive จาก source of truth เดียว
- ทำ mobile check ทุก phase ที่มี UI
- ปุ่มหลักในแต่ละหน้าต้องชัด ไม่เยอะเกิน
- งานเอกสารต้องไม่บังคับผู้ใช้กรอกข้อมูลซ้ำ

## Phase 0: Product and Data Model Lock

### Purpose

ล็อก workflow, status, money rules, และ schema ก่อนเริ่มเขียนหน้าจอเยอะ ๆ เพราะระบบ ERP ถ้า data model เอียงตั้งแต่ต้น จะแก้ยากมาก

### Tasks

- Confirm document lifecycle
- Confirm quote/invoice/payment/receipt statuses
- Confirm withholding 3% rules
- Confirm document numbering rules
- Confirm attachment storage rules
- Finalize schema and indexes
- Define RLS/storage access strategy for Supabase
- Define seed settings from current bill data

### Deliverable

- Final schema/migration draft
- Status transition map
- Money calculation rules
- Numbering transaction design

### Acceptance

- อธิบายได้ว่า quote หนึ่งใบกลายเป็น invoice/receipt อย่างไร
- อธิบายได้ว่ายอดค้างมาจากตารางไหน
- อธิบายได้ว่าไฟล์สลิปถูกเก็บและเปิดดูอย่างไร

## Phase 1: App Foundation and Walking Skeleton

### Purpose

ทำแอปออนไลน์ที่ล็อกอินได้ เชื่อม database ได้ และ deploy ได้เร็ว เพื่อพิสูจน์ infra ก่อนลง workflow หลัก

### Tasks

- Create Next.js app
- Set TypeScript
- Set UI styling system
- Connect Supabase
- Configure environment variables
- Build PIN/Password login
- Build responsive app shell
- Desktop sidebar
- Mobile navigation
- Route guard
- Seed settings
- Deploy preview to Vercel

### Deliverable

- Login แล้วเข้าหน้า Dashboard placeholder ได้
- มีเมนูหลัก
- Settings seed พร้อม
- Deploy preview ได้

### Acceptance

- Refresh แล้วยังอยู่ใน session
- Logout ได้
- Desktop/mobile navigation ใช้งานได้
- Supabase read/write test ผ่าน

## Phase 2: Master Data Slice

### Purpose

สร้างข้อมูลหลักที่ quote-to-cash ต้องใช้ ได้แก่ ลูกค้าและบริการ พร้อม UX ที่กรอกเร็ว

### Tasks

- Customer list
- Customer create/edit modal
- Customer detail shell
- Customer search
- Service list
- Service create/edit modal
- Service search picker component
- Basic activity log for customer/service changes

### Deliverable

- เพิ่มลูกค้าได้
- เพิ่มบริการได้
- ค้นหาได้
- Service picker พร้อมเอาไปใช้ใน quote editor

### Acceptance

- สร้างลูกค้าจาก list ได้
- สร้างบริการพร้อมราคาและหน่วยได้
- Mobile list แสดงเป็น card
- ไม่มี table ที่ต้อง zoom บนมือถือ

## Phase 3: Quote-to-Invoice Vertical Slice

### Purpose

พิสูจน์ workflow เอกสารหลักตั้งแต่ quote จนกลายเป็น invoice โดยไม่กรอกซ้ำ

### Tasks

- Quote list
- Quote editor
- Create customer inline from quote
- Add item from service picker
- Add custom line item
- Calculate subtotal/withholding/total_due
- Save draft
- Mark as sent
- Quote preview/print
- Confirm quote to invoice
- Create invoice from quote in one transaction
- Link quote.created_invoice_id
- Log activity
- Redirect to invoice detail

### Deliverable

- สร้าง `QT-2026-0001`
- กด confirm แล้วได้ `INV-2026-0001`
- ข้อมูลลูกค้า รายการ และยอดเงินถูก copy ครบ

### Acceptance

- ไม่กรอกข้อมูลซ้ำตอนสร้าง invoice
- Quote status = `คอนเฟิร์มแล้ว`
- Invoice status = `ยังไม่ชำระ`
- Invoice items ตรงกับ quote items
- Withholding 3% ถูกต้อง
- Mobile quote editor ใช้งานได้

## Phase 4: Invoice, Payment, Receipt Slice

### Purpose

ปิดวงจร quote-to-cash ให้รับเงินจริง แนบหลักฐาน และออกใบเสร็จได้

### Tasks

- Invoice list/detail
- Invoice status calculation from payments
- Receive payment modal/page
- Default payment amount = balance_due
- Upload payment attachment to Supabase Storage
- Preview payment attachment
- Update invoice paid_amount/balance/status
- Create receipt from payment
- Receipt detail
- Receipt preview/print
- Log payment and receipt activity

### Deliverable

- จาก invoice กดรับเงินได้
- แนบสลิปได้
- รับเงินแล้วออก `RC-2026-0001` ได้
- Invoice เปลี่ยนสถานะอัตโนมัติ

### Acceptance

- รับเงินบางส่วนได้
- รับเงินครบได้
- balance_due ถูกต้อง
- receipt link กลับ invoice/payment/customer ได้
- หลักฐานเปิดดูย้อนหลังได้
- Mobile รับเงินและแนบสลิปได้

## Phase 5: Customer Ledger and Operational History

### Purpose

ทำให้ระบบเป็น CRM/ledger จริง ไม่ใช่แค่ออกเอกสาร

### Tasks

- Customer detail overview
- Customer KPI cards
- Customer timeline from activity_log
- Documents tab
- Payments tab
- Attachments tab
- Service history summary
- Customer statement CSV
- Outstanding balance per customer

### Deliverable

- เปิดลูกค้าคนเดียวแล้วเห็นทุกอย่างที่เคยออกบิลและรับเงิน

### Acceptance

- เห็น quote, invoice, payment, receipt ใน timeline
- เห็นยอดรวม ชำระแล้ว ค้างชำระ
- เห็นสถานะเอกสารล่าสุด
- Export customer statement CSV ได้
- Mobile timeline อ่านง่าย

## Phase 6: Operational Dashboard

### Purpose

Dashboard ต้องช่วยตัดสินใจและกดทำงานต่อได้ ไม่ใช่แค่กราฟสวย

### Tasks

- KPI cards
- Revenue this month
- Outstanding balance
- Quotes waiting confirmation
- Invoices overdue/unpaid
- Recent payments
- Action list with quick links
- Monthly revenue chart
- Top customers
- Top services

### Deliverable

- หน้าแรกบอกได้ทันทีว่าต้องตามเงินใคร ต้อง follow quote ใบไหน

### Acceptance

- คลิกจาก dashboard ไป invoice/quote/customer ได้
- ยอดตรงกับข้อมูล invoice/payment
- Mobile dashboard เป็น card ไม่ล้น

## Phase 7: Reports and Export

### Purpose

เพิ่มรายงานเพื่อดูภาพรวมและ export ข้อมูล โดยใช้ data ที่พิสูจน์จาก workflow แล้ว

### Tasks

- Monthly revenue report
- Customer sales report
- Service sales report
- Quote conversion report
- Outstanding invoice report
- Payment received report
- Withholding report
- Customer statement report
- Date/customer/status filters
- CSV export
- Print-friendly report views

### Deliverable

- รายงานหลักพร้อมใช้งานประจำเดือน

### Acceptance

- Filter ตามวันที่ได้
- Filter ตามลูกค้าได้
- Export CSV ได้
- ยอดรวมตรงกับ dashboard และ ledger

## Phase 8: Document Design and PDF Polish

### Purpose

เอกสารต้องดูดี ส่งลูกค้าได้ และ print/PDF ไม่เพี้ยน

### Tasks

- Quote print template
- Invoice print template
- Receipt print template
- Shared document theme
- Seller/payment info from settings
- QR code support
- Mobile preview behavior
- Browser print QA

### Deliverable

- เอกสาร 3 ประเภท print/save PDF ได้

### Acceptance

- A4 layout ไม่ล้น
- ข้อมูลลูกค้าและรายการครบ
- Summary ถูกต้อง
- QR/payment info แสดงถูก
- Print บน desktop ใช้งานได้

## Phase 9: Mobile Workflow QA

### Purpose

ตรวจ flow ที่ใช้จริงบนมือถือ ไม่ใช่แค่ responsive หน้าตา

### Tasks

- QA viewport 390px
- QA viewport 430px
- QA tablet
- Quote creation on mobile
- Payment attachment on mobile
- Customer ledger on mobile
- Dashboard on mobile
- Sticky bottom action refinement
- Table-to-card refinement

### Deliverable

- Workflow หลักใช้งานบนมือถือได้โดยไม่ต้องซูม

### Acceptance

- สร้าง quote บนมือถือได้
- รับเงินและแนบสลิปบนมือถือได้
- ปุ่มไม่ชนกัน
- Text ไม่ล้น
- Action หลักอยู่ในตำแหน่งกดง่าย

## Phase 10: Production Readiness

### Purpose

เตรียมระบบให้ใช้งานจริงออนไลน์อย่างปลอดภัยและดูแลง่าย

### Tasks

- Loading states
- Empty states
- Error states
- Confirm dialogs for destructive actions
- Supabase RLS review
- Storage policy review
- Backup/export strategy
- Basic audit logging review
- Production deploy
- Environment variable audit
- Smoke test production

### Deliverable

- Production app พร้อมใช้งานจริง

### Acceptance

- ข้อมูลไม่ public โดยไม่ตั้งใจ
- ไฟล์แนบไม่เปิด public โดยไม่จำเป็น
- Recover/export ข้อมูลสำคัญได้
- Production smoke test ผ่าน

## Recommended Build Order

1. Phase 0: Product and Data Model Lock
2. Phase 1: App Foundation and Walking Skeleton
3. Phase 2: Master Data Slice
4. Phase 3: Quote-to-Invoice Vertical Slice
5. Phase 4: Invoice, Payment, Receipt Slice
6. Phase 5: Customer Ledger and Operational History
7. Phase 6: Operational Dashboard
8. Phase 7: Reports and Export
9. Phase 8: Document Design and PDF Polish
10. Phase 9: Mobile Workflow QA
11. Phase 10: Production Readiness

## First Sprint Plan

### Goal

สร้าง foundation ที่พร้อมต่อ quote-to-cash workflow โดยยังไม่ทำ dashboard/report หนัก ๆ

### Scope

- Next.js app
- Supabase connection
- PIN login
- Responsive app shell
- Settings seed
- Database migration draft
- Customer CRUD
- Service CRUD
- Service picker component

### Out of Scope

- Full quote editor
- Payment upload
- Dashboard charts
- Reports
- Production hardening

### Done When

- Login ได้
- เพิ่มลูกค้าได้
- เพิ่มบริการได้
- Service picker ใช้งานได้
- Mobile list ไม่ต้องซูม
- Deploy preview เปิดได้

## ERP Risks and Mitigation

### Risk: เลขเอกสารซ้ำ

Mitigation:

- ใช้ document_counters ใน transaction
- สร้างเลขตอน save ครั้งแรก
- ห้ามสร้างเลขจาก client อย่างเดียว

### Risk: ยอดค้างไม่ตรง

Mitigation:

- payments เป็น source of truth
- invoice paid_amount/balance_due recalculated after payment mutation
- dashboard/report ใช้ query เดียวกับ ledger

### Risk: แก้ service แล้วเอกสารเก่าเปลี่ยน

Mitigation:

- copy description/unit_price/amount ลง document items เป็น snapshot

### Risk: Workflow ยาวเกิน ใช้ยาก

Mitigation:

- quick actions ใน customer/invoice
- confirm quote แล้ว redirect invoice ทันที
- payment default amount = balance_due
- receipt creation offered immediately after payment

### Risk: Mobile ใช้ยาก

Mitigation:

- table-to-card ตั้งแต่ phase แรก
- sticky action button
- QA mobile ทุก vertical slice

### Risk: File security

Mitigation:

- Supabase Storage policy review
- Store metadata in payment_attachments
- Avoid public bucket unless explicitly needed

## Final Acceptance Criteria

ระบบถือว่าพร้อมใช้งานเมื่อ:

- สร้าง customer/service ได้
- สร้าง quote ได้
- confirm quote เป็น invoice ได้
- รับเงินและแนบหลักฐานได้
- ออก receipt ได้
- ดู customer ledger ได้ครบ
- dashboard ช่วยตามงานค้างได้
- reports หลัก export CSV ได้
- print/PDF เอกสาร 3 ประเภทใช้งานได้
- mobile workflow หลักใช้งานได้โดยไม่ซูม
- deploy production ได้
