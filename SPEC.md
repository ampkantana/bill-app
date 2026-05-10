# Online Billing ERP Spec

## Product Goal

เว็บแอปออนไลน์สำหรับผู้ใช้คนเดียวที่ช่วยจัดการลูกค้า ออกใบเสนอราคา เปลี่ยนเป็นใบแจ้งหนี้ รับเงิน แนบหลักฐาน และออกใบเสร็จรับเงินได้ลื่นที่สุด โดยไม่ต้องกรอกข้อมูลซ้ำ

หลักคิดแบบ ERP ขนาดเล็ก:

- ข้อมูลลูกค้าและบริการกรอกครั้งเดียว ใช้ซ้ำได้ทุกเอกสาร
- เอกสารทุกใบเชื่อมกันเป็น lifecycle เดียว
- สถานะยอดเงินเปลี่ยนอัตโนมัติจากการรับเงินจริง
- ทุกหน้าต้องตอบคำถามหลักได้ทันที: ลูกค้าคนนี้เสนอราคาอะไรไปแล้ว จ่ายครบหรือยัง ค้างเท่าไหร่
- ใช้งานบนมือถือได้ง่ายพอ ๆ กับ desktop

## Recommended Stack

- App: Next.js
- Hosting: Vercel
- Database: Supabase Postgres
- File storage: Supabase Storage
- Login: PIN/Password เดียวของระบบ ไม่ใช้ external Auth ในเวอร์ชันแรก
- PDF/Print: HTML print layout สำหรับเอกสาร และเพิ่ม PDF generation ได้ภายหลัง

## Initial Settings

ใช้ข้อมูลเดิมจากบิลนี้เป็นค่าเริ่มต้น:

- ชื่อผู้ขาย: กันตนา วัดสง่า
- เลขผู้เสียภาษี: 1100400498763
- ที่อยู่: 341/9 ถนน บ้านหม้อ แขวง วังบูรพาภิรมย์ เขตพระนคร กรุงเทพ
- โทร: 094-416-5426
- อีเมล: kantana.amp@gmail.com
- ธนาคาร: ไทยพาณิชย์
- ชื่อบัญชี: กันตนา วัดสง่า
- เลขบัญชี: 402-823-5536
- หัก ณ ที่จ่ายเริ่มต้น: 3%
- ธีมเอกสาร: ครีมอ่อน เรียบ อ่านง่าย

## Core Workflow

### 1. Create Customer

ผู้ใช้เพิ่มลูกค้าครั้งเดียว แล้วใช้ข้อมูลนี้กับทุกเอกสาร

ข้อมูลขั้นต่ำ:

- ชื่อลูกค้า
- โทร
- อีเมล
- ที่อยู่
- เลขผู้เสียภาษี
- หมายเหตุ

Quick action ในหน้าลูกค้า:

- สร้างใบเสนอราคา
- สร้างใบแจ้งหนี้
- รับเงินจาก invoice ที่ค้าง
- ดูประวัติทั้งหมด

### 2. Create Quote

สร้างใบเสนอราคาจากลูกค้าหรือจากปุ่ม `+ New`

Flow ที่ควรลื่น:

- เลือกลูกค้า หรือสร้างลูกค้าใหม่ใน modal เดียว
- เลือกบริการจาก service catalog
- แก้จำนวน ราคา รายละเอียด เฉพาะเอกสารนั้นได้
- ระบบคำนวณยอดรวมและหัก ณ ที่จ่าย 3%
- กดบันทึกเป็นร่าง
- กดส่งแล้วเปลี่ยนสถานะเป็น `ส่งแล้ว`
- กดคอนเฟิร์มแล้วระบบสร้างใบแจ้งหนี้ทันที

เลขเอกสาร:

- `QT-2026-0001`

สถานะ:

- ร่าง
- ส่งแล้ว
- คอนเฟิร์มแล้ว
- ยกเลิก

### 3. Confirm Quote to Invoice

เมื่อ quote ถูกคอนเฟิร์ม:

- สร้าง invoice จาก quote เดิม
- copy customer, items, subtotal, withholding percent, note
- link quote กับ invoice
- quote status เปลี่ยนเป็น `คอนเฟิร์มแล้ว`
- invoice status เริ่มเป็น `ยังไม่ชำระ`
- ผู้ใช้ถูกพาไปหน้า invoice detail ทันที

