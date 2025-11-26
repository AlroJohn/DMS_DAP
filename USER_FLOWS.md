# User Flows - Document Management System (DMS)

## 1. Authentication & User Management Flow

### User Flow
```
Open DMS → Login Page → Enter Credentials/Google OAuth → JWT Token (HttpOnly Cookie) → 
Role & Permission Validation → Department-Based Dashboard
```

### Detailed Paths

#### New User Invitation & Registration
```
Admin Dashboard → User Management → Send Invitation → User Receives Email →
Click Invitation Link → View Invitation Details → Create Password → 
Account Activated → Auto-Login → Dashboard
```

#### Existing User Login
```
Login Page → Enter Email/Password OR Google OAuth → JWT Token Generated →
Session Created → Role & Department Validation → Redirect to Dashboard
```

#### Google OAuth Flow
```
Login Page → "Sign in with Google" → Google Authorization → OAuth Callback →
Account Linking/Creation → JWT Token → Dashboard
```

#### Password Reset
```
Login Page → "Forgot Password" → Enter Email → Receive Reset Token →
Click Reset Link → Create New Password → Auto-Login → Dashboard
```

### Pages
- Login Page (`/login`)
- Create Password Page (`/create-password`)
- Invitation Accept Page (`/invitation/accept`)
- OAuth Callback Page (`/auth/callback`)
- Account Settings Page (`/account`)

---

## 2. Document Repository & File Management Flow

### User Flow (Document Creation)
```
Dashboard → Documents → Create Document → Fill Metadata (Title, Description, Type, Classification) →
Upload File(s) → Select Department/Type → Save → Document Available in Repository
```

### User Flow (Document Access & Processing)
```
Documents Page → Search/Filter → Select Document → Preview/Download →
Release to Department → Select Recipient → Add Notes → Confirm Transfer → 
Real-time Notification → Status Updated
```

### Detailed Paths

#### Document Metadata Management
```
Create Document → Enter Title/Description → Select Document Type → 
Set Classification (Simple/Complex/Highly Technical) → Set Origin (Internal/External) → 
Save → Document Code Auto-Generated → Available in Repository
```

#### Document Workflow & Routing
```
Document Detail → Release to Department → Select Target Department → Add Remarks →
Confirm Transfer → Workflow Updated (JSON Array) → Real-time Notification → 
Status Changed to In-Transit
```

#### Document Recovery
```
Recycle Bin → Select Deleted Document → View Details → Restore →
Document Returns to Original Location → Status Updated
```

#### Bulk Document Upload
```
Documents → Upload → Select Multiple Files → Auto-Extract Metadata →
File Validation → Virus Scan → Encryption → Storage → Thumbnail Generation
```

### Pages
- All Documents Page (`/documents`)
- Document Upload Interface
- Document Viewer/Preview Page
- Owned Documents Page (`/documents/owned`)
- Received Documents Page (`/documents/received`)
- In-Transit Documents Page (`/documents/in-transit`)
- Completed Documents Page (`/documents/completed`)
- Recycle Bin Page (`/documents/recycle-bin`)
- File Management Settings

---

## 3. Document Editing & Version Control Flow

### User Flow (Document Editing)
```
Document Detail → Check Out Document → Lock Status → In-Browser Editor → 
Make Changes → Save Version → Add Comments → Check In → Version History Updated
```

### User Flow (Version Management)
```
Document Detail → Version History → Compare Versions → Select Previous Version →
Restore OR View Changes → Update Document
```

### Detailed Paths

#### Collaborative Editing
```
Document Editor → Real-time Indicators → Multiple Users Editing →
Conflict Detection → Auto-merge OR Manual Resolution
```

### Pages
- Document Editor (`/documents/:id/edit`)
- Version History Page (`/documents/:id/versions`)
- Version Comparison View (`/documents/:id/compare`)
- Document Detail with Lock Status

---

## 4. Blockchain Document Signing & Verification Flow (DocOnChain)

### User Flow (Document Signing)
```
Document Detail → Sign Document → DocOnChain Modal → Confirm Signature →
Blockchain Processing → Digital Certificate Generated → Verification Badge Added
```

### User Flow (Document Verification)
```
Document Detail → Verify Status → View Blockchain Transaction →
Download Certificate → Share Verification Link
```

### Detailed Paths

#### Public Verification
```
Verification Link → Public Portal → Enter Document Hash →
Blockchain Verification → Display Results → No Login Required
```

#### Multi-Signature Workflow
```
Document → First Signature → Route to Next Signer → Second Signature →
Complete Signing Chain → Final Verification
```

