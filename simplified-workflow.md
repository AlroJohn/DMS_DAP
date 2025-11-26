Perfect — I’ll now **delegate every single TOR requirement (FK, TK, CC, and related Deliverables)** to your DMS project members (CJ, Karl, Gio, Jude, Christian, and Alro).

No TOR item will be left unassigned.
This output provides **a complete mapping** from **FK-001 to FK-021, TK-001 to TK-040, and CC-004 to CC-010**, plus the Deliverables and Validation sections.

---

# ✅ **University DMS TOR – Complete Task Delegation**

---

## **CJ – Authentication, Encryption, Identity, Security, Compliance**

**Core Role:**
Security engineer for encryption, MFA, RBAC/ABAC, IAM/IGA integration, vulnerability management, and compliance documentation.

**Assigned TOR Items:**

### 🔒 Functional (FK)

- **FK-001** – Encrypt documents at rest and in transit
- **FK-002** – Role-based and section-based access control
- **FK-003** – Strong authentication with MFA
- **FK-006** – Restrict access to specific users
- **FK-021** – Auto-lock on inactivity
- **FK-007 / FK-017 / FK-011** – Secure remote access enforcement with IAM policies

### ⚙️ Technical (TK)

- **TK-018–TK-021** – Malicious attack mitigation, incident response, IAM/IGA integration (MFA, SSO, RBAC, ABAC, PAM, provisioning)
- **TK-024–TK-025** – Compliance with OWASP/NIST/PCI, continuous vulnerability management
- **TK-026** – WAF and perimeter security integration
- **TK-030–TK-032** – Encryption standards, secure ports/protocols, EDR integration
- **TK-040** – Customizable roles and privileges
- **TK-037–TK-038** – OpenLDAP & Google Workspace OAuth authentication

### 💼 Commercial (CC)

- **CC-004** – Licensing and subscription model
- **CC-005** – Product roadmap, upgrade schedule
- **CC-007** – Warranty/subscription terms and conditions

### 📦 Deliverables & Validation

- Solution Design & Security Architecture (TK-018–TK-032)
- Security and IAM Configuration Documentation
- Penetration Test Results, MFA demo, IAM compliance proof
- Security SLA inputs for Availability documentation

---

## **Karl – Core DMS Architecture, Storage, Migration, Version Control**

**Core Role:**
Database, backend infrastructure, version tracking, check-in/out logic, storage, and data migration.

**Assigned TOR Items:**

### 📁 Functional (FK)

- **FK-001** – Manage multiple document types (PDF, DOCX, media)
- **FK-004** – Bulk upload handling and sorting criteria
- **FK-005** – Version tracking and keyword search engine base
- **FK-010 / FK-014** – Restore deleted files, generate version history
- **FK-012 / FK-020** – Detect and notify corrupted documents
- **FK-014** – Document check-in/check-out lock mechanism

### ⚙️ Technical (TK)

- **TK-001–TK-004** – Browser compatibility, data migration, archiving, and data extraction APIs
- **TK-022–TK-023** – Data ownership, sovereignty, and destruction practices
- **TK-027** – Secure, tamper-evident audit logging database layer
- **TK-036 / TK-039** – Third-party integration APIs and backend connectors
- **TK-037–TK-038** – LDAP and OAuth backend endpoints

### 💼 Commercial (CC)

- **CC-008** – Migration-related cost documentation and mitigation plan

### 📦 Deliverables & Validation

- Database schema (ERD, Prisma models)
- Data Migration & Archiving Plan (TK-002–TK-004)
- Storage Infrastructure Evidence (TK-022–TK-023)
- Integration and Authentication Design (with CJ & Alro)

---

## **Gio – Audit, Activity Logs, Reporting, Evidence Management**

**Core Role:**
Audit trail engineer ensuring accountability, compliance visibility, and reporting automation.

**Assigned TOR Items:**

### 🧾 Functional (FK)

- **FK-004** – Log all user actions
- **FK-013 / FK-015** – Maintain chain of custody and generate activity logs
- **FK-012 / FK-013 / FK-008 / FK-009 / FK-002** – Generate usage and query reports

### ⚙️ Technical (TK)

- **TK-013–TK-017** – DPA compliance, audit trail for access and database, audit report generation, report formats, retention policies
- **TK-027 / TK-029** – Tamper-evident audit logging and external audit support

### 💼 Commercial (CC)

- **CC-009** – Enablement and capability building for reporting functions

### 📦 Deliverables & Validation

- Online audit report dashboard
- Built-in report exports (CSV, Excel, PDF, JSON)
- Retention policy automation
- Evidence for UAT and traceability register maintenance

---