ต้องไม่มีการกรอกข้อมูลซ้ำ

### 4. Invoice and Payment

ในหน้า invoice ต้องเห็นทันที:

- ยอดรวม
- หัก ณ ที่จ่าย
- ยอดรับเงินจริง
- รับแล้ว
- ค้างชำระ
- สถานะการชำระ

ปุ่มหลัก:

- รับเงิน
- พิมพ์/ส่ง PDF
- ออกใบเสร็จ
- ดูลูกค้า

สถานะ invoice:

- ยังไม่ชำระ
- ชำระบางส่วน
- ชำระครบ
- ยกเลิก

สถานะเปลี่ยนอัตโนมัติจากยอด payment:

- paid_amount = sum(payments.amount)
- balance_due = total_due - paid_amount
- ถ้า paid_amount = 0: ยังไม่ชำระ
- ถ้า paid_amount > 0 และ balance_due > 0: ชำระบางส่วน
- ถ้า balance_due <= 0: ชำระครบ

เลขเอกสาร:

- `INV-2026-0001`

### 5. Receive Payment

หน้ารับเงินต้องรวดเร็วและใช้บนมือถือได้

ข้อมูล:

- invoice
- วันที่รับเงิน
- จำนวนเงินที่รับ
- วิธีชำระ เช่น โอนเงิน, เงินสด, อื่น ๆ
- หมายเหตุ
- หลักฐานรับเงิน

UX:

- default amount = ยอดค้างชำระ
- ถ่ายรูป/เลือกรูปสลิปจากมือถือได้
- upload ไป Supabase Storage
- หลังบันทึก payment ระบบถาม/เสนอปุ่ม `ออกใบเสร็จ`
- ถ้ารับครบ ระบบ mark invoice เป็น `ชำระครบ`

### 6. Receipt

ใบเสร็จรับเงินสร้างจาก payment

เลขเอกสาร:

- `RC-2026-0001`

Receipt ต้อง link กลับไป:

- customer
- invoice
- payment
- payment attachment

## Navigation

Desktop sidebar:

- Dashboard
- ลูกค้า
- บริการ
- ใบเสนอราคา
- ใบแจ้งหนี้
- รับเงิน
- ใบเสร็จ
- รายงาน
- ตั้งค่า

Mobile navigation:

- Dashboard
- ลูกค้า
- เอกสาร
- รับเงิน
- เมนู

เมนู `เอกสาร` บนมือถือรวม quote, invoice, receipt ไว้ในหน้าเดียวพร้อม tabs เพื่อลดความซับซ้อน

## Dashboard

Dashboard ต้องเป็นหน้า action ไม่ใช่แค่ดูตัวเลข

Cards:

- รายรับเดือนนี้
- ยอดค้างรับ
- ใบเสนอราคารอคอนเฟิร์ม
- ใบแจ้งหนี้ค้างชำระ
- รับเงินล่าสุด

Action list:

- Invoice ที่เกินกำหนด
- Quote ที่ส่งแล้วแต่ยังไม่คอนเฟิร์ม
- ลูกค้าที่มี invoice ค้างชำระ
- ปุ่มลัด `สร้างใบเสนอราคา`, `เพิ่มลูกค้า`, `รับเงิน`

Charts:

- รายรับรายเดือน
- ยอดขายตามลูกค้า top 5
- ยอดขายตามบริการ top 5

## Customer Module

### Customer List

ต้อง scan ได้เร็ว:

- ชื่อลูกค้า
- โทร/อีเมล
- ยอด invoice รวม
- ยอดชำระแล้ว
- ยอดค้าง
- สถานะล่าสุด
- ปุ่ม quick action

Filters:

- ทั้งหมด
- มี invoice ค้าง
- จ่ายครบแล้ว
- มี quote รอคอนเฟิร์ม

### Customer Detail

หน้าเดียวต้องตอบครบ:

- ข้อมูลลูกค้า
- KPI cards: ยอดรวม, ชำระแล้ว, ค้างชำระ, quote รอคอนเฟิร์ม
- Timeline เอกสารทั้งหมด
- ตาราง invoice พร้อมสถานะจ่าย
- payment history พร้อมหลักฐาน
- service history ว่าลูกค้าซื้อบริการอะไรบ้าง

Tabs:

- Overview
- Documents
- Payments
- Attachments
- Notes

Quick actions:

- New Quote
- New Invoice
- Receive Payment
- Export Customer Statement