### Pages
- Signing Interface (DocOnChain modal)
- Signature Confirmation Page
- Certificate Download Page
- Verification Status Panel
- Public Verification Portal (`/verify/:hash`)
- Blockchain Transaction Viewer
- DocOnChain Configuration Page (admin)

---

## 5. Search & Discovery Flow

### User Flow (Basic Search)
```
Any Page → Global Search Bar → Enter Keywords → View Results →
Apply Filters → Select Document → Access/Preview
```

### User Flow (Advanced Search)
```
Search Page → Advanced Filters → Set Criteria (Type, Date, Signature Status) →
Save Search Preset → Execute Search → Sort Results → Access Documents
```

### Detailed Paths

#### Saved Search Management
```
Search Results → Save Search → Name Preset → Access Later from Saved Searches →
Modify Criteria → Re-execute
```

### Pages
- Global Search Bar (on all pages)
- Search Results Page
- Advanced Filters Panel
- Saved Searches Management

---

## 6. Workflow & Approvals Flow

### User Flow (Workflow Creation)
```
Admin Dashboard → Workflow Builder → Define Stages → Set Approval Rules →
Configure Notifications → Test Workflow → Activate → Apply to Documents
```

### User Flow (Document Approval Process)
```
Document Submitted → Workflow Triggered → Route to First Approver →
Notification Sent → Approver Reviews → Approve/Reject → Next Stage →
Final Approval → Document Completed
```

### Detailed Paths

#### Signature-Required Workflow
```
Workflow Stage → Requires Blockchain Signature → Document Routed →
Signer Notified → Sign Document → Verification → Next Stage
```

### Pages
- Workflow Configuration Builder (`/workflows/builder`)
- Approval Chains Editor
- Workflow Templates Library (`/workflows/templates`)
- My Approvals Dashboard (`/approvals`)
- Pending Signatures Queue

---

## 7. Audit, Reporting & Compliance Flow

### User Flow (Audit Trail Review)
```
Admin Dashboard → Audit Logs → Filter by User/Action/Date →
View Detailed Events → Export Report → Compliance Documentation
```

### User Flow (Report Generation)
```
Reports Dashboard → Select Report Type → Set Parameters →
Generate Report → View Analytics → Export (PDF/CSV/Excel)
```

### Detailed Paths

#### Compliance Monitoring
```
Compliance Dashboard → View Metrics → Identify Issues →
Drill Down to Details → Generate Compliance Report
```

### Pages
- Audit Logs Page (`/reports/audit-trail`)
- Signing History Timeline (`/reports/signing-history`)
- Reports Dashboard (`/reports`)
- Usage Reports (`/reports/usage`)
- Compliance Metrics Dashboard (`/reports/compliance`)
- Custom Report Builder (`/reports/builder`)
- Chain of Custody Reports (`/reports/chain-of-custody`)

---

## 8. System Administration Flow

### User Flow (User Management)
```
Admin Dashboard → User Management → View Users → Create/Edit Users →
Assign Roles → Send Invitations → Monitor Activity
```

### User Flow (Department Management)
```
Management → Departments → Create Department → Set Department Code →
Activate/Deactivate → Assign Users → Configure Access
```

### User Flow (Role & Permission Management)
```
User Management → Roles → Create Role → Assign Permissions →
Apply to Users → View Role Members → Audit Changes
```

### Detailed Paths

#### Document Configuration
```
Management → Document Types → Create Type → Set Properties →
Configure Workflow Rules → Activate/Deactivate
```

### Pages
- User Management Page (`/management/user-management`)
- Department Management Page (`/management/department`)
- Document Type Management (`/management/document-type`)
- Document Action Management (`/management/document-action`)
- Management Overview (`/management`)
- Security Settings Page (`/admin/security`)
- Integration Settings (`/admin/integrations`)
- System Health Dashboard (`/admin/system-health`)

---

## 9. Real-time Notifications Flow

### User Flow (Real-time Updates)
```
User Login → Auto-join Department Room → Auto-join Personal Room →
Document Action Occurs → Real-time Notification → UI Updates Instantly
```

### User Flow (Notification Management)
```
User Dashboard → Notification Center → View Alerts →
Mark as Read → Configure Preferences → Set Delivery Methods
```

### User Flow (System Notifications)
```
Event Occurs → System Generates Notification → Check User Preferences →
Send via Email/In-App → Update Notification Center → Track Delivery
```

### Detailed Paths