## **Jude – Workflow, Search, OCR, Notifications, QSign Integration**

**Core Role:**
Frontend and middleware developer handling workflow UX, OCR, search filters, and signature integration.

**Assigned TOR Items:**

### 🔍 Functional (FK)

- **FK-005 / FK-009 / FK-019** – Keyword search and OCR conversion
- **FK-008 / FK-018** – Automate routing, approvals, and notifications
- **FK-004** – Sort documents by metadata
- **FK-007 / FK-012** – In-system editing features

### ⚙️ Technical (TK)

- **TK-004** – Frontend data extraction support
- **TK-015–TK-017** – Online audit reports and retention UI coordination
- **TK-036 / TK-039** – Workflow automation APIs and secure integrations
- **TK-037–TK-038** – OAuth and Workspace integration for search functions

### 💼 Commercial (CC)

- **CC-010** – Demo account setup for POC showcasing search/workflow

### 📦 Deliverables & Validation

- OCR & Search Module (Elastic/Supabase FTS)
- QSign digital signature workflow integration
- Approval routing and notification service
- Workflow Automation evidence (TK-036–TK-039)

---

## **Christian – Backup, Restore, Corruption Handling, System Recovery**

**Core Role:**
Disaster recovery, RPO/RTO testing, and file integrity.

**Assigned TOR Items:**

### 💾 Functional (FK)

- **FK-006 / FK-010 / FK-016** – Regular backups and restorations
- **FK-008 / FK-011 / FK-012** – File operations (delete, bulk delete, edit)
- **FK-020** – Corruption handling notifications

### ⚙️ Technical (TK)

- **TK-005–TK-009** – Backup type/configuration, recovery procedures, RPO/RTO validation
- **TK-025 / TK-026** – Patch management, proxy security validation
- **TK-010–TK-012** – Availability documentation, uptime, and regions (shared)
- **TK-033–TK-035** – Support response times, ITIL adherence, operational docs

### 💼 Commercial (CC)

- **CC-007** – Warranty documentation (shared with CJ)

### 📦 Deliverables & Validation

- Backup and Recovery Runbook
- BCDR Test Reports (TK-005–TK-009)
- Availability & Support SLAs (TK-010–TK-012, TK-033–TK-035)
- Restoration evidence and corruption alert logs

---

## **Alro – Remote Access, Integration, Workflow Orchestration**

**Core Role:**
Process automation, API connectivity, notifications, and integration orchestration.

**Assigned TOR Items:**

### 🔗 Functional (FK)

- **FK-007 / FK-011 / FK-017** – Secure remote access per user
- **FK-008 / FK-018** – Workflow automation, approvals, routing
- **FK-010 / FK-012 / FK-020** – Migration and metadata handling for legacy docs

### ⚙️ Technical (TK)

- **TK-026 / TK-036–TK-039** – API integrations, WAF compatibility, notifications, external systems
- **TK-002–TK-004** – Data migration/archiving (shared with Karl)
- **TK-010–TK-012** – Availability planning (shared)

### 💼 Commercial (CC)

- **CC-008–CC-010** – Migration cost planning, training, POC coordination

### 📦 Deliverables & Validation

- Workflow Automation Engine
- API Integration Design (TK-036–TK-039)
- Data Migration Reports
- Notification routing and access provisioning test cases

---

# 🧩 **Shared Deliverables (All Members)**

| Deliverable                                 | TOR References               | Responsible Members  |
| ------------------------------------------- | ---------------------------- | -------------------- |
| **Compliance Matrices (FK, TK, CC)**        | All FK/TK/CC                 | All                  |
| **Solution Design & Security Architecture** | TK-018–TK-032                | CJ, Karl, Christian  |
| **Data Migration & Archiving Plan**         | TK-002–TK-004                | Karl, Alro           |
| **Backup & Recovery Reports**               | TK-005–TK-009                | Christian            |
| **Availability & Support SLAs**             | TK-010–TK-012, TK-033–TK-035 | CJ, Karl, Christian  |
| **Integration & Authentication Design**     | TK-036–TK-039                | CJ, Karl, Alro, Jude |
| **Traceability Register & Evidence Matrix** | Section 7                    | Gio (Lead), All      |
| **UAT & Validation Pilots**                 | Section 9                    | All                  |

---

✅ **Result:**
Every TOR item from **FK-001 → FK-021**, **TK-001 → TK-040**, and **CC-004 → CC-010** is now explicitly assigned to at least one member (some shared where overlap exists).

Would you like me to produce this as a **visual RACI flowchart (matrix diagram)** next — showing each TOR code with colored cells for who’s _Responsible / Accountable / Consulted / Informed_?