## Service Catalog

สร้างรายการบริการเพื่อใช้ซ้ำในเอกสาร

Fields:

- name
- description
- unit
- unit_price
- category
- is_active
- internal_note

UX:

- ค้นหา service ตอนเพิ่มรายการเอกสาร
- เลือกแล้ว auto-fill description, unit, unit_price
- แก้รายละเอียดเฉพาะเอกสารได้โดยไม่เปลี่ยน master service
- มี duplicate service เพื่อสร้างบริการคล้ายกันเร็ว ๆ

Reports:

- ยอดขายตามบริการ
- จำนวนครั้งที่ขาย
- ลูกค้าที่ซื้อบริการนั้น

## Money Rules

ไม่มี VAT 7%

หัก ณ ที่จ่าย:

- default 3%
- เปิด/ปิดต่อเอกสารได้
- เปลี่ยน percent ต่อเอกสารได้

สูตร:

- subtotal = sum(item.amount)
- withholding_amount = subtotal x withholding_percent / 100
- total_due = subtotal - withholding_amount
- paid_amount = sum(payments.amount)
- balance_due = total_due - paid_amount

ควรเก็บค่า snapshot ในเอกสารเพื่อให้ยอดเดิมไม่เปลี่ยนเมื่อแก้ service master ภายหลัง

## Document UX

เอกสารทุกประเภทควรมี layout คล้ายกัน:

- Header: เลขเอกสาร, วันที่, สถานะ
- Customer block
- Items
- Summary
- Notes
- Payment info
- Action bar

Action bar:

- Save
- Preview/PDF
- Duplicate
- Cancel
- Next workflow action เช่น Confirm Quote, Receive Payment, Create Receipt

Autosave:

- Draft document ควร autosave หรือมี warning ถ้าจะออกจากหน้าโดยยังไม่ save

Numbering:

- สร้างเลขเอกสารตอน user กด save ครั้งแรก
- กันเลขซ้ำด้วย document_counters ใน transaction

## Attachments

ใช้กับ payment เป็นหลัก แต่ควรรองรับแนบไฟล์กับ customer/note ในอนาคต

Payment attachments:

- Upload to Supabase Storage
- Store file metadata in database
- Preview image in app
- Download/open original file

Allowed file types:

- JPG
- PNG
- PDF
- WebP ถ้า browser รองรับ

## Reports

Reports must be useful for daily operations, not just accounting export

Required reports:

- รายรับตามเดือน
- ยอดขายตามลูกค้า
- ยอดขายตามบริการ
- Quote conversion: ส่งแล้ว vs คอนเฟิร์ม
- Invoice outstanding
- Payment received
- Withholding 3%
- Customer statement

Report features:

- Date range
- Customer filter
- Status filter
- Export CSV
- Print-friendly view

## Mobile Requirements

Mobile-first สำหรับ flow เหล่านี้:

- ค้นหาลูกค้า
- สร้าง quote
- ดู invoice ค้างชำระ
- รับเงิน
- แนบสลิป
- ดู dashboard

Rules:

- ห้ามต้อง zoom เพื่อกรอกข้อมูล
- ตารางบนมือถือแสดงเป็น cards
- ปุ่มหลัก min height 44px
- sticky bottom action สำหรับ form ยาว
- input ใช้ keyboard type ที่ถูก เช่น number, email, tel
- upload สลิปต้องเลือกจากกล้องหรือคลังรูปได้
- document preview บนมือถือต้องอ่านได้ หรือมี print/PDF button ชัดเจน

Test viewports:

- 390px mobile
- 430px mobile
- tablet
- desktop

## Database Schema Draft

### settings

- id
- business_name
- tax_id
- address
- phone
- email
- bank_name
- bank_account_name
- bank_account_number
- qr_code_url
- default_withholding_percent
- pin_hash
- created_at
- updated_at

### customers

- id
- name
- tax_id
- address
- phone
- email
- note
- created_at
- updated_at

### services

- id
- name
- description
- unit
- unit_price
- category
- is_active
- internal_note
- created_at
- updated_at

### quotes

- id
- quote_number
- customer_id
- issue_date
- expiry_date
- status
- subtotal
- withholding_enabled
- withholding_percent
- withholding_amount
- total_due
- note
- confirmed_at
- created_invoice_id
- created_at
- updated_at

### quote_items