#### Department Notifications
```
Document Action → Identify Department Members → Send to Department Room →
Real-time Updates → Personal Notifications → Email Backup
```

### Pages
- Notifications Inbox
- Notification Settings
- Real-time Updates (all authenticated pages)

---

## 10. Data Management & Recovery Flow

### User Flow (Document Recovery)
```
Recycle Bin → View Deleted Documents → Select Document → Preview Details →
Restore Document → Document Returns to Active Status → Audit Trail Updated
```

### User Flow (Document Migration)
```
Admin Dashboard → Migration Tools → Select Source → Map Metadata →
Configure Policies → Execute Migration → Monitor Progress → Verify Results
```

### User Flow (Backup & Recovery)
```
Admin Dashboard → Backup Console → Schedule Backup → Monitor Status →
Test Recovery → Restore Data → Verify Integrity
```

### Detailed Paths

#### Selective Migration
```
Migration Dashboard → Set Retention Policies → Filter Documents →
Preview Selection → Execute Selective Migration → Audit Trail
```

### Pages
- Recycle Bin Page (`/documents/recycle-bin`)
- Migration Dashboard (`/admin/migration`)
- Backup & Recovery Console (`/admin/backup`)
- Archive Management (`/documents/archive`)
- Chain of Custody Reports (`/reports/chain-of-custody`)
- Storage Analytics (`/documents/storage-analytics`)

---

## Complete Integrated User Flow Examples

### Example 1: Department User Processing Document with Blockchain Signing

```
1. Login → JWT Authentication → Department Dashboard → View Received Documents

2. Select Document → View Details → Preview File → Review Metadata

3. Edit Document → Save Version → Add Remarks

4. Sign Document → DocOnChain Modal → Blockchain Verification

5. Release to Next Department → Select Target → Add Transfer Notes → Confirm

6. Real-time Notification Sent → Department Members Notified → Status Updated
```

### Example 2: Admin User Onboarding New Department Member

```
1. Admin Login → User Management → Create Invitation

2. Enter User Details → Select Department → Assign Role → Send Invitation

3. User Receives Email → Click Invitation Link → View Details → Create Password

4. Account Activated → Auto-Login → Department Dashboard → Ready to Work

5. Real-time Notification to Department → New Member Joined
```

### Example 3: Complete Document Lifecycle

```
1. User Creates Document → Fill Metadata → Upload Files → Select Type/Classification → Save

2. Document Code Generated → Status: Dispatch → Available in Repository

3. Release to Department → Select Target → Add Remarks → Status: In-Transit

4. Target Department Receives → Real-time Notification → Process Document

5. Sign Document → Blockchain Verification → Certificate Generated

6. Mark as Completed → Status: Completed → Workflow Tracking Updated

7. [Optional] Archive Document → Long-term Storage → Maintain Blockchain Records

8. [Optional] Soft Delete → Move to Recycle Bin → Can be Restored
```

### Example 4: Advanced Search and Discovery

```
1. User Opens Search → Enter Keywords → View Initial Results

2. Apply Advanced Filters → Signature Status → Date Range → Document Type

3. Save Search Preset → Name "Monthly Signed Contracts" → Execute Search

4. Sort by Signature Date → Select Document → View Blockchain Certificate

5. Share Verification Link → External Party Verifies → No Login Required
```

### Example 5: Workflow Automation

```
1. Admin Creates Workflow → Define Approval Stages → Set Signature Requirements

2. Configure Routing Rules → Department A → Department B → Final Approval

3. Apply Workflow to Document Type → Activate Automation

4. User Submits Document → Workflow Triggered → Auto-route to First Approver

5. Approver Signs → Blockchain Verification → Auto-route to Next Stage

6. Final Approval → Document Completed → All Parties Notified
```

---

## System Architecture Overview

### Technology Stack
- **Backend**: Express.js with TypeScript, Prisma ORM
- **Database**: PostgreSQL with comprehensive models
- **Authentication**: JWT tokens in HttpOnly cookies
- **Real-time**: Socket.IO for live updates
- **Blockchain**: DocOnChain API integration
- **Frontend**: Next.js 14 with TypeScript, shadcn/ui
- **Security**: bcrypt, CORS, rate limiting, encryption

### Key Features
- Role-based access control with granular permissions
- Real-time notifications and updates
- Blockchain document signing and verification
- Comprehensive audit trails
- Department-based workflow management
- Advanced search and filtering
- Document version control and collaboration
- Automated workflow and approval chains
- Data migration and backup systems
- Public verification portal for signed documents