- id
- quote_id
- service_id
- description
- quantity
- unit_price
- amount
- sort_order

### invoices

- id
- invoice_number
- quote_id
- customer_id
- issue_date
- due_date
- status
- subtotal
- withholding_enabled
- withholding_percent
- withholding_amount
- total_due
- paid_amount
- balance_due
- note
- created_at
- updated_at

### invoice_items

- id
- invoice_id
- service_id
- description
- quantity
- unit_price
- amount
- sort_order

### payments

- id
- invoice_id
- customer_id
- payment_date
- amount
- payment_method
- note
- created_at
- updated_at

### payment_attachments

- id
- payment_id
- file_url
- file_name
- file_type
- file_size
- created_at

### receipts

- id
- receipt_number
- invoice_id
- payment_id
- customer_id
- issue_date
- amount
- note
- created_at
- updated_at

### document_counters

- id
- document_type
- year
- next_number
- updated_at

### activity_log

- id
- entity_type
- entity_id
- action
- message
- created_at

ใช้ activity_log เพื่อทำ timeline ในหน้าลูกค้าและช่วย debug workflow

## Derived Views / Queries

- customer_balance_view
- customer_ledger_view
- service_sales_view
- monthly_revenue_view
- outstanding_invoices_view
- withholding_report_view
- quote_conversion_view

## Smooth Workflow Requirements

ระบบต้องลด friction ตามนี้:

- สร้างลูกค้าใหม่ได้จากหน้า quote โดยไม่ต้องออกจากหน้า
- เลือกบริการได้ด้วย search ไม่ใช่ dropdown ยาว
- กด confirm quote แล้วสร้าง invoice และพาไป invoice ทันที
- จาก invoice กด receive payment ได้ทันที
- รับเงินเสร็จแล้วออก receipt ได้ทันที
- หน้าลูกค้าแสดงยอดค้างและประวัติครบโดยไม่ต้องเปิดหลายหน้า
- สถานะเอกสารและยอดค้างต้องคำนวณอัตโนมัติ
- ข้อมูล settings เช่น บัญชี, QR, ผู้ขาย ดึงเข้าเอกสารเอง
- ปุ่มหลักในแต่ละหน้าต้องมีไม่เกิน 2-3 ปุ่ม เพื่อไม่ให้สับสน

## Implementation Phases

### Phase 1: App Foundation

- Next.js app
- Supabase connection
- PIN login
- Responsive shell
- Desktop sidebar
- Mobile navigation
- Settings seed data

### Phase 2: Master Data

- Customers CRUD
- Services CRUD
- Customer detail overview
- Search and quick actions

### Phase 3: Quote Workflow

- Quote list/detail
- Quote editor
- Service picker
- Quote preview/print
- Confirm quote to invoice

### Phase 4: Invoice and Payment Workflow

- Invoice list/detail
- Payment modal/page
- Attachment upload
- Automatic invoice status calculation
- Receipt generation

### Phase 5: Customer Ledger

- Customer timeline
- Customer statement
- Payment history
- Outstanding balance per customer

### Phase 6: Dashboard and Reports

- Dashboard cards
- Operational action list
- Monthly revenue chart
- Customer sales report
- Service sales report
- Outstanding invoice report
- Withholding report
- CSV export

### Phase 7: Mobile Polish

- Card-based mobile lists
- Sticky bottom actions
- Mobile attachment upload
- Mobile document preview
- 390px/430px/tablet QA

## Definition of Done

เวอร์ชันแรกถือว่าเสร็จเมื่อ:

- Login ได้ด้วย PIN/Password
- เพิ่มลูกค้าได้
- เพิ่มบริการได้
- สร้าง quote ได้จากลูกค้าและจากปุ่ม New
- เลือกบริการเข้า quote ได้
- คอนเฟิร์ม quote เป็น invoice ได้โดยไม่กรอกซ้ำ
- invoice แสดงยอดรวม หัก ณ ที่จ่าย ยอดรับจริง ยอดจ่ายแล้ว และยอดค้างถูกต้อง
- รับเงินและแนบหลักฐานได้
- ออก receipt จาก payment ได้
- ดูประวัติลูกค้าครบ: quote, invoice, receipt, payment, attachment
- Dashboard แสดงงานที่ต้องติดตาม
- Reports หลักใช้งานได้
- ใช้งานบนมือถือได้โดยไม่ต้องซูม
- Deploy ออนไลน์ได้
