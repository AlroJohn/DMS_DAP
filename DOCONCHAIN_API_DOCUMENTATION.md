# DOCONCHAIN API Documentation

## Overview

DOCONCHAIN provides blockchain-based document signing and verification services. This documentation covers the API endpoints available in the **STG (Staging) environment**.

### Environment Details

- **Base URL**: `https://stg-api2.doconchain.com`
- **Environment**: Staging
- **Portal**: https://doconchain.readme.io/reference/intro/getting-started

### Authentication Credentials

```
Email: stg_quanby@maildrop.cc
Client Key: U2FsdGVkX19dxrNafE8249yn0M/GMqq3WAbITHfKYl8=
Client Secret: 5sd07WmZyXJft2jEP8LOJyfGH
```

---

## Endpoints

### 1. Generate Token

Generate an authentication token for API access.

**Endpoint**: `POST /api/v2/generate/token`

**URL**: `https://stg-api2.doconchain.com/api/v2/generate/token`

#### Request

**Headers**:
```
Accept: application/json
Content-Type: multipart/form-data
```

**Body Parameters** (multipart/form-data):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `client_key` | string | Yes | The client key for authentication |
| `client_secret` | string | Yes | The client secret for authentication |
| `email` | string | Optional | Email associated with the account |

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "token": "string"
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/api/v2/generate/token',
  headers: {
    accept: 'application/json',
    'content-type': 'multipart/form-data'
  },
  data: {
    client_key: 'U2FsdGVkX19dxrNafE8249yn0M/GMqq3WAbITHfKYl8=',
    client_secret: '5sd07WmZyXJft2jEP8LOJyfGH'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 2. Verify Auth Token

Check the validity of an authorization token for an ENTERPRISE_API user type.

**Endpoint**: `POST /api/v2/auth/verify`

**URL**: `https://stg-api2.doconchain.com/api/v2/auth/verify?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
Content-Type: application/json
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | User type (use `ENTERPRISE_API`) |

**Body Parameters**: None required (can be empty)

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "string",
  "data": {
    "redirect_to": "string",
    "status": "string"
  }
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/api/v2/auth/verify',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response (Valid Token)

```json
{
  "message": "Token is valid",
  "data": {
    "redirect_to": "",
    "status": "active"
  }
}
```

#### Example Response (Invalid Token)

```json
{
  "message": "Invalid or expired token",
  "data": {
    "redirect_to": "",
    "status": "invalid"
  }
}
```

#### Use Cases

- **Token Validation**: Verify a token is still valid before making API calls
- **Session Check**: Check if user session is still active
- **Pre-flight Check**: Validate token before performing critical operations
- **Error Prevention**: Avoid failed requests due to expired tokens

#### Notes

- This endpoint is useful for checking token validity before making important operations
- Returns status information about the token
- Can help implement token refresh logic in your application
- Use `user_type=ENTERPRISE_API` for API authentication validation

---

### 3. Logout (Invalidate Token)

Logout and invalidate the current authentication token. A new token must be generated to regain API access.

**Endpoint**: `POST /api/v2/api_generation/logout`

**URL**: `https://stg-api2.doconchain.com/api/v2/api_generation/logout`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
```

**Body Parameters**: None required

#### Response

**Status**: `200 OK`

**Body**: Empty or minimal response

```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/api/v2/api_generation/logout',
  headers: {
    accept: 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Notes

- After logout, the token becomes invalid and cannot be reused
- You must call `/api/v2/generate/token` again to get a new token
- This is useful for security purposes when ending a session

---

### 4. Create Project (Upload Document)

Create a blockchain project by uploading a document for signing.

**Endpoint**: `POST /api/v2/projects`

**URL**: `https://stg-api2.doconchain.com/api/v2/projects`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Body Parameters** (multipart/form-data):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | file | Yes | The document file to be signed |
| `project_name` | string | Optional | Name of the project |
| `description` | string | Optional | Project description |

#### Response

**Status**: `200 OK` or `201 Created`

**Body**:
```json
{
  "success": true,
  "data": {
    "project_uuid": "string",
    "transaction_hash": "string",
    "status": "string",
    "redirect_url": "string",
    "created_at": "string"
  }
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const formData = new FormData();
formData.append('file', fs.createReadStream('/path/to/document.pdf'));
formData.append('project_name', 'Contract Signing');
formData.append('description', 'Legal contract for project X');

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/api/v2/projects',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE',
    ...formData.getHeaders()
  },
  data: formData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "project_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "transaction_hash": "0x1234567890abcdef1234567890abcdef12345678",
    "status": "pending",
    "redirect_url": "https://doconchain.com/projects/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

---

### 5. Add Project Signer

Add a new user or participant to a signature request document. A project role can be set to determine whether a user is a Signer (requires fields to be added), Approver, Viewer, or Issuee.

**Endpoint**: `POST /projects/{uuid}/signers`

**URL**: `https://stg-api2.doconchain.com/projects/{uuid}/signers?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The project identifier or UUID |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

**Body Parameters** (JSON):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | Email address of the signer |
| `first_name` | string | Yes | First name of the signer |
| `last_name` | string | Yes | Last name of the signer |
| `type` | string | Yes | Type of the signer (e.g., "GUEST") |
| `signer_role` | string | Yes | Role of the signer ("Signer", "Approver", "Viewer", "Issuee") |

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "",
  "data": [
    {
      "id": 0,
      "project_id": 0,
      "client_id": 0,
      "email": "",
      "first_name": "",
      "last_name": "",
      "country": "",
      "role": "",
      "photo": "",
      "verified": 0,
      "verified_at": "",
      "type": "",
      "sequence": 0,
      "status": "",
      "company": "",
      "job_title": "",
      "team": null,
      "deliver_status": "",
      "in_contact": true,
      "color_code": "",
      "sent_at": null,
      "opened_at": null,
      "signed_at": null,
      "created_at": "",
      "deleted_at": null,
      "signature": null,
      "signature_source": "",
      "initial": "",
      "initial_source": "",
      "signer_role": "",
      "project_role": "",
      "project_role_id": null
    }
  ]
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/projects/{{project-uuid}}/signers',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  },
  data: {
    email: 'john.doe@example.com',
    first_name: 'John',
    last_name: 'Doe',
    type: 'GUEST',
    signer_role: 'Signer'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "Signer added successfully",
  "data": [
    {
      "id": 12345,
      "project_id": 67890,
      "client_id": 111,
      "email": "john.doe@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "country": "",
      "role": "Signer",
      "photo": "",
      "verified": 0,
      "verified_at": "",
      "type": "GUEST",
      "sequence": 1,
      "status": "pending",
      "company": "",
      "job_title": "",
      "team": null,
      "deliver_status": "not_sent",
      "in_contact": true,
      "color_code": "#FF5733",
      "sent_at": null,
      "opened_at": null,
      "signed_at": null,
      "created_at": "2024-01-15T10:30:00Z",
      "deleted_at": null,
      "signature": null,
      "signature_source": "",
      "initial": "",
      "initial_source": "",
      "signer_role": "Signer",
      "project_role": "Signer",
      "project_role_id": null
    }
  ]
}
```

#### Signer Roles

| Role | Description |
|------|-------------|
| `Signer` | Requires signature fields to be added to the document |
| `Approver` | Can approve the document without signing |
| `Viewer` | Can view the document but cannot sign or approve |
| `Issuee` | Document recipient who issued the request |

#### Important Notes

- Adding a document user can only be done to a 'Draft' document that has not been sent to users yet
- The `user_type=ENTERPRISE_API` query parameter is required
- Each signer gets assigned a unique color code for identification
- The sequence determines the order in which signers will receive the document
- Use `type: "GUEST"` for external signers who don't have accounts in the system

#### Use Cases

- **Multi-party Agreements**: Add multiple signers to contracts requiring several signatures
- **Approval Workflows**: Add approvers who need to review before final signing
- **Document Distribution**: Add viewers who need to see the document but not sign
- **Sequential Signing**: Control the order of signing by managing the sequence

---

### 6. Update Project Signer

Update the details of a signer associated with a specific project. This allows you to modify signer information such as name, signing order, and role within a project.

**Endpoint**: `PUT /projects/{uuid}/signers/{signerId}`

**URL**: `https://stg-api2.doconchain.com/projects/{uuid}/signers/{signerId}?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The UUID of the project |
| `signerId` | string | Yes | The ID of the signer to update |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

**Body Parameters** (JSON):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `first_name` | string | Optional | First name of the signer |
| `last_name` | string | Optional | Last name of the signer |
| `sequence` | string/integer | Optional | Signer order in the signing process (1-10) |
| `signer_role` | string | Optional | Role of the signer ("Creator", "Signer", "Viewer", "Approver") |

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "Signer updated successfully",
  "data": {
    "id": 0,
    "project_id": 0,
    "email": "string",
    "first_name": "string",
    "last_name": "string",
    "sequence": 0,
    "signer_role": "string",
    "status": "string",
    "updated_at": "string"
  }
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'PUT',
  url: 'https://stg-api2.doconchain.com/projects/{{project-uuid}}/signers/{{signerId}}',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  },
  data: {
    first_name: 'John',
    last_name: 'Doe',
    sequence: '1',
    signer_role: 'Signer'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "Signer updated successfully",
  "data": {
    "id": 12345,
    "project_id": 67890,
    "email": "john.doe@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "sequence": 1,
    "signer_role": "Signer",
    "status": "pending",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

#### Signer Roles

| Role | Description |
|------|-------------|
| `Creator` | The person who created the project |
| `Signer` | Requires signature fields and must sign the document |
| `Viewer` | Can view the document but cannot sign |
| `Approver` | Can approve the document without signing |

#### Sequence Order

- **Range**: 1-10 (supports up to 10 signers in sequence)
- **Sequential Signing**: Lower numbers sign first (1, then 2, then 3, etc.)
- **Parallel Signing**: Use the same sequence number for simultaneous signing

#### Use Cases

- **Name Corrections**: Update signer names due to typos or changes
- **Role Changes**: Modify signer roles based on project requirements
- **Sequence Reordering**: Change the signing order when workflow changes
- **Workflow Updates**: Adjust signer responsibilities after project creation

#### Important Notes

- Updates can typically only be made to projects in 'Draft' status
- Changing sequence affects the signing workflow order
- Role changes may impact what actions the signer can perform
- The `user_type=ENTERPRISE_API` query parameter is required

---

### 7. Delete Project Signer

Remove a user from a signature request document. This will also delete any fields on the document associated with the user (if user is a Signer) and remove the user from the signature workflow.

**Endpoint**: `DELETE /projects/{uuid}/signers/{signerId}`

**URL**: `https://stg-api2.doconchain.com/projects/{uuid}/signers/{signerId}?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The unique identifier of the project |
| `signerId` | string | Yes | The identifier of the signer to be removed |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

**Body Parameters**: None required

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": ""
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'DELETE',
  url: 'https://stg-api2.doconchain.com/projects/{{project-uuid}}/signers/{{signerId}}',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "Signer removed successfully"
}
```

#### What Gets Deleted

- **Signer Record**: The user is completely removed from the project
- **Signature Fields**: Any signature, initial, or form fields assigned to the signer
- **Workflow Position**: The signer's position in the signing sequence
- **Notifications**: Any pending email notifications for this signer

#### Use Cases

- **Incorrect Signer**: Remove wrongly added signers before sending the document
- **Workflow Changes**: Adjust the signing workflow by removing unnecessary participants
- **Role Consolidation**: Remove duplicate or redundant signers
- **Project Cleanup**: Clean up draft projects before finalizing

#### Important Notes

- **Draft Only**: Deleting a signer can only be done on 'Draft' documents that haven't been sent yet
- **Irreversible**: Once deleted, the signer and all associated fields are permanently removed
- **Sequence Impact**: Removing a signer may affect the signing sequence order
- **Field Dependencies**: All signature fields assigned to this signer will be deleted
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Error Responses

**400 Bad Request**: Document is not in draft status or invalid parameters
```json
{
  "error": {
    "code": "INVALID_STATUS",
    "message": "Cannot delete signer from non-draft document"
  }
}
```

**404 Not Found**: Signer or project not found
```json
{
  "error": {
    "code": "SIGNER_NOT_FOUND",
    "message": "Signer with specified ID not found in project"
  }
}
```

---

### 8. Add Project Marks

Add a field (such as Signature or Initials) for a Signer in a specific signature request document. The field serves as a placeholder for where their signature or initials will be placed on the document.

**Endpoint**: `POST /projects/{uuid}/signers/{signerId}/properties`

**URL**: `https://stg-api2.doconchain.com/projects/{uuid}/signers/{signerId}/properties?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The project identifier or UUID |
| `signerId` | integer | Yes | The ID of the signer |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

**Body Parameters** (JSON):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | Yes | Type of the signature mark ("signature", "initial", "text", "date", etc.) |
| `position_x` | integer | Yes | X-coordinate position of the signature mark |
| `position_y` | integer | Yes | Y-coordinate position of the signature mark |
| `height` | integer | Yes | Height of the signature mark |
| `width` | integer | Yes | Width of the signature mark |
| `page_no` | string | Yes | Page number for the signature mark |

#### Response

**Status**: `200 OK`

**Body**:
```json
[
  {
    "id": 0,
    "project_id": 0,
    "signer_id": 0,
    "reference_number": "string",
    "project_reference_number": "string",
    "position_x": 0,
    "position_y": 0,
    "width": 0,
    "height": 0,
    "page_no": 0,
    "type": "string",
    "value": "string",
    "font_style": "string",
    "font_size": 0,
    "attach": 0,
    "txn_hash": "string",
    "attached_at": "string",
    "created_at": "string"
  }
]
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/projects/{{project-uuid}}/signers/{{signerId}}/properties',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  },
  data: {
    type: 'signature',
    position_x: 100,
    position_y: 200,
    height: 50,
    width: 150,
    page_no: '1'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
[
  {
    "id": 12345,
    "project_id": 67890,
    "signer_id": 111,
    "reference_number": "MARK-2024-001",
    "project_reference_number": "PROJ-2024-001",
    "position_x": 100,
    "position_y": 200,
    "width": 150,
    "height": 50,
    "page_no": 1,
    "type": "signature",
    "value": "",
    "font_style": "Arial",
    "font_size": 12,
    "attach": 0,
    "txn_hash": "",
    "attached_at": null,
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### Field Types

| Type | Description |
|------|-------------|
| `signature` | Full signature field |
| `initial` | Initial/monogram field |
| `text` | Text input field |
| `date` | Date field |
| `checkbox` | Checkbox field |
| `radio` | Radio button field |

#### Position Guidelines

- **Coordinates**: Use pixel coordinates relative to the document page
- **Origin**: Top-left corner is (0, 0)
- **Page Size**: Standard letter size is approximately 612x792 pixels
- **Margins**: Consider document margins when positioning fields

#### Use Cases

- **Signature Placement**: Add signature fields where signers need to sign
- **Initial Requirements**: Add initial fields for document acknowledgment
- **Form Fields**: Add text fields for additional information
- **Date Fields**: Add date fields for signing timestamps
- **Approval Checkboxes**: Add checkboxes for agreement confirmation

#### Important Notes

- **Draft Only**: Adding fields can only be done on 'Draft' documents that haven't been sent yet
- **Signer Role**: Fields can only be associated with users having 'Signer' access role
- **Page Validation**: Ensure the page number exists in the document
- **Position Validation**: Coordinates must be within the page boundaries
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Error Responses

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authentication token"
  }
}
```

**404 Not Found**: Project or signer not found
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Project or signer not found"
  }
}
```

**422 Unprocessable Entity**: Invalid field parameters
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid field position or dimensions"
  }
}
```

---

### 9. Update Project Marks

Update a Signer's field in a specific signature request document. This allows you to modify field properties such as position, dimensions, and other attributes.

**Endpoint**: `PUT /projects/signers/{signerId}/properties/{propertyId}`

**URL**: `https://stg-api2.doconchain.com/projects/signers/{signerId}/properties/{propertyId}?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `signerId` | integer | Yes | The ID of the signer |
| `propertyId` | integer | Yes | The ID of the property/field to update |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

**Body Parameters** (JSON):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `position_x` | integer | Optional | X-coordinate position of the field |
| `position_y` | integer | Optional | Y-coordinate position of the field |
| `width` | integer | Optional | Width of the field |
| `height` | integer | Optional | Height of the field |
| `page_no` | string | Optional | Page number for the field |
| `type` | string | Optional | Type of the field |
| `font_style` | string | Optional | Font style for text fields |
| `font_size` | integer | Optional | Font size for text fields |

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "Property updated successfully",
  "data": {
    "id": 0,
    "project_id": 0,
    "signer_id": 0,
    "reference_number": "string",
    "project_reference_number": "string",
    "position_x": 0,
    "position_y": 0,
    "width": 0,
    "height": 0,
    "page_no": 0,
    "type": "string",
    "value": "string",
    "font_style": "string",
    "font_size": 0,
    "attach": 0,
    "txn_hash": null,
    "attached_at": null,
    "created_at": "string"
  },
  "meta": {}
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'PUT',
  url: 'https://stg-api2.doconchain.com/projects/signers/{{signerId}}/properties/{{propertyId}}',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  },
  data: {
    position_x: 80,
    position_y: 150,
    width: 200,
    height: 60
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "Property updated successfully",
  "data": {
    "id": 12345,
    "project_id": 67890,
    "signer_id": 111,
    "reference_number": "MARK-2024-001",
    "project_reference_number": "PROJ-2024-001",
    "position_x": 80,
    "position_y": 150,
    "width": 200,
    "height": 60,
    "page_no": 1,
    "type": "signature",
    "value": "",
    "font_style": "Arial",
    "font_size": 12,
    "attach": 0,
    "txn_hash": null,
    "attached_at": null,
    "created_at": "2024-01-15T10:30:00Z"
  },
  "meta": {}
}
```

#### Updatable Properties

| Property | Description | Example |
|----------|-------------|----------|
| `position_x` | Horizontal position on the page | `80` |
| `position_y` | Vertical position on the page | `150` |
| `width` | Field width in pixels | `200` |
| `height` | Field height in pixels | `60` |
| `page_no` | Target page number | `"1"` |
| `font_style` | Font family for text fields | `"Arial"` |
| `font_size` | Font size for text fields | `12` |

#### Use Cases

- **Position Adjustment**: Move fields to better locations on the document
- **Size Optimization**: Resize fields to fit content appropriately
- **Page Relocation**: Move fields to different pages
- **Font Customization**: Update text field appearance
- **Layout Refinement**: Fine-tune field placement after initial setup

#### Important Notes

- **Draft Only**: Updating project marks can only be done on 'Draft' documents that haven't been sent yet
- **Partial Updates**: Only include the properties you want to update in the request body
- **Validation**: Position and dimension values must be within valid page boundaries
- **Field Dependencies**: Some properties may only apply to specific field types
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

---

### 10. Delete Project Marks

Delete a specific field associated with a user in a signature request document. This permanently removes the field and cannot be undone.

**Endpoint**: `DELETE /projects/signers/{signerId}/properties/{propertyId}`

**URL**: `https://stg-api2.doconchain.com/projects/signers/{signerId}/properties/{propertyId}?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `signerId` | integer | Yes | The ID of the signer |
| `propertyId` | integer | Yes | The ID of the property/field to delete |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

**Body Parameters**: None required

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "Property deleted successfully"
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'DELETE',
  url: 'https://stg-api2.doconchain.com/projects/signers/{{signerId}}/properties/{{propertyId}}',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "Property deleted successfully"
}
```

#### Use Cases

- **Field Removal**: Remove incorrectly placed signature or form fields
- **Layout Cleanup**: Clean up document layout by removing unnecessary fields
- **Workflow Changes**: Remove fields when signer requirements change
- **Error Correction**: Delete fields that were added by mistake
- **Template Refinement**: Remove fields during document template development

#### Important Notes

- **Draft Only**: Deleting project marks can only be done on 'Draft' documents that haven't been sent yet
- **Irreversible**: Once deleted, the field is permanently removed and cannot be recovered
- **Signer Association**: Only fields associated with the specified signer will be deleted
- **Field Dependencies**: Ensure no other processes depend on the field before deletion
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### What Gets Deleted

- **Field Definition**: The complete field configuration and properties
- **Position Data**: All positioning and sizing information
- **Field Type**: The field type (signature, initial, text, etc.)
- **Styling**: Any font, color, or appearance settings
- **References**: All internal references to the field

#### Error Responses

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authentication token"
  }
}
```

**404 Not Found**: Property or signer not found
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Property or signer not found"
  }
}
```

---

### 11. Send Project

Send the document to its recipients. Recipients will receive email notifications depending on their access role and signing order. The Issuee access role will only receive an email once the document is completed.

**Endpoint**: `POST /my/projects/{uuid}/send`

**URL**: `https://stg-api2.doconchain.com/my/projects/{uuid}/send?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The project identifier or UUID |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

**Body Parameters**: None required

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "string"
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/my/projects/{{project-uuid}}/send',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "Signature request sent successfully"
}
```

#### Email Notification Behavior

| Signer Role | Email Timing | Description |
|-------------|--------------|-------------|
| `Signer` | Immediate (if first in sequence) | Receives email to sign the document |
| `Approver` | Immediate (if first in sequence) | Receives email to approve the document |
| `Viewer` | Immediate | Receives email to view the document |
| `Issuee` | After completion | Only receives email once all signers complete |

#### Signing Order

- **Sequential**: If recipient order is enabled, only first-order recipients receive immediate emails
- **Parallel**: All recipients at the same sequence level receive emails simultaneously
- **Next in Line**: Subsequent recipients receive emails after previous ones complete their actions

#### Use Cases

- **Document Distribution**: Send contracts to all parties for signing
- **Approval Workflows**: Initiate approval processes with multiple stakeholders
- **Legal Documents**: Distribute legal agreements requiring signatures
- **Business Contracts**: Send business agreements to partners or clients
- **Internal Approvals**: Route documents through internal approval chains

#### Important Notes

- **Draft to Processing**: Sending changes the document status from 'Draft' to 'Processing'
- **No More Edits**: Once sent, signers and fields cannot be modified
- **Email Delivery**: Ensure all signer email addresses are valid
- **Sequence Matters**: Check signing order before sending
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Prerequisites

- **Document Status**: Project must be in 'Draft' status
- **Signers Added**: At least one signer must be added to the project
- **Fields Configured**: Signature fields must be properly placed (for Signers)
- **Valid Emails**: All signer email addresses must be valid

#### Error Responses

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authentication token"
  }
}
```

**404 Not Found**: Project not found
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Project not found"
  }
}
```

#### Best Practices

- **Pre-send Validation**: Verify all signers and fields are correctly configured
- **Email Testing**: Test with internal email addresses first
- **Sequence Planning**: Plan the signing order carefully before sending
- **Backup Communication**: Have alternative communication methods ready
- **Status Monitoring**: Monitor project status after sending

---

### 12. Get Uploaded Templates

Retrieve all templates for a specific user, including template details such as saved recipients (template roles or permanent users), template status, and more.

**Endpoint**: `GET /api/v2/templates`

**URL**: `https://stg-api2.doconchain.com/api/v2/templates?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "success": true,
  "data": [
    {
      "template_id": "string",
      "template_uuid": "string",
      "template_name": "string",
      "description": "string",
      "status": "string",
      "file_name": "string",
      "file_url": "string",
      "created_at": "string",
      "updated_at": "string",
      "template_roles": [
        {
          "role_id": "string",
          "role_name": "string",
          "role_type": "string",
          "sequence": 0
        }
      ],
      "permanent_users": [
        {
          "user_id": "string",
          "email": "string",
          "first_name": "string",
          "last_name": "string",
          "role": "string"
        }
      ]
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 10,
    "total": 50,
    "total_pages": 5
  }
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/api/v2/templates',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "success": true,
  "data": [
    {
      "template_id": "12345",
      "template_uuid": "template-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "template_name": "NDA Template",
      "description": "Standard Non-Disclosure Agreement template",
      "status": "active",
      "file_name": "nda_template.pdf",
      "file_url": "https://doconchain.com/templates/nda_template.pdf",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-20T14:45:00Z",
      "template_roles": [
        {
          "role_id": "role_001",
          "role_name": "Company Representative",
          "role_type": "Signer",
          "sequence": 1
        },
        {
          "role_id": "role_002",
          "role_name": "Client Representative",
          "role_type": "Signer",
          "sequence": 2
        }
      ],
      "permanent_users": [
        {
          "user_id": "user_123",
          "email": "legal@company.com",
          "first_name": "Legal",
          "last_name": "Department",
          "role": "Approver"
        }
      ]
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 10,
    "total": 15,
    "total_pages": 2
  }
}
```

#### Template Components

| Component | Description |
|-----------|-------------|
| **Template Roles** | Generic roles that can be filled when using the template |
| **Permanent Users** | Specific users always assigned to the template |
| **Template Status** | Current status (active, inactive, draft) |
| **File Details** | Original document file information |

#### Template Roles vs Permanent Users

- **Template Roles**: Generic placeholders (e.g., "Client", "Vendor") that get filled when creating projects
- **Permanent Users**: Specific individuals always included (e.g., legal department, compliance officer)

#### Use Cases

- **Template Management**: View all available document templates
- **Project Creation**: Select templates for new signature requests
- **Template Reuse**: Identify frequently used templates
- **Role Planning**: Review template roles before project creation
- **Template Maintenance**: Monitor template usage and status

#### Important Notes

- **User-Specific**: Only returns templates accessible to the authenticated user
- **Role Information**: Includes both template roles and permanent users
- **Status Filtering**: Templates may have different statuses (active, inactive, draft)
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Template Statuses

| Status | Description |
|--------|-------------|
| `active` | Template is available for use |
| `inactive` | Template is disabled but preserved |
| `draft` | Template is still being configured |

---

### 13. Create Template From File

Create a template by uploading a file and setting up field mappings. The location, size, and document page number for field placement are customizable.

**Endpoint**: `POST /api/v2/templates`

**URL**: `https://stg-api2.doconchain.com/api/v2/templates?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

**Body Parameters** (multipart/form-data):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | file | Yes | The file to be used for the template |
| `name` | string | Yes | The name of the template |
| `mapping` | string | Yes | JSON string defining field positions and properties |
| `organization_id` | integer | Optional | Organization ID |
| `manual_mapping` | integer | Optional | Enable manual field mapping |
| `number_of_signatories` | integer | Optional | Number of signatories for the template |

#### Mapping Format

The `mapping` parameter should be a JSON string with the following structure:

```json
[{
  "signatures": [
    {
      "x": 35,
      "y": 703,
      "width": 95,
      "height": 65,
      "pageNo": 1,
      "isRequired": 1
    }
  ]
}]
```

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "Template created successfully",
  "data": {
    "client_id": 0,
    "name": "string",
    "path": "string",
    "created_at": "string",
    "updated_at": "string",
    "id": 0
  }
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const formData = new FormData();
formData.append('file', fs.createReadStream('/path/to/template.pdf'));
formData.append('name', 'NDA Template');
formData.append('mapping', JSON.stringify([{
  "signatures": [
    {
      "x": 35,
      "y": 703,
      "width": 95,
      "height": 65,
      "pageNo": 1,
      "isRequired": 1
    },
    {
      "x": 404,
      "y": 703,
      "width": 95,
      "height": 65,
      "pageNo": 1,
      "isRequired": 1
    }
  ]
}]));
formData.append('number_of_signatories', '2');

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/api/v2/templates',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    'content-type': 'multipart/form-data',
    authorization: 'Bearer YOUR_TOKEN_HERE',
    ...formData.getHeaders()
  },
  data: formData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "Template created successfully",
  "data": {
    "client_id": 12345,
    "name": "NDA Template",
    "path": "/templates/nda_template_67890.pdf",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "id": 67890
  }
}
```

#### Field Mapping Properties

| Property | Type | Description |
|----------|------|-------------|
| `x` | integer | X-coordinate position on the page |
| `y` | integer | Y-coordinate position on the page |
| `width` | integer | Field width in pixels |
| `height` | integer | Field height in pixels |
| `pageNo` | integer | Page number where the field is located |
| `isRequired` | integer | Whether the field is required (1 = required, 0 = optional) |

#### Field Types

The mapping can include different field types:

- **signatures**: Signature fields for signers
- **initials**: Initials fields for signers
- **text**: Text input fields
- **date**: Date fields
- **checkbox**: Checkbox fields

#### Use Cases

- **Template Creation**: Create reusable document templates
- **Standardization**: Standardize document layouts and field positions
- **Automation**: Automate document preparation with pre-defined fields
- **Compliance**: Ensure consistent field placement for legal documents
- **Efficiency**: Reduce manual field placement for recurring documents

#### Important Notes

- **File Format**: Supports PDF, DOCX, and other common document formats
- **Coordinate System**: Uses pixel coordinates with origin at top-left (0,0)
- **Page Validation**: Ensure page numbers exist in the uploaded document
- **Field Positioning**: Test field positions to ensure proper placement
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Best Practices

- **Test Coordinates**: Verify field positions before finalizing the template
- **Consistent Sizing**: Use consistent field dimensions for similar field types
- **Page Boundaries**: Ensure fields don't exceed page boundaries
- **Required Fields**: Mark essential fields as required (isRequired: 1)
- **Template Naming**: Use descriptive names for easy identification

---

### 14. Bulk Delete Templates

Permanently delete multiple templates for a specific user. The template IDs to be deleted should be listed and separated by commas.

**Endpoint**: `DELETE /api/v2/templates`

**URL**: `https://stg-api2.doconchain.com/api/v2/templates?user_type=ENTERPRISE_API&template_ids=1,2,3,4,5`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |
| `template_ids` | string | Yes | Comma-separated IDs of templates to delete (e.g., "1,2,3,4,5") |

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "Templates deleted successfully",
  "deleted_count": 5,
  "deleted_ids": [1, 2, 3, 4, 5]
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'DELETE',
  url: 'https://stg-api2.doconchain.com/api/v2/templates',
  params: {
    user_type: 'ENTERPRISE_API',
    template_ids: '1,2,3,4,5'
  },
  headers: {
    accept: 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "5 templates deleted successfully",
  "deleted_count": 5,
  "deleted_ids": [1, 2, 3, 4, 5]
}
```

#### Use Cases

- **Template Cleanup**: Remove outdated or unused templates
- **Bulk Management**: Delete multiple templates at once for efficiency
- **Storage Optimization**: Free up storage space by removing unnecessary templates
- **Template Maintenance**: Clean up template library during reorganization
- **Compliance**: Remove templates that no longer meet regulatory requirements

#### Important Notes

- **Permanent Deletion**: This action permanently deletes templates and cannot be undone
- **User-Specific**: Only templates owned by the authenticated user can be deleted
- **Active Projects**: Templates currently in use by active projects may not be deletable
- **Comma Separation**: Template IDs must be separated by commas without spaces
- **Required Parameters**: Both `user_type` and `template_ids` query parameters are mandatory

#### Template ID Format

- **Single Template**: `template_ids=123`
- **Multiple Templates**: `template_ids=123,456,789`
- **Large Batch**: `template_ids=1,2,3,4,5,6,7,8,9,10`

#### Error Handling

- **Invalid IDs**: Non-existent template IDs will be ignored
- **Permission Denied**: Templates not owned by the user will be skipped
- **Partial Success**: Some templates may be deleted while others fail

#### Best Practices

- **Backup First**: Consider backing up templates before bulk deletion
- **Verify IDs**: Confirm template IDs before deletion
- **Check Dependencies**: Ensure templates aren't used in active projects
- **Batch Size**: Limit batch size to avoid timeout issues
- **Audit Trail**: Keep records of deleted templates for compliance

#### Safety Considerations

- **No Undo**: Deleted templates cannot be recovered
- **Impact Assessment**: Review template usage before deletion
- **User Notification**: Inform team members of template deletions
- **Staging Test**: Test deletion process in staging environment first

---

### 15. Update Template Mapping

Update a specific template's field mapping and name. This allows you to modify the template's field positions, properties, and metadata.

**Endpoint**: `PUT /api/v2/templates/{templateId}`

**URL**: `https://stg-api2.doconchain.com/api/v2/templates/{templateId}?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `templateId` | integer | Yes | The ID of the template to update |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

**Body Parameters** (multipart/form-data):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mapping` | string | Optional | JSON string defining updated field positions and properties |
| `name` | string | Optional | Updated name for the template |

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "Template updated successfully",
  "data": {
    "id": 0,
    "name": "string",
    "mapping": "string",
    "client_id": 0,
    "path": "string",
    "created_at": "string",
    "updated_at": "string"
  }
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';
import FormData from 'form-data';

const formData = new FormData();
formData.append('name', 'Updated NDA Template');
formData.append('mapping', JSON.stringify([{
  "signatures": [
    {
      "x": 50,
      "y": 720,
      "width": 100,
      "height": 70,
      "pageNo": 1,
      "isRequired": 1
    },
    {
      "x": 420,
      "y": 720,
      "width": 100,
      "height": 70,
      "pageNo": 1,
      "isRequired": 1
    }
  ]
}]));

const options = {
  method: 'PUT',
  url: 'https://stg-api2.doconchain.com/api/v2/templates/141',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    'content-type': 'multipart/form-data',
    authorization: 'Bearer YOUR_TOKEN_HERE',
    ...formData.getHeaders()
  },
  data: formData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "Template updated successfully",
  "data": {
    "id": 141,
    "name": "Updated NDA Template",
    "mapping": "[{\"signatures\":[{\"x\":50,\"y\":720,\"width\":100,\"height\":70,\"pageNo\":1,\"isRequired\":1},{\"x\":420,\"y\":720,\"width\":100,\"height\":70,\"pageNo\":1,\"isRequired\":1}]}]",
    "client_id": 12345,
    "path": "/templates/updated_nda_template_141.pdf",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-20T15:45:00Z"
  }
}
```

#### Mapping Format

The `mapping` parameter should follow the same JSON structure as template creation:

```json
[{
  "signatures": [
    {
      "x": 50,
      "y": 720,
      "width": 100,
      "height": 70,
      "pageNo": 1,
      "isRequired": 1
    }
  ],
  "initials": [
    {
      "x": 200,
      "y": 720,
      "width": 50,
      "height": 30,
      "pageNo": 1,
      "isRequired": 0
    }
  ]
}]
```

#### Use Cases

- **Field Repositioning**: Move signature fields to better locations
- **Template Refinement**: Improve field placement based on usage feedback
- **Name Updates**: Change template names for better organization
- **Field Addition**: Add new fields to existing templates
- **Field Removal**: Remove unnecessary fields from templates
- **Layout Optimization**: Optimize field layout for better user experience

#### Important Notes

- **Partial Updates**: Only include the parameters you want to update
- **Template Ownership**: Only templates owned by the authenticated user can be updated
- **Active Projects**: Changes may not affect projects already created from this template
- **Validation**: Field positions must be within document boundaries
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

---

### 16. Send Signature Request By Template

Create a signature request document directly from a template. This endpoint allows you to use an existing template with pre-defined fields and send it to recipients for signing.

**Endpoint**: `POST /api/v2/templates/signs`

**URL**: `https://stg-api2.doconchain.com/api/v2/templates/signs?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

**Body Parameters** (multipart/form-data):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `template_id` | string | Yes | The ID of the template to use |
| `email_address[0]` | string | Yes | Email address of the first recipient |
| `first_name[0]` | string | Yes | First name of the first recipient |
| `last_name[0]` | string | Yes | Last name of the first recipient |
| `middle_name[0]` | string | Optional | Middle name of the first recipient |
| `email_address[1]` | string | Optional | Email address of the second recipient |
| `first_name[1]` | string | Optional | First name of the second recipient |
| `last_name[1]` | string | Optional | Last name of the second recipient |
| `middle_name[1]` | string | Optional | Middle name of the second recipient |
| `email_address[2]` | string | Optional | Email address of the third recipient |
| `first_name[2]` | string | Optional | First name of the third recipient |
| `last_name[2]` | string | Optional | Last name of the third recipient |
| `middle_name[2]` | string | Optional | Middle name of the third recipient |
| `email_address[3]` | string | Optional | Email address of the fourth recipient |
| `first_name[3]` | string | Optional | First name of the fourth recipient |
| `last_name[3]` | string | Optional | Last name of the fourth recipient |
| `middle_name[3]` | string | Optional | Middle name of the fourth recipient |
| `email_sender` | string | Yes | Email address of the sender |
| `email_subject` | string | Yes | Subject of the email |
| `email_message` | string | Yes | Message to be included in the email |
| `project_description` | string | Optional | Description of the project |
| `project_setting[custom_completion_page]` | string | Optional | Custom completion page settings |
| `project_setting[custom_completion_page_color]` | string | Optional | Custom completion page color settings |
| `project_setting[vault_access]` | string | Optional | Vault access settings |
| `project_setting[sign_page_custom_branding]` | string | Optional | Sign page custom branding settings |

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "Signature request created successfully",
  "data": {
    "project": {
      "template_id": 0,
      "sender_id": 0,
      "uuid": "string",
      "reference_number": "string",
      "type": "string",
      "category": "string",
      "source": "string",
      "status": "string",
      "signatory_type": "string",
      "name": "string",
      "file_name": "string",
      "created_by": 0,
      "updated_by": 0,
      "email_sender": "string",
      "email_message": "string",
      "email_subject": "string",
      "description": "string",
      "created_at": "string",
      "updated_at": "string",
      "id": 0,
      "sent_at": "string"
    }
  }
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';
import FormData from 'form-data';

const formData = new FormData();
formData.append('template_id', '123');
formData.append('email_address[0]', 'john.doe@example.com');
formData.append('first_name[0]', 'John');
formData.append('last_name[0]', 'Doe');
formData.append('email_address[1]', 'jane.smith@example.com');
formData.append('first_name[1]', 'Jane');
formData.append('last_name[1]', 'Smith');
formData.append('email_sender', 'sender@company.com');
formData.append('email_subject', 'Please sign the NDA');
formData.append('email_message', 'Please review and sign the attached NDA document.');
formData.append('project_description', 'NDA for Q1 2024 project');

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/api/v2/templates/signs',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    'content-type': 'multipart/form-data',
    authorization: 'Bearer YOUR_TOKEN_HERE',
    ...formData.getHeaders()
  },
  data: formData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "Signature request created successfully",
  "data": {
    "project": {
      "template_id": 123,
      "sender_id": 456,
      "uuid": "proj-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "reference_number": "REF-2024-001",
      "type": "signature_request",
      "category": "legal",
      "source": "template",
      "status": "processing",
      "signatory_type": "multiple",
      "name": "NDA Template Project",
      "file_name": "nda_template.pdf",
      "created_by": 456,
      "updated_by": 456,
      "email_sender": "sender@company.com",
      "email_message": "Please review and sign the attached NDA document.",
      "email_subject": "Please sign the NDA",
      "description": "NDA for Q1 2024 project",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "id": 789,
      "sent_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

#### Recipient Array Format

Recipients are specified using array notation with indices [0], [1], [2], [3]:

- **Recipient 0**: `email_address[0]`, `first_name[0]`, `last_name[0]`, `middle_name[0]`
- **Recipient 1**: `email_address[1]`, `first_name[1]`, `last_name[1]`, `middle_name[1]`
- **Recipient 2**: `email_address[2]`, `first_name[2]`, `last_name[2]`, `middle_name[2]`
- **Recipient 3**: `email_address[3]`, `first_name[3]`, `last_name[3]`, `middle_name[3]`

#### Project Settings

| Setting | Description |
|---------|-------------|
| `custom_completion_page` | URL or content for custom completion page |
| `custom_completion_page_color` | Color scheme for completion page |
| `vault_access` | Access level for document vault |
| `sign_page_custom_branding` | Custom branding for signing pages |

#### Use Cases

- **Template-Based Workflows**: Use pre-configured templates for consistent document processing
- **Bulk Document Sending**: Send the same document type to multiple recipients
- **Standardized Processes**: Maintain consistent branding and field placement
- **Automated Workflows**: Integrate with business processes for automatic document generation
- **Compliance Documents**: Use approved templates for regulatory compliance

#### Important Notes

- **Template Ownership**: Only templates owned by the authenticated user can be used
- **Field Mapping**: Template fields are automatically mapped to recipients based on template configuration
- **Immediate Sending**: The document is sent immediately upon creation
- **Recipient Limit**: Supports up to 4 recipients per request
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Best Practices

- **Template Testing**: Test templates before using in production workflows
- **Recipient Validation**: Verify email addresses before sending
- **Message Customization**: Customize email messages for better recipient engagement
- **Branding Consistency**: Use consistent branding across all signature requests
- **Error Handling**: Implement proper error handling for failed requests

---

### 17. Delete Template

Delete a specific template for a user. This permanently removes the template and cannot be undone.

**Endpoint**: `DELETE /api/v2/templates/{templateId}`

**URL**: `https://stg-api2.doconchain.com/api/v2/templates/{templateId}?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `templateId` | string | Yes | The ID of the template to delete |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "Template deleted successfully"
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'DELETE',
  url: 'https://stg-api2.doconchain.com/api/v2/templates/123',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "Template deleted successfully"
}
```

#### Use Cases

- **Template Cleanup**: Remove outdated or unused templates
- **Storage Management**: Free up storage space
- **Error Correction**: Delete incorrectly created templates
- **Compliance**: Remove templates that no longer meet requirements
- **Data Management**: Clean up project database

#### Important Notes

- **Permanent Deletion**: This action permanently deletes the template and cannot be undone
- **User-Specific**: Only templates owned by the authenticated user can be deleted
- **Active Projects**: Templates currently in use by active projects may not be deletable
- **Single Template**: This endpoint deletes one template at a time (use bulk delete for multiple)
- **Required Parameters**: Both `templateId` path parameter and `user_type` query parameter are mandatory

#### Safety Considerations

- **Backup Important Data**: Save any important information before deletion
- **Verify Project**: Confirm the correct project UUID before deletion
- **Check Dependencies**: Ensure no other processes depend on this project
- **User Notification**: Inform relevant stakeholders before deletion

#### Error Responses

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authentication token"
  }
}
```

**404 Not Found**: Project not found or not accessible
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Project not found"
  }
}
```

**409 Conflict**: Template is in use by active projects
```json
{
  "error": {
    "code": "TEMPLATE_IN_USE",
    "message": "Cannot delete template that is currently in use"
  }
}
```

#### Best Practices

- **Verify Template ID**: Confirm the correct template ID before deletion
- **Check Dependencies**: Ensure no active projects depend on the template
- **Staging Test**: Test deletion process in staging environment first
- **Audit Trail**: Keep records of deleted templates for compliance
- **Bulk Operations**: Use bulk delete endpoint for multiple templates

---

### 18. Get All Project Signers

Retrieve a list of all users and their associated information in a specific active signature request document.

**Endpoint**: `GET /projects/{uuid}/signers`

**URL**: `https://stg-api2.doconchain.com/projects/{uuid}/signers?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The project identifier or UUID |

**Query Parameters**:

| Parameter | Type | Required | Description |
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "",
  "data": [
    {
      "id": 0,
      "project_id": 0,
      "client_id": 0,
      "email": "string",
      "first_name": "string",
      "last_name": "string",
      "photo": "string",
      "type": "string",
      "sequence": 0,
      "status": "string",
      "deliver_status": "string",
      "in_contact": true,
      "color_code": "string",
      "sent_at": null,
      "opened_at": null,
      "signed_at": null,
      "created_at": "string",
      "deleted_at": null,
      "signature": "string",
      "signature_source": "string",
      "initial": "string",
      "initial_source": "string",
      "marks": []
    }
  ],
  "meta": {}
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/projects/{{project-uuid}}/signers',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "Signers retrieved successfully",
  "data": [
    {
      "id": 12345,
      "project_id": 67890,
      "client_id": 111,
      "email": "john.doe@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "photo": "",
      "type": "GUEST",
      "sequence": 1,
      "status": "pending",
      "deliver_status": "sent",
      "in_contact": true,
      "color_code": "#FF5733",
      "sent_at": "2024-01-15T10:30:00Z",
      "opened_at": null,
      "signed_at": null,
      "created_at": "2024-01-15T10:30:00Z",
      "deleted_at": null,
      "signature": "",
      "signature_source": "",
      "initial": "",
      "initial_source": "",
      "marks": [
        {
          "id": 1001,
          "type": "signature",
          "position_x": 100,
          "position_y": 200,
          "width": 150,
          "height": 50,
          "page_no": 1
        }
      ]
    },
    {
      "id": 12346,
      "project_id": 67890,
      "client_id": 112,
      "email": "jane.smith@example.com",
      "first_name": "Jane",
      "last_name": "Smith",
      "photo": "",
      "type": "GUEST",
      "sequence": 2,
      "status": "completed",
      "deliver_status": "delivered",
      "in_contact": true,
      "color_code": "#33FF57",
      "sent_at": "2024-01-15T10:30:00Z",
      "opened_at": "2024-01-15T11:00:00Z",
      "signed_at": "2024-01-15T11:15:00Z",
      "created_at": "2024-01-15T10:30:00Z",
      "deleted_at": null,
      "signature": "base64_signature_data",
      "signature_source": "draw",
      "initial": "base64_initial_data",
      "initial_source": "type",
      "marks": [
        {
          "id": 1002,
          "type": "signature",
          "position_x": 400,
          "position_y": 200,
          "width": 150,
          "height": 50,
          "page_no": 1
        }
      ]
    }
  ],
  "meta": {}
}
```

#### Signer Information Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique signer ID |
| `project_id` | integer | ID of the associated project |
| `client_id` | integer | Client ID |
| `email` | string | Signer's email address |
| `first_name` | string | Signer's first name |
| `last_name` | string | Signer's last name |
| `photo` | string | URL to signer's photo |
| `type` | string | Signer type (GUEST, USER, etc.) |
| `sequence` | integer | Signing order sequence |
| `status` | string | Current status (pending, completed, etc.) |
| `deliver_status` | string | Email delivery status |
| `in_contact` | boolean | Whether signer is in contact |
| `color_code` | string | Unique color code for identification |
| `sent_at` | string/null | When invitation was sent |
| `opened_at` | string/null | When document was opened |
| `signed_at` | string/null | When document was signed |
| `signature` | string | Base64 encoded signature data |
| `signature_source` | string | How signature was created (draw, type, upload) |
| `initial` | string | Base64 encoded initial data |
| `initial_source` | string | How initial was created |
| `marks` | array | Array of signature fields assigned to this signer |

#### Signer Status Values

| Status | Description |
|--------|-------------|
| `pending` | Waiting for signer action |
| `opened` | Document has been opened |
| `completed` | Signing completed |
| `declined` | Signer declined to sign |
| `expired` | Signing deadline expired |

#### Use Cases

- **Project Monitoring**: Track signing progress across all signers
- **Status Dashboard**: Display current status of all participants
- **Workflow Management**: Understand signing sequence and completion status
- **Audit Trail**: Review signing history and timestamps
- **Field Mapping**: See which fields are assigned to each signer

#### Important Notes

- **Active Projects**: Only works with active signature request documents
- **Complete Information**: Returns comprehensive signer data including marks and timestamps
- **Sequence Order**: Signers are typically returned in sequence order
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

---

### 19. Get All Projects

Retrieve all active signature request documents that are still waiting for signature, approval, manual validation, or processing for completion. This endpoint provides comprehensive information about each document including file details, timestamps, and signer information.

**Endpoint**: `GET /api/v2/projects/processing/all-files`

**URL**: `https://stg-api2.doconchain.com/api/v2/projects/processing/all-files?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |
| `status` | string | Optional | Status of projects to retrieve (e.g., "Processing") |
| `user_items_only` | string | Optional | Include user items only ("yes" or "no") |
| `api_integrated_projects_only` | string | Optional | Include API integrated projects only ("yes" or "no") |

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "Project count retrieved successfully",
  "data": {
    "total_projects": 45,
    "active_projects": 12,
    "completed_projects": 28,
    "draft_projects": 3,
    "processing_projects": 2
  }
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/api/v2/projects/processing/all-files',
  params: {
    user_type: 'ENTERPRISE_API',
    status: 'Processing',
    user_items_only: 'no',
    api_integrated_projects_only: 'no'
  },
  headers: {
    accept: 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "Project count retrieved successfully",
  "data": {
    "total_projects": 45,
    "active_projects": 12,
    "completed_projects": 28,
    "draft_projects": 3,
    "processing_projects": 2
  }
}
```

#### Use Cases

- **Dashboard Metrics**: Display project statistics on dashboard
- **Performance Monitoring**: Track project completion rates
- **Workload Assessment**: Understand current workload
- **Reporting**: Generate summary reports
- **Quick Overview**: Get instant project status overview

#### Important Notes

- **User-Specific**: Returns counts only for the authenticated user's projects
- **Real-Time**: Provides current project counts
- **Lightweight**: Optimized for frequent polling without full data retrieval
- **Caching**: Suitable for client-side caching with appropriate refresh intervals
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

---

### 21. Get Specific Project

Retrieve detailed information about a specific signature request document. This endpoint provides comprehensive project data including file information, timestamps, sender details, and signer information.

**Endpoint**: `GET /my/projects/{uuid}`

**URL**: `https://stg-api2.doconchain.com/my/projects/{uuid}?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The project identifier or UUID |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "",
  "data": {
    "access_type": "string",
    "id": 0,
    "sender_id": 0,
    "uuid": "string",
    "reference_number": "string",
    "type": "string",
    "category": "string",
    "source": "string",
    "status": "string",
    "name": "string",
    "file_name": "string",
    "url": "string",
    "description": null,
    "signatory_type": "string",
    "validation_status": "string",
    "signer_mark_page": null,
    "signature_timestamp_label": "string",
    "email_sender": "string",
    "email_subject": "string",
    "email_message": "string",
    "meta_data": {
      "1": {
        "pageNumber": 0,
        "width": 0,
        "height": 0
      },
      "pages": 0
    },
    "files": [
      {
        "id": 0,
        "project_id": 0,
        "file_name": "string",
        "type": "string",
        "storage": "string",
        "path": "string",
        "url": "string",
        "created_by": "string",
        "created_at": "string"
      }
    ],
    "setting": [
      {
        "id": 0,
        "project_id": 0,
        "option_id": 0,
        "option_code": "string",
        "value": "string"
      }
    ],
    "signers": [
      {
        "id": 0,
        "project_id": 0,
        "client_id": 0,
        "email": "string",
        "first_name": "string",
        "last_name": "string",
        "photo": "string",
        "type": "string",
        "sequence": 0,
        "status": "string",
        "deliver_status": "string",
        "in_contact": true,
        "color_code": "string",
        "sent_at": null,
        "opened_at": null,
        "signed_at": null,
        "created_at": "string",
        "deleted_at": "string",
        "signature": "string",
        "signature_source": "string",
        "initial": "string",
        "initial_source": "string",
        "marks": []
      }
    ],
    "sender_details": {
      "id": 0,
      "client_id": 0,
      "email": "string",
      "first_name": "string",
      "last_name": "string",
      "photo": "string",
      "type": "string",
      "sequence": 0,
      "status": "string",
      "deliver_status": "string",
      "in_contact": "string",
      "sent_at": "string",
      "opened_at": "string",
      "signed_at": "string",
      "created_at": "string",
      "deleted_at": "string",
      "signature": "string",
      "signature_source": "string",
      "initial": "string",
      "initial_source": "string"
    },
    "active_signer_details": {
      "id": 0,
      "project_id": 0,
      "client_id": 0,
      "email": "string",
      "first_name": "string",
      "last_name": "string",
      "type": "string",
      "sequence": 0,
      "status": "string",
      "deliver_status": "string",
      "in_contact": true,
      "sent_at": "string",
      "opened_at": "string",
      "signed_at": "string",
      "created_at": "string",
      "deleted_at": "string",
      "signature": "string",
      "signature_source": "string",
      "initial": "string",
      "initial_source": "string",
      "marks": []
    },
    "actions": ["string"]
  },
  "meta": {}
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/my/projects/{{project-uuid}}',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "Project details retrieved successfully",
  "data": {
    "access_type": "string",
    "id": 0,
    "sender_id": 0,
    "uuid": "string",
    "reference_number": "string",
    "type": "string",
    "category": "string",
    "source": "string",
    "status": "string",
    "name": "string",
    "file_name": "string",
    "url": "string",
    "description": null,
    "signatory_type": "string",
    "validation_status": "string",
    "signer_mark_page": null,
    "signature_timestamp_label": "string",
    "email_sender": "string",
    "email_subject": "string",
    "email_message": "string",
    "meta_data": {
      "1": {
        "pageNumber": 0,
        "width": 0,
        "height": 0
      },
      "pages": 0
    },
    "files": [
      {
        "id": 0,
        "project_id": 0,
        "file_name": "string",
        "type": "string",
        "storage": "string",
        "path": "string",
        "url": "string",
        "created_by": "string",
        "created_at": "string"
      }
    ],
    "setting": [
      {
        "id": 0,
        "project_id": 0,
        "option_id": 0,
        "option_code": "string",
        "value": "string"
      }
    ],
    "signers": [
      {
        "id": 0,
        "project_id": 0,
        "client_id": 0,
        "email": "string",
        "first_name": "string",
        "last_name": "string",
        "photo": "string",
        "type": "string",
        "sequence": 0,
        "status": "string",
        "deliver_status": "string",
        "in_contact": true,
        "color_code": "string",
        "sent_at": "string",
        "opened_at": "string",
        "signed_at": "string",
        "created_at": "string",
        "deleted_at": "string",
        "signature": "string",
        "signature_source": "string",
        "initial": "string",
        "initial_source": "string",
        "marks": []
      }
    ],
    "sender_details": {
      "id": 0,
      "client_id": 0,
      "email": "string",
      "first_name": "string",
      "last_name": "string",
      "photo": "string",
      "type": "string",
      "sequence": 0,
      "status": "string",
      "deliver_status": "string",
      "in_contact": "string",
      "sent_at": "string",
      "opened_at": "string",
      "signed_at": "string",
      "created_at": "string",
      "deleted_at": "string",
      "signature": "string",
      "signature_source": "string",
      "initial": "string",
      "initial_source": "string"
    },
    "active_signer_details": {
      "id": 0,
      "project_id": 0,
      "client_id": 0,
      "email": "string",
      "first_name": "string",
      "last_name": "string",
      "type": "string",
      "sequence": 0,
      "status": "string",
      "deliver_status": "string",
      "in_contact": true,
      "sent_at": "string",
      "opened_at": "string",
      "signed_at": "string",
      "created_at": "string",
      "deleted_at": "string",
      "signature": "string",
      "signature_source": "string",
      "initial": "string",
      "initial_source": "string",
      "marks": []
    },
    "actions": ["string"]
  },
  "meta": {}
}
```

#### Project Data Structure

| Section | Description |
|---------|-------------|
| **Basic Info** | Project ID, UUID, name, status, type, category |
| **File Details** | File name, URL, storage information |
| **Email Settings** | Sender email, subject, message templates |
| **Reminder Settings** | Reminder configuration for signers |
| **Metadata** | Document pages, dimensions, timestamps |
| **Files Array** | All associated files with storage details |
| **Settings Array** | Project configuration options |
| **Signers Array** | Complete signer information and status |
| **Sender Details** | Information about the project sender |
| **Active Signer** | Current signer in the workflow |
| **Actions** | Available actions for the project |

#### Use Cases

- **Project Details View**: Display comprehensive project information
- **Status Tracking**: Monitor project progress and signer status
- **Document Management**: Access file information and URLs
- **Workflow Monitoring**: Track active signer and next steps
- **Audit Trail**: Review project history and timestamps

#### Important Notes

- **Complete Information**: Returns all available project data
- **User Access**: Only accessible to authorized users
- **Real-Time Data**: Provides current project status
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Error Responses

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authentication token"
  }
}
```

**404 Not Found**: Project not found or not accessible
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Project not found"
  }
}
```

---

### 22. Permanently Delete Project

Permanently remove a specific active signature request document. Once deleted, the project cannot be recovered or restored.

**Endpoint**: `DELETE /my/projects/{uuid}`

**URL**: `https://stg-api2.doconchain.com/my/projects/{uuid}?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The project identifier or UUID |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

**Body Parameters**: None required

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "Project deleted successfully"
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'DELETE',
  url: 'https://stg-api2.doconchain.com/my/projects/{{project-uuid}}',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "Project deleted successfully"
}
```

#### Use Cases

- **Project Cleanup**: Remove unwanted or obsolete projects
- **Storage Management**: Free up storage space
- **Error Correction**: Delete incorrectly created projects
- **Compliance**: Remove projects that no longer meet requirements
- **Data Management**: Clean up project database

#### Important Notes

- **Permanent Deletion**: This action cannot be undone
- **No Recovery**: Deleted projects cannot be restored
- **User Authorization**: Only authorized users can delete projects
- **Active Projects**: Consider project status before deletion
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Safety Considerations

- **Backup Important Data**: Save any important information before deletion
- **Verify Project**: Confirm the correct project UUID before deletion
- **Check Dependencies**: Ensure no other processes depend on this project
- **User Notification**: Inform relevant stakeholders before deletion

#### Error Responses

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authentication token"
  }
}
```

**404 Not Found**: Project not found or not accessible
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Project not found"
  }
}
```

---

### 23. Get All Project Properties/Marks

Retrieve a list of all the signature fields associated with a specific signature request document by providing the project identifier or UUID. This can include information such as the position, type, width and height, and other relevant attributes.

**Endpoint**: `GET /projects/{uuid}/properties`

**URL**: `https://stg-api2.doconchain.com/projects/{uuid}/properties?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The project identifier or UUID |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

#### Response

**Status**: `200 OK`

**Body**:
```json
{
    "message": "",
    "data": [
        {
            "id": 0,
            "project_id": 0,
            "signer_id": 0,
            "reference_number": "",
            "project_reference_number": "",
            "position_x": 0,
            "position_y": 0,
            "width": 0,
            "height": 0,
            "page_no": 0,
            "type": "",
            "value": "",
            "font_style": "",
            "font_size": 0,
            "attach": 0,
            "txn_hash": null,
            "attached_at": null,
            "created_at": ""
        }
    ],
    "meta": {}
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/projects/{uuid}/properties',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
    "message": "Properties retrieved successfully",
    "data": [
        {
            "id": 12345,
            "project_id": 67890,
            "signer_id": 111,
            "reference_number": "MARK-2024-001",
            "project_reference_number": "PROJ-2024-001",
            "position_x": 100,
            "position_y": 200,
            "width": 150,
            "height": 50,
            "page_no": 1,
            "type": "signature",
            "value": "",
            "font_style": "Arial",
            "font_size": 12,
            "attach": 0,
            "txn_hash": "",
            "attached_at": null,
            "created_at": "2024-01-15T10:30:00Z"
        },
        {
            "id": 12346,
            "project_id": 67890,
            "signer_id": 111,
            "reference_number": "MARK-2024-002",
            "project_reference_number": "PROJ-2024-001",
            "position_x": 300,
            "position_y": 200,
            "width": 50,
            "height": 30,
            "page_no": 1,
            "type": "initial",
            "value": "",
            "font_style": "Arial",
            "font_size": 10,
            "attach": 0,
            "txn_hash": "",
            "attached_at": null,
            "created_at": "2024-01-15T10:30:00Z"
        }
    ],
    "meta": {}
}
```

#### Field Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | integer | Unique identifier for the property/field |
| `project_id` | integer | ID of the associated project |
| `signer_id` | integer | ID of the signer this field belongs to |
| `reference_number` | string | Reference number for the field |
| `project_reference_number` | string | Project reference number |
| `position_x` | integer | X-coordinate position on the page |
| `position_y` | integer | Y-coordinate position on the page |
| `width` | integer | Width of the field in pixels |
| `height` | integer | Height of the field in pixels |
| `page_no` | integer | Page number where the field is located |
| `type` | string | Type of the field (signature, initial, text, etc.) |
| `value` | string | Current value of the field |
| `font_style` | string | Font style for text fields |
| `font_size` | integer | Font size for text fields |
| `attach` | integer | Attachment status |
| `txn_hash` | string/null | Transaction hash if attached to blockchain |
| `attached_at` | string/null | Timestamp when attached |
| `created_at` | string | Creation timestamp |

#### Use Cases

- **Signer Field Review**: Get all fields assigned to a specific signer
- **Field Management**: Review and manage fields for individual signers
- **Validation**: Verify field assignments for a particular signer
- **Workflow Analysis**: Analyze signing requirements for specific participants
- **Field Updates**: Prepare for updating fields for a signer

#### Important Notes

- **Signer-Specific**: Returns only fields associated with the specified signer
- **Project Context**: Fields are within the context of their project
- **Field Details**: Provides comprehensive field information
- **Blockchain Status**: Includes attachment status and transaction hashes
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

---

### 25. Resend to All Unsigned Signers

Resend an email reminder to all Signers and Approvers with a pending status (Awaiting Signature and Awaiting Approval), by providing the project identifier or UUID. If recipient order is enabled, they will only be sent a reminder if it's their turn to sign.

**Endpoint**: `POST /my/projects/{uuid}/resend`

**URL**: `https://stg-api2.doconchain.com/my/projects/{uuid}/resend?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The project identifier or UUID |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

**Body Parameters**: None required

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "string"
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/my/projects/{uuid}/resend',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "Reminder emails sent successfully to all pending signers"
}
```

#### Email Notification Behavior

| Signer Status | Email Sent | Description |
|---------------|------------|-------------|
| `Awaiting Signature` | Yes (if their turn) | Receives reminder to sign the document |
| `Awaiting Approval` | Yes (if their turn) | Receives reminder to approve the document |
| `Signed` | No | Already completed, no reminder needed |
| `Approved` | No | Already completed, no reminder needed |
| `Declined` | No | Action already taken |

#### Signing Order

- **Sequential Signing**: Only the current signer in the sequence receives the reminder
- **Parallel Signing**: All signers at the same sequence level receive reminders simultaneously
- **Completed Signers**: Signers who have already signed are not sent reminders
- **Order Enforcement**: Respects the defined signing workflow order

#### Use Cases

- **Follow-up Reminders**: Send reminders to signers who haven't acted yet
- **Workflow Acceleration**: Speed up document completion by reminding pending participants
- **Status Updates**: Notify signers of outstanding actions
- **Deadline Management**: Send reminders as deadlines approach
- **Process Monitoring**: Ensure documents don't get stuck in pending status

#### Important Notes

- **Pending Only**: Only sends to signers with pending status
- **Order Respect**: Honors signing sequence if recipient order is enabled
- **No Duplicates**: Won't send to signers who have already completed their actions
- **Email Delivery**: Uses the same email templates as initial sending
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Prerequisites

- **Project Status**: Project must be in 'Processing' status (already sent)
- **Pending Signers**: At least one signer must have pending status
- **Valid Emails**: All pending signers must have valid email addresses
- **User Permissions**: User must have permission to manage the project

#### Error Responses

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authentication token"
  }
}
```

**404 Not Found**: Project not found
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Project not found"
  }
}
```

**400 Bad Request**: Invalid project status or no pending signers
```json
{
  "error": {
    "code": "INVALID_STATUS",
    "message": "Project is not in processing status or no pending signers found"
  }
}
```

#### Best Practices

- **Timing**: Send reminders at appropriate intervals (e.g., 3 days, 1 week)
- **Frequency**: Avoid sending too many reminders to prevent spam
- **Status Monitoring**: Check project status before sending reminders
- **User Communication**: Consider including custom messages in reminders
- **Automation**: Set up automated reminder schedules for better workflow management

---

### 26. Move a Project into Trash

Transfer or move a specific active signature request document to trash by providing the project identifier or UUID of the document. This changes the active document's status to "Deleted", which means all the email links to this document will be inaccessible, while the document stays in the trash indefinitely. Documents with a "Deleted" status can be either restored or permanently deleted.

**Endpoint**: `PUT /my/projects/{uuid}/trash`

**URL**: `https://stg-api2.doconchain.com/my/projects/{uuid}/trash?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The project identifier or UUID |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

**Body Parameters**: None required

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "Project moved to trash successfully"
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'PUT',
  url: 'https://stg-api2.doconchain.com/my/projects/{uuid}/trash',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "Project moved to trash successfully"
}
```

#### Status Change Behavior

| Original Status | New Status | Description |
|-----------------|------------|-------------|
| `Draft` | `Deleted` | Draft project moved to trash |
| `Processing` | `Deleted` | Active project moved to trash |
| `Completed` | `Deleted` | Completed project moved to trash |
| `Expired` | `Deleted` | Expired project moved to trash |

#### Link Accessibility

- **Email Links**: All signing links become inaccessible
- **Portal Access**: Document remains visible in trash tab
- **Download Access**: May be restricted based on permissions
- **API Access**: Document still accessible via API for restore/delete operations

#### Recovery Options

| Action | Description | Endpoint |
|--------|-------------|----------|
| **Restore** | Move back to active status | `PUT /my/projects/{uuid}/restore` |
| **Permanent Delete** | Completely remove from system | `DELETE /my/projects/{uuid}` |

#### Use Cases

- **Project Cleanup**: Move unwanted or obsolete projects to trash
- **Workflow Management**: Temporarily remove projects from active view
- **Error Correction**: Delete incorrectly created projects
- **Space Management**: Clear active project list without permanent deletion
- **Archival**: Prepare projects for long-term storage

#### Important Notes

- **Reversible**: Projects can be restored from trash
- **Link Invalidation**: All email links become unusable immediately
- **Status Change**: Changes project status to "Deleted"
- **Indefinite Storage**: Documents remain in trash until manually deleted
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Prerequisites

- **Project Exists**: The project must be active and accessible
- **User Permissions**: User must have permission to modify the project
- **Valid Status**: Project should not already be in trash

#### Error Responses

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authentication token"
  }
}
```

**404 Not Found**: Project not found or not accessible
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Project not found"
  }
}
```

**409 Conflict**: Project already in trash
```json
{
  "error": {
    "code": "ALREADY_TRASHED",
    "message": "Project is already in trash"
  }
}
```

#### Best Practices

- **Confirmation**: Confirm project details before moving to trash
- **Backup Important Data**: Ensure important information is preserved
- **User Notification**: Inform stakeholders before trashing projects
- **Regular Cleanup**: Periodically review and permanently delete old trash items
- **Audit Trail**: Keep records of trashed projects for compliance

#### Security Considerations

- **Link Invalidation**: Prevents unauthorized access via old email links
- **Data Preservation**: Maintains document integrity during trash period
- **Access Control**: Respects user permissions for trash operations
- **Audit Logging**: Logs all trash operations for security tracking

---

### 27. Validate Guest Signer

Validate and authenticate a Guest Signer who is invited to sign the active signature request document via email. This verifies the identity and email address of the Guest Signer before they can proceed with the signing process, by providing the project identifier or UUID and the Guest's email address.

**Endpoint**: `POST /guest-signers/projects/{uuid}/validate`

**URL**: `https://stg-api2.doconchain.com/guest-signers/projects/{uuid}/validate?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
Content-Type: application/json
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The project identifier or UUID |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

**Body Parameters** (JSON):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | The email address of the guest signer to be validated |

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "status": "string",
  "message": "string"
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/guest-signers/projects/{uuid}/validate',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  },
  data: {
    email: 'guest@example.com'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response (Valid Guest)

```json
{
  "status": "valid",
  "message": "Guest signer validated successfully"
}
```

#### Example Response (Invalid Guest)

```json
{
  "status": "invalid",
  "message": "Guest signer not found or not authorized for this project"
}
```

#### Validation Process

| Validation Step | Description |
|-----------------|-------------|
| **Email Verification** | Checks if the email is associated with the project |
| **Guest Status** | Confirms the signer is a guest (not registered user) |
| **Project Access** | Verifies the guest has access to the specific project |
| **Status Check** | Ensures the guest hasn't already completed signing |

#### Guest Signer Types

| Type | Description |
|------|-------------|
| **Invited Guest** | External signer invited via email |
| **Anonymous Guest** | Signer without account registration |
| **One-time Guest** | Single-use signer for specific document |

#### Use Cases

- **Pre-signing Validation**: Verify guest identity before allowing access to signing page
- **Email Confirmation**: Confirm the correct email was used for invitation
- **Access Control**: Ensure only authorized guests can access the document
- **Workflow Security**: Prevent unauthorized access to sensitive documents
- **Audit Trail**: Log validation attempts for compliance

#### Important Notes

- **Guest-Only**: This endpoint is specifically for guest signers, not registered users
- **Email Required**: Validation requires the exact email address used in invitation
- **Project-Specific**: Validation is tied to a specific project UUID
- **One-time Use**: Typically used once per signing session
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Prerequisites

- **Project Exists**: The project must be active and accessible
- **Guest Invited**: The email must have been used to invite a guest signer
- **Valid Email**: The email address must be properly formatted
- **Not Completed**: The guest should not have already signed the document

#### Error Responses

**400 Bad Request**: Invalid email format or missing parameters
```json
{
  "status": "error",
  "message": "Invalid email address or missing required parameters"
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "status": "error",
  "message": "Invalid authentication token"
}
```

**404 Not Found**: Project not found or guest not associated with project
```json
{
  "status": "invalid",
  "message": "Project not found or guest signer not associated with this project"
}
```

**409 Conflict**: Guest has already signed or validation expired
```json
{
  "status": "expired",
  "message": "Guest signer has already completed signing or validation has expired"
}
```

#### Best Practices

- **Email Validation**: Always validate email format before submission
- **Error Handling**: Implement proper error handling for different validation states
- **Security**: Use HTTPS for all validation requests
- **Rate Limiting**: Implement rate limiting to prevent abuse
- **Logging**: Log validation attempts for security monitoring

#### Security Considerations

- **Identity Verification**: Ensure guest identity is properly validated
- **Access Control**: Strict permissions for signing operations
- **Data Integrity**: Protect document integrity during signing
- **Blockchain Security**: Secure blockchain recording of signatures
- **Audit Trail**: Comprehensive logging of signing activities

---

### 28. Guest Signer Upload Marks

Allow setting up a field for a Guest Signer in a document, by providing the project identifier or UUID, along with the Guest's email address, source, type (Signature or Initials), and the file to be uploaded as the Guest's signature or initials.

**Endpoint**: `PUT /guest-signers/projects/{uuid}/upload-marks`

**URL**: `https://stg-api2.doconchain.com/guest-signers/projects/{uuid}/upload-marks?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
Content-Type: multipart/form-data
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The project identifier or UUID |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

**Body Parameters** (multipart/form-data):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | The email address of the guest signer |
| `source` | string | Yes | The source of the signature mark |
| `type` | string | Yes | The type of signature mark ("signature" or "initials") |
| `file` | file | Yes | The file containing the signature mark (image file) |

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "Signature mark uploaded successfully",
  "data": {
    "mark_id": 0,
    "project_id": 0,
    "signer_id": 0,
    "type": "string",
    "file_url": "string",
    "uploaded_at": "string"
  }
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const formData = new FormData();
formData.append('email', 'guest@example.com');
formData.append('source', 'upload');
formData.append('type', 'signature');
formData.append('file', fs.createReadStream('/path/to/signature.png'));

const options = {
  method: 'PUT',
  url: 'https://stg-api2.doconchain.com/guest-signers/projects/{uuid}/upload-marks',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE',
    ...formData.getHeaders()
  },
  data: formData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "Signature mark uploaded successfully",
  "data": {
    "mark_id": 12345,
    "project_id": 67890,
    "signer_id": 111,
    "type": "signature",
    "file_url": "https://doconchain.com/marks/signature_12345.png",
    "uploaded_at": "2024-01-15T10:30:00Z"
  }
}
```

#### Supported File Types

| File Type | Description | Max Size |
|-----------|-------------|----------|
| `PNG` | Portable Network Graphics | 5MB |
| `JPG/JPEG` | Joint Photographic Experts Group | 5MB |
| `GIF` | Graphics Interchange Format | 5MB |
| `SVG` | Scalable Vector Graphics | 2MB |

#### Mark Types

| Type | Description | Use Case |
|------|-------------|----------|
| `signature` | Full signature image | Legal document signing |
| `initials` | Initials/monogram image | Document acknowledgment |

#### Source Types

| Source | Description |
|--------|-------------|
| `upload` | Manually uploaded by guest |
| `draw` | Drawn on device |
| `type` | Typed text signature |
| `mobile` | Captured from mobile device |

#### Use Cases

- **Guest Signature Upload**: Allow external signers to upload their signatures
- **Initial Setup**: Enable guests to provide their initials for documents
- **Custom Branding**: Upload company signatures or logos
- **Accessibility**: Provide alternative to drawing signatures
- **Document Completion**: Enable guests to complete signing process

#### Important Notes

- **Guest-Only**: This endpoint is specifically for guest signers
- **File Validation**: Only accepts supported image formats
- **Size Limits**: Files must not exceed maximum size limits
- **Security**: Uploaded files are validated for malicious content
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Prerequisites

- **Guest Validation**: Guest must be validated first using the validate endpoint
- **Project Access**: Guest must have access to the specific project
- **Supported Format**: File must be in a supported image format
- **Size Compliance**: File size must be within allowed limits

#### File Processing

- **Validation**: Files are scanned for security threats
- **Optimization**: Images may be optimized for document embedding
- **Storage**: Secure storage with access controls
- **Blockchain**: May be recorded on blockchain for immutability

#### Error Responses

**400 Bad Request**: Invalid file format, size, or missing parameters
```json
{
  "message": "Invalid file format or parameters"
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "message": "Invalid authentication token"
}
```

**404 Not Found**: Project or guest not found
```json
{
  "message": "Project or guest signer not found"
}
```

**413 Payload Too Large**: File size exceeds limits
```json
{
  "message": "File size exceeds maximum allowed limit"
}
```

**415 Unsupported Media Type**: File type not supported
```json
{
  "message": "Unsupported file type"
}
```

#### Best Practices

- **File Validation**: Always validate file types and sizes before upload
- **User Guidance**: Provide clear instructions for supported formats
- **Progress Indication**: Show upload progress for large files
- **Error Handling**: Handle upload failures gracefully
- **Security**: Use HTTPS and validate file contents

#### Security Considerations

- **File Scanning**: All uploads are scanned for malware
- **Access Control**: Strict permissions for file access
- **Storage Encryption**: Files encrypted at rest
- **Audit Logging**: All upload activities are logged
- **Data Privacy**: Guest data protected according to privacy regulations

---

### 29. Sign Signature Request

Trigger the signing of a signature request document by a Signer in the active signature request document, by providing the project identifier or UUID, along with the Signer's email address. Once the document is signed, it updates the Signer's status to "Signed" and updates the document status and signature properties accordingly.

**Endpoint**: `POST /guest-signers/projects/{uuid}/sign`

**URL**: `https://stg-api2.doconchain.com/guest-signers/projects/{uuid}/sign?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
Content-Type: application/json
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The project identifier or UUID |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

**Body Parameters** (JSON):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | The email address of the signer |

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "string",
  "data": {
    "project_id": 0,
    "signer_id": 0,
    "signer_email": "string",
    "status": "string",
    "signed_at": "string",
    "document_status": "string",
    "transaction_hash": "string"
  }
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/guest-signers/projects/{uuid}/sign',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  },
  data: {
    email: 'guest@example.com'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "Document signed successfully",
  "data": {
    "project_id": 67890,
    "signer_id": 111,
    "signer_email": "guest@example.com",
    "status": "signed",
    "signed_at": "2024-01-15T10:30:00Z",
    "document_status": "processing",
    "transaction_hash": "0x1234567890abcdef1234567890abcdef12345678"
  }
}
```

#### Signing Process Flow

| Step | Description | Status Update |
|------|-------------|---------------|
| **Validation** | Verify signer identity and permissions | N/A |
| **Signature Application** | Apply signature to document fields | Signer: "Signed" |
| **Document Update** | Update document with signature data | Document: Status change |
| **Blockchain Recording** | Record signature on blockchain | Transaction hash generated |
| **Notification** | Send completion notifications | Next signer notified |

#### Status Transitions

| Signer Status Before | Signer Status After | Document Impact |
|----------------------|---------------------|-----------------|
| `Awaiting Signature` | `Signed` | May advance to next signer |
| `Awaiting Approval` | `Signed` | Approval recorded |
| `Pending` | `Signed` | Workflow continues |

#### Document Status Changes

| Scenario | Document Status Change | Description |
|----------|------------------------|-------------|
| **Partial Completion** | Remains "Processing" | More signers needed |
| **Final Signature** | Changes to "Completed" | All required signatures obtained |
| **Approval Required** | Remains "Processing" | Waiting for approvals |

#### Use Cases

- **Guest Signing**: Allow external signers to complete document signing
- **Workflow Completion**: Enable the final step in signature workflows
- **Legal Compliance**: Record legally binding signatures
- **Document Finalization**: Complete pending signature requests
- **Audit Trail**: Create immutable signature records

#### Important Notes

- **Guest-Only**: This endpoint is specifically for guest signers
- **Status Update**: Automatically updates signer and document status
- **Blockchain Integration**: Signatures are recorded on blockchain
- **Workflow Continuation**: May trigger notifications to next signers
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Prerequisites

- **Guest Validation**: Guest must be validated and authorized
- **Project Access**: Guest must have access to the project
- **Fields Ready**: Signature fields must be properly configured
- **Signing Order**: Must be the guest's turn if sequential signing

#### Signature Properties Updated

- **Field Values**: Signature marks are applied to document fields
- **Timestamps**: Signing time is recorded
- **Blockchain Hash**: Transaction hash for immutability
- **Status Flags**: Completion status updated
- **Audit Logs**: Signing activity logged

#### Error Responses

**400 Bad Request**: Invalid email or missing parameters
```json
{
  "message": "Invalid email address or missing required parameters"
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "message": "Invalid authentication token"
}
```

**403 Forbidden**: Guest not authorized to sign this document
```json
{
  "message": "Guest signer not authorized for this project"
}
```

**404 Not Found**: Project or guest not found
```json
{
  "message": "Project or guest signer not found"
}
```

**409 Conflict**: Document already signed or signing not allowed
```json
{
  "message": "Document already signed by this guest or signing not currently allowed"
}
```

#### Best Practices

- **Validation First**: Always validate guest before allowing signing
- **Order Respect**: Ensure signing order is followed
- **Error Handling**: Implement comprehensive error handling
- **User Feedback**: Provide clear success/failure messages
- **Audit Logging**: Log all signing attempts for compliance

#### Security Considerations

- **Identity Verification**: Ensure guest identity is properly validated
- **Access Control**: Strict permissions for signing operations
- **Data Integrity**: Protect document integrity during signing
- **Blockchain Security**: Secure blockchain recording of signatures
- **Audit Trail**: Comprehensive logging of signing activities

---

### 30. Get Passport Document

Get the Passport details of a specific document by providing the project identifier or UUID and the view (history, blockchain, user_data, verifiable_presentation, certificate_url) which indicates what Passport section you wish to retrieve.

The Passport includes the document's audit trail (signature, approval, and view timestamps, and more), necessary user data, and blockchain hash per document action / event.

**Endpoint**: `GET /api/v2/projects/{uuid}/passport`

**URL**: `https://stg-api2.doconchain.com/api/v2/projects/{uuid}/passport?user_type=ENTERPRISE_API&view=blockchain`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The unique identifier of the project |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |
| `view` | string | Yes | The passport view type: `history`, `blockchain`, `user_data`, `verifiable_presentation`, `certificate_url` |

#### Response

**Status**: `200 OK`

**Body**: Varies based on the `view` parameter

#### View Types and Responses

##### History View (`view=history`)

Returns the audit trail of all document actions and events.

```json
{
  "message": "Passport history retrieved successfully",
  "data": {
    "project_id": 0,
    "project_uuid": "string",
    "history": [
      {
        "id": 0,
        "action": "string",
        "actor_email": "string",
        "actor_name": "string",
        "timestamp": "string",
        "ip_address": "string",
        "user_agent": "string",
        "transaction_hash": "string"
      }
    ]
  }
}
```

##### Blockchain View (`view=blockchain`)

Returns blockchain hashes for all document actions and events.

```json
{
  "message": "Passport blockchain data retrieved successfully",
  "data": {
    "project_id": 0,
    "project_uuid": "string",
    "blockchain": [
      {
        "action": "string",
        "transaction_hash": "string",
        "block_number": 0,
        "timestamp": "string",
        "gas_used": 0,
        "status": "string"
      }
    ]
  }
}
```

##### User Data View (`view=user_data`)

Returns user information for all participants in the document.

```json
{
  "message": "Passport user data retrieved successfully",
  "data": {
    "project_id": 0,
    "project_uuid": "string",
    "users": [
      {
        "user_id": 0,
        "email": "string",
        "first_name": "string",
        "last_name": "string",
        "role": "string",
        "signed_at": "string",
        "ip_address": "string"
      }
    ]
  }
}
```

##### Verifiable Presentation View (`view=verifiable_presentation`)

Returns W3C Verifiable Presentation data for the document.

```json
{
  "message": "Passport verifiable presentation retrieved successfully",
  "data": {
    "project_id": 0,
    "project_uuid": "string",
    "verifiable_presentation": {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      "type": ["VerifiablePresentation"],
      "verifiableCredential": [
        {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          "type": ["VerifiableCredential"],
          "issuer": "string",
          "issuanceDate": "string",
          "credentialSubject": {
            "id": "string",
            "documentHash": "string",
            "signatures": []
          },
          "proof": {
            "type": "string",
            "created": "string",
            "proofPurpose": "string",
            "verificationMethod": "string",
            "jws": "string"
          }
        }
      ]
    }
  }
}
```

##### Certificate URL View (`view=certificate_url`)

Returns URLs for downloadable certificates and proofs.

```json
{
  "message": "Passport certificate URLs retrieved successfully",
  "data": {
    "project_id": 0,
    "project_uuid": "string",
    "certificates": {
      "completion_certificate": "string",
      "blockchain_certificate": "string",
      "verifiable_credential": "string",
      "audit_trail_pdf": "string"
    }
  }
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/api/v2/projects/{uuid}/passport',
  params: {
    user_type: 'ENTERPRISE_API',
    view: 'blockchain'
  },
  headers: {
    accept: 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response (Blockchain View)

```json
{
  "message": "Passport blockchain data retrieved successfully",
  "data": {
    "project_id": 67890,
    "project_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "blockchain": [
      {
        "action": "document_created",
        "transaction_hash": "0x1234567890abcdef1234567890abcdef12345678",
        "block_number": 18500000,
        "timestamp": "2024-01-15T10:00:00Z",
        "gas_used": 21000,
        "status": "confirmed"
      },
      {
        "action": "signature_applied",
        "transaction_hash": "0xabcdef1234567890abcdef1234567890abcdef12",
        "block_number": 18500001,
        "timestamp": "2024-01-15T10:30:00Z",
        "gas_used": 25000,
        "status": "confirmed"
      }
    ]
  }
}
```

#### Passport Components

| Component | Description | Views |
|-----------|-------------|-------|
| **Audit Trail** | Complete history of document actions | `history` |
| **Blockchain Records** | Immutable transaction records | `blockchain` |
| **User Information** | Participant details and roles | `user_data` |
| **Verifiable Credentials** | W3C compliant credentials | `verifiable_presentation` |
| **Certificates** | Downloadable proof documents | `certificate_url` |

#### Use Cases

- **Compliance Auditing**: Review complete document history for regulatory compliance
- **Legal Verification**: Verify document authenticity and signatures
- **Blockchain Validation**: Confirm transactions on the blockchain
- **User Tracking**: Monitor participant activities and timestamps
- **Certificate Generation**: Access downloadable proof documents

#### Important Notes

- **View Required**: The `view` parameter is mandatory to specify what data to retrieve
- **Project Access**: User must have access to the project to view its passport
- **Blockchain Integration**: All actions are recorded immutably on blockchain
- **Verifiable Credentials**: Supports W3C Verifiable Credentials standard
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Prerequisites

- **Project Completion**: Document should be in completed or processing status
- **User Permissions**: User must have permission to access project data
- **Valid View**: View parameter must be one of the supported types

#### Error Responses

**400 Bad Request**: Invalid view parameter or missing required parameters
```json
{
  "message": "Invalid view parameter or missing required parameters"
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "message": "Invalid authentication token"
}
```

**403 Forbidden**: User does not have permission to access project passport
```json
{
  "message": "Access denied to project passport"
}
```

**404 Not Found**: Project not found
```json
{
  "message": "Project not found"
}
```

#### Best Practices

- **View Selection**: Choose the most appropriate view for your needs
- **Caching**: Cache passport data appropriately based on update frequency
- **Error Handling**: Implement proper error handling for access issues
- **Action Completion**: Use action URLs to complete notification requirements
- **Status Updates**: Check status changes after actions are taken

#### Security Considerations

- **Access Control**: Strict permissions for passport data access
- **Data Privacy**: Protect sensitive notification content
- **Audit Logging**: Log all notification access attempts
- **Token Security**: Secure authentication token handling

---

### 31. Get All Notifications

Retrieve all notifications for the authenticated user, including document signing requests, status updates, reminders, and system notifications.

**Endpoint**: `GET /api/v2/notifications`

**URL**: `https://stg-api2.doconchain.com/api/v2/notifications?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "Notifications retrieved successfully",
  "data": [
    {
      "id": 0,
      "type": "string",
      "title": "string",
      "message": "string",
      "project_id": 0,
      "project_uuid": "string",
      "project_name": "string",
      "sender_email": "string",
      "recipient_email": "string",
      "status": "string",
      "priority": "string",
      "created_at": "string",
      "read_at": "string",
      "action_url": "string"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/api/v2/notifications',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "Notifications retrieved successfully",
  "data": [
    {
      "id": 12345,
      "type": "signature_request",
      "title": "Document Requires Your Signature",
      "message": "Please review and sign the NDA document",
      "project_id": 67890,
      "project_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "project_name": "NDA Agreement Q1 2024",
      "sender_email": "legal@company.com",
      "recipient_email": "john.doe@example.com",
      "status": "unread",
      "priority": "high",
      "created_at": "2024-01-15T10:00:00Z",
      "read_at": null,
      "action_url": "https://doconchain.com/sign/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "metadata": {
        "due_date": "2024-01-20T23:59:59Z",
        "reminder_count": 2,
        "last_action": "reminder_sent"
      }
    },
    {
      "id": 12346,
      "type": "status_update",
      "title": "Document Completed",
      "message": "The contract has been fully signed by all parties",
      "project_id": 67891,
      "project_uuid": "b2c3d4e5-f6g7-8901-bcde-f23456789012",
      "project_name": "Service Contract 2024",
      "sender_email": "system@doconchain.com",
      "recipient_email": "john.doe@example.com",
      "status": "unread",
      "priority": "medium",
      "created_at": "2024-01-15T11:30:00Z",
      "read_at": null,
      "action_url": "https://doconchain.com/projects/b2c3d4e5-f6g7-8901-bcde-f23456789012",
      "metadata": {
        "completion_date": "2024-01-15T11:15:00Z",
        "signer_count": 2
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

#### Notification Types

| Type | Description | Example |
|------|-------------|---------|
| `signature_request` | Request for user to sign a document | "Please sign the contract" |
| `status_update` | Document status has changed | "Document completed" |
| `reminder` | Reminder to complete pending action | "Don't forget to sign" |
| `approval_request` | Request for document approval | "Please approve this document" |
| `system_alert` | System-generated notification | "Account security update" |
| `completion_notice` | Document fully completed | "All signatures received" |

#### Notification Status

| Status | Description |
|--------|-------------|
| `unread` | Notification not yet viewed by user |
| `read` | Notification has been viewed |
| `archived` | Notification moved to archive |

#### Priority Levels

| Priority | Description | Color Code |
|----------|-------------|------------|
| `low` | General information | Green |
| `medium` | Important updates | Yellow |
| `high` | Urgent action required | Red |
| `critical` | Immediate attention needed | Red/Flashing |

#### Use Cases

- **Inbox Management**: View all pending notifications in one place
- **Task Tracking**: Monitor documents requiring user action
- **Status Monitoring**: Stay updated on document progress
- **Workflow Monitoring**: Track signing and approval workflows
- **Communication Hub**: Centralized notification system

#### Important Notes

- **User-Specific**: Returns only notifications for the authenticated user
- **Real-time Updates**: Notifications are delivered in real-time
- **Action URLs**: Each notification includes relevant action URLs
- **Pagination**: Large result sets are paginated
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Prerequisites

- **Authentication**: User must be authenticated
- **Valid Token**: Authentication token must be valid
- **Active Account**: User account must be active

#### Error Responses

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authentication token"
  }
}
```

**403 Forbidden**: User account is inactive or suspended
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "User account is not active"
  }
}
```

#### Best Practices

- **Regular Checking**: Check notifications regularly for pending actions
- **Priority Handling**: Address high-priority notifications first
- **Action Completion**: Use action URLs to complete required tasks
- **Archive Management**: Archive read notifications to keep inbox clean
- **Mobile Access**: Access notifications on mobile devices

#### Security Considerations

- **User Isolation**: Notifications are strictly user-specific
- **No Sensitive Data**: Only returns aggregate counts, no notification content
- **Access Logging**: All count requests are logged for security monitoring
- **Rate Limiting**: Implement appropriate rate limiting for polling

---

### 32. Get Specific Notification

Retrieve detailed information about a specific notification by providing the notification ID.

**Endpoint**: `GET /notifications/{notification_id}`

**URL**: `https://stg-api2.doconchain.com/notifications/{notification_id}?user_type=ENTERPRISE_API`

#### Request



**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `notification_id` | string | Yes | The unique identifier of the notification |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "Notification retrieved successfully",
  "data": {
    "id": 0,
    "type": "string",
    "title": "string",
    "message": "string",
    "project_id": 0,
    "project_uuid": "string",
    "project_name": "string",
    "sender_email": "string",
    "recipient_email": "string",
    "status": "string",
    "priority": "string",
    "created_at": "string",
    "read_at": "string",
    "action_url": "string",
    "metadata": {
      "due_date": "string",
      "reminder_count": 0,
      "last_action": "string"
    }
  }
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/notifications/{notification_id}',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "Notification retrieved successfully",
  "data": {
    "id": 12345,
    "type": "signature_request",
    "title": "Document Requires Your Signature",
    "message": "Please review and sign the NDA document. This document is due for completion by January 20, 2024.",
    "project_id": 67890,
    "project_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "project_name": "NDA Agreement Q1 2024",
    "sender_email": "legal@company.com",
    "recipient_email": "john.doe@example.com",
    "status": "unread",
    "priority": "high",
    "created_at": "2024-01-15T10:00:00Z",
    "read_at": null,
    "action_url": "https://doconchain.com/sign/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "metadata": {
      "due_date": "2024-01-20T23:59:59Z",
      "reminder_count": 2,
      "last_action": "reminder_sent"
    }
  }
}
```

#### Notification Metadata

| Field | Type | Description |
|-------|------|-------------|
| `due_date` | string | Deadline for completing the notification action |
| `reminder_count` | integer | Number of reminder notifications sent |
| `last_action` | string | Most recent action taken on the notification |

#### Use Cases

- **Notification Details**: Get complete information about a specific notification
- **Action Context**: Understand what action is required and how to complete it
- **Status Tracking**: Monitor the status and history of specific notifications
- **Priority Assessment**: Evaluate notification importance and urgency
- **Workflow Integration**: Integrate notification details into external systems

#### Important Notes

- **Ownership Check**: User can only access their own notifications
- **Detailed View**: Provides more information than the list endpoint
- **Metadata Included**: Contains additional context and tracking information
- **Action URLs**: Direct links to complete required actions
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Prerequisites

- **Authentication**: User must be authenticated
- **Notification Ownership**: Notification must belong to the authenticated user
- **Valid ID**: Notification ID must exist and be accessible

#### Error Responses

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authentication token"
  }
}
```

**403 Forbidden**: Notification does not belong to the authenticated user
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to this notification"
  }
}
```

**404 Not Found**: Notification not found
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Notification not found"
  }
}
```

#### Best Practices

- **ID Validation**: Ensure notification ID is valid before making requests
- **Caching**: Cache notification details appropriately
- **Error Handling**: Implement proper error handling for access issues
- **Action Completion**: Use action URLs to complete notification requirements
- **Status Updates**: Check status changes after actions are taken

#### Security Considerations

- **Access Control**: Strict ownership validation for notifications
- **Data Privacy**: Protect sensitive notification content
- **Audit Logging**: Log all notification access attempts
- **Token Security**: Secure authentication token handling

---

### 33. Get Notification Count

Retrieve the count of notifications for the authenticated user, including breakdowns by status, type, and priority levels.

**Endpoint**: `GET /api/v2/notifications/count`

**URL**: `https://stg-api2.doconchain.com/api/v2/notifications/count?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "Notification count retrieved successfully",
  "data": {
    "total": 0,
    "unread": 0,
    "read": 0,
    "by_type": {
      "signature_request": 0,
      "status_update": 0,
      "reminder": 0,
      "approval_request": 0,
      "system_alert": 0,
      "completion_notice": 0
    },
    "by_priority": {
      "low": 0,
      "medium": 0,
      "high": 0,
      "critical": 0
    },
    "by_status": {
      "unread": 0,
      "read": 0,
      "archived": 0
    }
  }
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/api/v2/notifications/count',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "Notification count retrieved successfully",
  "data": {
    "total": 45,
    "unread": 12,
    "read": 30,
    "by_type": {
      "signature_request": 8,
      "status_update": 15,
      "reminder": 5,
      "approval_request": 3,
      "system_alert": 2,
      "completion_notice": 12
    },
    "by_priority": {
      "low": 20,
      "medium": 15,
      "high": 8,
      "critical": 2
    },
    "by_status": {
      "unread": 12,
      "read": 30,
      "archived": 3
    }
  }
}
```

#### Count Categories

| Category | Description |
|----------|-------------|
| **Total** | All notifications regardless of status |
| **Unread** | Notifications not yet viewed |
| **Read** | Notifications that have been viewed |
| **By Type** | Breakdown by notification type |
| **By Priority** | Breakdown by priority level |
| **By Status** | Breakdown by read status |

#### Use Cases

- **Dashboard Indicators**: Display notification counts on dashboard
- **Badge Updates**: Update notification badges in UI applications
- **Priority Assessment**: Quickly identify high-priority notifications
- **Workflow Monitoring**: Monitor pending actions and tasks
- **Performance Metrics**: Track notification engagement rates

#### Important Notes

- **Real-time Data**: Counts reflect current notification state
- **User-Specific**: Returns counts only for the authenticated user
- **Lightweight**: Optimized for frequent polling without full data retrieval
- **Caching**: Suitable for client-side caching with appropriate refresh intervals
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Prerequisites

- **Authentication**: User must be authenticated
- **Valid Token**: Authentication token must be valid
- **Active Account**: User account must be active

#### Error Responses

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authentication token"
  }
}
```

**403 Forbidden**: User account is inactive or suspended
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "User account is not active"
  }
}
```

#### Best Practices

- **Polling Frequency**: Use appropriate polling intervals (e.g., every 30 seconds)
- **Caching Strategy**: Cache counts on client-side with short TTL
- **UI Updates**: Update UI badges and indicators based on count changes
- **Performance**: Use this endpoint instead of full notification lists for counts
- **Error Handling**: Gracefully handle authentication errors

#### Security Considerations

- **User Isolation**: Counts are strictly user-specific
- **No Sensitive Data**: Only returns aggregate counts, no notification content
- **Access Logging**: All count requests are logged for security monitoring
- **Rate Limiting**: Implement appropriate rate limiting for polling

---

### 34. Update a Notification

Update the status of a specific notification, such as marking it as read or unread.

**Endpoint**: `PUT /notifications/{notification_id}`

**URL**: `https://stg-api2.doconchain.com/notifications/{notification_id}?user_type=ENTERPRISE_API&read=1`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
Content-Type: application/json
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `notification_id` | string | Yes | The unique identifier of the notification |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |
| `read` | integer | Yes | Mark as read (1) or unread (0) |

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "Notification updated successfully",
  "data": {
    "id": 0,
    "status": "string",
    "read_at": "string",
    "updated_at": "string"
  }
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'PUT',
  url: 'https://stg-api2.doconchain.com/notifications/{notification_id}',
  params: {
    user_type: 'ENTERPRISE_API',
    read: 1
  },
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "Notification updated successfully",
  "data": {
    "id": 12345,
    "status": "read",
    "read_at": "2024-01-15T14:30:00Z",
    "updated_at": "2024-01-15T14:30:00Z"
  }
}
```

#### Update Operations

| Operation | Query Parameter | Description |
|-----------|----------------|-------------|
| **Mark as Read** | `read=1` | Mark notification as read, set read_at timestamp |
| **Mark as Unread** | `read=0` | Mark notification as unread, clear read_at timestamp |

#### Status Transitions

| Current Status | Operation | New Status | Effect |
|----------------|-----------|------------|--------|
| `unread` | Mark as Read | `read` | Sets read_at timestamp |
| `read` | Mark as Unread | `unread` | Clears read_at timestamp |

#### Use Cases

- **Inbox Management**: Mark notifications as read after viewing
- **Bulk Operations**: Update multiple notifications programmatically
- **Status Tracking**: Maintain accurate read/unread counts
- **User Experience**: Provide read/unread indicators in UI
- **Workflow Management**: Track notification engagement

#### Important Notes

- **Ownership Check**: User can only update their own notifications
- **Single Operation**: Each request updates one notification
- **Timestamp Tracking**: Read operations are timestamped
- **Status Persistence**: Status changes are permanent until updated again
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Prerequisites

- **Authentication**: User must be authenticated
- **Notification Ownership**: Notification must belong to the authenticated user
- **Valid ID**: Notification ID must exist and be accessible

#### Error Responses

**400 Bad Request**: Invalid read parameter value
```json
{
  "message": "Invalid read parameter. Must be 0 or 1"
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "message": "Invalid authentication token"
}
```

**403 Forbidden**: Notification does not belong to the authenticated user
```json
{
  "message": "Access denied to this notification"
}
```

**404 Not Found**: Notification not found
```json
{
  "message": "Notification not found"
}
```

#### Best Practices

- **Batch Updates**: Consider using bulk update endpoints for multiple notifications
- **UI Feedback**: Provide immediate visual feedback after status updates
- **Optimistic Updates**: Update UI immediately, then sync with server
- **Error Handling**: Handle cases where no notifications exist to update
- **Status Consistency**: Keep local state synchronized with server state

#### Security Considerations

- **Access Control**: Strict ownership validation for notification updates
- **Audit Logging**: Log all notification status changes
- **Data Integrity**: Ensure status changes are atomic and consistent
- **Rate Limiting**: Implement rate limiting for update operations

---

### 35. Update All Notifications

Mark all notifications for the authenticated user as read.

**Endpoint**: `PUT /notifications/read/all`

**URL**: `https://stg-api2.doconchain.com/notifications/read/all?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
Content-Type: application/json
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "All notifications marked as read successfully",
  "data": {
    "updated_count": 0,
    "total_notifications": 0,
    "updated_at": "string"
  }
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'PUT',
  url: 'https://stg-api2.doconchain.com/notifications/read/all',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "All notifications marked as read successfully",
  "data": {
    "updated_count": 12,
    "total_notifications": 45,
    "updated_at": "2024-01-15T14:30:00Z"
  }
}
```

#### Operation Details

| Action | Description | Effect |
|--------|-------------|--------|
| **Mark All Read** | Updates all unread notifications to read status | Sets read_at timestamps for all previously unread notifications |

#### Use Cases

- **Inbox Cleanup**: Clear all unread notifications at once
- **Bulk Actions**: Perform mass read operations for better organization
- **UI Reset**: Reset notification badges and indicators
- **Maintenance**: Periodic cleanup of notification status
- **User Preference**: Allow users to mark everything as read

#### Important Notes

- **Irreversible**: This action marks all notifications as read
- **User-Specific**: Only affects notifications for the authenticated user
- **Performance**: Optimized for bulk operations
- **Audit Trail**: All updates are logged
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Prerequisites

- **Authentication**: User must be authenticated
- **Active Account**: User account must be active
- **Notifications Exist**: User must have notifications to update

#### Error Responses

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "message": "Invalid authentication token"
}
```

**403 Forbidden**: User account is inactive or suspended
```json
{
  "message": "User account is not active"
}
```

#### Best Practices

- **Confirmation**: Consider requiring user confirmation for bulk operations
- **UI Updates**: Update all notification indicators after successful operation
- **Performance**: Use this endpoint for bulk operations instead of individual updates
- **Error Handling**: Handle cases where no notifications exist to update

#### Security Considerations

- **User Isolation**: Operations are strictly user-specific
- **Audit Logging**: All bulk operations are logged for compliance
- **Rate Limiting**: Implement rate limiting to prevent abuse

---

### 36. Delete a Notification

Delete a specific notification for the authenticated user.

**Endpoint**: `DELETE /notifications/{notification_id}`

**URL**: `https://stg-api2.doconchain.com/notifications/{notification_id}?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `notification_id` | string | Yes | The unique identifier of the notification |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "Notification deleted successfully"
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'DELETE',
  url: 'https://stg-api2.doconchain.com/notifications/{notification_id}',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "Notification deleted successfully"
}
```

#### Deletion Behavior

| Notification Status | Deletion Effect | Recovery |
|---------------------|-----------------|----------|
| **Read** | Permanently removed | No recovery |
| **Unread** | Permanently removed | No recovery |
| **Archived** | Permanently removed | No recovery |

#### Use Cases

- **Inbox Management**: Remove unwanted or completed notifications
- **Space Management**: Clean up notification storage
- **Privacy**: Remove sensitive notification content
- **Organization**: Maintain clean notification lists
- **Maintenance**: Remove outdated or irrelevant notifications

#### Important Notes

- **Permanent Deletion**: Deleted notifications cannot be recovered
- **Ownership Check**: User can only delete their own notifications
- **Audit Trail**: Deletion events are logged
- **Cascade Effects**: May affect notification counts and statistics
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Prerequisites

- **Authentication**: User must be authenticated
- **Notification Ownership**: Notification must belong to the authenticated user
- **Valid ID**: Notification ID must exist and be accessible

#### Error Responses

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "message": "Invalid authentication token"
}
```

**403 Forbidden**: Notification does not belong to the authenticated user
```json
{
  "message": "Access denied to this notification"
}
```

**404 Not Found**: Notification not found
```json
{
  "message": "Notification not found"
}
```

#### Best Practices

- **Confirmation**: Require user confirmation before deletion
- **Bulk Operations**: Use bulk delete for multiple notifications
- **UI Updates**: Update notification counts and lists after deletion
- **Error Handling**: Handle deletion failures gracefully
- **Audit Compliance**: Maintain deletion logs for compliance

#### Security Considerations

- **Access Control**: Strict ownership validation for deletions
- **Data Privacy**: Ensure complete removal of sensitive data
- **Audit Logging**: Comprehensive logging of deletion operations
- **Rate Limiting**: Prevent abuse through comprehensive rate limiting

---

### 37. Delete All Notifications

Delete all notifications for the authenticated user.

**Endpoint**: `DELETE /notifications/delete/all`

**URL**: `https://stg-api2.doconchain.com/notifications/delete/all?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "All notifications deleted successfully",
  "data": {
    "deleted_count": 0,
    "total_deleted": 0
  }
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'DELETE',
  url: 'https://stg-api2.doconchain.com/notifications/delete/all',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    authorization: 'Bearer YOUR_TOKEN_HERE'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "All notifications deleted successfully",
  "data": {
    "deleted_count": 45,
    "total_deleted": 45
  }
}
```

#### Deletion Scope

| Notification Type | Included in Deletion | Notes |
|-------------------|----------------------|-------|
| **All Types** | Yes | signature_request, status_update, reminder, etc. |
| **All Statuses** | Yes | read, unread, archived |
| **All Priorities** | Yes | low, medium, high, critical |

#### Use Cases

- **Complete Cleanup**: Clear entire notification history
- **Privacy Reset**: Remove all notification data for privacy
- **Account Maintenance**: Clean slate for new notification management
- **Storage Optimization**: Free up notification storage space
- **System Reset**: Start fresh with notification management

#### Important Notes

- **Permanent Deletion**: All notifications are permanently removed
- **No Recovery**: Deleted notifications cannot be restored
- **Complete Wipe**: Affects all notification types and statuses
- **User-Specific**: Only affects the authenticated user's notifications
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Prerequisites

- **Authentication**: User must be authenticated
- **Active Account**: User account must be active
- **Confirmation**: Consider requiring explicit user confirmation

#### Error Responses

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "message": "Invalid authentication token"
}
```

**403 Forbidden**: User account is inactive or suspended
```json
{
  "message": "User account is not active"
}
```

#### Best Practices

- **Confirmation Required**: Always require explicit user confirmation
- **Backup Consideration**: Inform users that data cannot be recovered
- **UI Reset**: Clear all notification UI elements after deletion
- **Audit Trail**: Maintain comprehensive deletion logs
- **Rate Limiting**: Implement strict rate limiting for destructive operations

#### Security Considerations

- **User Isolation**: Operations are strictly user-specific
- **Data Privacy**: Complete removal of all user notification data
- **Audit Logging**: Detailed logging of bulk deletion operations
- **Confirmation**: Require strong user confirmation for destructive actions
- **Rate Limiting**: Prevent abuse through comprehensive rate limiting

---

### 38. Get Projects In Vault

Retrieve Completed Signature Request Projects. This endpoint retrieves all completed signature request documents, with options to filter results by API-integrated projects only.

**Endpoint**: `GET /vault/items`

**URL**: `https://stg-api2.doconchain.com/vault/items?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Specifies the type of user, e.g., ENTERPRISE_API |
| `per_page` | integer | Optional | Specifies the number of items to include per page |
| `page` | integer | Optional | Specifies the page number for pagination |
| `user_items_only` | string | Optional | Indicates whether to include only user items (yes/no) |
| `api_integrated_projects_only` | string | Optional | Indicates whether to include only API integrated projects (yes/no) |

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "type": "object",
  "properties": {
    "message": {"type": "string"},
    "data": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {"type": "integer"},
          "uuid": {"type": "string"},
          "client_id": {"type": "integer"},
          "category_id": {"type": "integer"},
          "project_uuid": {"type": "string"},
          "category_type": {"type": "string"},
          "signatory_type": {"type": "string"},
          "name": {"type": "string"},
          "size": {"type": "string"},
          "status": {"type": "string"},
          "created_at": {"type": "string"},
          "actions": {
            "type": "array",
            "items": {"type": "string"}
          },
          "contents": {
            "type": "array",
            "items": {}
          }
        }
      }
    },
    "meta": {
      "type": "object",
      "properties": {
        "total": {"type": "integer"},
        "per_page": {"type": "integer"},
        "first_page": {"type": "integer"},
        "last_page": {"type": "integer"},
        "current_page": {"type": "integer"}
      }
    }
  }
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/vault/items',
  headers: {accept: 'application/json', authorization: 'Bearer sample-token'}
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "Vault items retrieved successfully",
  "data": [
    {
      "id": 12345,
      "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "client_id": 67890,
      "category_id": 1,
      "project_uuid": "p1q2r3s4-t5u6-7890-abcd-ef1234567890",
      "category_type": "document",
      "signatory_type": "multiple",
      "name": "Service Agreement 2024.pdf",
      "size": "2.5MB",
      "status": "completed",
      "created_at": "2024-01-15T10:00:00Z",
      "actions": ["download", "view", "share"],
      "contents": [
        {
          "type": "pdf",
          "url": "https://doconchain.com/vault/files/12345.pdf",
          "thumbnail": "https://doconchain.com/vault/thumbnails/12345.jpg"
        }
      ]
    }
  ],
  "meta": {
    "total": 150,
    "per_page": 20,
    "first_page": 1,
    "last_page": 8,
    "current_page": 1
  }
}
```

#### Project Data Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique vault item identifier |
| `uuid` | string | Vault item UUID |
| `client_id` | integer | Associated client ID |
| `category_id` | integer | Document category ID |
| `project_uuid` | string | Original project UUID |
| `category_type` | string | Type of document category |
| `signatory_type` | string | Type of signatory (single/multiple) |
| `name` | string | Document name with extension |
| `size` | string | File size (e.g., "2.5MB") |
| `status` | string | Completion status |
| `created_at` | string | Vault storage timestamp |
| `actions` | array | Available actions for the item |
| `contents` | array | File content information |

#### Filtering Options

| Parameter | Values | Description |
|-----------|--------|-------------|
| `user_items_only` | `yes`, `no` | Filter to user's own items only |
| `api_integrated_projects_only` | `yes`, `no` | Show only API-integrated projects |

#### Pagination

| Field | Description |
|-------|-------------|
| `total` | Total number of vault items |
| `per_page` | Items per page |
| `current_page` | Current page number |
| `first_page` | First page number (usually 1) |
| `last_page` | Last page number |

#### Use Cases

- **Document Archive**: Access completed signed documents
- **Vault Management**: Browse and manage stored documents
- **Download Access**: Retrieve completed documents for external use
- **Status Verification**: Confirm document completion status
- **API Integration**: Access documents created via API

#### Important Notes

- **Completed Only**: Returns only fully completed signature requests
- **Vault Storage**: Documents are stored securely in the vault
- **Access Control**: User permissions determine accessible documents
- **Pagination**: Large result sets are paginated
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Permissions**: User must have vault access permissions
- **Completed Projects**: Only completed projects appear in vault

#### Error Responses

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authentication token"
  }
}
```

**403 Forbidden**: User does not have vault access permissions
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to vault"
  }
}
```

#### Best Practices

- **Pagination**: Use pagination for large document sets
- **Filtering**: Apply filters to narrow down results
- **Caching**: Cache vault data appropriately
- **Download Management**: Handle large file downloads carefully
- **Access Logging**: Monitor vault access for security

#### Security Considerations

- **Access Control**: Strict permissions for vault access
- **Data Encryption**: Documents encrypted at rest
- **Audit Logging**: All vault access attempts logged
- **Token Security**: Secure authentication token handling
- **File Integrity**: Verify document integrity on access

---

### 39. Get Project Count In Vault

Retrieve Vault Item Count. This endpoint gets the number of completed signature request documents under a specific user account.

**Endpoint**: `GET /vault/items/count`

**URL**: `https://stg-api2.doconchain.com/vault/items/count?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Specifies the type of user for which the vault items count is to be retrieved. Example: ENTERPRISE_API |

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "Vault items count retrieved successfully",
  "data": {
    "count": 150
  }
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/vault/items/count',
  headers: {accept: 'application/json', authorization: 'Bearer sample-token'}
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "Vault items count retrieved successfully",
  "data": {
    "count": 150
  }
}
```

#### Count Data

| Field | Type | Description |
|-------|------|-------------|
| `count` | integer | Total number of completed vault items for the user |

#### Use Cases

- **Dashboard Metrics**: Display vault item counts on user dashboards
- **Storage Monitoring**: Monitor document storage usage
- **Progress Tracking**: Track completion rates for signature requests
- **Reporting**: Generate reports on completed documents
- **Quota Management**: Check against storage limits

#### Important Notes

- **Completed Only**: Counts only fully completed signature requests
- **User-Specific**: Returns count for the authenticated user only
- **Real-time Data**: Provides current count of vault items
- **No Pagination**: Returns total count without pagination details
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Permissions**: User must have vault access permissions
- **Active Account**: User account must be active

#### Error Responses

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authentication token"
  }
}
```

**403 Forbidden**: User does not have vault access permissions
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to vault"
  }
}
```

#### Best Practices

- **Caching**: Cache count data with appropriate refresh intervals
- **Polling Frequency**: Use reasonable polling intervals to avoid rate limits
- **UI Updates**: Update count displays in real-time or near real-time
- **Error Handling**: Handle authentication errors gracefully
- **Performance**: Use this endpoint for counts instead of full item lists

#### Security Considerations

- **User Isolation**: Counts are strictly user-specific
- **Access Logging**: All count requests are logged for security monitoring
- **Rate Limiting**: Implement appropriate rate limiting for polling
- **Data Privacy**: No sensitive document data is exposed in count responses

---

### 40. Get Specific Project In Vault

Retrieve a specific completed signature request document and all its associated details by providing the project identifier or UUID.

**Endpoint**: `GET /vault/items/{uuid}`

**URL**: `https://stg-api2.doconchain.com/vault/items/{uuid}?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The unique identifier of the vault item |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

**Body Parameters**: None required

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "Vault item retrieved successfully",
  "data": {
    "id": 0,
    "uuid": "string",
    "sender_id": 0,
    "project_uuid": "string",
    "reference_number": "string",
    "type": "string",
    "category": "string",
    "source": "string",
    "status": "string",
    "name": "string",
    "file_name": "string",
    "url": "string",
    "description": "string",
    "signatory_type": "string",
    "meta_data": {},
    "created_by": 0,
    "updated_by": 0,
    "sent_at": "string",
    "completed_at": "string",
    "created_at": "string",
    "deleted_at": "string",
    "files": [],
    "setting": {},
    "signers": [],
    "sender_details": {}
  },
  "meta": {}
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/vault/items/{uuid}',
  headers: {accept: 'application/json', authorization: 'Bearer sample-token'}
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Example Response

```json
{
  "message": "Vault item retrieved successfully",
  "data": {
    "id": 12345,
    "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "sender_id": 67890,
    "project_uuid": "p1q2r3s4-t5u6-7890-abcd-ef1234567890",
    "reference_number": "VAULT-2024-001",
    "type": "signature_request",
    "category": "legal",
    "source": "api",
    "status": "completed",
    "name": "Service Agreement 2024.pdf",
    "file_name": "service_agreement_2024.pdf",
    "url": "https://doconchain.com/vault/files/12345.pdf",
    "description": "Legal service agreement for 2024",
    "signatory_type": "multiple",
    "meta_data": {
      "page_count": 5,
      "file_size": "2.3MB",
      "hash": "abc123..."
    },
    "created_by": 67890,
    "updated_by": 67890,
    "sent_at": "2024-01-15T10:00:00Z",
    "completed_at": "2024-01-16T14:30:00Z",
    "created_at": "2024-01-15T09:00:00Z",
    "deleted_at": null,
    "files": [
      {
        "id": 12345,
        "name": "service_agreement_2024.pdf",
        "url": "https://doconchain.com/vault/files/12345.pdf",
        "size": "2.3MB",
        "type": "pdf"
      }
    ],
    "setting": {
      "custom_completion_page": false,
      "vault_access": true,
      "reminders_enabled": true
    },
    "signers": [
      {
        "id": 111,
        "email": "signer1@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "status": "signed",
        "signed_at": "2024-01-16T10:00:00Z"
      }
    ],
    "sender_details": {
      "id": 67890,
      "email": "sender@company.com",
      "first_name": "Jane",
      "last_name": "Smith",
      "company": "ABC Corp"
    }
  },
  "meta": {}
}
```

#### Vault Item Data Structure

| Section | Description |
|---------|-------------|
| **Basic Info** | ID, UUID, project UUID, reference number |
| **Document Details** | Type, category, source, status, name, file info |
| **Timestamps** | Created, sent, completed, deleted timestamps |
| **Metadata** | Additional document metadata and settings |
| **Files** | Associated file information and URLs |
| **Signers** | List of signers with their details and status |
| **Sender** | Information about the document sender |

#### Use Cases

- **Document Details**: View complete information about a specific vault item
- **Status Verification**: Confirm completion status and timestamps
- **File Access**: Access document files and download URLs
- **Audit Trail**: Review signer information and completion details
- **Integration**: Retrieve specific document data for external systems

#### Important Notes

- **Completed Only**: Only completed signature requests are available in vault
- **User Access**: User must have permission to access the specific vault item
- **Detailed Response**: Returns comprehensive project information
- **File URLs**: Provides secure URLs for document access
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Permissions**: User must have access to the specific vault item
- **Valid UUID**: The vault item UUID must exist and be accessible
- **Completed Status**: Item must be in completed status

#### Error Responses

**400 Bad Request**: Invalid UUID format or missing parameters
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid vault item UUID"
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authentication token"
  }
}
```

**404 Not Found**: Vault item not found or not accessible
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Vault item not found"
  }
}
```

#### Best Practices

- **UUID Validation**: Ensure UUID is valid before making requests
- **Caching**: Cache vault item data appropriately
- **Error Handling**: Implement proper error handling for access issues
- **File Downloads**: Handle large file downloads carefully
- **Access Logging**: Monitor vault item access for security

#### Security Considerations

- **Access Control**: Strict permissions for vault item access
- **Data Privacy**: Protect sensitive document and signer information
- **Audit Logging**: All vault item access attempts logged
- **Token Security**: Secure authentication token handling
- **File Security**: Secure file URLs and access controls

---

### 41. Download Completed Project

Retrieve Document Download. This endpoint downloads a specific completed signature request document by providing the project identifier or UUID. The downloaded file will bear the name of the completed document.

**Endpoint**: `GET /vault/items/{uuid}/download`

**URL**: `https://stg-api2.doconchain.com/vault/items/{uuid}/download?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The unique identifier of the vault item to download |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

**Body Parameters**: None required

#### Response

**Status**: `200 OK`

**Body**: Binary file content (the downloaded document)

The response contains the completed document file with the appropriate filename.

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/vault/items/{uuid}/download',
  headers: {accept: 'application/json', authorization: 'Bearer sample-token'}
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### File Download Handling

For actual file downloads in a browser or application, you may need to handle the response differently:

```javascript
// Example for downloading and saving the file
axios({
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/vault/items/{uuid}/download',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  },
  params: {
    user_type: 'ENTERPRISE_API'
  },
  responseType: 'blob' // Important for file downloads
})
.then(response => {
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'document.pdf'); // Set appropriate filename
  document.body.appendChild(link);
  link.click();
  link.remove();
})
.catch(err => console.error(err));
```

#### Use Cases

- **Document Retrieval**: Download completed signed documents for records
- **File Sharing**: Share completed documents with external parties
- **Backup**: Create local backups of completed documents
- **Archival**: Store completed documents in external systems
- **Compliance**: Maintain copies of legally binding documents

#### Important Notes

- **Completed Only**: Only completed documents can be downloaded from vault
- **File Format**: Downloads the original document with signatures applied
- **Filename**: The downloaded file uses the document's original name
- **Binary Response**: Response contains binary file data, not JSON
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Permissions**: User must have download permissions for the vault item
- **Valid UUID**: The vault item UUID must exist and be accessible
- **Completed Status**: Document must be in completed status

#### Error Responses

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authentication token"
  }
}
```

**404 Not Found**: Vault item not found or not accessible
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Vault item not found"
  }
}
```

#### Best Practices

- **File Handling**: Use appropriate responseType for binary downloads
- **Progress Indication**: Show download progress for large files
- **Error Handling**: Handle network errors and authentication failures
- **Storage**: Implement proper local file storage and naming
- **Security**: Validate downloaded files before opening

#### Security Considerations

- **Access Control**: Strict permissions for document downloads
- **File Integrity**: Ensure downloaded files are not tampered with
- **Audit Logging**: All download attempts are logged
- **Token Security**: Secure authentication token handling
- **Content Validation**: Verify file content after download

---

### 42. Move File To Trash

Update or Move Document to Trash. This endpoint transfers or moves a specific completed signature request document to trash by providing the project identifier or UUID of the document.

**Important Note**: If the completed document has multiple recipients, and the document is moved to trash only on one recipient (e.g. only on creator side), this would not move the completed document into trash on the side of the other recipients.

**Endpoint**: `PUT /api/v2/vault/item/{uuid}/trash`

**URL**: `https://stg-api2.doconchain.com/api/v2/vault/item/{uuid}/trash?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The unique identifier of the vault item to move to trash |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

**Body Parameters**: None required

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "Document moved to trash successfully"
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'PUT',
  url: 'https://stg-api2.doconchain.com/api/v2/vault/item/{uuid}/trash',
  headers: {accept: 'application/json', authorization: 'Bearer sample-token'}
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Trash Behavior

| Action | Effect | Visibility |
|--------|--------|------------|
| **Move to Trash** | Document status changes to "trashed" | Hidden from active vault view |
| **User-Specific** | Only affects current user's view | Other recipients still see document |
| **Recoverable** | Can be restored from trash | Document remains accessible |

#### Use Cases

- **Document Cleanup**: Remove unwanted completed documents from view
- **Organization**: Keep vault organized by archiving old documents
- **Privacy**: Hide sensitive documents from active listings
- **Workflow Management**: Clear completed tasks from active dashboard
- **Space Management**: Manage vault storage visibility

#### Important Notes

- **User-Specific Action**: Only moves the document to trash for the current user
- **Multi-Recipient Impact**: Does not affect other recipients' views of the document
- **Reversible**: Documents can be restored from trash if needed
- **Status Change**: Changes document status to "trashed" in user's vault
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Permissions**: User must have trash permissions for the vault item
- **Valid UUID**: The vault item UUID must exist and be accessible
- **Completed Status**: Document must be in completed status

#### Error Responses

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authentication token"
  }
}
```

**404 Not Found**: Vault item not found or not accessible
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Vault item not found"
  }
}
```

**409 Conflict**: Document already in trash
```json
{
  "error": {
    "code": "ALREADY_TRASHED",
    "message": "Document is already in trash"
  }
}
```

#### Best Practices

- **Confirmation**: Confirm before moving documents to trash
- **Bulk Operations**: Consider bulk trash operations for multiple documents
- **Restore Access**: Keep track of trashed documents for potential restore
- **Regular Cleanup**: Periodically review and permanently delete old trash items
- **User Communication**: Inform team members about trashed documents

#### Security Considerations

- **Access Control**: Strict permissions for trash operations
- **Audit Logging**: All trash operations are logged for compliance
- **Data Integrity**: Ensure trash operations don't affect document integrity
- **User Isolation**: Trash actions are user-specific and isolated
- **Recovery Options**: Provide secure restore functionality

---

### 43. Permanently Delete Document

Delete Document. This endpoint permanently deletes a completed document on DOC Vault from a specific user.

**Important Note**: If the completed document has multiple recipients, and the document gets permanently deleted only on one recipient (e.g. only on creator side), this would not delete the completed document from the rest of the recipients' side. All the recipients of the document must have their copy of the document permanently deleted to completely delete the document from the DOCONCHAIN system.

**Endpoint**: `DELETE /api/v2/vault/items/{uuid}`

**URL**: `https://stg-api2.doconchain.com/api/v2/vault/items/{uuid}?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The unique identifier of the document to be deleted |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Specifies the type of user as `ENTERPRISE_API` |

**Body Parameters**: None required

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "Document permanently deleted successfully"
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'DELETE',
  url: 'https://stg-api2.doconchain.com/api/v2/vault/items/{uuid}',
  headers: {accept: 'application/json', authorization: 'Bearer sample-token'}
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Deletion Behavior

| Action | Scope | System Impact |
|--------|-------|---------------|
| **Permanent Delete** | User-specific | Document removed from user's vault |
| **Multi-Recipient** | Requires all recipients to delete | Complete system removal only when all delete |
| **Irreversible** | Cannot be undone | Document permanently lost for that user |
| **Blockchain Impact** | May affect local records | Original blockchain signatures preserved |

#### Use Cases

- **Complete Removal**: Permanently remove documents no longer needed
- **Compliance**: Delete documents per regulatory requirements
- **Storage Management**: Free up vault storage space
- **Privacy**: Remove sensitive documents permanently
- **Data Cleanup**: Clean up obsolete or duplicate documents

#### Important Notes

- **User-Specific Deletion**: Only removes the document from the current user's vault
- **Multi-Recipient Requirement**: All recipients must delete their copies for complete removal
- **Irreversible Action**: Permanent deletion cannot be undone
- **Blockchain Preservation**: Original signed document remains on blockchain
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Permissions**: User must have delete permissions for the vault item
- **Valid UUID**: The vault item UUID must exist and be accessible
- **Completed Status**: Document should be in completed status
- **Confirmation**: Consider requiring explicit user confirmation

#### Error Responses

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authentication token"
  }
}
```

**404 Not Found**: Vault item not found or not accessible
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Vault item not found"
  }
}
```

**409 Conflict**: Document cannot be deleted (e.g., still in use)
```json
{
  "error": {
    "code": "CANNOT_DELETE",
    "message": "Document cannot be deleted at this time"
  }
}
```

#### Best Practices

- **Confirmation Required**: Always require explicit user confirmation
- **Backup Important Data**: Ensure important information is preserved elsewhere
- **Multi-User Coordination**: Coordinate with all recipients for complete deletion
- **Audit Trail**: Maintain records of permanent deletions
- **Compliance**: Follow data retention and deletion policies

#### Security Considerations

- **Access Control**: Strict permissions for permanent deletion
- **Audit Logging**: All deletion operations logged for compliance
- **Data Privacy**: Complete removal of user-specific document data
- **Irreversibility**: Prevent accidental permanent deletions
- **Multi-Party Verification**: Ensure all parties agree to deletion

---

### 44. Rename Folder Or Subfolder

Update Vault Item Name. This endpoint updates a specific DOC Vault folder or subfolder's name, by providing its ID.

**Endpoint**: `PUT /api/v2/vault/items/{uuid}`

**URL**: `https://stg-api2.doconchain.com/api/v2/vault/items/{uuid}?name={new_name}&user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The unique identifier of the vault item (folder/subfolder) |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | The new name for the vault item |
| `user_type` | string | Yes | The user type, for example, `ENTERPRISE_API` |

**Body Parameters**: None required

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "Vault item renamed successfully",
  "data": {
    "uuid": "string",
    "name": "string",
    "updated_at": "string"
  }
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'PUT',
  url: 'https://stg-api2.doconchain.com/api/v2/vault/items/{uuid}',
  params: {
    name: 'New Folder Name',
    user_type: 'ENTERPRISE_API'
  },
  headers: {accept: 'application/json', authorization: 'Bearer sample-token'}
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Naming Guidelines

| Rule | Description | Example |
|------|-------------|---------|
| **Length Limit** | Maximum 255 characters | "Legal Contracts 2024" |
| **Allowed Characters** | Alphanumeric, spaces, hyphens, underscores | "Q1-Reports_2024" |
| **Special Characters** | Avoid special symbols except - and _ | No: @#$%, Yes: "Client-Files" |
| **Uniqueness** | Names should be unique within parent folder | "Contracts" vs "Legal Contracts" |

#### Use Cases

- **Organization**: Rename folders for better organization
- **Clarity**: Update names to reflect current content or purpose
- **Rebranding**: Change names due to company rebranding
- **Project Updates**: Rename folders as projects evolve
- **User Preferences**: Customize folder names for personal workflow

#### Important Notes

- **Folder/Subfolder Only**: This endpoint is for renaming folders, not documents
- **User Permissions**: User must have rename permissions for the folder
- **Name Validation**: New name must meet naming guidelines
- **Path Impact**: Renaming may affect folder paths and references
- **Required Parameters**: Both `name` and `user_type` query parameters are mandatory

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Permissions**: User must have rename permissions for the vault folder
- **Valid UUID**: The folder UUID must exist and be accessible
- **Valid Name**: New name must comply with naming rules
- **Ownership**: User must own or have edit access to the folder

#### Error Responses

**400 Bad Request**: Invalid name or missing required parameters
```json
{
  "error": {
    "code": "INVALID_NAME",
    "message": "Invalid folder name or missing required parameters"
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authentication token"
  }
}
```

**403 Forbidden**: User does not have rename permissions
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions to rename folder"
  }
}
```

**404 Not Found**: Folder not found or not accessible
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Folder not found"
  }
}
```

**409 Conflict**: Name already exists or folder cannot be renamed
```json
{
  "error": {
    "code": "NAME_CONFLICT",
    "message": "A folder with this name already exists"
  }
}
```

#### Best Practices

- **Descriptive Names**: Use clear, descriptive folder names
- **Consistent Naming**: Follow consistent naming conventions
- **Version Control**: Consider version numbers for project folders
- **User Communication**: Inform team members of folder renames
- **Audit Trail**: Keep records of folder name changes

#### Security Considerations

- **Access Control**: Strict permissions for folder rename operations
- **Audit Logging**: All rename operations logged for compliance
- **Data Integrity**: Ensure rename doesn't break folder references
- **User Isolation**: Rename actions respect user permissions
- **Validation**: Prevent malicious or inappropriate folder names

---

### 45. Restore Document

This endpoint restores a specific completed document from the DOC Vault Trash back to the DOC Vault completed documents list.

**Endpoint**: `PUT /api/v2/vault/item/{uuid}/restore`

**URL**: `https://stg-api2.doconchain.com/api/v2/vault/item/{uuid}/restore?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The unique identifier of the document to restore |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | Must be set to `ENTERPRISE_API` |

**Body Parameters**: None required

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "status": "success",
  "message": "Document restored successfully"
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'PUT',
  url: 'https://stg-api2.doconchain.com/api/v2/vault/item/{uuid}/restore',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {accept: 'application/json', authorization: 'Bearer sample-token'}
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Restore Process

| Step | Action | Result |
|------|--------|--------|
| **Validation** | Check if document exists in trash | Verify accessibility |
| **Permission Check** | Confirm user has restore rights | Ensure authorization |
| **Status Update** | Change document status from trashed to active | Make document visible |
| **Audit Log** | Record restore operation | Maintain compliance trail |

#### Use Cases

- **Accidental Deletion**: Restore documents moved to trash by mistake
- **Temporary Removal**: Bring back documents needed again
- **Workflow Recovery**: Restore documents for continued processing
- **Access Recovery**: Make documents accessible to users again
- **Data Recovery**: Retrieve important documents from trash

#### Important Notes

- **Trash Only**: Can only restore documents currently in trash
- **User-Specific**: Restore affects only the current user's view
- **Status Change**: Document status changes from "trashed" to "active"
- **Visibility**: Restored document becomes visible in vault listings
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Permissions**: User must have restore permissions for the document
- **Trash Status**: Document must currently be in trash
- **Valid UUID**: The document UUID must exist and be accessible
- **Ownership**: User must have previously trashed the document

#### Error Responses

**400 Bad Request**: Invalid UUID or missing parameters
```json
{
  "status": "error",
  "message": "Invalid document UUID or missing required parameters"
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "status": "error",
  "message": "Invalid authentication token"
}
```

**403 Forbidden**: User does not have restore permissions
```json
{
  "status": "error",
  "message": "Insufficient permissions to restore document"
}
```

**404 Not Found**: Document not found in trash
```json
{
  "status": "error",
  "message": "Document not found in trash"
}
```

**409 Conflict**: Document cannot be restored (e.g., permanently deleted)
```json
{
  "status": "error",
  "message": "Document cannot be restored"
}
```

#### Best Practices

- **Regular Review**: Periodically review trash contents for restore needs
- **Clear Communication**: Inform team members when restoring shared documents
- **Audit Maintenance**: Keep records of restore operations
- **Permission Management**: Ensure appropriate restore permissions
- **Status Monitoring**: Track document status changes

#### Security Considerations

- **Access Control**: Strict permissions for document restore operations
- **Audit Logging**: All restore operations logged for compliance
- **Data Integrity**: Ensure restore doesn't corrupt document data
- **User Isolation**: Restore actions respect user permissions
- **Status Validation**: Prevent unauthorized status changes

---

### 46. Create Folder

This endpoint allows users to create a folder on DOC Vault, by providing a folder name, to better organize their completed documents. The number of maximum folders to be created are dependent on the user's plan. In addition, there is no limitation for the number of files to be saved in a DOC Vault folder.

**Endpoint**: `POST /api/v2/folders`

**URL**: `https://stg-api2.doconchain.com/api/v2/folders?name={folder_name}&user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Authorization: Bearer {token}
Accept: application/json
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | The name of the folder to be created |
| `user_type` | string | Yes | The type of user, e.g., `ENTERPRISE_API` |

**Body Parameters**: None required

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "message": "Folder created successfully",
  "data": {
    "id": 0,
    "uuid": "string",
    "name": "string",
    "created_at": "string",
    "updated_at": "string"
  }
}
```

#### Example Request (Axios)

```javascript
import axios from 'axios';

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/api/v2/folders',
  params: {
    name: 'Legal Contracts',
    user_type: 'ENTERPRISE_API'
  },
  headers: {accept: 'application/json', authorization: 'Bearer sample-token'}
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Folder Limitations

| Limitation Type | Details | Notes |
|----------------|---------|-------|
| **Maximum Folders** | Dependent on user plan | Check plan limits before creation |
| **Files per Folder** | No limitation | Unlimited files allowed |
| **Folder Depth** | Single level (no subfolders via this endpoint) | Use rename endpoint for subfolder management |
| **Name Length** | Maximum 255 characters | Follow naming guidelines |

#### Naming Guidelines

| Rule | Description | Example |
|------|-------------|---------|
| **Descriptive** | Use clear, meaningful names | "Q1 Contracts" vs "Folder1" |
| **Consistent** | Follow naming conventions | "YYYY-MM Project Name" |
| **Unique** | Avoid duplicate names | Check existing folders first |
| **Professional** | Use appropriate language | Avoid special characters |

#### Use Cases

- **Document Organization**: Group related documents by project or category
- **Access Control**: Create folders for different teams or departments
- **Workflow Management**: Organize documents by status or priority
- **Compliance**: Separate sensitive documents into secure folders
- **Archival**: Create folders for different time periods or projects

#### Important Notes

- **Plan Limits**: Folder creation limited by user subscription plan
- **No Subfolders**: This endpoint creates top-level folders only
- **Unlimited Files**: No restrictions on number of documents per folder
- **User-Specific**: Folders are created for the authenticated user
- **Required Parameters**: Both `name` and `user_type` query parameters are mandatory

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Plan Limits**: User must not have exceeded folder creation limits
- **Valid Name**: Folder name must meet validation requirements
- **Permissions**: User must have folder creation permissions
- **Unique Name**: Folder name must not already exist

#### Error Responses

**400 Bad Request**: Invalid name or missing required parameters
```json
{
  "error": {
    "code": "INVALID_NAME",
    "message": "Invalid folder name or missing required parameters"
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authentication token"
  }
}
```

**403 Forbidden**: User has exceeded plan limits or lacks permissions
```json
{
  "error": {
    "code": "PLAN_LIMIT_EXCEEDED",
    "message": "Folder creation limit exceeded for your plan"
  }
}
```

**409 Conflict**: Folder name already exists
```json
{
  "error": {
    "code": "NAME_EXISTS",
    "message": "A folder with this name already exists"
  }
}
```

#### Best Practices

- **Plan Monitoring**: Track folder usage against plan limits
- **Naming Conventions**: Establish and follow consistent naming rules
- **Regular Cleanup**: Review and organize folders periodically
- **Access Planning**: Plan folder structure before creation
- **User Training**: Educate users on folder organization best practices

#### Security Considerations

- **Access Control**: Folders inherit user permissions
- **Audit Logging**: All folder creation logged for compliance
- **Data Organization**: Proper folder structure prevents data leaks
- **User Isolation**: Folders are user-specific and isolated
- **Plan Enforcement**: Respect subscription limits and restrictions

---

### 47. Create Subfolder

Create a subfolder within an existing folder in the DOC Vault.

**Endpoint**: `POST /api/v2/folders/{uuid}/sub`

**URL**: `https://stg-api2.doconchain.com/api/v2/folders/{uuid}/sub`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
Content-Type: application/json
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The UUID of the parent folder where the subfolder will be created |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | The name of the subfolder to be created |
| `user_type` | string | Yes | The type of user creating the subfolder (e.g., ENTERPRISE_API) |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "success": true,
  "data": {
    "uuid": "string",
    "name": "string",
    "parent_uuid": "string",
    "created_at": "string",
    "updated_at": "string",
    "user_type": "string"
  },
  "message": "Subfolder created successfully"
}
```

#### Examples

**cURL**:
```bash
curl -X POST "https://stg-api2.doconchain.com/api/v2/folders/{uuid}/sub?name=NewSubfolder&user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/api/v2/folders/{uuid}/sub',
  params: {
    name: 'NewSubfolder',
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Use Cases

- **Document Organization**: Create subfolders to categorize completed documents within parent folders
- **Workflow Management**: Organize documents by project phases or departments
- **User Collaboration**: Allow team members to create subfolders for shared document management
- **Archive Structure**: Build hierarchical folder structures for long-term document storage

#### Error Handling

**400 Bad Request**: Missing or invalid parameters
```json
{
  "error": {
    "code": "INVALID_PARAMETERS",
    "message": "Required parameters are missing or invalid"
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: Insufficient permissions or plan limits exceeded
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to create subfolders in this folder"
  }
}
```

**404 Not Found**: Parent folder not found
```json
{
  "error": {
    "code": "FOLDER_NOT_FOUND",
    "message": "The specified parent folder does not exist"
  }
}
```

**409 Conflict**: Subfolder name already exists in the parent folder
```json
{
  "error": {
    "code": "NAME_EXISTS",
    "message": "A subfolder with this name already exists in the parent folder"
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later"
  }
}
```

#### Best Practices

- **Naming Conventions**: Use descriptive, consistent naming for subfolders
- **Hierarchy Planning**: Plan folder structure before creating subfolders
- **Permission Checks**: Verify parent folder permissions before creation
- **Duplicate Prevention**: Check for existing subfolder names to avoid conflicts
- **Usage Tracking**: Monitor subfolder creation against plan limits

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Parent Folder Access**: User must have access to parent folder
- **Audit Trail**: All subfolder creation activities are logged
- **Data Isolation**: Subfolders maintain user-specific isolation
- **Input Validation**: Sanitize folder names to prevent injection attacks

---

### 48. Move Document Into Folder Or Subfolder

Move a specific document from the DOC Vault into a folder or subfolder.

**Endpoint**: `POST /api/v2/vault/items/{uuid}/move`

**URL**: `https://stg-api2.doconchain.com/api/v2/vault/items/{uuid}/move`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
Content-Type: application/json
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The unique identifier of the document to be moved |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `folder_uuid` | string | Yes | The unique identifier of the folder where the document needs to be moved |
| `user_type` | string | Yes | The type of user making the request (e.g., ENTERPRISE_API) |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "success": true,
  "data": {
    "uuid": "string",
    "folder_uuid": "string",
    "moved_at": "string",
    "user_type": "string"
  },
  "message": "Document moved successfully"
}
```

#### Examples

**cURL**:
```bash
curl -X POST "https://stg-api2.doconchain.com/api/v2/vault/items/{uuid}/move?folder_uuid={folder_uuid}&user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/api/v2/vault/items/{uuid}/move',
  params: {
    folder_uuid: '{folder_uuid}',
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Use Cases

- **Document Organization**: Move completed documents into appropriate folders for better organization
- **Workflow Management**: Relocate documents based on project status or department requirements
- **Archive Management**: Move documents to archival folders after completion
- **Collaboration**: Allow team members to reorganize shared documents

#### Error Handling

**400 Bad Request**: Missing or invalid parameters
```json
{
  "error": {
    "code": "INVALID_PARAMETERS",
    "message": "Required parameters are missing or invalid"
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: Insufficient permissions to move the document or access the folder
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to move this document or access the target folder"
  }
}
```

**404 Not Found**: Document or folder not found
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "The specified document or folder does not exist"
  }
}
```

**409 Conflict**: Document already in the target folder
```json
{
  "error": {
    "code": "ALREADY_IN_FOLDER",
    "message": "The document is already in the specified folder"
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later"
  }
}
```

#### Best Practices

- **Permission Verification**: Always check permissions before moving documents
- **Audit Trail**: Log all document movements for compliance
- **Bulk Operations**: Consider batch moving for multiple documents
- **Folder Structure**: Maintain logical folder hierarchies
- **User Training**: Educate users on proper document organization

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Access Control**: User must have permissions for both document and target folder
- **Audit Logging**: All document movements are logged for compliance
- **Data Integrity**: Ensure document metadata is preserved during move
- **Input Validation**: Validate UUIDs and user types to prevent unauthorized access

---

### 49. Verify Feature Limit

Retrieve the remaining documents available for verification based on the user type.

**Endpoint**: `GET /api/v2/verifications/remaining-documents`

**URL**: `https://stg-api2.doconchain.com/api/v2/verifications/remaining-documents?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "success": true,
  "data": {
    "remaining_documents": 150,
    "total_limit": 1000,
    "used_documents": 850,
    "user_type": "ENTERPRISE_API"
  },
  "message": "Remaining documents retrieved successfully"
}
```

#### Examples

**cURL**:
```bash
curl -X GET "https://stg-api2.doconchain.com/api/v2/verifications/remaining-documents?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/api/v2/verifications/remaining-documents',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Use Cases

- **Quota Monitoring**: Check remaining verification documents before processing
- **Plan Management**: Monitor usage against subscription limits
- **Resource Planning**: Plan document verification workflows based on available quota
- **Billing Alerts**: Set up alerts when approaching limit thresholds
- **Usage Analytics**: Track verification document consumption over time

#### Error Handling

**400 Bad Request**: Missing or invalid user_type parameter
```json
{
  "error": {
    "code": "INVALID_PARAMETERS",
    "message": "Required parameter user_type is missing or invalid"
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have permission to access verification limits
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to verification limits"
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later"
  }
}
```

#### Best Practices

- **Regular Monitoring**: Check limits periodically to avoid service interruptions
- **Threshold Alerts**: Set up notifications when approaching limits
- **Usage Optimization**: Optimize verification workflows to maximize quota usage
- **Plan Upgrades**: Monitor usage patterns to determine if plan upgrades are needed
- **Caching**: Cache limit data with appropriate refresh intervals

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **User-Specific Data**: Limits are strictly user-specific and isolated
- **Audit Logging**: All limit checks are logged for compliance
- **Data Privacy**: Protect sensitive usage and limit information
- **Rate Limiting**: Prevent abuse through appropriate rate limiting

---

### 50. Get All Verifications

Retrieve all documents uploaded to the DOC Verify module for a specific user, including verification status and passport details.

**Endpoint**: `GET /verifications`

**URL**: `https://stg-api2.doconchain.com/verifications?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "uuid": "string",
      "document_name": "string",
      "verification_status": "pending|verified|failed|expired",
      "uploaded_at": "string",
      "verified_at": "string",
      "passport_details": {
        "passport_number": "string",
        "issue_date": "string",
        "expiry_date": "string",
        "issuing_country": "string",
        "nationality": "string"
      },
      "user_type": "string"
    }
  ],
  "total_count": 0,
  "message": "Verifications retrieved successfully"
}
```

#### Examples

**cURL**:
```bash
curl -X GET "https://stg-api2.doconchain.com/verifications?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/verifications',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Verification Status Values

| Status | Description |
|--------|-------------|
| **pending** | Document uploaded, verification in progress |
| **verified** | Document successfully verified |
| **failed** | Verification failed due to invalid document |
| **expired** | Verification expired and needs renewal |

#### Use Cases

- **Status Monitoring**: Check verification progress for uploaded documents
- **Compliance Tracking**: Monitor document verification compliance
- **User Dashboard**: Display verification history and status
- **Audit Reporting**: Generate reports on verification activities
- **Renewal Management**: Identify documents requiring re-verification

#### Error Handling

**400 Bad Request**: Missing or invalid user_type parameter
```json
{
  "error": {
    "code": "INVALID_PARAMETERS",
    "message": "Required parameter user_type is missing or invalid"
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have permission to access verifications
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to verification data"
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later"
  }
}
```

#### Best Practices

- **Regular Monitoring**: Check verification status periodically
- **Status Alerts**: Set up notifications for status changes
- **Data Validation**: Validate passport details before submission
- **Compliance Tracking**: Maintain records of verification activities
- **User Communication**: Keep users informed about verification progress

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Sensitive Data Protection**: Protect passport and personal information
- **Audit Logging**: All verification access attempts logged
- **Data Encryption**: Ensure data is encrypted in transit and at rest
- **Access Control**: Strict user-specific access to verification data

---

### 51. Document Verify

Verify the authenticity of a document by uploading a PDF file or providing a document code.

**Endpoint**: `POST /api/v2/verifications/document/verify`

**URL**: `https://stg-api2.doconchain.com/api/v2/verifications/document/verify`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters** (multipart/form-data):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | file | No* | The PDF file to be verified (*required if code not provided) |
| `code` | string | No* | The document code from DOC Vault (*required if file not provided) |
| `user_uuid` | string | Yes | The UUID of the user performing the verification |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "success": true,
  "data": {
    "verification_id": "string",
    "document_uuid": "string",
    "verification_status": "verified|failed|pending",
    "verification_result": {
      "is_authentic": true,
      "confidence_score": 0.95,
      "verification_method": "blockchain|digital_signature",
      "verified_at": "string",
      "blockchain_hash": "string",
      "signer_details": [
        {
          "name": "string",
          "email": "string",
          "signed_at": "string",
          "certificate_valid": true
        }
      ]
    },
    "document_details": {
      "file_name": "string",
      "file_size": 0,
      "page_count": 0,
      "uploaded_at": "string"
    }
  },
  "message": "Document verification completed successfully"
}
```

#### Examples

**cURL** (with file upload):
```bash
curl -X POST "https://stg-api2.doconchain.com/api/v2/verifications/document/verify?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@document.pdf" \
  -F "user_uuid=user-uuid-here"
```

**cURL** (with document code):
```bash
curl -X POST "https://stg-api2.doconchain.com/api/v2/verifications/document/verify?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "code=DOC-123456" \
  -F "user_uuid=user-uuid-here"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('file', fileInput.files[0]); // or formData.append('code', 'DOC-123456');
formData.append('user_uuid', 'user-uuid-here');

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/api/v2/verifications/document/verify',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'multipart/form-data'
  },
  data: formData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Verification Methods

| Method | Description | Use Case |
|--------|-------------|----------|
| **File Upload** | Upload PDF directly for verification | New documents or external files |
| **Document Code** | Use existing DOC Vault document code | Documents already in the system |

#### Use Cases

- **Document Authentication**: Verify signed document authenticity
- **Compliance Checking**: Ensure documents meet regulatory requirements
- **Fraud Prevention**: Detect tampered or forged documents
- **Legal Validation**: Confirm document validity for legal proceedings
- **Trust Building**: Provide verification certificates for stakeholders

#### Error Handling

**400 Bad Request**: Missing required parameters or invalid file/code
```json
{
  "error": {
    "code": "INVALID_PARAMETERS",
    "message": "Either file or code parameter is required, and user_uuid is mandatory"
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have verification permissions
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to document verification"
  }
}
```

**404 Not Found**: Document code not found in vault
```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Document with the specified code was not found"
  }
}
```

**413 Payload Too Large**: File size exceeds limits
```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "Uploaded file exceeds maximum size limit"
  }
}
```

**415 Unsupported Media Type**: Invalid file type
```json
{
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "Only PDF files are supported for verification"
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many verification requests. Please try again later"
  }
}
```

#### Best Practices

- **File Validation**: Validate file type and size before upload
- **Progress Monitoring**: Show verification progress for large files
- **Error Handling**: Implement comprehensive error handling for failed verifications
- **Caching Results**: Cache verification results when appropriate
- **User Feedback**: Provide clear feedback on verification status and results

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **File Security**: Secure file upload and processing
- **Data Privacy**: Protect sensitive document content during verification
- **Audit Logging**: All verification attempts logged for compliance
- **Access Control**: User-specific verification permissions
- **Input Validation**: Validate all input parameters and file content

---

### 52. Show Verification

Retrieve detailed information about a specific document verification, including verification status, users, and passport details.

**Endpoint**: `GET /api/v2/verifications/{uuid}`

**URL**: `https://stg-api2.doconchain.com/api/v2/verifications/{uuid}?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The unique identifier of the verification record |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "uuid": "string",
    "document_uuid": "string",
    "document_name": "string",
    "verification_status": "pending|verified|failed|expired",
    "verification_result": {
      "is_authentic": true,
      "confidence_score": 0.95,
      "verification_method": "blockchain|digital_signature",
      "verified_at": "string",
      "blockchain_hash": "string",
      "signer_details": [
        {
          "name": "string",
          "email": "string",
          "signed_at": "string",
          "certificate_valid": true
        }
      ]
    },
    "passport_details": {
      "passport_number": "string",
      "issue_date": "string",
      "expiry_date": "string",
      "issuing_country": "string",
      "nationality": "string",
      "holder_name": "string"
    },
    "document_details": {
      "file_name": "string",
      "file_size": 0,
      "page_count": 0,
      "uploaded_at": "string",
      "content_hash": "string"
    },
    "user_details": {
      "user_uuid": "string",
      "user_type": "string",
      "requested_at": "string"
    },
    "created_at": "string",
    "updated_at": "string"
  },
  "message": "Verification details retrieved successfully"
}
```

#### Examples

**cURL**:
```bash
curl -X GET "https://stg-api2.doconchain.com/api/v2/verifications/{uuid}?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/api/v2/verifications/{uuid}',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Verification Status Values

| Status | Description |
|--------|-------------|
| **pending** | Verification request submitted, processing in progress |
| **verified** | Document successfully verified as authentic |
| **failed** | Verification failed due to invalid or tampered document |
| **expired** | Verification result has expired and needs renewal |

#### Use Cases

- **Status Checking**: Monitor the status of a specific verification request
- **Detailed Review**: Access complete verification results and signer information
- **Compliance Audit**: Review verification details for regulatory compliance
- **Issue Resolution**: Investigate failed verifications with detailed error information
- **Certificate Generation**: Generate verification certificates with complete details

#### Error Handling

**400 Bad Request**: Invalid UUID format
```json
{
  "error": {
    "code": "INVALID_UUID",
    "message": "The provided verification UUID is invalid"
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have permission to access this verification
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to this verification record"
  }
}
```

**404 Not Found**: Verification record not found
```json
{
  "error": {
    "code": "VERIFICATION_NOT_FOUND",
    "message": "The specified verification record was not found"
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later"
  }
}
```

#### Best Practices

- **UUID Validation**: Ensure UUID is valid before making requests
- **Caching**: Cache verification details when appropriate
- **Error Handling**: Implement proper error handling for access issues
- **Data Security**: Handle sensitive passport and signer information securely
- **Audit Trail**: Log access to verification details for compliance

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Access Control**: Strict permissions for verification record access
- **Data Privacy**: Protect sensitive passport and personal information
- **Audit Logging**: All verification detail access attempts logged
- **User Isolation**: Verification records are user-specific and isolated
- **Input Validation**: Validate UUID format to prevent unauthorized access

---

### 53. Delete Verification

Permanently delete a document that has been uploaded for verification on DOC Verify.

**Endpoint**: `DELETE /api/v2/verifications/{uuid}`

**URL**: `https://stg-api2.doconchain.com/api/v2/verifications/{uuid}?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The unique identifier of the verification record to delete |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "success": true,
  "data": {
    "uuid": "string",
    "deleted_at": "string",
    "document_name": "string"
  },
  "message": "Verification record deleted successfully"
}
```

#### Examples

**cURL**:
```bash
curl -X DELETE "https://stg-api2.doconchain.com/api/v2/verifications/{uuid}?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'DELETE',
  url: 'https://stg-api2.doconchain.com/api/v2/verifications/{uuid}',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Deletion Behavior

| Action | Scope | Impact |
|--------|-------|--------|
| **Permanent Delete** | User-specific verification record | Document removed from verification history |
| **Document File** | Original document file may remain | Only verification record deleted |
| **Blockchain Record** | Original signatures preserved | Blockchain integrity maintained |
| **Audit Trail** | Deletion logged for compliance | Maintains regulatory compliance |

#### Use Cases

- **Privacy Compliance**: Remove verification records per data protection regulations
- **Data Cleanup**: Delete obsolete or incorrect verification records
- **Storage Management**: Free up verification storage space
- **Error Correction**: Remove verification records with incorrect data
- **User Request**: Honor user requests for data deletion

#### Important Notes

- **Permanent Action**: Deletion cannot be undone
- **User-Specific**: Only affects the current user's verification records
- **Document Preservation**: Original signed document may still exist in vault
- **Blockchain Integrity**: Original blockchain signatures remain intact
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Permissions**: User must have delete permissions for the verification record
- **Valid UUID**: The verification UUID must exist and be accessible
- **Ownership**: User must own or have delete rights for the verification record
- **Confirmation**: Consider requiring explicit user confirmation

#### Error Responses

**400 Bad Request**: Invalid UUID format
```json
{
  "error": {
    "code": "INVALID_UUID",
    "message": "The provided verification UUID is invalid"
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have delete permissions
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to delete this verification record"
  }
}
```

**404 Not Found**: Verification record not found
```json
{
  "error": {
    "code": "VERIFICATION_NOT_FOUND",
    "message": "The specified verification record was not found"
  }
}
```

**409 Conflict**: Verification record cannot be deleted
```json
{
  "error": {
    "code": "CANNOT_DELETE",
    "message": "Verification record cannot be deleted at this time"
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later"
  }
}
```

#### Best Practices

- **Confirmation Required**: Always require explicit user confirmation before deletion
- **Backup Important Data**: Ensure important verification data is preserved elsewhere if needed
- **Audit Trail**: Maintain records of verification deletions for compliance
- **Bulk Operations**: Consider bulk deletion for multiple records when appropriate
- **User Communication**: Inform users about the permanent nature of deletion

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Access Control**: Strict permissions for verification record deletion
- **Audit Logging**: All deletion operations logged for compliance
- **Data Privacy**: Complete removal of verification record data
- **Irreversibility**: Prevent accidental permanent deletions
- **User Isolation**: Deletion actions respect user permissions and isolation

---

### 54. Trash Verification

Move a DOC Verify document to trash. Documents in trash can still be restored or permanently deleted.

**Endpoint**: `DELETE /api/v2/verifications/{uuid}/trash`

**URL**: `https://stg-api2.doconchain.com/api/v2/verifications/{uuid}/trash?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The unique identifier of the verification record to move to trash |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "status": "success",
  "message": "Verification document moved to trash successfully"
}
```

#### Examples

**cURL**:
```bash
curl -X DELETE "https://stg-api2.doconchain.com/api/v2/verifications/{uuid}/trash?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'DELETE',
  url: 'https://stg-api2.doconchain.com/api/v2/verifications/{uuid}/trash',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Trash Behavior

| Action | Effect | Visibility |
|--------|--------|------------|
| **Move to Trash** | Document status changes to "trashed" | Hidden from active verification view |
| **Recoverable** | Can be restored from trash | Document remains accessible |
| **Reversible** | Trash action can be undone | Restore functionality available |
| **Data Preservation** | All verification data preserved | No data loss during trash operation |

#### Use Cases

- **Temporary Removal**: Hide verification documents temporarily without permanent deletion
- **Organization**: Clean up active verification lists while preserving data
- **Workflow Management**: Move completed or obsolete verifications out of active view
- **Privacy Management**: Temporarily hide sensitive verification records
- **Error Handling**: Move failed or problematic verifications for review

#### Important Notes

- **Reversible Action**: Documents can be restored from trash if needed
- **Data Preservation**: All verification data and results remain intact
- **User-Specific**: Trash action affects only the current user's view
- **Restore Capability**: Documents can be restored via API or interface
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Permissions**: User must have trash permissions for the verification record
- **Valid UUID**: The verification UUID must exist and be accessible
- **Ownership**: User must own or have trash rights for the verification record

#### Error Responses

**400 Bad Request**: Invalid UUID format
```json
{
  "status": "error",
  "message": "The provided verification UUID is invalid"
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "status": "error",
  "message": "Authentication required"
}
```

**403 Forbidden**: User does not have trash permissions
```json
{
  "status": "error",
  "message": "Access denied to trash this verification record"
}
```

**404 Not Found**: Verification record not found
```json
{
  "status": "error",
  "message": "The specified verification record was not found"
}
```

**409 Conflict**: Verification record already in trash
```json
{
  "status": "error",
  "message": "Verification record is already in trash"
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "status": "error",
  "message": "Too many requests. Please try again later"
}
```

#### Best Practices

- **Confirmation**: Consider requiring user confirmation before trashing
- **Bulk Operations**: Support bulk trash operations for multiple records
- **Restore Access**: Keep track of trashed documents for potential restore
- **Regular Cleanup**: Periodically review and permanently delete old trash items
- **User Communication**: Inform users about trash and restore capabilities

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Access Control**: Strict permissions for trash operations
- **Audit Logging**: All trash operations logged for compliance
- **Data Integrity**: Ensure trash operations don't corrupt verification data
- **User Isolation**: Trash actions are user-specific and isolated
- **Recovery Options**: Provide secure restore functionality

---

### 55. Restore Verification

Restore a specific document from the DOC Verify trash back to the user's verifiable documents list.

**Endpoint**: `PUT /api/v2/verifications/{uuid}/restore`

**URL**: `https://stg-api2.doconchain.com/api/v2/verifications/{uuid}/restore?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The unique identifier of the verification record to restore |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "success": true,
  "data": {
    "uuid": "string",
    "document_name": "string",
    "verification_status": "pending|verified|failed|expired",
    "restored_at": "string",
    "user_type": "string"
  },
  "message": "Verification document restored successfully"
}
```

#### Examples

**cURL**:
```bash
curl -X PUT "https://stg-api2.doconchain.com/api/v2/verifications/{uuid}/restore?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'PUT',
  url: 'https://stg-api2.doconchain.com/api/v2/verifications/{uuid}/restore',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Restore Process

| Step | Action | Result |
|------|--------|--------|
| **Validation** | Check if document exists in trash | Verify accessibility |
| **Permission Check** | Confirm user has restore rights | Ensure authorization |
| **Status Update** | Change document status from "trashed" to active | Make document visible |
| **Audit Log** | Record restore operation | Maintain compliance trail |

#### Use Cases

- **Accidental Deletion**: Restore verification documents moved to trash by mistake
- **Temporary Removal**: Bring back documents needed for verification again
- **Workflow Recovery**: Restore documents for continued verification processing
- **Access Recovery**: Make verification documents accessible to users again
- **Data Recovery**: Retrieve important verification records from trash

#### Important Notes

- **Trash Only**: Can only restore documents currently in trash
- **User-Specific**: Restore affects only the current user's verification records
- **Status Change**: Document status changes from "trashed" to active
- **Visibility**: Restored document becomes visible in verification listings
- **Required Parameter**: The `user_type=ENTERPRISE_API` query parameter is mandatory

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Permissions**: User must have restore permissions for the verification record
- **Trash Status**: Document must currently be in trash
- **Valid UUID**: The verification UUID must exist and be accessible
- **Ownership**: User must have previously trashed the verification record

#### Error Responses

**400 Bad Request**: Invalid UUID format
```json
{
  "error": {
    "code": "INVALID_UUID",
    "message": "The provided verification UUID is invalid"
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have restore permissions
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to restore this verification record"
  }
}
```

**404 Not Found**: Verification record not found in trash
```json
{
  "error": {
    "code": "VERIFICATION_NOT_FOUND",
    "message": "The specified verification record was not found in trash"
  }
}
```

**409 Conflict**: Verification record cannot be restored
```json
{
  "error": {
    "code": "CANNOT_RESTORE",
    "message": "Verification record cannot be restored"
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later"
  }
}
```

#### Best Practices

- **Regular Review**: Periodically review trash contents for restore needs
- **Clear Communication**: Inform team members when restoring shared verification records
- **Audit Maintenance**: Keep records of restore operations
- **Permission Management**: Ensure appropriate restore permissions
- **Status Monitoring**: Track verification record status changes

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Access Control**: Strict permissions for verification record restore operations
- **Audit Logging**: All restore operations logged for compliance
- **Data Integrity**: Ensure restore doesn't corrupt verification data
- **User Isolation**: Restore actions respect user permissions and isolation
- **Status Validation**: Prevent unauthorized status changes

---

### 56. Get Associated Attachments From Project

Search and retrieve protected documents by providing up to 3 keywords under a specific user.

**Endpoint**: `GET /api/v2/projects/protect`

**URL**: `https://stg-api2.doconchain.com/api/v2/projects/protect?user_type=ENTERPRISE_API&keyword[sample_1]=keyword1&keyword[sample_2]=keyword2&keyword[sample_3]=keyword3`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |
| `keyword[sample_1]` | string | Yes | The first keyword for searching protected documents |
| `keyword[sample_2]` | string | Yes | The second keyword for searching protected documents |
| `keyword[sample_3]` | string | Yes | The third keyword for searching protected documents |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "message": "Protected documents retrieved successfully",
  "data": [
    {
      "id": 0,
      "project_uuid": "string",
      "reference_number": "string",
      "type": "string",
      "category": "string",
      "status": "string",
      "name": "string",
      "file_name": "string",
      "project_file_id": 0,
      "storage": "string",
      "path": "string",
      "dna": "string",
      "project_file_meta": "string",
      "blockchain_id": 0,
      "blockchain_uuid": "string",
      "event": "string",
      "network": "string",
      "blockchain_status": "string",
      "blockchain_meta": "string",
      "txn_hash": "string",
      "created_by": 0,
      "completed_at": "string",
      "created_at": "string",
      "updated_at": "string"
    }
  ]
}
```

#### Examples

**cURL**:
```bash
curl -X GET "https://stg-api2.doconchain.com/api/v2/projects/protect?user_type=ENTERPRISE_API&keyword[sample_1]=contract&keyword[sample_2]=agreement&keyword[sample_3]=2024" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/api/v2/projects/protect',
  params: {
    user_type: 'ENTERPRISE_API',
    'keyword[sample_1]': 'contract',
    'keyword[sample_2]': 'agreement',
    'keyword[sample_3]': '2024'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Keyword Search Guidelines

| Parameter | Requirements | Examples |
|-----------|--------------|----------|
| **keyword[sample_1]** | Required, 2-50 characters | "contract", "agreement", "invoice" |
| **keyword[sample_2]** | Required, 2-50 characters | "legal", "financial", "2024" |
| **keyword[sample_3]** | Required, 2-50 characters | "confidential", "draft", "final" |
| **Search Logic** | AND operation between keywords | All keywords must match |
| **Case Sensitivity** | Case-insensitive search | "Contract" matches "contract" |

#### Use Cases

- **Document Discovery**: Find protected documents using specific keywords
- **Compliance Search**: Locate documents for regulatory compliance
- **Document Management**: Organize and categorize protected documents
- **Audit Preparation**: Gather documents for audit purposes
- **Legal Research**: Search for legal documents with specific terms

#### Important Notes

- **Protected Documents**: Only searches within protected/blockchain-verified documents
- **User-Specific**: Returns documents owned by the authenticated user
- **Keyword Requirements**: All three keywords are required for the search
- **Search Scope**: Searches across document names, content, and metadata
- **Result Limit**: May have pagination for large result sets

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Permissions**: User must have access to protected documents
- **Valid Keywords**: All three keywords must meet validation requirements
- **Active Account**: User account must be active and in good standing

#### Error Responses

**400 Bad Request**: Missing or invalid keywords
```json
{
  "error": {
    "code": "INVALID_KEYWORDS",
    "message": "All three keywords are required and must be valid"
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have access to protected documents
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to protected documents"
  }
}
```

**404 Not Found**: No documents found matching the keywords
```json
{
  "error": {
    "code": "NO_DOCUMENTS_FOUND",
    "message": "No protected documents found matching the specified keywords"
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later"
  }
}
```

#### Best Practices

- **Keyword Selection**: Choose relevant and specific keywords for better results
- **Search Optimization**: Use common terms that appear in document names or content
- **Result Review**: Review search results to ensure relevance
- **Regular Searches**: Use for periodic document organization and cleanup
- **Access Logging**: Monitor search activities for security

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Access Control**: Strict permissions for protected document access
- **Data Privacy**: Protect sensitive document information during search
- **Audit Logging**: All search operations logged for compliance
- **User Isolation**: Search results limited to user's protected documents
- **Input Validation**: Validate keywords to prevent injection attacks

---

### 57. Create Attachments

Upload files to be protected on the DOCONCHAIN blockchain network.

**Endpoint**: `POST /api/v2/projects/protect`

**URL**: `https://stg-api2.doconchain.com/api/v2/projects/protect?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters** (multipart/form-data):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file[0]` | file | Yes* | The first file to be uploaded (*at least one file required) |
| `meta[0]` | string | Yes | JSON string containing metadata for the first file |
| `viewer_access[0]` | string | No | Access level for first file (Private or Public) |
| `completed_account_restriction[0]` | string | No | Account restriction for first file |
| `first_name[0]` | string | No | First name for first file viewer |
| `last_name[0]` | string | No | Last name for first file viewer |
| `email[0]` | string | No | Email for first file viewer |
| `file[1]` | file | No | The second file to be uploaded |
| `meta[1]` | string | No | JSON string containing metadata for the second file |
| `viewer_access[1]` | string | No | Access level for second file (Private or Public) |
| `completed_account_restriction[1]` | string | No | Account restriction for second file |
| `first_name[1]` | string | No | First name for second file viewer |
| `last_name[1]` | string | No | Last name for second file viewer |
| `email[1]` | string | No | Email for second file viewer |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "message": "Files uploaded and protected successfully",
  "data": [
    {
      "project_uuid": "string",
      "project_reference": "string",
      "file": {
        "id": 0,
        "type": "string",
        "storage": "string",
        "reference_number": "string",
        "created_by": 0,
        "meta": "string",
        "project_id": 0,
        "dna": "string",
        "path": "string",
        "created_at": "string",
        "updated_at": "string"
      },
      "blockchain": {
        "id": 0,
        "uuid": "string",
        "project_uuid": "string",
        "event": "string",
        "network": "string",
        "status": "string",
        "retries": 0,
        "meta": "string",
        "txn_hash": "string",
        "created_at": "string",
        "updated_at": "string"
      }
    }
  ]
}
```

#### Examples

**cURL**:
```bash
curl -X POST "https://stg-api2.doconchain.com/api/v2/projects/protect?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file[0]=@document1.pdf" \
  -F "meta[0]={\"property_1\": 1, \"property_2\": 1, \"property_3\": 1}" \
  -F "viewer_access[0]=Private" \
  -F "first_name[0]=John" \
  -F "last_name[0]=Doe" \
  -F "email[0]=john.doe@example.com"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('file[0]', fileInput1.files[0]);
formData.append('meta[0]', JSON.stringify({property_1: 1, property_2: 1, property_3: 1}));
formData.append('viewer_access[0]', 'Private');
formData.append('first_name[0]', 'John');
formData.append('last_name[0]', 'Doe');
formData.append('email[0]', 'john.doe@example.com');

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/api/v2/projects/protect',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'multipart/form-data'
  },
  data: formData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### File Upload Guidelines

| Parameter | Requirements | Notes |
|-----------|--------------|-------|
| **File Types** | PDF, DOC, DOCX, XLS, XLSX | Maximum 10MB per file |
| **File Count** | 1-3 files per request | At least one file required |
| **Metadata** | Valid JSON string | Required for each file |
| **Viewer Access** | Private or Public | Defaults to Private |
| **Email Validation** | Valid email format | Required for viewer access |

#### Metadata Format

The `meta` parameter should be a JSON string containing file metadata:

```json
{
  "title": "Document Title",
  "description": "Document description",
  "category": "legal",
  "tags": ["contract", "agreement"],
  "version": "1.0"
}
```

#### Use Cases

- **Document Protection**: Secure important documents on blockchain
- **Legal Compliance**: Create tamper-proof legal documents
- **Audit Trail**: Maintain immutable document records
- **Digital Assets**: Protect digital assets and certificates
- **Regulatory Filing**: Secure documents for regulatory compliance

#### Important Notes

- **Blockchain Protection**: Files are permanently protected on blockchain
- **Immutable Records**: Protected documents cannot be altered
- **Viewer Permissions**: Control who can access protected documents
- **Batch Upload**: Upload multiple related documents together
- **Processing Time**: Blockchain protection may take time to complete

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Permissions**: User must have blockchain protection permissions
- **Valid Files**: Files must meet size and type requirements
- **Valid Metadata**: Metadata must be valid JSON
- **Active Account**: User account must be active and in good standing

#### Error Responses

**400 Bad Request**: Invalid file or metadata
```json
{
  "error": {
    "code": "INVALID_FILE",
    "message": "File type not supported or metadata invalid"
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have protection permissions
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to blockchain protection"
  }
}
```

**413 Payload Too Large**: File size exceeds limits
```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size exceeds maximum limit"
  }
}
```

**415 Unsupported Media Type**: Invalid file type
```json
{
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "File type not supported for protection"
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later"
  }
}
```

#### Best Practices

- **File Preparation**: Ensure files are properly formatted before upload
- **Metadata Accuracy**: Provide accurate and complete metadata
- **Batch Processing**: Group related documents for batch protection
- **Progress Monitoring**: Monitor blockchain protection status
- **Access Control**: Set appropriate viewer permissions
- **Backup Storage**: Keep local backups of original files

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **File Security**: Secure file upload and processing
- **Blockchain Integrity**: Files protected by blockchain immutability
- **Access Control**: Strict permissions for document protection
- **Audit Logging**: All protection operations logged for compliance
- **Data Privacy**: Protect sensitive document content
- **Input Validation**: Validate all file and metadata inputs

---

### 58. Get Specific Attachment From Project

Retrieve a specific protected document by providing its project UUID.

**Endpoint**: `GET /api/v2/projects/protect/{project-uuid}`

**URL**: `https://stg-api2.doconchain.com/api/v2/projects/protect/{project-uuid}?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project-uuid` | string | Yes | The UUID of the project to retrieve details for |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | No | Filter the results by user type (e.g., ENTERPRISE_API) |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "message": "Protected project details retrieved successfully",
  "data": [
    {
      "id": 0,
      "project_uuid": "string",
      "reference_number": "string",
      "type": "string",
      "category": "string",
      "status": "string",
      "name": "string",
      "file_name": "string",
      "project_file_id": 0,
      "storage": "string",
      "path": "string",
      "dna": "string",
      "project_file_meta": "string",
      "blockchain_id": 0,
      "blockchain_uuid": "string",
      "event": "string",
      "network": "string",
      "blockchain_status": "string",
      "blockchain_meta": "string",
      "txn_hash": "string",
      "created_by": 0,
      "completed_at": "string",
      "created_at": "string",
      "updated_at": "string"
    }
  ]
}
```

#### Examples

**cURL**:
```bash
curl -X GET "https://stg-api2.doconchain.com/api/v2/projects/protect/{project-uuid}?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/api/v2/projects/protect/{project-uuid}',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Response Data Structure

| Field | Type | Description |
|-------|------|-------------|
| **id** | integer | Unique identifier of the project file |
| **project_uuid** | string | UUID of the protected project |
| **reference_number** | string | Reference number for the project |
| **type** | string | Type of the document |
| **category** | string | Category classification |
| **status** | string | Current status of the project |
| **name** | string | Display name of the document |
| **file_name** | string | Actual filename |
| **storage** | string | Storage location information |
| **dna** | string | Unique DNA hash of the document |
| **blockchain_status** | string | Status of blockchain protection |
| **txn_hash** | string | Blockchain transaction hash |

#### Use Cases

- **Document Verification**: Verify specific protected document details
- **Status Monitoring**: Check blockchain protection status
- **Audit Access**: Access specific document audit information
- **Compliance Review**: Review protected document compliance
- **Integration**: Retrieve specific document data for external systems

#### Important Notes

- **Protected Documents**: Only returns blockchain-protected documents
- **User Access**: User must have access to the specific project
- **UUID Format**: Project UUID must be valid format
- **Single Project**: Returns details for one specific project
- **Blockchain Data**: Includes complete blockchain protection information

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Permissions**: User must have access to the protected project
- **Valid UUID**: The project UUID must exist and be accessible
- **Ownership**: User must own or have access to the project

#### Error Responses

**400 Bad Request**: Invalid UUID format
```json
{
  "error": {
    "code": "INVALID_UUID",
    "message": "The provided project UUID is invalid"
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have access to the project
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to this protected project"
  }
}
```

**404 Not Found**: Project not found
```json
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "The specified protected project was not found"
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later"
  }
}
```

#### Best Practices

- **UUID Validation**: Ensure project UUID is valid before requests
- **Caching**: Cache project details when appropriate
- **Error Handling**: Implement proper error handling for access issues
- **Data Security**: Handle sensitive blockchain information securely
- **Audit Trail**: Log access to protected project details

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Access Control**: Strict permissions for protected project access
- **Data Privacy**: Protect sensitive document and blockchain information
- **Audit Logging**: All project access attempts logged
- **User Isolation**: Project details limited to authorized users
- **Input Validation**: Validate UUID format to prevent unauthorized access

---

### 59. Upload Signature

Upload a signature image file for a specific user.

**Endpoint**: `POST /client/signature`

**URL**: `https://stg-api2.doconchain.com/client/signature?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters** (multipart/form-data):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | file | Yes | The signature image file to be uploaded |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "success": true,
  "data": {
    "signature_id": "string",
    "file_name": "string",
    "file_size": 0,
    "uploaded_at": "string",
    "user_type": "string"
  },
  "message": "Signature uploaded successfully"
}
```

#### Examples

**cURL**:
```bash
curl -X POST "https://stg-api2.doconchain.com/client/signature?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@signature.png"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('file', signatureFileInput.files[0]);

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/client/signature',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'multipart/form-data'
  },
  data: formData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Signature File Requirements

| Requirement | Specification | Notes |
|-------------|---------------|-------|
| **File Types** | PNG, JPG, JPEG, GIF | Transparent background recommended |
| **File Size** | Maximum 2MB | Optimize for web usage |
| **Dimensions** | 200x100px recommended | Maintain aspect ratio |
| **Resolution** | 300 DPI minimum | Ensure clarity |
| **Background** | Transparent preferred | White background acceptable |

#### Use Cases

- **User Profile**: Set up signature for document signing
- **Document Preparation**: Prepare signature for automated signing
- **Identity Verification**: Associate signature with user identity
- **Legal Compliance**: Maintain digital signature records
- **Workflow Automation**: Enable automated document signing

#### Important Notes

- **User-Specific**: Signature is associated with the authenticated user
- **Single Signature**: Each user can have one active signature
- **File Validation**: Signature file must meet requirements
- **Secure Storage**: Signatures are securely stored and encrypted
- **Usage Tracking**: Signature usage is tracked for compliance

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Permissions**: User must have signature upload permissions
- **Valid File**: Signature file must meet format and size requirements
- **Active Account**: User account must be active

#### Error Responses

**400 Bad Request**: Invalid file or missing parameters
```json
{
  "error": {
    "code": "INVALID_FILE",
    "message": "Signature file does not meet requirements"
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have upload permissions
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to signature upload"
  }
}
```

**413 Payload Too Large**: File size exceeds limits
```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "Signature file exceeds maximum size limit"
  }
}
```

**415 Unsupported Media Type**: Invalid file type
```json
{
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "File type not supported for signatures"
  }
}
```

**422 Unprocessable Entity**: File processing failed
```json
{
  "error": {
    "code": "PROCESSING_FAILED",
    "message": "Signature file could not be processed"
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later"
  }
}
```

#### Best Practices

- **Image Quality**: Use high-quality, clear signature images
- **File Optimization**: Compress images while maintaining quality
- **Format Selection**: Use PNG for transparency, JPG for smaller files
- **Testing**: Test signature appearance before final use
- **Backup**: Keep original signature files for records

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **File Security**: Secure signature file upload and storage
- **Data Privacy**: Protect signature images as sensitive data
- **Access Control**: Strict permissions for signature management
- **Audit Logging**: All signature upload attempts logged
- **Encryption**: Signature files encrypted at rest
- **Input Validation**: Validate file type, size, and content

---

### 60. Upload Initial

Upload an initials image file for a specific user.

**Endpoint**: `POST /client/initial`

**URL**: `https://stg-api2.doconchain.com/client/initial?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters** (multipart/form-data):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | file | Yes | The initials image file to be uploaded |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "success": true,
  "data": {
    "initial_id": "string",
    "file_name": "string",
    "file_size": 0,
    "uploaded_at": "string",
    "user_type": "string"
  },
  "message": "Initial uploaded successfully"
}
```

#### Examples

**cURL**:
```bash
curl -X POST "https://stg-api2.doconchain.com/client/initial?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@initial.png"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('file', initialFileInput.files[0]);

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/client/initial',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'multipart/form-data'
  },
  data: formData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Initial File Requirements

| Requirement | Specification | Notes |
|-------------|---------------|-------|
| **File Types** | PNG, JPG, JPEG, GIF | Transparent background recommended |
| **File Size** | Maximum 1MB | Smaller than signature files |
| **Dimensions** | 100x50px recommended | Compact for document placement |
| **Resolution** | 300 DPI minimum | Ensure legibility |
| **Background** | Transparent preferred | White background acceptable |

#### Use Cases

- **Document Signing**: Add initials to document pages
- **User Profile**: Set up initials for document authentication
- **Document Preparation**: Prepare initials for automated placement
- **Identity Verification**: Associate initials with user identity
- **Legal Compliance**: Maintain digital initial records

#### Important Notes

- **User-Specific**: Initials are associated with the authenticated user
- **Single Initial**: Each user can have one active initial image
- **File Validation**: Initial file must meet requirements
- **Secure Storage**: Initials are securely stored and encrypted
- **Usage Tracking**: Initial usage is tracked for compliance

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Permissions**: User must have initial upload permissions
- **Valid File**: Initial file must meet format and size requirements
- **Active Account**: User account must be active

#### Error Responses

**400 Bad Request**: Invalid file or missing parameters
```json
{
  "error": {
    "code": "INVALID_FILE",
    "message": "Initial file does not meet requirements"
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have upload permissions
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to initial upload"
  }
}
```

**413 Payload Too Large**: File size exceeds limits
```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "Initial file exceeds maximum size limit"
  }
}
```

**415 Unsupported Media Type**: Invalid file type
```json
{
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "File type not supported for initials"
  }
}
```

**422 Unprocessable Entity**: File processing failed
```json
{
  "error": {
    "code": "PROCESSING_FAILED",
    "message": "Initial file could not be processed"
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later"
  }
}
```

#### Best Practices

- **Image Quality**: Use clear, legible initial images
- **File Optimization**: Compress images while maintaining readability
- **Format Selection**: Use PNG for transparency, JPG for smaller files
- **Size Consideration**: Keep initials compact for document integration
- **Testing**: Test initial appearance in documents before final use

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **File Security**: Secure initial file upload and storage
- **Data Privacy**: Protect initial images as sensitive data
- **Access Control**: Strict permissions for initial management
- **Audit Logging**: All initial upload attempts logged
- **Encryption**: Initial files encrypted at rest
- **Input Validation**: Validate file type, size, and content

---

### 61. Get User Profile Information

Retrieve the profile information of a specific user account, including basic information, subscription details, limits, and usage.

**Endpoint**: `GET /api/v2/my/profile`

**URL**: `https://stg-api2.doconchain.com/api/v2/my/profile?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "message": "User profile retrieved successfully",
  "data": {
    "id": 0,
    "uuid": "string",
    "photo": null,
    "profile_id": 0,
    "verified": 0,
    "guest": 0,
    "company": "string",
    "industry": "string",
    "job_title": "string",
    "email": "string",
    "salutation": "string",
    "first_name": "string",
    "middle_name": "string",
    "last_name": "string",
    "country": "string",
    "notification": 0,
    "subscription": {
      "id": 0,
      "client_id": 0,
      "plan_id": 0,
      "price_id": 0,
      "payment_method_id": null,
      "reference_number": "string",
      "status": "string",
      "seat": 0,
      "plan": {
        "id": 0,
        "name": "string",
        "alias": "string",
        "details": "string",
        "cancellation": {}
      },
      "type": {
        "name": "string",
        "details": {}
      },
      "trial_type": "string",
      "next_billing_date": null,
      "name": "string",
      "email": "string",
      "email_cc": "string"
    },
    "payment_method": null,
    "migration_status": "string",
    "update_password": 0,
    "upload_limit": 0,
    "upload_usage": 0,
    "verify_limit": 0,
    "verify_usage": 0,
    "organization": "string",
    "org_invite": 0,
    "promotion_banner": 0,
    "grace_period": null
  },
  "meta": {}
}
```

#### Examples

**cURL**:
```bash
curl -X GET "https://stg-api2.doconchain.com/api/v2/my/profile?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/api/v2/my/profile',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Profile Data Structure

| Section | Fields | Description |
|---------|--------|-------------|
| **Basic Info** | id, uuid, email, names | Core user identification |
| **Profile Details** | company, industry, job_title, country | Professional information |
| **Account Status** | verified, guest, migration_status | Account verification and type |
| **Subscription** | plan, pricing, billing, limits | Subscription and usage details |
| **Usage Metrics** | upload_limit/usage, verify_limit/usage | Resource consumption tracking |
| **Organization** | organization, org_invite | Company and team associations |

#### Use Cases

- **Dashboard Display**: Show user profile information in dashboards
- **Account Management**: Display account details and settings
- **Usage Monitoring**: Track subscription limits and usage
- **Profile Updates**: Retrieve current profile data for editing
- **Integration**: Get user information for external systems

#### Important Notes

- **User-Specific**: Returns profile for the authenticated user only
- **Complete Profile**: Includes all user account information
- **Subscription Details**: Comprehensive subscription and billing information
- **Usage Tracking**: Real-time limits and usage statistics
- **Organization Info**: Includes organization membership details

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Active Account**: User account must be active
- **Valid Token**: Authentication token must be valid and current

#### Error Responses

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have profile access permissions
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to profile information"
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later"
  }
}
```

#### Best Practices

- **Caching**: Cache profile data with appropriate refresh intervals
- **Selective Display**: Show only relevant profile information in UI
- **Usage Alerts**: Monitor usage against limits and show warnings
- **Data Privacy**: Handle sensitive profile information securely
- **Regular Updates**: Refresh profile data periodically

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Data Privacy**: Protect sensitive personal and subscription information
- **Access Control**: Profile access limited to account owner
- **Audit Logging**: All profile access attempts logged
- **Information Disclosure**: Prevent unauthorized access to profile data
- **Token Security**: Secure authentication token handling

---

### 62. Update User Profile Information

Update the profile information of a specific user account.

**Endpoint**: `PUT /api/v2/my/profile`

**URL**: `https://stg-api2.doconchain.com/api/v2/my/profile?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters** (multipart/form-data):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `first_name` | string | No | The first name of the user |
| `last_name` | string | No | The last name of the user |
| `company` | string | No | The user's company name |
| `industry` | string | No | The industry associated with the user |
| `job_title` | string | No | The job title of the user |
| `country` | string | No | The country associated with the user |
| `salutation` | string | No | The salutation used for addressing the user |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "success": true,
  "data": {
    "updated_fields": ["first_name", "last_name"],
    "updated_at": "string"
  },
  "message": "Profile updated successfully"
}
```

#### Examples

**cURL**:
```bash
curl -X PUT "https://stg-api2.doconchain.com/api/v2/my/profile?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "first_name=John" \
  -F "last_name=Doe" \
  -F "company=ABC Corp"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('first_name', 'John');
formData.append('last_name', 'Doe');
formData.append('company', 'ABC Corp');

const options = {
  method: 'PUT',
  url: 'https://stg-api2.doconchain.com/api/v2/my/profile',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'multipart/form-data'
  },
  data: formData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Updateable Fields

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| **first_name** | string | 2-50 characters | Required for identification |
| **last_name** | string | 2-50 characters | Required for identification |
| **company** | string | 2-100 characters | Optional business information |
| **industry** | string | 2-50 characters | Optional industry classification |
| **job_title** | string | 2-100 characters | Optional professional title |
| **country** | string | Valid country code | Optional location information |
| **salutation** | string | Mr, Ms, Dr, etc. | Optional formal address |

#### Use Cases

- **Profile Management**: Update personal and professional information
- **Account Setup**: Complete user profile after registration
- **Information Correction**: Fix incorrect profile data
- **Professional Updates**: Update job title or company information
- **Compliance**: Maintain accurate user information for compliance

#### Important Notes

- **Partial Updates**: Only provided fields are updated
- **Validation**: All fields undergo validation before update
- **Audit Trail**: Profile changes are logged for compliance
- **Real-time Update**: Changes take effect immediately
- **User-Specific**: Only the authenticated user can update their profile

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Active Account**: User account must be active
- **Valid Data**: All provided data must pass validation
- **Ownership**: User can only update their own profile

#### Error Responses

**400 Bad Request**: Invalid data or validation errors
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid data provided for profile update",
    "details": {
      "first_name": "First name is required",
      "last_name": "Last name must be at least 2 characters"
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have update permissions
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to profile update"
  }
}
```

**422 Unprocessable Entity**: Data processing failed
```json
{
  "error": {
    "code": "PROCESSING_FAILED",
    "message": "Profile update could not be processed"
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later"
  }
}
```

#### Best Practices

- **Data Validation**: Validate data on client side before submission
- **Incremental Updates**: Update only fields that need changing
- **Confirmation**: Show confirmation before saving changes
- **Backup Data**: Keep original values for rollback if needed
- **User Feedback**: Provide clear success/failure messages

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Data Validation**: Strict validation of all input data
- **Audit Logging**: All profile update attempts logged
- **Access Control**: Users can only update their own profiles
- **Data Sanitization**: Input data sanitized to prevent injection
- **Change Tracking**: Profile changes tracked for security monitoring

---

### 63. Password Reset

Reset the user's password using a valid reset token.

**Endpoint**: `PUT /password/reset`

**URL**: `https://stg-api2.doconchain.com/password/reset?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Content-Type: multipart/form-data
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters** (multipart/form-data):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | The password reset token received via email |
| `password` | string | Yes | The new password for the user's account |
| `password_confirmation` | string | Yes | Confirmation of the new password |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "success": true,
  "message": "Password has been reset successfully"
}
```

#### Examples

**cURL**:
```bash
curl -X PUT "https://stg-api2.doconchain.com/password/reset?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "token=reset-token-12345" \
  -F "password=newSecurePassword123!" \
  -F "password_confirmation=newSecurePassword123!"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('token', 'reset-token-12345');
formData.append('password', 'newSecurePassword123!');
formData.append('password_confirmation', 'newSecurePassword123!');

const options = {
  method: 'PUT',
  url: 'https://stg-api2.doconchain.com/password/reset',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    'Content-Type': 'multipart/form-data'
  },
  data: formData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Password Requirements

| Requirement | Description | Example |
|-------------|-------------|---------|
| **Minimum Length** | At least 8 characters | `password123` |
| **Maximum Length** | No more than 128 characters | - |
| **Uppercase Letter** | At least one uppercase letter | `Password123` |
| **Lowercase Letter** | At least one lowercase letter | `PASSWORD123` |
| **Number** | At least one numeric digit | `Password` |
| **Special Character** | At least one special character | `Password123!` |
| **No Common Words** | Avoid common passwords | `password`, `123456`, `qwerty` |
| **No Personal Info** | Avoid names, dates, etc. | User's name, birthdate |

#### Use Cases

- **Forgotten Password**: Reset password when user cannot remember current password
- **Account Recovery**: Recover access to locked or compromised accounts
- **Security Enhancement**: Force password change for security reasons
- **Regular Updates**: Periodic password updates for security best practices

#### Important Notes

- **Token Validity**: Reset token must be valid and not expired
- **Single Use**: Reset token can only be used once
- **Time Limited**: Tokens typically expire after 24-48 hours
- **Secure Transmission**: Passwords transmitted over HTTPS only
- **Immediate Effect**: Password change takes effect immediately

#### Prerequisites

- **Valid Token**: User must have a valid reset token
- **Token Expiration**: Token must not be expired
- **Password Strength**: New password must meet security requirements
- **Confirmation Match**: Password and confirmation must match exactly

#### Error Responses

**400 Bad Request**: Invalid data or validation errors
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid data provided for password reset",
    "details": {
      "password": "Password must be at least 8 characters long",
      "password_confirmation": "Password confirmation does not match"
    }
  }
}
```

**401 Unauthorized**: Invalid or expired reset token
```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "The reset token is invalid or has expired"
  }
}
```

**422 Unprocessable Entity**: Password requirements not met
```json
{
  "error": {
    "code": "PASSWORD_REQUIREMENTS_NOT_MET",
    "message": "Password does not meet security requirements",
    "details": {
      "requirements": [
        "At least 8 characters",
        "At least one uppercase letter",
        "At least one lowercase letter",
        "At least one number",
        "At least one special character"
      ]
    }
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many password reset attempts. Please try again later"
  }
}
```

**500 Internal Server Error**: Server-side processing error
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An error occurred while processing the password reset"
  }
}
```

#### Best Practices

- **Token Security**: Never share reset tokens via insecure channels
- **Password Strength**: Use strong, unique passwords
- **Password Managers**: Consider using password management tools
- **Regular Changes**: Change passwords periodically for security
- **Multi-Factor**: Enable additional authentication methods when available

#### Security Considerations

- **Token-Based Reset**: Secure token validation prevents unauthorized resets
- **Password Encryption**: Passwords stored using strong encryption
- **Rate Limiting**: Prevents brute force attacks on reset endpoint
- **Audit Logging**: All password reset attempts logged for security monitoring
- **Token Expiration**: Time-limited tokens reduce security risks
- **HTTPS Only**: All password operations require secure connections
- **Password Policies**: Enforced password complexity requirements
- **Account Lockout**: Temporary lockouts after failed attempts

---

### 64. Update User Email

Update the email address associated with a user account.

**Endpoint**: `PUT /api/v2/account/email`

**URL**: `https://stg-api2.doconchain.com/api/v2/account/email?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters** (multipart/form-data):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | The new email address for the user |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "success": true,
  "data": {
    "email": "newemail@example.com",
    "verification_required": true,
    "updated_at": "2025-11-02T10:30:00Z"
  },
  "message": "Email update initiated. Please check your email for verification."
}
```

#### Examples

**cURL**:
```bash
curl -X PUT "https://stg-api2.doconchain.com/api/v2/account/email?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "email=newemail@example.com"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('email', 'newemail@example.com');

const options = {
  method: 'PUT',
  url: 'https://stg-api2.doconchain.com/api/v2/account/email',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'multipart/form-data'
  },
  data: formData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Email Validation Rules

| Rule | Description | Example |
|------|-------------|---------|
| **Format** | Valid email format (RFC 5322) | `user@domain.com` |
| **Length** | 5-254 characters total | - |
| **Local Part** | 1-64 characters before @ | `john.doe` |
| **Domain** | Valid domain format | `example.com` |
| **TLD** | Valid top-level domain | `.com`, `.org`, `.net` |
| **No Spaces** | No whitespace characters | `john doe@example.com` (invalid) |
| **Unique** | Email not already in use | - |

#### Email Verification Process

1. **Update Request**: User submits new email address
2. **Validation**: Email format and uniqueness validated
3. **Verification Email**: System sends verification link to new email
4. **Token Generation**: Unique verification token created
5. **User Confirmation**: User clicks verification link
6. **Email Update**: Email address updated upon verification
7. **Notification**: Confirmation sent to old email address

#### Use Cases

- **Email Change**: Update email address for account recovery
- **Account Migration**: Transfer account to new email address
- **Professional Updates**: Change work email address
- **Security Enhancement**: Update compromised email addresses
- **Account Recovery**: Regain access with new email

#### Important Notes

- **Verification Required**: Email changes require verification before taking effect
- **Old Email Access**: User retains access until verification completes
- **Unique Constraint**: New email must not be associated with another account
- **Audit Trail**: Email changes logged for security and compliance
- **Rollback Capability**: System maintains old email during transition

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Active Account**: User account must be active and verified
- **Valid Email**: New email must pass format validation
- **Unique Email**: Email address not already registered
- **Ownership**: User can only update their own email

#### Error Responses

**400 Bad Request**: Invalid email format or validation errors
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email address provided",
    "details": {
      "email": "Please provide a valid email address"
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have email update permissions
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to email update"
  }
}
```

**409 Conflict**: Email address already in use
```json
{
  "error": {
    "code": "EMAIL_CONFLICT",
    "message": "This email address is already associated with another account"
  }
}
```

**422 Unprocessable Entity**: Email processing failed
```json
{
  "error": {
    "code": "PROCESSING_FAILED",
    "message": "Email update could not be processed"
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many email update requests. Please try again later"
  }
}
```

#### Best Practices

- **Email Verification**: Always verify new email addresses
- **Backup Access**: Maintain access to old email during transition
- **Security Checks**: Validate email ownership before updates
- **User Notification**: Inform user of email change process
- **Audit Logging**: Log all email change attempts

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Email Verification**: Prevents unauthorized email changes
- **Uniqueness Enforcement**: Prevents account takeover attempts
- **Audit Logging**: All email update attempts logged
- **Rate Limiting**: Prevents abuse of email update functionality
- **Data Validation**: Strict email format validation
- **Transition Security**: Secure handling during email change process
- **Notification Security**: Secure notifications to old and new email addresses

---

### 65. Create Contact

Create a new contact in the user's network/contact list.

**Endpoint**: `POST /api/v2/network`

**URL**: `https://stg-api2.doconchain.com/api/v2/network?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
Content-Type: application/json
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters** (JSON):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `first_name` | string | Yes | The first name of the contact |
| `last_name` | string | Yes | The last name of the contact |
| `email` | string | Yes | The email address of the contact |
| `company` | string | No | The company name of the contact |
| `phone` | string | No | The phone number of the contact |
| `job_title` | string | No | The job title of the contact |
| `notes` | string | No | Additional notes about the contact |

#### Response

**Status**: `201 Created`

**Response Body**:
```json
{
  "success": true,
  "data": {
    "contact_id": "contact_12345",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "company": "ABC Corp",
    "created_at": "2025-11-02T10:30:00Z",
    "status": "active"
  },
  "message": "Contact created successfully"
}
```

#### Examples

**cURL**:
```bash
curl -X POST "https://stg-api2.doconchain.com/api/v2/network?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "company": "ABC Corp",
    "phone": "+1-555-0123",
    "job_title": "Software Engineer"
  }'
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const contactData = {
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  company: 'ABC Corp',
  phone: '+1-555-0123',
  job_title: 'Software Engineer',
  notes: 'Met at tech conference'
};

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/api/v2/network',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'application/json'
  },
  data: contactData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Contact Validation Rules

| Field | Validation | Description |
|-------|------------|-------------|
| **first_name** | 2-50 characters, alphanumeric + spaces | Required for contact identification |
| **last_name** | 2-50 characters, alphanumeric + spaces | Required for contact identification |
| **email** | Valid email format, unique in network | Required for contact communication |
| **company** | 2-100 characters (optional) | Optional business information |
| **phone** | Valid phone format (optional) | Optional contact number |
| **job_title** | 2-100 characters (optional) | Optional professional information |
| **notes** | 0-500 characters (optional) | Optional additional information |

#### Use Cases

- **Business Networking**: Add professional contacts for collaboration
- **Client Management**: Maintain client contact information
- **Team Building**: Add team members and colleagues
- **Lead Generation**: Store potential business leads
- **Contact Organization**: Build and organize contact networks

#### Important Notes

- **Unique Email**: Email addresses must be unique within user's network
- **Contact Ownership**: Contacts are private to the creating user
- **Data Privacy**: Contact information is securely stored
- **Audit Trail**: Contact creation and modifications are logged
- **Export Capability**: Contacts can be exported for backup

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Active Account**: User account must be active
- **Valid Data**: All provided data must pass validation
- **Unique Email**: Email not already in user's contact list

#### Error Responses

**400 Bad Request**: Invalid data or validation errors
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid contact data provided",
    "details": {
      "first_name": "First name is required",
      "email": "Please provide a valid email address",
      "last_name": "Last name must be at least 2 characters"
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**409 Conflict**: Contact with email already exists
```json
{
  "error": {
    "code": "CONTACT_EXISTS",
    "message": "A contact with this email address already exists in your network"
  }
}
```

**422 Unprocessable Entity**: Data processing failed
```json
{
  "error": {
    "code": "PROCESSING_FAILED",
    "message": "Contact creation could not be processed"
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many contact creation requests. Please try again later"
  }
}
```

#### Best Practices

- **Data Accuracy**: Ensure contact information is accurate and up-to-date
- **Privacy Compliance**: Respect contact privacy and data protection regulations
- **Regular Updates**: Keep contact information current
- **Categorization**: Use notes field to categorize contacts
- **Backup**: Regularly export contact data for backup

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Data Privacy**: Contact information protected and encrypted
- **Access Control**: Contacts accessible only to the owner
- **Audit Logging**: All contact operations logged for security
- **Data Validation**: Strict validation of all contact data
- **Unique Constraints**: Prevents duplicate contacts
- **Privacy Controls**: User controls over contact data sharing

---

### 66. Update Contact

Update an existing contact in the user's network/contact list.

**Endpoint**: `PUT /api/v2/network/{contactId}`

**URL**: `https://stg-api2.doconchain.com/api/v2/network/{contactId}?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
Content-Type: application/json
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `contactId` | string | Yes | The unique identifier of the contact to update |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters** (JSON):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `first_name` | string | No | The updated first name of the contact |
| `last_name` | string | No | The updated last name of the contact |
| `email` | string | No | The updated email address of the contact |
| `company` | string | No | The updated company name of the contact |
| `phone` | string | No | The updated phone number of the contact |
| `job_title` | string | No | The updated job title of the contact |
| `notes` | string | No | Updated additional notes about the contact |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "success": true,
  "data": {
    "contact_id": "contact_12345",
    "first_name": "John",
    "last_name": "Smith",
    "email": "john.smith@example.com",
    "company": "XYZ Corp",
    "updated_at": "2025-11-02T10:30:00Z",
    "updated_fields": ["last_name", "email", "company"]
  },
  "message": "Contact updated successfully"
}
```

#### Examples

**cURL**:
```bash
curl -X PUT "https://stg-api2.doconchain.com/api/v2/network/contact_12345?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "last_name": "Smith",
    "email": "john.smith@example.com",
    "company": "XYZ Corp",
    "job_title": "Senior Engineer"
  }'
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const contactId = 'contact_12345';
const updateData = {
  last_name: 'Smith',
  email: 'john.smith@example.com',
  company: 'XYZ Corp',
  job_title: 'Senior Engineer',
  notes: 'Updated contact information'
};

const options = {
  method: 'PUT',
  url: `https://stg-api2.doconchain.com/api/v2/network/${contactId}`,
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'application/json'
  },
  data: updateData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Update Rules

| Field | Partial Update | Validation | Notes |
|-------|----------------|------------|-------|
| **first_name** | Yes | 2-50 characters | Can be updated independently |
| **last_name** | Yes | 2-50 characters | Can be updated independently |
| **email** | Yes | Valid email, unique | Email uniqueness checked |
| **company** | Yes | 2-100 characters | Optional field |
| **phone** | Yes | Valid phone format | Optional field |
| **job_title** | Yes | 2-100 characters | Optional field |
| **notes** | Yes | 0-500 characters | Optional field |

#### Use Cases

- **Contact Information Updates**: Update contact details when they change
- **Professional Changes**: Update job titles, companies, or contact information
- **Data Correction**: Fix incorrect contact information
- **Information Enhancement**: Add missing contact details
- **Contact Maintenance**: Keep contact database current

#### Important Notes

- **Partial Updates**: Only provided fields are updated
- **Ownership Verification**: User must own the contact to update it
- **Email Uniqueness**: Updated email must not conflict with other contacts
- **Audit Trail**: All contact updates are logged
- **Version Control**: Contact update history maintained

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Contact Ownership**: User must own the contact being updated
- **Valid Contact ID**: Contact ID must exist and be valid
- **Valid Data**: All provided data must pass validation

#### Error Responses

**400 Bad Request**: Invalid data or validation errors
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid contact update data provided",
    "details": {
      "email": "Please provide a valid email address",
      "first_name": "First name must be at least 2 characters"
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not own the contact
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to this contact"
  }
}
```

**404 Not Found**: Contact not found
```json
{
  "error": {
    "code": "CONTACT_NOT_FOUND",
    "message": "The specified contact does not exist"
  }
}
```

**409 Conflict**: Email address already in use by another contact
```json
{
  "error": {
    "code": "EMAIL_CONFLICT",
    "message": "This email address is already associated with another contact"
  }
}
```

**422 Unprocessable Entity**: Update processing failed
```json
{
  "error": {
    "code": "PROCESSING_FAILED",
    "message": "Contact update could not be processed"
  }
}
```

#### Best Practices

- **Incremental Updates**: Update only fields that need changing
- **Data Validation**: Validate data before submission
- **Backup Information**: Keep original values for rollback if needed
- **User Confirmation**: Confirm updates before saving changes
- **Regular Maintenance**: Keep contact information current

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Ownership Verification**: Users can only update their own contacts
- **Data Validation**: Strict validation of all update data
- **Audit Logging**: All contact update operations logged
- **Access Control**: Contact ownership verified before updates
- **Data Privacy**: Contact information remains private to owner
- **Change Tracking**: Contact modifications tracked for security

---

### 67. Delete Contact

Permanently delete a contact from the user's network/contact list.

**Endpoint**: `DELETE /api/v2/network/{contactId}`

**URL**: `https://stg-api2.doconchain.com/api/v2/network/{contactId}?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `contactId` | string | Yes | The unique identifier of the contact to delete |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters**: None

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "success": true,
  "data": {
    "contact_id": "contact_12345",
    "deleted_at": "2025-11-02T10:30:00Z"
  },
  "message": "Contact deleted successfully"
}
```

#### Examples

**cURL**:
```bash
curl -X DELETE "https://stg-api2.doconchain.com/api/v2/network/contact_12345?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const contactId = 'contact_12345';

const options = {
  method: 'DELETE',
  url: `https://stg-api2.doconchain.com/api/v2/network/${contactId}`,
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Deletion Behavior

| Aspect | Behavior | Notes |
|--------|----------|-------|
| **Permanence** | Permanent deletion | Contact cannot be recovered |
| **Data Removal** | Complete removal | All contact data deleted |
| **Relationships** | Cascade effects | May affect related documents or shares |
| **Audit Trail** | Deletion logged | Deletion event recorded for compliance |
| **Recovery** | No recovery | Deleted contacts cannot be restored |

#### Use Cases

- **Contact Cleanup**: Remove outdated or incorrect contacts
- **Privacy Compliance**: Delete contacts per data protection regulations
- **Account Management**: Remove contacts when relationships end
- **Data Minimization**: Reduce contact database size
- **Contact Maintenance**: Regular cleanup of contact lists

#### Important Notes

- **Irreversible Action**: Deletion cannot be undone
- **Ownership Verification**: Only contact owner can delete
- **Cascade Effects**: May affect shared documents or permissions
- **Audit Logging**: All deletions logged for compliance
- **Data Privacy**: Complete removal of personal information

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Contact Ownership**: User must own the contact being deleted
- **Valid Contact ID**: Contact ID must exist and be valid
- **Confirmation**: Consider implementing user confirmation for deletion

#### Error Responses

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not own the contact
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to this contact"
  }
}
```

**404 Not Found**: Contact not found
```json
{
  "error": {
    "code": "CONTACT_NOT_FOUND",
    "message": "The specified contact does not exist"
  }
}
```

**409 Conflict**: Contact cannot be deleted due to dependencies
```json
{
  "error": {
    "code": "DELETE_CONFLICT",
    "message": "Contact cannot be deleted due to existing dependencies",
    "details": {
      "dependencies": ["shared_document_123", "pending_invitation_456"]
    }
  }
}
```

**422 Unprocessable Entity**: Deletion processing failed
```json
{
  "error": {
    "code": "PROCESSING_FAILED",
    "message": "Contact deletion could not be processed"
  }
}
```

#### Best Practices

- **User Confirmation**: Require explicit confirmation before deletion
- **Dependency Check**: Verify no critical dependencies before deletion
- **Backup Consideration**: Consider contact export before deletion
- **Audit Review**: Review deletion logs for compliance
- **Gradual Cleanup**: Delete contacts in batches to avoid issues

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Ownership Verification**: Users can only delete their own contacts
- **Audit Logging**: All contact deletion operations logged
- **Access Control**: Contact ownership verified before deletion
- **Data Privacy**: Complete removal of contact data
- **Dependency Protection**: Prevents deletion of contacts with active dependencies
- **Compliance Logging**: Deletion events logged for regulatory compliance

---

### 68. Get Organizations

Retrieve a list of organizations based on the specified user type.

**Endpoint**: `GET /api/v2/organizations`

**URL**: `https://stg-api2.doconchain.com/api/v2/organizations?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user for filtering organizations (e.g., ENTERPRISE_API) |

**Body Parameters**: None

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "success": true,
  "data": {
    "organizations": [
      {
        "id": "org_12345",
        "name": "ABC Corporation",
        "type": "ENTERPRISE",
        "description": "Leading technology company",
        "created_at": "2025-01-15T08:30:00Z",
        "updated_at": "2025-11-01T14:20:00Z",
        "status": "active",
        "member_count": 150,
        "plan": "ENTERPRISE_PREMIUM"
      },
      {
        "id": "org_67890",
        "name": "XYZ Industries",
        "type": "ENTERPRISE",
        "description": "Manufacturing and distribution",
        "created_at": "2025-03-22T10:15:00Z",
        "updated_at": "2025-10-28T16:45:00Z",
        "status": "active",
        "member_count": 75,
        "plan": "ENTERPRISE_STANDARD"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 2,
      "total_pages": 1
    }
  },
  "message": "Organizations retrieved successfully"
}
```

#### Examples

**cURL**:
```bash
curl -X GET "https://stg-api2.doconchain.com/api/v2/organizations?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/api/v2/organizations',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Organization Data Structure

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| **id** | string | Unique organization identifier | `org_12345` |
| **name** | string | Organization display name | `ABC Corporation` |
| **type** | string | Organization type/category | `ENTERPRISE` |
| **description** | string | Organization description | `Leading technology company` |
| **created_at** | string | ISO 8601 creation timestamp | `2025-01-15T08:30:00Z` |
| **updated_at** | string | ISO 8601 last update timestamp | `2025-11-01T14:20:00Z` |
| **status** | string | Organization status | `active`, `inactive`, `suspended` |
| **member_count** | integer | Number of organization members | `150` |
| **plan** | string | Subscription plan type | `ENTERPRISE_PREMIUM` |

#### Organization Types

| Type | Description | Access Level |
|------|-------------|--------------|
| **ENTERPRISE** | Large organizations with multiple users | Full API access |
| **BUSINESS** | Medium-sized businesses | Standard features |
| **STARTUP** | New companies and startups | Basic features |
| **INDIVIDUAL** | Single user organizations | Limited features |

#### Use Cases

- **Organization Selection**: Display available organizations for user selection
- **Account Management**: Show organizations user belongs to
- **Administrative Tasks**: List organizations for management purposes
- **Integration Setup**: Retrieve organization details for API integrations
- **Reporting**: Generate organization-based reports

#### Important Notes

- **User Type Filtering**: Organizations filtered by user_type parameter
- **Authorization Required**: Bearer token authentication mandatory
- **Pagination Support**: Large result sets are paginated
- **Real-time Data**: Organization data reflects current state
- **Access Control**: Users see only authorized organizations

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Valid User Type**: user_type parameter must be valid
- **Organization Access**: User must have access to view organizations

#### Error Responses

**400 Bad Request**: Invalid user_type parameter
```json
{
  "error": {
    "code": "INVALID_USER_TYPE",
    "message": "Invalid user_type parameter provided",
    "details": {
      "user_type": "Must be one of: ENTERPRISE_API, BUSINESS_API, etc."
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have organization access permissions
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to organization data"
  }
}
```

**422 Unprocessable Entity**: Data processing failed
```json
{
  "error": {
    "code": "PROCESSING_FAILED",
    "message": "Organization data could not be retrieved"
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many organization requests. Please try again later"
  }
}
```

#### Best Practices

- **Caching**: Cache organization data to reduce API calls
- **Incremental Updates**: Use updated_at timestamps for efficient syncing
- **Error Handling**: Implement robust error handling for API failures
- **User Experience**: Display organization data in user-friendly format
- **Security**: Never expose sensitive organization data in client-side code

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Access Control**: Users can only view authorized organizations
- **Data Filtering**: Organizations filtered by user permissions
- **Audit Logging**: All organization access attempts logged
- **Rate Limiting**: Prevents abuse of organization listing
- **Data Privacy**: Organization information protected
- **Token Security**: Secure authentication token handling

---

### 69. Create Organization

Create a new organization with an initial owner and send activation email.

**Endpoint**: `POST /api/v2/organizations`

**URL**: `https://stg-api2.doconchain.com/api/v2/organizations?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters** (multipart/form-data):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | The name of the organization |
| `email` | string | Yes | The email address of the organization owner |
| `address` | string | No | The physical address of the organization |
| `sub_organization_type_name` | string | No | The type/category of the sub-organization |
| `phone` | string | No | The phone number of the organization |
| `website` | string | No | The website URL of the organization |
| `industry` | string | No | The industry sector of the organization |

#### Response

**Status**: `201 Created`

**Response Body**:
```json
{
  "success": true,
  "data": {
    "organization_id": "org_12345",
    "name": "ABC Corporation",
    "email": "admin@abc-corp.com",
    "address": "123 Business St, City, State 12345",
    "sub_organization_type_name": "Technology",
    "status": "pending_activation",
    "owner_id": "user_67890",
    "created_at": "2025-11-02T10:30:00Z",
    "activation_token": "temp_activation_abc123"
  },
  "message": "Organization created successfully. Activation email sent to owner."
}
```

#### Examples

**cURL**:
```bash
curl -X POST "https://stg-api2.doconchain.com/api/v2/organizations?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "name=ABC Corporation" \
  -F "email=admin@abc-corp.com" \
  -F "address=123 Business St, City, State 12345" \
  -F "sub_organization_type_name=Technology" \
  -F "phone=+1-555-0123" \
  -F "industry=Software Development"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('name', 'ABC Corporation');
formData.append('email', 'admin@abc-corp.com');
formData.append('address', '123 Business St, City, State 12345');
formData.append('sub_organization_type_name', 'Technology');
formData.append('phone', '+1-555-0123');
formData.append('industry', 'Software Development');

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/api/v2/organizations',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'multipart/form-data'
  },
  data: formData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Organization Creation Process

1. **Validation**: Input data validated for format and uniqueness
2. **Owner Creation**: Organization owner account created with temporary password
3. **Organization Setup**: Organization record created with provided details
4. **Email Notification**: Activation email sent to owner with temporary credentials
5. **Status Setting**: Organization status set to "pending_activation"
6. **Audit Logging**: Creation event logged for compliance

#### Email Activation Process

| Step | Description | Timeline |
|------|-------------|----------|
| **Email Sent** | Activation email dispatched to owner | Immediate |
| **Temporary Password** | Secure temporary password generated | Auto-generated |
| **Activation Link** | Unique activation URL provided | 24-48 hours valid |
| **Account Activation** | Owner completes activation process | Within validity period |
| **Password Reset** | Owner sets permanent password | After activation |
| **Organization Access** | Full organization access granted | After activation |

#### Validation Rules

| Field | Validation | Description |
|-------|------------|-------------|
| **name** | 2-100 characters, unique | Organization display name |
| **email** | Valid email, unique | Owner's email address |
| **address** | 10-500 characters (optional) | Physical address |
| **sub_organization_type_name** | 2-50 characters (optional) | Organization category |
| **phone** | Valid phone format (optional) | Contact phone number |
| **website** | Valid URL format (optional) | Organization website |
| **industry** | 2-50 characters (optional) | Industry sector |

#### Use Cases

- **New Business Setup**: Create organization for new business entities
- **Enterprise Onboarding**: Set up enterprise accounts with proper structure
- **Client Organization**: Create organizations for client management
- **Department Setup**: Establish sub-organizations within larger entities
- **Account Provisioning**: Automated organization creation for new users

#### Important Notes

- **Email Uniqueness**: Organization email must be unique across system
- **Owner Creation**: Automatically creates organization owner account
- **Temporary Access**: Owner receives temporary password via email
- **Activation Required**: Organization inactive until owner activates account
- **Audit Trail**: All organization creation events logged

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Authorization**: User must have organization creation permissions
- **Unique Email**: Organization email not already registered
- **Valid Data**: All provided data must pass validation

#### Error Responses

**400 Bad Request**: Invalid data or validation errors
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid organization data provided",
    "details": {
      "name": "Organization name is required",
      "email": "Please provide a valid email address",
      "address": "Address must be at least 10 characters"
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have organization creation permissions
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to create organizations"
  }
}
```

**409 Conflict**: Organization email already exists
```json
{
  "error": {
    "code": "EMAIL_CONFLICT",
    "message": "An organization with this email already exists"
  }
}
```

**422 Unprocessable Entity**: Organization creation failed
```json
{
  "error": {
    "code": "PROCESSING_FAILED",
    "message": "Organization creation could not be processed"
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many organization creation requests. Please try again later"
  }
}
```

#### Best Practices

- **Data Validation**: Validate all input data before submission
- **Unique Identification**: Ensure organization names and emails are unique
- **Secure Communication**: Use secure channels for organization setup
- **User Guidance**: Provide clear instructions for account activation
- **Audit Compliance**: Maintain detailed logs of organization creation

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Permission Checks**: Users must have creation permissions
- **Data Validation**: Strict validation of all organization data
- **Email Security**: Secure email delivery for activation credentials
- **Audit Logging**: All organization creation events logged
- **Temporary Credentials**: Secure generation of temporary passwords
- **Access Control**: Proper permission checks for organization creation

---

### 70. Update Organization

Update the details and branding of an existing organization.

**Endpoint**: `PUT /api/v2/organizations`

**URL**: `https://stg-api2.doconchain.com/api/v2/organizations?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters** (multipart/form-data):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | No | The updated name of the organization |
| `address` | string | No | The updated physical address of the organization |
| `photo` | file | No | Banner image file for organization branding (JPG, PNG, max 5MB) |
| `avatar` | file | No | Profile picture file for organization (JPG, PNG, max 2MB) |
| `organization_link` | string | No | The website URL of the organization |
| `phone` | string | No | The updated phone number of the organization |
| `description` | string | No | Updated description of the organization |
| `industry` | string | No | Updated industry sector |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "success": true,
  "data": {
    "organization_id": "org_12345",
    "name": "Updated Corporation Name",
    "address": "456 New Business Ave, City, State 67890",
    "organization_link": "https://updated-corp.com",
    "photo_url": "https://cdn.doconchain.com/org_12345/banner.jpg",
    "avatar_url": "https://cdn.doconchain.com/org_12345/avatar.jpg",
    "updated_at": "2025-11-02T10:30:00Z",
    "updated_fields": ["name", "address", "photo", "organization_link"]
  },
  "message": "Organization updated successfully"
}
```

#### Examples

**cURL**:
```bash
curl -X PUT "https://stg-api2.doconchain.com/api/v2/organizations?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "name=Updated Corporation Name" \
  -F "address=456 New Business Ave, City, State 67890" \
  -F "organization_link=https://updated-corp.com" \
  -F "photo=@/path/to/banner.jpg" \
  -F "avatar=@/path/to/avatar.jpg"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('name', 'Updated Corporation Name');
formData.append('address', '456 New Business Ave, City, State 67890');
formData.append('organization_link', 'https://updated-corp.com');
formData.append('phone', '+1-555-0987');
formData.append('description', 'Updated organization description');

// Add image files
const bannerFile = document.getElementById('banner-input').files[0];
const avatarFile = document.getElementById('avatar-input').files[0];

if (bannerFile) formData.append('photo', bannerFile);
if (avatarFile) formData.append('avatar', avatarFile);

const options = {
  method: 'PUT',
  url: 'https://stg-api2.doconchain.com/api/v2/organizations',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'multipart/form-data'
  },
  data: formData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### File Upload Specifications

| File Type | Field | Max Size | Allowed Formats | Dimensions |
|-----------|-------|----------|-----------------|------------|
| **Banner Photo** | `photo` | 5MB | JPG, PNG, GIF | 1200x400px recommended |
| **Avatar** | `avatar` | 2MB | JPG, PNG | 200x200px recommended |
| **Logo** | `logo` | 1MB | JPG, PNG, SVG | 300x100px recommended |

#### Image Processing

| Process | Description | Purpose |
|---------|-------------|---------|
| **Format Validation** | Check file type and size | Security and compatibility |
| **Resize** | Automatic resizing to standard dimensions | Consistent display |
| **Compression** | Optimize file size | Performance improvement |
| **CDN Storage** | Upload to content delivery network | Fast global access |
| **URL Generation** | Generate public access URLs | Easy integration |

#### Update Permissions

| User Role | Permissions | Scope |
|-----------|-------------|-------|
| **Organization Owner** | Full update access | All organization fields |
| **Admin** | Limited updates | Basic info, no branding |
| **Member** | Read-only | No update permissions |
| **Super Admin** | Full system access | All organizations |

#### Use Cases

- **Rebranding**: Update organization name, logo, and branding assets
- **Contact Updates**: Change address, phone, and website information
- **Profile Enhancement**: Add or update organization description and industry
- **Visual Updates**: Change banner photos and avatar images
- **Information Maintenance**: Keep organization details current

#### Important Notes

- **Partial Updates**: Only provided fields are updated
- **File Processing**: Images are processed and stored on CDN
- **URL Generation**: Public URLs provided for uploaded images
- **Permission Checks**: User must have organization update permissions
- **Audit Trail**: All organization updates logged

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Organization Access**: User must have update permissions for the organization
- **Valid Files**: Uploaded files must meet size and format requirements
- **Valid Data**: All provided data must pass validation

#### Error Responses

**400 Bad Request**: Invalid data or file upload errors
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid organization update data provided",
    "details": {
      "photo": "File size exceeds 5MB limit",
      "avatar": "Invalid file format. Only JPG and PNG allowed",
      "organization_link": "Please provide a valid URL"
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have organization update permissions
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to update organization"
  }
}
```

**404 Not Found**: Organization not found
```json
{
  "error": {
    "code": "ORGANIZATION_NOT_FOUND",
    "message": "The specified organization does not exist"
  }
}
```

**413 Payload Too Large**: File size exceeds limits
```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "Uploaded file exceeds size limit",
    "details": {
      "max_size": "5MB for banner, 2MB for avatar"
    }
  }
}
```

**422 Unprocessable Entity**: Update processing failed
```json
{
  "error": {
    "code": "PROCESSING_FAILED",
    "message": "Organization update could not be processed"
  }
}
```

#### Best Practices

- **File Optimization**: Compress images before upload
- **Progressive Updates**: Update fields incrementally
- **Backup Assets**: Keep original branding files
- **User Confirmation**: Confirm updates before saving
- **Version Control**: Track branding changes over time

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Permission Verification**: Users must have update permissions
- **File Validation**: Strict validation of uploaded files
- **Content Scanning**: Security scan of uploaded images
- **Audit Logging**: All organization updates logged
- **Access Control**: Role-based permissions for updates
- **Data Privacy**: Organization information remains secure

---

### 71. Delete Organization

Permanently delete an organization and all its sub-organizations.

**Endpoint**: `DELETE /api/v2/organizations`

**URL**: `https://stg-api2.doconchain.com/api/v2/organizations?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters**: None

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "success": true,
  "data": {
    "organization_id": "org_12345",
    "deleted_at": "2025-11-02T10:30:00Z",
    "sub_organizations_deleted": 3,
    "total_members_removed": 0
  },
  "message": "Organization and all sub-organizations deleted successfully"
}
```

#### Examples

**cURL**:
```bash
curl -X DELETE "https://stg-api2.doconchain.com/api/v2/organizations?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'DELETE',
  url: 'https://stg-api2.doconchain.com/api/v2/organizations',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Deletion Constraints

| Constraint | Description | Reason |
|------------|-------------|--------|
| **No Members** | Organization must have zero members | Prevent orphaned users |
| **No Admins** | All administrators must be removed | Maintain access control |
| **No Sub-org Members** | Sub-organizations must also be empty | Complete cleanup |
| **No Active Projects** | All projects must be archived/deleted | Data integrity |
| **No Pending Invites** | All invitations must be cancelled | Clean state |

#### Cascade Deletion Process

1. **Validation**: Check all deletion constraints are met
2. **Sub-organization Deletion**: Delete all sub-organizations first
3. **Data Cleanup**: Remove all organization-related data
4. **File Deletion**: Remove uploaded files and assets
5. **Audit Logging**: Log complete deletion event
6. **Confirmation**: Return deletion confirmation

#### Data Removal Scope

| Data Type | Removal Method | Notes |
|-----------|----------------|-------|
| **Organization Record** | Permanent deletion | Complete removal |
| **Sub-organizations** | Cascade deletion | All levels removed |
| **User Memberships** | Automatic cleanup | No orphaned records |
| **Uploaded Files** | CDN deletion | Storage cleanup |
| **Audit Logs** | Retention policy | Compliance requirements |
| **API Keys** | Immediate revocation | Security measure |

#### Use Cases

- **Organization Dissolution**: Remove defunct organizations
- **Account Cleanup**: Remove test or demo organizations
- **Compliance Requirements**: Delete organizations per regulations
- **Data Minimization**: Remove unused organization data
- **System Maintenance**: Clean up inactive accounts

#### Important Notes

- **Irreversible Action**: Deletion cannot be undone
- **Complete Removal**: All organization data permanently deleted
- **Member Check**: System validates no members remain
- **Cascade Effect**: Sub-organizations automatically deleted
- **Audit Trail**: Deletion events permanently logged

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Organization Ownership**: User must own the organization
- **Empty Organization**: No members or sub-organization members
- **Super Admin Rights**: May require elevated permissions

#### Error Responses

**400 Bad Request**: Organization not eligible for deletion
```json
{
  "error": {
    "code": "DELETION_CONSTRAINTS_NOT_MET",
    "message": "Organization cannot be deleted due to existing constraints",
    "details": {
      "active_members": 5,
      "sub_organizations_with_members": 2,
      "pending_invitations": 3
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have organization deletion permissions
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to delete organization"
  }
}
```

**404 Not Found**: Organization not found
```json
{
  "error": {
    "code": "ORGANIZATION_NOT_FOUND",
    "message": "The specified organization does not exist"
  }
}
```

**409 Conflict**: Organization has dependencies preventing deletion
```json
{
  "error": {
    "code": "DEPENDENCY_CONFLICT",
    "message": "Organization has dependencies that prevent deletion",
    "details": {
      "active_projects": ["project_123", "project_456"],
      "shared_documents": 15
    }
  }
}
```

**422 Unprocessable Entity**: Deletion processing failed
```json
{
  "error": {
    "code": "PROCESSING_FAILED",
    "message": "Organization deletion could not be processed"
  }
}
```

#### Best Practices

- **Pre-deletion Checklist**: Verify all constraints before attempting deletion
- **Member Migration**: Move members to other organizations if needed
- **Data Backup**: Export important data before deletion
- **User Communication**: Notify affected users before deletion
- **Gradual Process**: Delete sub-organizations individually if needed

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Ownership Verification**: Users can only delete owned organizations
- **Constraint Validation**: Strict checks prevent unauthorized deletions
- **Audit Logging**: All deletion attempts and successes logged
- **Data Privacy**: Complete removal of organization data
- **Access Control**: Elevated permissions required for deletion
- **Dependency Protection**: Prevents deletion of organizations with active dependencies

---

### 72. Transfer Organization Ownership

Transfer ownership of an organization to another member, changing roles accordingly.

**Endpoint**: `POST /api/v2/organizations/transfer`

**URL**: `https://stg-api2.doconchain.com/api/v2/organizations/transfer?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
Content-Type: application/json
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters** (JSON):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `member_id` | integer | Yes | The ID of the member to transfer ownership to |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "success": true,
  "data": {
    "organization_id": "org_12345",
    "previous_owner_id": "user_67890",
    "new_owner_id": "user_54321",
    "transfer_completed_at": "2025-11-02T10:30:00Z",
    "role_changes": {
      "previous_owner": "owner",
      "new_owner": "owner",
      "transferring_user": "admin"
    }
  },
  "message": "Organization ownership transferred successfully"
}
```

#### Examples

**cURL**:
```bash
curl -X POST "https://stg-api2.doconchain.com/api/v2/organizations/transfer?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "member_id": 54321
  }'
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const transferData = {
  member_id: 54321
};

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/api/v2/organizations/transfer',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'application/json'
  },
  data: transferData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Role Changes During Transfer

| User Type | Before Transfer | After Transfer | Notes |
|-----------|-----------------|----------------|-------|
| **Current Owner** | `owner` | `admin` | Loses ownership but retains admin privileges |
| **New Owner** | `admin` or `member` | `owner` | Gains full ownership rights |
| **Other Admins** | `admin` | `admin` | No change in role |
| **Members** | `member` | `member` | No change in role |

#### Transfer Process

1. **Validation**: Verify requesting user is current owner
2. **Member Check**: Confirm target member exists and is active
3. **Permission Check**: Ensure target member can become owner
4. **Role Update**: Transfer owner role to target member
5. **Previous Owner**: Demote current owner to admin role
6. **Notification**: Send notifications to affected users
7. **Audit Logging**: Log the ownership transfer event

#### Transfer Requirements

| Requirement | Description | Validation |
|-------------|-------------|------------|
| **Current Owner** | Only current owner can initiate transfer | Verified by authentication |
| **Active Member** | Target must be active organization member | Checked in database |
| **Valid Permissions** | Target must have appropriate permissions | Role-based validation |
| **Organization Status** | Organization must be active | Status verification |
| **No Pending Actions** | No critical pending actions | Business rule check |

#### Use Cases

- **Succession Planning**: Transfer ownership during leadership changes
- **Account Management**: Reassign ownership for administrative reasons
- **Business Transitions**: Transfer ownership during mergers or acquisitions
- **User Departure**: Transfer ownership when original owner leaves
- **Role Reassignment**: Reorganize ownership structure

#### Important Notes

- **Irreversible Action**: Ownership transfer cannot be undone
- **Role Demotion**: Current owner becomes admin after transfer
- **Immediate Effect**: Transfer takes effect immediately
- **Notification System**: Affected users receive notifications
- **Audit Trail**: Transfer events are permanently logged

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Organization Ownership**: User must be the current organization owner
- **Valid Member ID**: Target member must exist in the organization
- **Active Organization**: Organization must be in active status
- **Member Permissions**: Target member must be eligible for ownership

#### Error Responses

**400 Bad Request**: Invalid member ID or transfer not allowed
```json
{
  "error": {
    "code": "INVALID_TRANSFER_REQUEST",
    "message": "Invalid member ID or transfer conditions not met",
    "details": {
      "member_id": "Member not found in organization",
      "requirements": "Target member must be active and eligible"
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have ownership transfer permissions
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to transfer organization ownership"
  }
}
```

**404 Not Found**: Organization or member not found
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Organization or target member not found"
  }
}
```

**409 Conflict**: Transfer conflicts with business rules
```json
{
  "error": {
    "code": "TRANSFER_CONFLICT",
    "message": "Transfer cannot be completed due to conflicts",
    "details": {
      "conflicts": ["Organization has pending critical actions", "Target member has insufficient permissions"]
    }
  }
}
```

**422 Unprocessable Entity**: Transfer processing failed
```json
{
  "error": {
    "code": "PROCESSING_FAILED",
    "message": "Organization ownership transfer could not be processed"
  }
}
```

#### Best Practices

- **Pre-transfer Planning**: Plan ownership transitions carefully
- **Successor Preparation**: Ensure new owner understands responsibilities
- **Documentation**: Document transfer reasons and new ownership structure
- **Communication**: Inform all stakeholders of the transfer
- **Training**: Provide training to new owner if needed

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Ownership Verification**: Only current owners can initiate transfers
- **Permission Validation**: Strict validation of transfer permissions
- **Audit Logging**: All ownership transfers logged for security
- **Access Control**: Role-based restrictions on transfer capabilities
- **Data Privacy**: Organization data remains secure during transfer
- **Notification Security**: Secure notifications to affected parties

---

### 73. Get Organization Members

Retrieve a list of all members (owner, admins, and members) in the organization.

**Endpoint**: `GET /api/v2/organization/members`

**URL**: `https://stg-api2.doconchain.com/api/v2/organization/members?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters**: None

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "success": true,
  "data": {
    "organization_id": "org_12345",
    "organization_name": "ABC Corporation",
    "total_members": 15,
    "members": [
      {
        "id": "user_67890",
        "name": "John Smith",
        "email": "john.smith@abc-corp.com",
        "role": "owner",
        "status": "active",
        "joined_at": "2025-01-15T08:30:00Z",
        "last_active": "2025-11-01T14:20:00Z",
        "permissions": ["manage_organization", "manage_members", "view_reports"]
      },
      {
        "id": "user_54321",
        "name": "Jane Doe",
        "email": "jane.doe@abc-corp.com",
        "role": "admin",
        "status": "active",
        "joined_at": "2025-02-20T10:15:00Z",
        "last_active": "2025-10-30T16:45:00Z",
        "permissions": ["manage_members", "view_reports", "create_projects"]
      },
      {
        "id": "user_11111",
        "name": "Bob Johnson",
        "email": "bob.johnson@abc-corp.com",
        "role": "member",
        "status": "active",
        "joined_at": "2025-03-10T09:00:00Z",
        "last_active": "2025-11-02T11:30:00Z",
        "permissions": ["create_projects", "view_own_projects"]
      }
    ]
  },
  "message": "Organization members retrieved successfully"
}
```

#### Examples

**cURL**:
```bash
curl -X GET "https://stg-api2.doconchain.com/api/v2/organization/members?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/api/v2/organization/members',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Member Roles and Permissions

| Role | Description | Permissions |
|------|-------------|-------------|
| **Owner** | Organization creator with full control | All permissions including organization management |
| **Admin** | Elevated permissions for management | Member management, project oversight, reporting |
| **Member** | Standard user with basic access | Project creation, personal document management |

#### Member Status Types

| Status | Description | Access Level |
|--------|-------------|--------------|
| **Active** | Full access to organization resources | Complete access based on role |
| **Inactive** | Limited access, account suspended | Read-only access to own data |
| **Pending** | Invitation sent, not yet activated | No access until activation |
| **Suspended** | Temporarily blocked due to policy violation | No access, pending review |

#### Member Data Structure

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| **id** | string | Unique member identifier | `user_67890` |
| **name** | string | Full display name | `John Smith` |
| **email** | string | Email address | `john.smith@abc-corp.com` |
| **role** | string | Organization role | `owner`, `admin`, `member` |
| **status** | string | Account status | `active`, `inactive`, `pending` |
| **joined_at** | string | ISO 8601 join timestamp | `2025-01-15T08:30:00Z` |
| **last_active** | string | ISO 8601 last activity | `2025-11-01T14:20:00Z` |
| **permissions** | array | List of granted permissions | `["create_projects", "view_reports"]` |

#### Use Cases

- **Member Management**: View all organization members and their roles
- **Access Control**: Verify member permissions and status
- **Reporting**: Generate member activity and role reports
- **User Administration**: Manage member accounts and permissions
- **Audit Compliance**: Track member access and activity

#### Important Notes

- **Role-Based Access**: Members see different data based on their role
- **Real-time Data**: Member information reflects current state
- **Activity Tracking**: Last active timestamps show engagement
- **Permission Granularity**: Detailed permission lists for access control
- **Status Monitoring**: Track member account status and health

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Organization Access**: User must belong to an organization
- **Valid User Type**: user_type parameter must be valid
- **Member Permissions**: User must have permission to view members

#### Error Responses

**400 Bad Request**: Invalid user_type parameter
```json
{
  "error": {
    "code": "INVALID_USER_TYPE",
    "message": "Invalid user_type parameter provided",
    "details": {
      "user_type": "Must be one of: ENTERPRISE_API, BUSINESS_API, etc."
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have member viewing permissions
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to view organization members"
  }
}
```

**404 Not Found**: Organization not found
```json
{
  "error": {
    "code": "ORGANIZATION_NOT_FOUND",
    "message": "Organization not found or not accessible"
  }
}
```

**422 Unprocessable Entity**: Data processing failed
```json
{
  "error": {
    "code": "PROCESSING_FAILED",
    "message": "Member data could not be retrieved"
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many member requests. Please try again later"
  }
}
```

#### Best Practices

- **Caching**: Cache member data to reduce API calls
- **Incremental Updates**: Use last_active timestamps for efficient syncing
- **Privacy Compliance**: Respect member data privacy regulations
- **Access Logging**: Log member data access for audit purposes
- **User Experience**: Display member information in user-friendly format

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Role-Based Access**: Members can only view authorized information
- **Data Filtering**: Sensitive information filtered based on permissions
- **Audit Logging**: All member data access attempts logged
- **Privacy Protection**: Member personal information protected
- **Access Control**: Granular permissions control data visibility
- **Data Encryption**: Member data encrypted in transit and at rest

---

### 74. Add Organization Member

Add a new member to an organization and send an invitation email.

**Endpoint**: `POST /api/v2/organization/members/add`

**URL**: `https://stg-api2.doconchain.com/api/v2/organization/members/add?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters** (multipart/form-data):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `data[0][email]` | string | Yes | Email address of the member to be added |
| `data[0][first_name]` | string | Yes | First name of the member to be added |
| `data[0][last_name]` | string | Yes | Last name of the member to be added |
| `data[0][role]` | string | Yes | Role of the member (admin, member) |
| `data[0][organization_id]` | integer | Yes | ID of the organization to add the member to |

#### Response

**Status**: `201 Created`

**Response Body**:
```json
{
  "success": true,
  "data": {
    "member_id": "user_11111",
    "email": "new.member@company.com",
    "first_name": "New",
    "last_name": "Member",
    "role": "member",
    "organization_id": "org_12345",
    "invitation_sent": true,
    "invitation_token": "invite_abc123def456",
    "status": "pending_invitation",
    "invited_at": "2025-11-02T10:30:00Z",
    "expires_at": "2025-11-09T10:30:00Z"
  },
  "message": "Member invitation sent successfully"
}
```

#### Examples

**cURL**:
```bash
curl -X POST "https://stg-api2.doconchain.com/api/v2/organization/members/add?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "data[0][email]=new.member@company.com" \
  -F "data[0][first_name]=New" \
  -F "data[0][last_name]=Member" \
  -F "data[0][role]=member" \
  -F "data[0][organization_id]=12345"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('data[0][email]', 'new.member@company.com');
formData.append('data[0][first_name]', 'New');
formData.append('data[0][last_name]', 'Member');
formData.append('data[0][role]', 'member');
formData.append('data[0][organization_id]', '12345');

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/api/v2/organization/members/add',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'multipart/form-data'
  },
  data: formData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Invitation Process

1. **Member Creation**: Create member record with pending status
2. **Email Validation**: Verify email format and uniqueness
3. **Role Assignment**: Assign appropriate permissions based on role
4. **Invitation Token**: Generate secure invitation token
5. **Email Dispatch**: Send invitation email with acceptance link
6. **Status Tracking**: Set member status to "pending_invitation"
7. **Expiration Setting**: Set invitation expiration (typically 7 days)

#### Member Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| **admin** | Administrative access with elevated permissions | Member management, organization settings, reporting |
| **member** | Standard user with basic access | Project creation, document management, personal tasks |

#### Invitation Email Content

| Component | Description |
|-----------|-------------|
| **Subject** | "You're invited to join [Organization Name]" |
| **Greeting** | Personalized greeting with member's name |
| **Organization Info** | Organization name and inviting user |
| **Role Information** | Assigned role and permissions |
| **Acceptance Link** | Secure link to accept invitation |
| **Expiration Notice** | When the invitation expires |
| **Contact Support** | Support contact information |

#### Use Cases

- **Team Expansion**: Add new team members to organization
- **Role Assignment**: Assign appropriate roles to new users
- **Department Growth**: Add members to specific departments
- **Project Teams**: Build project-specific member groups
- **Administrative Setup**: Add admins for organization management

#### Important Notes

- **Email Uniqueness**: Member email must be unique across the organization
- **Role Permissions**: Inviting user must have permission to assign the role
- **Invitation Expiry**: Invitations typically expire after 7 days
- **Acceptance Required**: Members must accept invitation to gain access
- **Audit Trail**: All member additions are logged for compliance

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Organization Access**: User must have member management permissions
- **Valid Organization**: Organization ID must exist and be accessible
- **Role Permissions**: User must have permission to assign the specified role
- **Unique Email**: Email address not already associated with organization

#### Error Responses

**400 Bad Request**: Invalid data or validation errors
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid member data provided",
    "details": {
      "email": "Please provide a valid email address",
      "role": "Role must be either 'admin' or 'member'",
      "organization_id": "Invalid organization ID"
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have member addition permissions
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to add organization members"
  }
}
```

**409 Conflict**: Member already exists in organization
```json
{
  "error": {
    "code": "MEMBER_EXISTS",
    "message": "A member with this email already exists in the organization"
  }
}
```

**422 Unprocessable Entity**: Member creation failed
```json
{
  "error": {
    "code": "PROCESSING_FAILED",
    "message": "Member addition could not be processed"
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many member addition requests. Please try again later"
  }
}
```

#### Best Practices

- **Email Verification**: Ensure email addresses are valid before sending invitations
- **Role Appropriateness**: Assign appropriate roles based on user responsibilities
- **Communication**: Inform new members about the invitation process
- **Follow-up**: Follow up with members who haven't accepted invitations
- **Documentation**: Document member additions for organizational records

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Permission Validation**: Strict validation of member addition permissions
- **Email Security**: Secure invitation email delivery
- **Token Security**: Secure generation of invitation tokens
- **Audit Logging**: All member addition attempts logged
- **Role-Based Access**: Permissions validated before role assignment
- **Data Privacy**: Member information protected during invitation process

---

### 75. Auto-Join Member In Organization

Automatically add a member to an organization without sending an invitation email.

**Endpoint**: `POST /api/v2/organization/members/auto-join`

**URL**: `https://stg-api2.doconchain.com/api/v2/organization/members/auto-join?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters** (multipart/form-data):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `data[0][email]` | string | Yes | Email address of the member to be added |
| `data[0][first_name]` | string | Yes | First name of the member to be added |
| `data[0][last_name]` | string | Yes | Last name of the member to be added |
| `data[0][role]` | string | Yes | Role of the member (admin, member) |
| `data[0][organization_id]` | integer | Yes | ID of the organization to add the member to |

#### Response

**Status**: `201 Created`

**Response Body**:
```json
{
  "success": true,
  "data": {
    "member_id": "user_11111",
    "email": "auto.member@company.com",
    "first_name": "Auto",
    "last_name": "Member",
    "role": "member",
    "organization_id": "org_12345",
    "status": "active",
    "joined_at": "2025-11-02T10:30:00Z",
    "joined_method": "auto_join",
    "welcome_email_sent": true
  },
  "message": "Member added to organization successfully"
}
```

#### Examples

**cURL**:
```bash
curl -X POST "https://stg-api2.doconchain.com/api/v2/organization/members/auto-join?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "data[0][email]=auto.member@company.com" \
  -F "data[0][first_name]=Auto" \
  -F "data[0][last_name]=Member" \
  -F "data[0][role]=member" \
  -F "data[0][organization_id]=12345"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('data[0][email]', 'auto.member@company.com');
formData.append('data[0][first_name]', 'Auto');
formData.append('data[0][last_name]', 'Member');
formData.append('data[0][role]', 'member');
formData.append('data[0][organization_id]', '12345');

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/api/v2/organization/members/auto-join',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'multipart/form-data'
  },
  data: formData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Auto-Join vs Invitation Process

| Aspect | Auto-Join | Invitation |
|--------|-----------|------------|
| **Email Sent** | Welcome email only | Invitation + acceptance emails |
| **User Action** | No action required | Must accept invitation |
| **Status** | Immediately active | Pending until acceptance |
| **Access** | Immediate full access | Access after acceptance |
| **Token Required** | No invitation token | Secure invitation token |
| **Expiration** | No expiration | Invitation expires (7 days) |

#### Auto-Join Process

1. **Member Validation**: Validate email uniqueness and data format
2. **Account Creation**: Create user account with provided details
3. **Role Assignment**: Assign specified role and permissions
4. **Organization Linking**: Link member to specified organization
5. **Status Activation**: Set member status to "active"
6. **Welcome Email**: Send welcome email with account details
7. **Audit Logging**: Log auto-join event for compliance

#### Welcome Email Content

| Component | Description |
|-----------|-------------|
| **Subject** | "Welcome to [Organization Name]" |
| **Greeting** | Personalized greeting with member's name |
| **Organization Info** | Organization name and details |
| **Role Information** | Assigned role and permissions |
| **Login Instructions** | How to access the account |
| **Support Contact** | Support contact information |
| **Getting Started** | Links to documentation and resources |

#### Use Cases

- **Bulk User Import**: Add multiple users from external systems
- **Automated Provisioning**: Add users through integration workflows
- **Pre-approved Access**: Add users who have already been approved
- **System Migration**: Migrate users from other systems
- **API Integration**: Add users through automated processes

#### Important Notes

- **Immediate Access**: Members gain immediate access without acceptance
- **No Invitation**: No email invitation or acceptance required
- **Welcome Email**: Welcome email sent with account information
- **Account Creation**: User account created automatically
- **Audit Trail**: All auto-joins logged for compliance and security

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Organization Access**: User must have member management permissions
- **Valid Organization**: Organization ID must exist and be accessible
- **Role Permissions**: User must have permission to assign the specified role
- **Unique Email**: Email address not already associated with any account

#### Error Responses

**400 Bad Request**: Invalid data or validation errors
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid member data provided",
    "details": {
      "email": "Please provide a valid email address",
      "role": "Role must be either 'admin' or 'member'",
      "organization_id": "Invalid organization ID"
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have auto-join permissions
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to auto-join organization members"
  }
}
```

**409 Conflict**: Member already exists
```json
{
  "error": {
    "code": "MEMBER_EXISTS",
    "message": "A member with this email already exists"
  }
}
```

**422 Unprocessable Entity**: Auto-join processing failed
```json
{
  "error": {
    "code": "PROCESSING_FAILED",
    "message": "Member auto-join could not be processed"
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many auto-join requests. Please try again later"
  }
}
```

#### Best Practices

- **User Communication**: Inform users about automatic account creation
- **Password Policy**: Ensure users understand password requirements
- **Role Appropriateness**: Assign appropriate roles for auto-joined users
- **Welcome Resources**: Provide comprehensive welcome materials
- **Support Access**: Ensure users know how to get help

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Permission Validation**: Strict validation of auto-join permissions
- **Account Security**: Secure account creation process
- **Audit Logging**: All auto-join attempts logged
- **Role-Based Access**: Permissions validated before role assignment
- **Data Privacy**: Member information protected during auto-join
- **Access Control**: Immediate access requires elevated permissions

---

### 76. Resend Organization Member Invitation

Resend an organization invitation email to a pending member.

**Endpoint**: `PUT /api/v2/organization/members/{memberId}/resend`

**URL**: `https://stg-api2.doconchain.com/api/v2/organization/members/{memberId}/resend?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `memberId` | integer | Yes | ID of the member to resend invitation to |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters**: None required (empty form-data)

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "message": "Invitation resent successfully",
  "data": {
    "id": 12345,
    "name": "Acme Corporation",
    "purchased_seats": 50,
    "available_seats": 25,
    "occupied_seats": 25,
    "photo": "https://api.doconchain.com/storage/organizations/org_12345/photo.jpg",
    "status": "active"
  },
  "meta": {
    "resend_count": 2,
    "last_resend_at": "2025-11-02T11:00:00Z",
    "invitation_expires_at": "2025-11-09T11:00:00Z"
  }
}
```

#### Examples

**cURL**:
```bash
curl -X PUT "https://stg-api2.doconchain.com/api/v2/organization/members/12345/resend?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: multipart/form-data"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'PUT',
  url: 'https://stg-api2.doconchain.com/api/v2/organization/members/12345/resend',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'multipart/form-data'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Resend Process

1. **Member Validation**: Verify member exists and has 'pending' status
2. **Permission Check**: Ensure user has permission to resend invitations
3. **Rate Limiting**: Check if resend limit hasn't been exceeded
4. **Email Generation**: Generate new invitation email with fresh token
5. **Email Delivery**: Send invitation email to member
6. **Audit Logging**: Log resend event with timestamp
7. **Counter Update**: Increment resend counter for the invitation

#### Resend Conditions

| Condition | Requirement |
|-----------|-------------|
| **Member Status** | Must be 'pending' |
| **Invitation Validity** | Original invitation not expired |
| **Resend Limit** | Maximum 3 resends per invitation |
| **Time Window** | Minimum 1 hour between resends |
| **User Permissions** | Must have organization admin rights |
| **Organization Status** | Organization must be active |

#### Invitation Email Content

| Component | Description |
|-----------|-------------|
| **Subject** | "You're invited to join [Organization Name]" |
| **Greeting** | Personalized greeting with member's name |
| **Organization Info** | Organization name and inviting user |
| **Role Information** | Assigned role and permissions |
| **Action Buttons** | Accept/Decline buttons with secure links |
| **Expiration Notice** | When the invitation expires |
| **Support Contact** | How to get help if needed |

#### Resend Limits and Policies

| Policy | Limit | Description |
|--------|-------|-------------|
| **Max Resends** | 3 | Maximum number of resend attempts |
| **Time Between** | 1 hour | Minimum time between resend attempts |
| **Expiration** | 7 days | Total invitation validity period |
| **Rate Limit** | 10/hour | Maximum resend requests per hour |

#### Use Cases

- **Email Delivery Issues**: Resend if original invitation wasn't received
- **User Request**: Resend at user's request if they lost the email
- **Reminder System**: Automated resends for pending invitations
- **Administrative Action**: Manual resend by organization admins

#### Important Notes

- **Pending Status Only**: Only works for members with 'pending' status
- **Rate Limited**: Subject to resend limits and time restrictions
- **Fresh Token**: Each resend generates a new secure invitation token
- **Audit Trail**: All resend attempts are logged for compliance

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Organization Access**: User must have admin permissions for the organization
- **Valid Member**: Member ID must exist and be in 'pending' status
- **Active Organization**: Organization must be active and accessible
- **Resend Eligibility**: Member must be eligible for resend (within limits)

#### Error Responses

**400 Bad Request**: Invalid member ID or resend not allowed
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Member is not eligible for invitation resend",
    "details": {
      "member_status": "Member status must be 'pending'",
      "resend_limit": "Maximum resend attempts exceeded"
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have resend permissions
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to resend organization invitations"
  }
}
```

**404 Not Found**: Member not found
```json
{
  "error": {
    "code": "MEMBER_NOT_FOUND",
    "message": "Member not found or not accessible"
  }
}
```

**429 Too Many Requests**: Resend rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many resend requests. Please wait before trying again",
    "details": {
      "retry_after": "2025-11-02T12:00:00Z",
      "remaining_attempts": 1
    }
  }
}
```

**422 Unprocessable Entity**: Invitation expired or invalid
```json
{
  "error": {
    "code": "INVITATION_EXPIRED",
    "message": "Invitation has expired and cannot be resent"
  }
}
```

#### Best Practices

- **User Communication**: Inform users when resending invitations
- **Rate Limiting**: Respect resend limits to avoid spam
- **Expiration Awareness**: Check invitation expiration before resending
- **Audit Review**: Regularly review resend logs for security
- **User Support**: Provide clear support channels for invitation issues

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Permission Validation**: Strict validation of resend permissions
- **Token Security**: Secure generation of new invitation tokens
- **Audit Logging**: All resend attempts logged
- **Rate Limiting**: Protection against abuse and spam
- **Email Security**: Secure invitation email delivery
- **Access Control**: Admin-only access to resend functionality

---

### 77. Update Organization Member Role

Update the role of a specific organization member.

**Endpoint**: `PUT /api/v2/organization/members/{memberId}/update/role`

**URL**: `https://stg-api2.doconchain.com/api/v2/organization/members/{memberId}/update/role?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `memberId` | integer | Yes | ID of the member whose role to update |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters** (multipart/form-data):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `role` | string | Yes | New role for the member ("admin" or "member") |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "message": "Member role updated successfully",
  "data": {
    "id": 12345,
    "name": "Acme Corporation",
    "purchased_seats": 50,
    "available_seats": 25,
    "occupied_seats": 25,
    "photo": "https://api.doconchain.com/storage/organizations/org_12345/photo.jpg",
    "status": "active"
  },
  "meta": {
    "updated_member_id": 67890,
    "previous_role": "member",
    "new_role": "admin",
    "updated_at": "2025-11-02T12:00:00Z",
    "updated_by": "user_11111"
  }
}
```

#### Examples

**cURL**:
```bash
curl -X PUT "https://stg-api2.doconchain.com/api/v2/organization/members/67890/update/role?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "role=admin"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('role', 'admin');

const options = {
  method: 'PUT',
  url: 'https://stg-api2.doconchain.com/api/v2/organization/members/67890/update/role',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'multipart/form-data'
  },
  data: formData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Role Types

| Role | Description | Permissions |
|------|-------------|-------------|
| **admin** | Organization administrator | Full access to organization management, member management, settings, billing |
| **member** | Regular organization member | Access to assigned projects and documents, limited management capabilities |

#### Role Update Process

1. **Permission Validation**: Verify user has permission to update member roles
2. **Member Validation**: Confirm member exists and belongs to the organization
3. **Role Validation**: Ensure the new role is valid ("admin" or "member")
4. **Self-Update Check**: Prevent users from demoting their own admin role
5. **Permission Update**: Update member's permissions based on new role
6. **Audit Logging**: Log the role change with timestamp and user
7. **Notification**: Send notification to affected member (optional)

#### Role Permissions Comparison

| Permission | Admin | Member |
|------------|-------|--------|
| **Invite Members** | ✓ | ✗ |
| **Remove Members** | ✓ | ✗ |
| **Update Member Roles** | ✓ | ✗ |
| **Manage Organization Settings** | ✓ | ✗ |
| **View All Projects** | ✓ | ✓ |
| **Create Projects** | ✓ | ✓ |
| **Manage Own Projects** | ✓ | ✓ |
| **Access Organization Templates** | ✓ | ✓ |
| **View Organization Analytics** | ✓ | ✓ |
| **Manage Billing** | ✓ | ✗ |

#### Use Cases

- **Promotion**: Promote a member to admin role for additional responsibilities
- **Demotion**: Change admin to member role when responsibilities change
- **Access Control**: Adjust permissions based on role changes in the organization
- **Temporary Access**: Grant temporary admin access for specific tasks
- **Organizational Changes**: Update roles during team restructuring

#### Important Notes

- **Admin Protection**: Users cannot demote their own admin role
- **Permission Cascade**: Role changes immediately affect all permissions
- **Audit Trail**: All role changes are logged for compliance
- **Immediate Effect**: Role changes take effect immediately
- **Notification**: Members may receive notifications about role changes

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Organization Access**: User must be an admin of the organization
- **Valid Member**: Member ID must exist and belong to the organization
- **Valid Role**: Role must be either "admin" or "member"
- **Permission Level**: User must have higher or equal permission level than target role

#### Error Responses

**400 Bad Request**: Invalid role or validation errors
```json
{
  "error": {
    "code": "INVALID_ROLE",
    "message": "Invalid role specified. Must be 'admin' or 'member'",
    "details": {
      "allowed_roles": ["admin", "member"],
      "provided_role": "superuser"
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have permission to update roles
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to update member roles",
    "details": {
      "required_role": "admin",
      "user_role": "member"
    }
  }
}
```

**404 Not Found**: Member not found
```json
{
  "error": {
    "code": "MEMBER_NOT_FOUND",
    "message": "Member not found or not accessible"
  }
}
```

**409 Conflict**: Self-demotion attempt or invalid role transition
```json
{
  "error": {
    "code": "SELF_DEMOTION_NOT_ALLOWED",
    "message": "Users cannot demote their own admin role",
    "details": {
      "action": "demote_self",
      "solution": "Contact another admin to change your role"
    }
  }
}
```

**422 Unprocessable Entity**: Role update processing failed
```json
{
  "error": {
    "code": "ROLE_UPDATE_FAILED",
    "message": "Member role could not be updated"
  }
}
```

#### Best Practices

- **Role Justification**: Document reasons for role changes
- **Permission Review**: Review permissions before making changes
- **Communication**: Inform members about role changes
- **Audit Review**: Regularly review role change logs
- **Access Control**: Use principle of least privilege

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Permission Validation**: Strict validation of role update permissions
- **Self-Protection**: Prevent users from removing their own admin access
- **Audit Logging**: All role changes logged for security and compliance
- **Role-Based Access**: Permissions validated before role assignment
- **Access Control**: Admin-only access to role management functionality

---

### 78. Move Organization Member to Another Organization

Move an organization member to a different organization (including sub-organizations) with optional role update.

**Endpoint**: `PUT /api/v2/organization/members/{memberId}/move`

**URL**: `https://stg-api2.doconchain.com/api/v2/organization/members/{memberId}/move?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `memberId` | integer | Yes | ID of the member to move |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters** (multipart/form-data):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `organization_id` | integer | Yes | ID of the destination organization |
| `role` | string | Yes | New role for the member ("admin" or "member") |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "message": "Member moved to organization successfully",
  "data": {
    "member": {
      "id": 67890,
      "email": "john.doe@company.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "member",
      "organization_id": 54321,
      "organization_name": "Engineering Department",
      "moved_at": "2025-11-02T13:00:00Z",
      "moved_by": "user_11111"
    },
    "previous_organization": {
      "id": 12345,
      "name": "Main Organization"
    },
    "new_organization": {
      "id": 54321,
      "name": "Engineering Department"
    }
  },
  "meta": {
    "transfer_type": "sub_organization_move",
    "role_changed": true,
    "previous_role": "admin",
    "new_role": "member"
  }
}
```

#### Examples

**cURL**:
```bash
curl -X PUT "https://stg-api2.doconchain.com/api/v2/organization/members/67890/move?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "organization_id=54321" \
  -F "role=member"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('organization_id', '54321');
formData.append('role', 'member');

const options = {
  method: 'PUT',
  url: 'https://stg-api2.doconchain.com/api/v2/organization/members/67890/move',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'multipart/form-data'
  },
  data: formData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Organization Transfer Types

| Transfer Type | Description | Example |
|---------------|-------------|----------|
| **Parent to Sub** | Move from main org to sub-organization | Main Company → Engineering Dept |
| **Sub to Parent** | Move from sub-org to main organization | Engineering Dept → Main Company |
| **Sub to Sub** | Move between sub-organizations | Engineering Dept → Marketing Dept |
| **Cross-Organization** | Move between different organizations | Company A → Company B |

#### Member Move Process

1. **Permission Validation**: Verify user has permission to move members between organizations
2. **Organization Validation**: Confirm source and destination organizations exist and are accessible
3. **Member Validation**: Verify member exists and belongs to source organization
4. **Hierarchy Check**: Validate organization hierarchy and transfer permissions
5. **Role Validation**: Ensure new role is valid for destination organization
6. **Transfer Execution**: Move member to new organization with updated role
7. **Permission Update**: Update member's permissions based on new role and organization
8. **Notification**: Send notifications to affected parties
9. **Audit Logging**: Log the transfer with full details

#### Organization Hierarchy Considerations

| Hierarchy Level | Transfer Permissions | Role Requirements |
|----------------|---------------------|-------------------|
| **Same Level** | Admin access to both orgs | Organization admin |
| **Parent to Child** | Parent org admin rights | Parent organization admin |
| **Child to Parent** | Child org admin + parent access | Both organization access |
| **Cross-Organization** | Super admin or owner rights | System administrator |

#### Role Transition Rules

| Current Role | New Role | Allowed | Notes |
|--------------|----------|---------|-------|
| **Admin** | Admin | ✓ | Maintains admin privileges |
| **Admin** | Member | ✓ | Demotion during transfer |
| **Member** | Admin | ✓ | Promotion during transfer |
| **Member** | Member | ✓ | Role unchanged |

#### Use Cases

- **Department Reorganization**: Move employees between departments
- **Team Restructuring**: Reassign team members to different groups
- **Project-Based Assignment**: Move members to project-specific sub-orgs
- **Access Control**: Adjust organizational access during role changes
- **Company Restructuring**: Handle organizational changes and mergers

#### Important Notes

- **Permission Transfer**: Member loses access to source organization projects
- **Role Reset**: Role may be adjusted based on destination organization policies
- **Data Access**: Member retains access to personal data and completed projects
- **Notification**: Both source and destination organizations may be notified
- **Audit Trail**: All transfers are logged for compliance and security

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Organization Access**: User must have admin rights in both source and destination organizations
- **Valid Organizations**: Both source and destination organizations must exist
- **Valid Member**: Member must exist and belong to source organization
- **Hierarchy Permissions**: User must have permission to transfer between organization levels

#### Error Responses

**400 Bad Request**: Invalid organization ID or role
```json
{
  "error": {
    "code": "INVALID_TRANSFER_REQUEST",
    "message": "Invalid organization transfer request",
    "details": {
      "organization_id": "Destination organization not found",
      "role": "Invalid role for destination organization"
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: Insufficient permissions for transfer
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to transfer member between organizations",
    "details": {
      "source_org_access": "insufficient",
      "destination_org_access": "insufficient",
      "required_role": "admin"
    }
  }
}
```

**404 Not Found**: Member or organization not found
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Member or organization not found",
    "details": {
      "member_id": "Member not found in source organization",
      "organization_id": "Destination organization does not exist"
    }
  }
}
```

**409 Conflict**: Transfer conflicts or validation errors
```json
{
  "error": {
    "code": "TRANSFER_CONFLICT",
    "message": "Member transfer cannot be completed",
    "details": {
      "reason": "Member already exists in destination organization",
      "resolution": "Remove existing member or choose different destination"
    }
  }
}
```

**422 Unprocessable Entity**: Transfer processing failed
```json
{
  "error": {
    "code": "TRANSFER_FAILED",
    "message": "Member transfer could not be processed",
    "details": {
      "step": "permission_update",
      "error": "Failed to update member permissions"
    }
  }
}
```

#### Best Practices

- **Transfer Planning**: Plan transfers during low-activity periods
- **Communication**: Inform members about upcoming transfers
- **Permission Review**: Review permissions before and after transfer
- **Data Backup**: Ensure important data is accessible post-transfer
- **Audit Review**: Regularly review transfer logs for compliance

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Permission Validation**: Strict validation of inter-organization transfer permissions
- **Hierarchy Security**: Protection against unauthorized organization hierarchy changes
- **Audit Logging**: All transfers logged for security and compliance
- **Access Control**: Multi-level permission checks for organization transfers
- **Data Protection**: Secure handling of member data during transfer

---

### 79. Remove Member from Organization

Remove a member from an organization, including subscription plan changes.

**Endpoint**: `DELETE /api/v2/organization/members/{memberId}/remove`

**URL**: `https://stg-api2.doconchain.com/api/v2/organization/members/{memberId}/remove?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `memberId` | integer | Yes | ID of the member to remove |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters**: None required

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "message": "Member removed from organization successfully",
  "data": {
    "removed_member": {
      "id": 67890,
      "email": "john.doe@company.com",
      "first_name": "John",
      "last_name": "Doe",
      "removed_at": "2025-11-02T14:00:00Z",
      "removed_by": "user_11111"
    },
    "organization": {
      "id": 12345,
      "name": "Acme Corporation",
      "available_seats": 26,
      "occupied_seats": 24
    },
    "subscription_changes": {
      "previous_plan": "ENTERPRISE_API",
      "new_plan": "FREE",
      "effective_date": "2025-11-02T14:00:00Z"
    }
  },
  "meta": {
    "removal_type": "organization_removal",
    "subscription_downgrade": true,
    "data_retention_days": 30,
    "projects_affected": 5
  }
}
```

#### Examples

**cURL**:
```bash
curl -X DELETE "https://stg-api2.doconchain.com/api/v2/organization/members/67890/remove?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'DELETE',
  url: 'https://stg-api2.doconchain.com/api/v2/organization/members/67890/remove',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Member Removal Process

1. **Permission Validation**: Verify user has permission to remove organization members
2. **Member Validation**: Confirm member exists and belongs to the organization
3. **Self-Removal Check**: Prevent users from removing themselves
4. **Active Projects Check**: Review member's active projects and responsibilities
5. **Data Backup**: Prepare member data for retention period
6. **Subscription Downgrade**: Process plan change from Enterprise to previous plan
7. **Access Revocation**: Remove all organization-level permissions and access
8. **Notification**: Send removal notification to affected member
9. **Audit Logging**: Log the removal with full details and reasoning

#### Subscription Plan Changes

| Current Plan | Previous Plan | Action |
|--------------|---------------|--------|
| **Enterprise** | Free | Downgrade to Free plan |
| **Enterprise** | Pro | Downgrade to Pro plan |
| **Enterprise** | Basic | Downgrade to Basic plan |
| **Other** | N/A | No plan change required |

#### Data Retention After Removal

| Data Type | Retention Period | Access After Removal |
|-----------|-----------------|---------------------|
| **Profile Data** | 30 days | Member can access |
| **Project Documents** | Permanent | Organization retains |
| **Signature History** | Permanent | Organization retains |
| **Organization Access** | Immediate | Completely revoked |
| **Personal Templates** | Permanent | Member retains |
| **API Keys** | Immediate | Revoked and regenerated |

#### Access Revocation Scope

| Access Type | Status After Removal | Notes |
|-------------|---------------------|-------|
| **Organization Projects** | Revoked | Cannot access any org projects |
| **Organization Templates** | Revoked | Cannot use org templates |
| **Member Management** | Revoked | Cannot manage other members |
| **Organization Settings** | Revoked | Cannot modify org settings |
| **Billing Information** | Revoked | Cannot view org billing |
| **Personal Projects** | Retained | Own projects remain accessible |
| **Personal Documents** | Retained | Own documents remain accessible |

#### Use Cases

- **Employee Departure**: Remove former employees from organization
- **Contractor Completion**: Remove contractors after project completion
- **Access Control**: Revoke access for security or policy violations
- **Organization Restructuring**: Remove members during team reorganization
- **Subscription Management**: Adjust organization size and billing

#### Important Notes

- **Irreversible Action**: Member removal cannot be undone
- **Subscription Impact**: Enterprise plan removal affects billing
- **Data Retention**: Member data retained for 30 days
- **Project Impact**: Active projects may be affected
- **Notification**: Member receives removal notification
- **Audit Trail**: All removals logged for compliance

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Organization Access**: User must be an admin of the organization
- **Valid Member**: Member ID must exist and belong to the organization
- **Self-Protection**: Users cannot remove themselves
- **Permission Level**: User must have member removal permissions

#### Error Responses

**400 Bad Request**: Invalid member ID or removal not allowed
```json
{
  "error": {
    "code": "INVALID_REMOVAL_REQUEST",
    "message": "Member removal request is invalid",
    "details": {
      "member_status": "Cannot remove member with active critical projects",
      "reason": "Member has pending signatures on important documents"
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have permission to remove members
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to remove organization members",
    "details": {
      "required_role": "admin",
      "user_role": "member"
    }
  }
}
```

**404 Not Found**: Member not found
```json
{
  "error": {
    "code": "MEMBER_NOT_FOUND",
    "message": "Member not found or not accessible"
  }
}
```

**409 Conflict**: Self-removal attempt or critical dependencies
```json
{
  "error": {
    "code": "SELF_REMOVAL_NOT_ALLOWED",
    "message": "Users cannot remove themselves from organizations",
    "details": {
      "action": "self_removal",
      "solution": "Contact another admin to remove your membership"
    }
  }
}
```

**422 Unprocessable Entity**: Removal blocked by business rules
```json
{
  "error": {
    "code": "REMOVAL_BLOCKED",
    "message": "Member removal is blocked by business rules",
    "details": {
      "blocking_factor": "sole_admin_removal",
      "solution": "Promote another member to admin before removal"
    }
  }
}
```

#### Best Practices

- **Impact Assessment**: Review member's active projects before removal
- **Successor Planning**: Ensure critical responsibilities are transferred
- **Communication**: Inform member about removal and next steps
- **Data Export**: Allow member to export personal data if needed
- **Documentation**: Document removal reasons for compliance

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Permission Validation**: Strict validation of member removal permissions
- **Self-Protection**: Prevent users from removing their own access
- **Audit Logging**: All removals logged for security and compliance
- **Access Control**: Immediate revocation of all organization access
- **Data Protection**: Secure handling of member data during removal process

---

### 80. Get Organization Credits

Retrieve credit usage information for an organization.

**Endpoint**: `GET /api/v2/organizations/credits`

**URL**: `https://stg-api2.doconchain.com/api/v2/organizations/credits?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters**: None required

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "total_credits": 10000,
  "used_credits": 2340,
  "remaining_credits": 7660,
  "credit_breakdown": {
    "document_signing": {
      "used": 1800,
      "limit": 5000,
      "remaining": 3200
    },
    "document_verification": {
      "used": 450,
      "limit": 2000,
      "remaining": 1550
    },
    "api_calls": {
      "used": 90,
      "limit": 3000,
      "remaining": 2910
    }
  },
  "billing_period": {
    "start_date": "2025-11-01T00:00:00Z",
    "end_date": "2025-11-30T23:59:59Z",
    "days_remaining": 28
  },
  "organization": {
    "id": 12345,
    "name": "Acme Corporation",
    "plan_type": "ENTERPRISE_API"
  }
}
```

#### Examples

**cURL**:
```bash
curl -X GET "https://stg-api2.doconchain.com/api/v2/organizations/credits?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/api/v2/organizations/credits',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Credit System Overview

DOCONCHAIN uses a credit-based system for API usage and document processing. Credits are consumed based on the type and complexity of operations performed.

#### Credit Consumption by Service

| Service | Credits per Use | Description |
|---------|----------------|-------------|
| **Document Signing** | 5-50 credits | Based on document size and complexity |
| **Document Verification** | 10-25 credits | Blockchain verification and timestamping |
| **API Calls** | 1 credit | Per API request (excluding credit checks) |
| **Template Creation** | 20 credits | Creating reusable document templates |
| **Bulk Operations** | 2-10 credits | Per item in bulk operations |
| **Advanced Features** | 5-100 credits | OCR, AI processing, custom integrations |

#### Credit Limits by Plan

| Plan Type | Monthly Credits | Document Signing | API Calls | Verification |
|-----------|----------------|------------------|-----------|--------------|
| **Free** | 100 | 50 | 50 | 10 |
| **Basic** | 1,000 | 500 | 300 | 200 |
| **Pro** | 5,000 | 2,500 | 1,500 | 1,000 |
| **Enterprise** | 10,000+ | 5,000+ | 3,000+ | 2,000+ |

#### Credit Usage Tracking

Credits are tracked in real-time and updated immediately after each operation. The system provides detailed breakdown by service type and maintains historical usage data for billing and analytics.

#### Billing Period Management

- **Monthly Cycle**: Credits reset on the 1st of each month
- **No Carryover**: Unused credits do not roll over to next month
- **Usage Alerts**: Notifications at 50%, 80%, and 95% usage thresholds
- **Auto-Renewal**: Enterprise plans automatically renew with fresh credits

#### Credit Breakdown Structure

| Breakdown Field | Description | Example |
|----------------|-------------|----------|
| **used** | Credits consumed in current period | 2340 |
| **limit** | Maximum credits allowed for service | 5000 |
| **remaining** | Credits still available | 2660 |

#### Use Cases

- **Usage Monitoring**: Track credit consumption for cost management
- **Budget Planning**: Plan document processing based on available credits
- **Alert Setup**: Configure notifications for credit thresholds
- **Billing Integration**: Integrate with accounting systems
- **Resource Planning**: Scale operations based on credit availability

#### Important Notes

- **Real-time Updates**: Credit counts update immediately after operations
- **Service-specific Limits**: Different limits apply to different services
- **Billing Period**: Credits reset monthly on the 1st
- **No Overage**: Operations are blocked when credits are exhausted
- **Enterprise Flexibility**: Custom credit limits available for enterprise customers

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Organization Access**: User must belong to the organization
- **Active Subscription**: Organization must have an active plan
- **Read Permissions**: User must have permission to view billing information

#### Error Responses

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have permission to view credits
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to organization credit information",
    "details": {
      "required_permission": "billing_view",
      "user_permissions": ["project_create", "document_sign"]
    }
  }
}
```

**404 Not Found**: Organization not found
```json
{
  "error": {
    "code": "ORGANIZATION_NOT_FOUND",
    "message": "Organization not found or not accessible"
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many credit check requests. Please wait before trying again",
    "details": {
      "retry_after": "2025-11-02T15:01:00Z",
      "limit": "10 requests per minute"
    }
  }
}
```

#### Best Practices

- **Regular Monitoring**: Check credit usage regularly to avoid surprises
- **Alert Configuration**: Set up alerts for credit threshold notifications
- **Usage Optimization**: Optimize document processing to maximize credit efficiency
- **Budget Planning**: Plan monthly usage based on business requirements
- **Upgrade Planning**: Monitor usage patterns to determine if plan upgrades are needed

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Permission Validation**: Strict validation of billing information access
- **Data Protection**: Secure handling of financial and usage data
- **Audit Logging**: All credit information access logged
- **Access Control**: Role-based access to sensitive billing information

---

### 81. Get Credit Histories

Retrieve detailed credit transaction history for an organization.

**Endpoint**: `GET /api/v2/credits/histories`

**URL**: `https://stg-api2.doconchain.com/api/v2/credits/histories?user_type=ENTERPRISE_API&organization_uuid=org_12345&page=1&per_page=20`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |
| `organization_uuid` | string | Yes | UUID of the organization to get credit history for |
| `page` | integer | No | Page number for pagination (default: 1) |
| `per_page` | integer | No | Number of results per page (default: 20, max: 100) |

**Body Parameters**: None required

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "data": [
    {
      "id": "credit_txn_001",
      "type": "purchase",
      "amount": 5000,
      "description": "Monthly Enterprise Plan Credits",
      "transaction_date": "2025-11-01T00:00:00Z",
      "reference_id": "invoice_12345",
      "status": "completed",
      "metadata": {
        "plan_type": "ENTERPRISE_API",
        "billing_period": "2025-11-01 to 2025-11-30",
        "payment_method": "credit_card"
      }
    },
    {
      "id": "credit_txn_002",
      "type": "usage",
      "amount": -25,
      "description": "Document Verification - Contract_2025.pdf",
      "transaction_date": "2025-11-02T10:30:00Z",
      "reference_id": "doc_67890",
      "status": "completed",
      "metadata": {
        "service_type": "document_verification",
        "document_size": "2.5MB",
        "processing_time": "3.2 seconds"
      }
    },
    {
      "id": "credit_txn_003",
      "type": "allocation",
      "amount": 1000,
      "description": "Bonus Credits - Account Anniversary",
      "transaction_date": "2025-10-15T12:00:00Z",
      "reference_id": "bonus_2025",
      "status": "completed",
      "metadata": {
        "bonus_type": "anniversary",
        "account_age_years": 2
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total_pages": 5,
    "total_records": 87,
    "has_next": true,
    "has_previous": false
  },
  "summary": {
    "total_purchased": 45000,
    "total_used": 12340,
    "total_bonus": 2500,
    "current_balance": 35160,
    "period_start": "2025-11-01T00:00:00Z",
    "period_end": "2025-11-30T23:59:59Z"
  },
  "organization": {
    "uuid": "org_12345",
    "name": "Acme Corporation",
    "plan_type": "ENTERPRISE_API"
  }
}
```

#### Examples

**cURL**:
```bash
curl -X GET "https://stg-api2.doconchain.com/api/v2/credits/histories?user_type=ENTERPRISE_API&organization_uuid=org_12345&page=1&per_page=20" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/api/v2/credits/histories',
  params: {
    user_type: 'ENTERPRISE_API',
    organization_uuid: 'org_12345',
    page: 1,
    per_page: 20
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Credit Transaction Types

| Type | Description | Amount Sign | Examples |
|------|-------------|-------------|----------|
| **purchase** | Credits purchased or added via subscription | Positive (+) | Monthly plan credits, credit top-ups |
| **usage** | Credits consumed by services | Negative (-) | Document signing, API calls, verification |
| **allocation** | Bonus or promotional credits | Positive (+) | Anniversary bonuses, referral credits |
| **return** | Credits refunded or returned | Positive (+) | Service cancellations, error refunds |
| **adjustment** | Manual credit adjustments | Positive/Negative | Administrative corrections |

#### Transaction Status

| Status | Description |
|--------|-------------|
| **completed** | Transaction successfully processed |
| **pending** | Transaction in progress or awaiting confirmation |
| **failed** | Transaction failed or was rejected |
| **cancelled** | Transaction was cancelled before completion |

#### Pagination Parameters

| Parameter | Default | Maximum | Description |
|-----------|---------|---------|-------------|
| **page** | 1 | N/A | Page number to retrieve |
| **per_page** | 20 | 100 | Number of transactions per page |

#### History Filtering and Sorting

- **Chronological Order**: Transactions ordered by transaction_date (newest first)
- **Organization Scope**: Only shows transactions for specified organization
- **Complete History**: Includes all transaction types and statuses
- **Real-time Updates**: History updates immediately after transactions

#### Transaction Metadata

Different transaction types include relevant metadata:

**Purchase Transactions**:
```json
{
  "plan_type": "ENTERPRISE_API",
  "billing_period": "2025-11-01 to 2025-11-30",
  "payment_method": "credit_card",
  "invoice_number": "INV-2025-001"
}
```

**Usage Transactions**:
```json
{
  "service_type": "document_signing",
  "document_name": "Contract_2025.pdf",
  "document_size": "2.5MB",
  "processing_time": "3.2 seconds",
  "user_id": "user_11111"
}
```

**Bonus Transactions**:
```json
{
  "bonus_type": "referral",
  "referrer_id": "user_22222",
  "campaign_name": "Q4 Referral Program"
}
```

#### Use Cases

- **Billing Reconciliation**: Match credit usage with invoices and billing
- **Usage Analysis**: Analyze credit consumption patterns over time
- **Audit Compliance**: Maintain detailed audit trail of credit transactions
- **Cost Optimization**: Identify high-usage services for optimization
- **Financial Reporting**: Generate reports for accounting and finance teams

#### Important Notes

- **Complete History**: Includes all credit transactions since account creation
- **Real-time Data**: History reflects current state immediately
- **Pagination Required**: Large organizations may have extensive histories
- **Organization Scope**: Only accessible by organization members with billing permissions
- **Retention Policy**: Credit history retained indefinitely for compliance

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Organization Access**: User must belong to the specified organization
- **Billing Permissions**: User must have permission to view billing information
- **Valid Organization**: Organization UUID must exist and be accessible

#### Error Responses

**400 Bad Request**: Invalid parameters
```json
{
  "error": {
    "code": "INVALID_PARAMETERS",
    "message": "Invalid query parameters provided",
    "details": {
      "page": "Page must be a positive integer",
      "per_page": "Per page must be between 1 and 100"
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have permission to view credit history
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to credit history information",
    "details": {
      "required_permission": "billing_history_view",
      "user_permissions": ["project_create"]
    }
  }
}
```

**404 Not Found**: Organization not found
```json
{
  "error": {
    "code": "ORGANIZATION_NOT_FOUND",
    "message": "Organization not found or not accessible"
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many history requests. Please wait before trying again",
    "details": {
      "retry_after": "2025-11-02T15:31:00Z",
      "limit": "30 requests per minute"
    }
  }
}
```

#### Best Practices

- **Regular Monitoring**: Review credit history regularly for anomalies
- **Export for Analysis**: Export large datasets for detailed analysis
- **Pagination Optimization**: Use appropriate page sizes for your use case
- **Date Range Filtering**: Consider implementing date range filters in your application
- **Caching Strategy**: Cache history data appropriately to reduce API calls

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Permission Validation**: Strict validation of billing history access
- **Data Protection**: Secure handling of financial transaction data
- **Audit Logging**: All history access attempts logged
- **Access Control**: Role-based access to sensitive financial information
- **Rate Limiting**: Protection against data scraping and abuse

---

### 82. Export Organization Credit Consumption Report

Generate and email a detailed credit consumption report for an organization.

**Endpoint**: `POST /api/v2/organizations/{orgUuid}/export`

**URL**: `https://stg-api2.doconchain.com/api/v2/organizations/{orgUuid}/export?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orgUuid` | string | Yes | UUID of the organization to export credit data for |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters**: None required

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "message": "Credit consumption report has been generated and will be sent to your email shortly",
  "data": {
    "export_id": "export_12345",
    "organization_uuid": "org_67890",
    "report_type": "credit_consumption",
    "generated_at": "2025-11-02T16:00:00Z",
    "estimated_delivery": "2025-11-02T16:05:00Z",
    "recipient_email": "admin@acmecorp.com",
    "report_period": {
      "start_date": "2025-10-01T00:00:00Z",
      "end_date": "2025-10-31T23:59:59Z"
    }
  },
  "meta": {
    "processing_time_estimate": "5 minutes",
    "file_format": "PDF",
    "file_size_estimate": "2.5MB",
    "includes_attachments": true
  }
}
```

#### Examples

**cURL**:
```bash
curl -X POST "https://stg-api2.doconchain.com/api/v2/organizations/org_67890/export?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/api/v2/organizations/org_67890/export',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Export Process

1. **Request Validation**: Verify user permissions and organization access
2. **Data Aggregation**: Collect all credit transaction data for the organization
3. **Report Generation**: Create comprehensive PDF report with charts and tables
4. **Email Preparation**: Prepare email with report attachment and summary
5. **Delivery**: Send email to requesting user's registered email address
6. **Notification**: Confirm successful export initiation

#### Report Contents

The exported PDF report includes:

| Section | Content | Details |
|---------|---------|---------|
| **Executive Summary** | Credit usage overview | Total credits, usage trends, key metrics |
| **Usage Breakdown** | Service-by-service analysis | Document signing, verification, API calls |
| **Transaction History** | Detailed transaction log | All credit transactions with dates and amounts |
| **Cost Analysis** | Financial impact | Credit costs, efficiency metrics, optimization suggestions |
| **Charts & Graphs** | Visual representations | Usage trends, service distribution, monthly comparisons |
| **Recommendations** | Optimization suggestions | Cost-saving recommendations and usage tips |

#### Report Format and Delivery

- **Format**: Professional PDF document with company branding
- **File Size**: Typically 1-5MB depending on transaction volume
- **Delivery Method**: Email attachment to requesting user
- **Processing Time**: 2-10 minutes depending on data volume
- **Email Subject**: "Credit Consumption Report - [Organization Name]"

#### Email Content Structure

| Component | Description |
|-----------|-------------|
| **Subject** | Credit Consumption Report - [Organization Name] - [Date] |
| **Greeting** | Personalized greeting with user's name |
| **Report Summary** | Key metrics and highlights from the report |
| **Attachment** | PDF report file (credit_report_YYYY_MM.pdf) |
| **Access Instructions** | How to view and download the attachment |
| **Support Contact** | Contact information for questions |
| **Report Validity** | When the report data was generated |

#### Report Data Scope

| Data Included | Time Period | Details |
|---------------|-------------|---------|
| **Credit Transactions** | Last 12 months | All purchases, usage, allocations |
| **Usage Metrics** | Current billing period | Real-time usage statistics |
| **Service Breakdown** | All time periods | Usage by service type |
| **Cost Analysis** | Monthly basis | Credit costs and efficiency |
| **Comparative Data** | Previous periods | Month-over-month comparisons |

#### Use Cases

- **Financial Reporting**: Generate reports for accounting and finance teams
- **Usage Analysis**: Analyze credit consumption patterns for optimization
- **Audit Preparation**: Prepare documentation for financial audits
- **Budget Planning**: Support budget planning with detailed usage data
- **Compliance Reporting**: Meet regulatory requirements for financial reporting

#### Important Notes

- **Asynchronous Processing**: Report generation happens in background
- **Email Delivery**: Report sent to user's registered email address
- **Processing Time**: May take several minutes for large organizations
- **File Retention**: Reports not stored on server, only emailed
- **One-time Export**: Each request generates a fresh report

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Organization Access**: User must belong to the specified organization
- **Billing Permissions**: User must have permission to view billing information
- **Valid Email**: User must have a registered email address
- **Active Organization**: Organization must be active and accessible

#### Error Responses

**400 Bad Request**: Invalid organization UUID
```json
{
  "error": {
    "code": "INVALID_ORGANIZATION",
    "message": "Invalid organization UUID provided",
    "details": {
      "orgUuid": "Organization not found or malformed UUID"
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: User does not have permission to export reports
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to export credit consumption reports",
    "details": {
      "required_permission": "billing_export",
      "user_permissions": ["billing_view"]
    }
  }
}
```

**404 Not Found**: Organization not found
```json
{
  "error": {
    "code": "ORGANIZATION_NOT_FOUND",
    "message": "Organization not found or not accessible"
  }
}
```

**429 Too Many Requests**: Export rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many export requests. Please wait before requesting another report",
    "details": {
      "retry_after": "2025-11-02T17:00:00Z",
      "limit": "1 export per hour per organization"
    }
  }
}
```

**500 Internal Server Error**: Report generation failed
```json
{
  "error": {
    "code": "REPORT_GENERATION_FAILED",
    "message": "Failed to generate credit consumption report",
    "details": {
      "error_type": "data_processing_error",
      "support_contact": "support@doconchain.com"
    }
  }
}
```

#### Best Practices

- **Schedule Regularly**: Generate reports monthly for consistent monitoring
- **Archive Reports**: Save important reports for historical reference
- **Review Timely**: Review reports while data is current
- **Share Appropriately**: Share reports only with authorized personnel
- **Monitor Delivery**: Ensure email delivery and check spam folders

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Permission Validation**: Strict validation of export permissions
- **Data Protection**: Secure handling of sensitive financial data
- **Email Security**: Secure email delivery with encryption
- **Audit Logging**: All export requests logged for compliance
- **Access Control**: Role-based access to export functionality
- **Rate Limiting**: Protection against abuse and system overload

---

### 83. Transfer Organization Credits to Sub-Organization

Transfer credits from a parent organization to one of its sub-organizations.

**Endpoint**: `POST /api/v2/organizations/transfer/credits`

**URL**: `https://stg-api2.doconchain.com/api/v2/organizations/transfer/credits?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters** (multipart/form-data):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sub_org_uuid` | string | Yes | UUID of the sub-organization to receive credits |
| `credits` | integer | Yes | Number of credits to transfer (must be positive) |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "message": "Credits transferred successfully",
  "data": {
    "transfer_id": "transfer_12345",
    "from_organization": {
      "uuid": "org_parent_001",
      "name": "Main Organization",
      "credits_before": 10000,
      "credits_after": 8500,
      "credits_transferred": 1500
    },
    "to_organization": {
      "uuid": "org_sub_001",
      "name": "Engineering Department",
      "credits_before": 500,
      "credits_after": 2000,
      "credits_received": 1500
    },
    "transfer_details": {
      "amount": 1500,
      "transfer_date": "2025-11-02T17:00:00Z",
      "initiated_by": "user_11111",
      "transfer_type": "parent_to_sub"
    }
  },
  "meta": {
    "transaction_fee": 0,
    "processing_time": "2.3 seconds",
    "audit_logged": true
  }
}
```

#### Examples

**cURL**:
```bash
curl -X POST "https://stg-api2.doconchain.com/api/v2/organizations/transfer/credits?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "sub_org_uuid=org_sub_001" \
  -F "credits=1500"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('sub_org_uuid', 'org_sub_001');
formData.append('credits', '1500');

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/api/v2/organizations/transfer/credits',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'multipart/form-data'
  },
  data: formData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Credit Transfer Process

1. **Permission Validation**: Verify user has admin rights in parent organization
2. **Organization Validation**: Confirm parent-child relationship exists
3. **Credit Availability**: Check sufficient credits in parent organization
4. **Transfer Limits**: Validate transfer amount against policy limits
5. **Atomic Transaction**: Execute transfer as single atomic operation
6. **Balance Updates**: Update credit balances for both organizations
7. **Audit Logging**: Log transfer details for compliance
8. **Notification**: Send notifications to relevant parties

#### Transfer Validation Rules

| Validation | Requirement | Error Code |
|------------|-------------|------------|
| **Parent-Child Relationship** | Sub-org must be direct child of parent | INVALID_RELATIONSHIP |
| **Admin Rights** | User must be admin of parent org | INSUFFICIENT_PERMISSIONS |
| **Credit Availability** | Parent must have sufficient credits | INSUFFICIENT_CREDITS |
| **Transfer Limits** | Amount within daily/monthly limits | TRANSFER_LIMIT_EXCEEDED |
| **Positive Amount** | Credits must be positive integer | INVALID_AMOUNT |
| **Active Organizations** | Both orgs must be active | ORGANIZATION_INACTIVE |

#### Transfer Limits and Policies

| Limit Type | Default Limit | Description |
|------------|---------------|-------------|
| **Minimum Transfer** | 1 credit | Smallest transferable amount |
| **Maximum Transfer** | 10,000 credits | Largest single transfer |
| **Daily Limit** | 50,000 credits | Maximum per day per organization |
| **Monthly Limit** | 200,000 credits | Maximum per month per organization |

#### Transfer Types

| Transfer Direction | Description | Use Case |
|-------------------|-------------|----------|
| **Parent to Sub** | Main org to department | Resource allocation |
| **Sub to Parent** | Department to main org | Credit consolidation |
| **Sub to Sub** | Between departments | Inter-department transfers |

#### Transfer Fees

- **Internal Transfers**: No fees for parent-sub organization transfers
- **Cross-Organization**: Fees may apply for transfers between unrelated organizations
- **Large Transfers**: Volume discounts may apply for bulk transfers

#### Use Cases

- **Resource Allocation**: Distribute credits to departments based on needs
- **Budget Management**: Allocate monthly credit budgets to sub-organizations
- **Project Funding**: Provide credits for specific projects or initiatives
- **Department Autonomy**: Allow departments to manage their own credit usage
- **Cost Center Management**: Track and control spending by organizational units

#### Important Notes

- **Atomic Operation**: Transfer either succeeds completely or fails entirely
- **Immediate Effect**: Credit balances update immediately after transfer
- **Audit Trail**: All transfers logged with full details for compliance
- **No Reversals**: Transfers cannot be reversed once completed
- **Real-time Balance**: Balances reflect current state after transfer

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Parent Organization Admin**: User must be admin of the parent organization
- **Valid Relationship**: Sub-organization must be a direct child of parent
- **Active Organizations**: Both organizations must be active
- **Sufficient Credits**: Parent organization must have enough credits

#### Error Responses

**400 Bad Request**: Invalid transfer parameters
```json
{
  "error": {
    "code": "INVALID_TRANSFER_REQUEST",
    "message": "Invalid credit transfer request",
    "details": {
      "sub_org_uuid": "Invalid sub-organization UUID",
      "credits": "Amount must be a positive integer"
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: Insufficient permissions for transfer
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to transfer organization credits",
    "details": {
      "required_role": "parent_org_admin",
      "user_role": "member",
      "missing_permissions": ["credit_transfer"]
    }
  }
}
```

**404 Not Found**: Organization or relationship not found
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Organization or relationship not found",
    "details": {
      "sub_org_uuid": "Sub-organization not found",
      "relationship": "No parent-child relationship exists"
    }
  }
}
```

**409 Conflict**: Transfer validation failed
```json
{
  "error": {
    "code": "TRANSFER_CONFLICT",
    "message": "Credit transfer cannot be completed",
    "details": {
      "reason": "Insufficient credits in parent organization",
      "available_credits": 800,
      "requested_transfer": 1500
    }
  }
}
```

**422 Unprocessable Entity**: Business rule violation
```json
{
  "error": {
    "code": "TRANSFER_LIMIT_EXCEEDED",
    "message": "Transfer amount exceeds policy limits",
    "details": {
      "daily_limit": 50000,
      "daily_used": 45000,
      "requested": 8000,
      "available_today": 5000
    }
  }
}
```

**429 Too Many Requests**: Transfer rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many transfer requests. Please wait before trying again",
    "details": {
      "retry_after": "2025-11-02T17:31:00Z",
      "limit": "10 transfers per hour"
    }
  }
}
```

#### Best Practices

- **Plan Transfers**: Calculate required amounts before transferring
- **Monitor Balances**: Track credit balances across organizations
- **Document Transfers**: Record transfer purposes for audit trails
- **Set Policies**: Establish clear credit allocation policies
- **Regular Reviews**: Review transfer history and adjust allocations

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Permission Validation**: Strict validation of transfer permissions
- **Relationship Verification**: Confirm organizational hierarchy before transfer
- **Amount Validation**: Prevent unauthorized large transfers
- **Audit Logging**: All transfers logged for financial compliance
- **Access Control**: Admin-only access to credit transfer functionality
- **Rate Limiting**: Protection against transfer abuse

---

### 84. Bulk Allocate Credits to Organizations

Allocate credits to multiple organizations in a single bulk operation.

**Endpoint**: `POST /api/v2/organizations/allocate/credits`

**URL**: `https://stg-api2.doconchain.com/api/v2/organizations/allocate/credits?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters** (multipart/form-data):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `credit_allocation` | string | Yes | JSON string containing allocation details for multiple organizations |

#### Credit Allocation Format

The `credit_allocation` parameter should be a JSON string with the following structure:

```json
[
  {
    "organization_uuid": "org_001",
    "credits": 1000,
    "allocation_type": "monthly_budget",
    "notes": "Q4 2025 budget allocation"
  },
  {
    "organization_uuid": "org_002",
    "credits": 2500,
    "allocation_type": "project_funding",
    "notes": "New product launch project"
  },
  {
    "organization_uuid": "org_003",
    "credits": 500,
    "allocation_type": "bonus_credits",
    "notes": "Performance bonus for Q3"
  }
]
```

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "status": "success",
  "message": "Credits allocated successfully to 3 organizations",
  "data": {
    "allocation_id": "bulk_alloc_12345",
    "total_organizations": 3,
    "total_credits_allocated": 4000,
    "allocations": [
      {
        "organization_uuid": "org_001",
        "organization_name": "Engineering Department",
        "credits_allocated": 1000,
        "previous_balance": 500,
        "new_balance": 1500,
        "status": "completed",
        "transaction_id": "txn_001"
      },
      {
        "organization_uuid": "org_002",
        "organization_name": "Marketing Department",
        "credits_allocated": 2500,
        "previous_balance": 800,
        "new_balance": 3300,
        "status": "completed",
        "transaction_id": "txn_002"
      },
      {
        "organization_uuid": "org_003",
        "organization_name": "Sales Department",
        "credits_allocated": 500,
        "previous_balance": 200,
        "new_balance": 700,
        "status": "completed",
        "transaction_id": "txn_003"
      }
    ],
    "summary": {
      "successful_allocations": 3,
      "failed_allocations": 0,
      "total_credits_distributed": 4000,
      "processing_time": "1.2 seconds"
    }
  },
  "meta": {
    "allocated_at": "2025-11-02T18:00:00Z",
    "allocated_by": "user_11111",
    "allocation_type": "bulk_manual",
    "audit_logged": true
  }
}
```

#### Examples

**cURL**:
```bash
curl -X POST "https://stg-api2.doconchain.com/api/v2/organizations/allocate/credits?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F 'credit_allocation=[
    {
      "organization_uuid": "org_001",
      "credits": 1000,
      "allocation_type": "monthly_budget",
      "notes": "Q4 2025 budget allocation"
    },
    {
      "organization_uuid": "org_002",
      "credits": 2500,
      "allocation_type": "project_funding",
      "notes": "New product launch project"
    }
  ]'
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const allocationData = [
  {
    organization_uuid: 'org_001',
    credits: 1000,
    allocation_type: 'monthly_budget',
    notes: 'Q4 2025 budget allocation'
  },
  {
    organization_uuid: 'org_002',
    credits: 2500,
    allocation_type: 'project_funding',
    notes: 'New product launch project'
  }
];

const formData = new FormData();
formData.append('credit_allocation', JSON.stringify(allocationData));

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/api/v2/organizations/allocate/credits',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'multipart/form-data'
  },
  data: formData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Bulk Allocation Process

1. **Request Validation**: Verify user permissions and allocation data format
2. **Data Parsing**: Parse and validate JSON allocation array
3. **Organization Validation**: Verify all target organizations exist and are accessible
4. **Credit Availability**: Check sufficient credits for bulk allocation
5. **Individual Processing**: Process each allocation with validation
6. **Atomic Transactions**: Execute all allocations or rollback on failure
7. **Balance Updates**: Update credit balances for all organizations
8. **Audit Logging**: Log complete bulk allocation details
9. **Result Compilation**: Generate comprehensive allocation report

#### Allocation Types

| Type | Description | Use Case |
|------|-------------|----------|
| **monthly_budget** | Regular monthly credit allocation | Ongoing operational budgets |
| **project_funding** | Credits for specific projects | Project-based funding |
| **bonus_credits** | Performance or promotional credits | Rewards and incentives |
| **emergency_allocation** | Urgent credit requirements | Unexpected needs |
| **reimbursement** | Credit refunds or reimbursements | Error corrections |

#### Bulk Operation Limits

| Limit Type | Default Limit | Description |
|------------|---------------|-------------|
| **Max Organizations** | 50 | Maximum organizations per bulk allocation |
| **Max Credits per Org** | 10,000 | Maximum credits per organization |
| **Total Credits** | 100,000 | Maximum total credits per bulk operation |
| **Request Size** | 1MB | Maximum JSON payload size |

#### Partial Success Handling

For bulk operations, the API supports partial success scenarios:

- **Continue on Error**: Process remaining allocations if one fails
- **Rollback on Critical Error**: Cancel entire operation for system errors
- **Detailed Reporting**: Report success/failure status for each allocation

#### Allocation Validation Rules

| Validation | Requirement | Error Handling |
|------------|-------------|----------------|
| **Organization Access** | User must have access to all target orgs | Skip invalid organizations |
| **Credit Availability** | Sufficient credits for total allocation | Fail entire operation |
| **Organization Status** | All organizations must be active | Skip inactive organizations |
| **Amount Validation** | Positive credit amounts only | Skip invalid amounts |
| **Duplicate Prevention** | No duplicate organizations in request | Fail with validation error |

#### Use Cases

- **Monthly Budget Distribution**: Allocate monthly budgets to all departments
- **Project Funding**: Distribute credits for multiple projects simultaneously
- **Performance Bonuses**: Award credits to multiple organizations at once
- **Organizational Changes**: Reallocate credits during restructuring
- **Emergency Funding**: Provide urgent credits to multiple departments

#### Important Notes

- **Atomic Operation**: Either all allocations succeed or the entire operation fails
- **Credit Source**: Credits are deducted from the allocating user's organization
- **Immediate Effect**: All credit balances update immediately
- **Audit Trail**: Complete audit log for compliance and tracking
- **Rate Limiting**: Subject to bulk operation rate limits

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Organization Admin**: User must be admin of the allocating organization
- **Credit Availability**: Sufficient credits for total allocation amount
- **Organization Access**: Access to all target organizations
- **Valid JSON**: Properly formatted allocation data

#### Error Responses

**400 Bad Request**: Invalid allocation data or format
```json
{
  "error": {
    "code": "INVALID_ALLOCATION_DATA",
    "message": "Invalid credit allocation data provided",
    "details": {
      "json_format": "Invalid JSON format in credit_allocation",
      "missing_fields": ["organization_uuid", "credits"],
      "invalid_amounts": ["credits must be positive integers"]
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: Insufficient permissions for bulk allocation
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to bulk credit allocation",
    "details": {
      "required_permissions": ["credit_allocate", "organization_admin"],
      "user_permissions": ["credit_view"]
    }
  }
}
```

**409 Conflict**: Insufficient credits or allocation conflicts
```json
{
  "error": {
    "code": "ALLOCATION_CONFLICT",
    "message": "Bulk allocation cannot be completed",
    "details": {
      "insufficient_credits": "Available: 5000, Required: 8000",
      "invalid_organizations": ["org_999 does not exist"]
    }
  }
}
```

**413 Payload Too Large**: Allocation data exceeds size limits
```json
{
  "error": {
    "code": "PAYLOAD_TOO_LARGE",
    "message": "Allocation data exceeds maximum size limit",
    "details": {
      "max_size": "1MB",
      "provided_size": "2.5MB",
      "suggestion": "Reduce number of organizations or split into multiple requests"
    }
  }
}
```

**422 Unprocessable Entity**: Business rule violations
```json
{
  "error": {
    "code": "ALLOCATION_LIMIT_EXCEEDED",
    "message": "Bulk allocation exceeds policy limits",
    "details": {
      "max_organizations": 50,
      "provided_organizations": 75,
      "max_total_credits": 100000,
      "provided_credits": 150000
    }
  }
}
```

**429 Too Many Requests**: Bulk allocation rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many bulk allocation requests. Please wait before trying again",
    "details": {
      "retry_after": "2025-11-02T18:31:00Z",
      "limit": "5 bulk allocations per hour"
    }
  }
}
```

#### Best Practices

- **Batch Processing**: Process allocations in optimal batch sizes
- **Validation First**: Validate all data before submitting bulk requests
- **Error Handling**: Implement proper error handling for partial failures
- **Audit Monitoring**: Regularly review allocation audit logs
- **Credit Planning**: Plan credit allocations based on organizational needs

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Permission Validation**: Strict validation of bulk allocation permissions
- **Data Validation**: Comprehensive validation of allocation data
- **Audit Logging**: All bulk allocations logged for financial compliance
- **Access Control**: Admin-only access to bulk credit operations
- **Rate Limiting**: Protection against allocation abuse and system overload

---

### 85. Get All Sub-Organizations

Retrieve a list of all sub-organizations accessible to the authenticated user.

**Endpoint**: `GET /api/v2/organizations/sub`

**URL**: `https://stg-api2.doconchain.com/api/v2/organizations/sub?user_type=ENTERPRISE_API&page=1&per_page=20`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |
| `page` | integer | No | Page number for pagination (default: 1) |
| `per_page` | integer | No | Number of results per page (default: 20, max: 100) |
| `include_inactive` | boolean | No | Include inactive sub-organizations (default: false) |
| `search` | string | No | Search term to filter organizations by name |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "data": [
    {
      "id": 12345,
      "uuid": "org_sub_001",
      "name": "Engineering Department",
      "description": "Software development and engineering team",
      "parent_organization_id": 11111,
      "parent_organization_name": "Main Organization",
      "status": "active",
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-11-01T14:30:00Z",
      "member_count": 25,
      "admin_count": 3,
      "credit_balance": 5000,
      "plan_type": "ENTERPRISE_API",
      "settings": {
        "allow_sub_orgs": true,
        "credit_sharing": true,
        "member_invitation": true
      }
    },
    {
      "id": 12346,
      "uuid": "org_sub_002",
      "name": "Marketing Department",
      "description": "Brand marketing and customer acquisition",
      "parent_organization_id": 11111,
      "parent_organization_name": "Main Organization",
      "status": "active",
      "created_at": "2025-02-20T09:15:00Z",
      "updated_at": "2025-10-28T16:45:00Z",
      "member_count": 15,
      "admin_count": 2,
      "credit_balance": 3200,
      "plan_type": "ENTERPRISE_API",
      "settings": {
        "allow_sub_orgs": false,
        "credit_sharing": true,
        "member_invitation": true
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total_pages": 3,
    "total_records": 45,
    "has_next": true,
    "has_previous": false
  },
  "summary": {
    "total_sub_organizations": 45,
    "active_sub_organizations": 42,
    "inactive_sub_organizations": 3,
    "total_members": 1250,
    "total_credits": 150000
  },
  "parent_organization": {
    "id": 11111,
    "name": "Main Organization",
    "uuid": "org_main_001"
  }
}
```

#### Examples

**cURL**:
```bash
curl -X GET "https://stg-api2.doconchain.com/api/v2/organizations/sub?user_type=ENTERPRISE_API&page=1&per_page=20" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/api/v2/organizations/sub',
  params: {
    user_type: 'ENTERPRISE_API',
    page: 1,
    per_page: 20
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Organization Hierarchy

DOCONCHAIN supports multi-level organization hierarchies:

```
Main Organization (Level 0)
├── Engineering Department (Level 1)
│   ├── Frontend Team (Level 2)
│   ├── Backend Team (Level 2)
│   └── DevOps Team (Level 2)
├── Marketing Department (Level 1)
│   ├── Content Team (Level 2)
│   └── Design Team (Level 2)
└── Sales Department (Level 1)
    ├── Enterprise Sales (Level 2)
    └── SMB Sales (Level 2)
```

#### Sub-Organization Data Structure

| Field | Description | Example |
|-------|-------------|----------|
| **id** | Unique organization ID | 12345 |
| **uuid** | Unique organization UUID | org_sub_001 |
| **name** | Organization display name | Engineering Department |
| **description** | Organization description | Software development team |
| **parent_organization_id** | Parent org ID | 11111 |
| **status** | Organization status | active/inactive |
| **member_count** | Total members | 25 |
| **admin_count** | Admin members | 3 |
| **credit_balance** | Available credits | 5000 |

#### Organization Status

| Status | Description | Access |
|--------|-------------|--------|
| **active** | Fully operational | Full access to all features |
| **inactive** | Temporarily disabled | Read-only access |
| **suspended** | Administrative suspension | No access |
| **pending** | Awaiting activation | Limited access |

#### Filtering and Search

| Filter | Parameter | Description |
|--------|-----------|-------------|
| **Status** | `include_inactive=true` | Include inactive organizations |
| **Search** | `search=engineering` | Filter by organization name |
| **Pagination** | `page=1&per_page=20` | Control result pagination |

#### Access Control

- **Parent Organization Admins**: Can view all sub-organizations
- **Sub-Organization Admins**: Can view their own organization and child organizations
- **Members**: Limited access based on permissions
- **System Administrators**: Can view all organizations in the system

#### Use Cases

- **Organization Management**: View and manage organizational structure
- **Resource Allocation**: Plan credit and resource distribution
- **User Management**: Understand member distribution across organizations
- **Reporting**: Generate organization-wide reports and analytics
- **Hierarchy Navigation**: Navigate complex organizational structures

#### Important Notes

- **Hierarchical Access**: Users see organizations based on their access level
- **Real-time Data**: Member counts and credit balances are real-time
- **Pagination Required**: Large organizations require pagination
- **Search Functionality**: Supports partial name matching
- **Status Filtering**: Default shows only active organizations

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Organization Access**: User must belong to an organization with sub-organizations
- **Read Permissions**: User must have permission to view organization structure
- **Active Account**: User's account must be active

#### Error Responses

**400 Bad Request**: Invalid query parameters
```json
{
  "error": {
    "code": "INVALID_PARAMETERS",
    "message": "Invalid query parameters provided",
    "details": {
      "page": "Page must be a positive integer",
      "per_page": "Per page must be between 1 and 100"
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: Insufficient permissions to view sub-organizations
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to view sub-organizations",
    "details": {
      "required_permission": "organization_view",
      "user_permissions": ["project_create"]
    }
  }
}
```

**404 Not Found**: No sub-organizations found
```json
{
  "error": {
    "code": "NO_SUB_ORGANIZATIONS",
    "message": "No sub-organizations found for the current user",
    "details": {
      "reason": "User has no access to sub-organizations or none exist"
    }
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many organization requests. Please wait before trying again",
    "details": {
      "retry_after": "2025-11-02T19:01:00Z",
      "limit": "60 requests per minute"
    }
  }
}
```

#### Best Practices

- **Pagination**: Use appropriate page sizes for your application
- **Caching**: Cache organization data to reduce API calls
- **Search Optimization**: Use search parameters to filter results efficiently
- **Status Monitoring**: Regularly check organization status
- **Access Auditing**: Monitor who accesses organization information

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Permission Validation**: Strict validation of organization access permissions
- **Data Protection**: Secure handling of organizational structure data
- **Audit Logging**: All organization access attempts logged
- **Access Control**: Role-based access to organizational information
- **Rate Limiting**: Protection against data enumeration attacks

---

### 86. Create Sub-Organization

Create a new sub-organization under an existing parent organization.

**Endpoint**: `POST /api/v2/organizations/sub`

**URL**: `https://stg-api2.doconchain.com/api/v2/organizations/sub?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters** (multipart/form-data):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Name of the sub-organization |
| `address` | string | No | Physical address or contact details |
| `photo` | file | No | Organization logo/branding image (PNG, JPG, max 5MB) |
| `sub_organization_type_name` | string | Yes | Type/category of the sub-organization |
| `organization_uuid` | integer | Yes | UUID of the parent organization |
| `description` | string | No | Description of the sub-organization's purpose |
| `settings` | string | No | JSON string of organization settings |

#### Organization Settings Format

The `settings` parameter should be a JSON string with organization configuration:

```json
{
  "allow_sub_orgs": true,
  "credit_sharing": true,
  "member_invitation": true,
  "default_member_role": "member",
  "require_approval": false,
  "max_members": 100
}
```

#### Response

**Status**: `201 Created`

**Response Body**:
```json
{
  "message": "Sub-organization created successfully",
  "data": {
    "organization": {
      "id": 12346,
      "uuid": "org_sub_003",
      "name": "Product Development Team",
      "description": "New product development and innovation team",
      "address": "123 Innovation Drive, Tech City, TC 12345",
      "sub_organization_type_name": "Development",
      "parent_organization_id": 11111,
      "parent_organization_name": "Main Organization",
      "status": "active",
      "created_at": "2025-11-02T20:00:00Z",
      "member_count": 0,
      "admin_count": 0,
      "credit_balance": 0,
      "plan_type": "ENTERPRISE_API",
      "photo_url": "https://api.doconchain.com/storage/organizations/org_sub_003/photo.jpg",
      "settings": {
        "allow_sub_orgs": true,
        "credit_sharing": true,
        "member_invitation": true,
        "default_member_role": "member",
        "require_approval": false,
        "max_members": 100
      }
    },
    "created_by": {
      "user_id": "user_11111",
      "name": "John Admin",
      "email": "admin@company.com"
    }
  },
  "meta": {
    "creation_time": "2.3 seconds",
    "welcome_email_sent": false,
    "initial_setup_required": true
  }
}
```

#### Examples

**cURL**:
```bash
curl -X POST "https://stg-api2.doconchain.com/api/v2/organizations/sub?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "name=Product Development Team" \
  -F "address=123 Innovation Drive, Tech City, TC 12345" \
  -F "photo=@/path/to/logo.png" \
  -F "sub_organization_type_name=Development" \
  -F "organization_uuid=org_main_001" \
  -F "description=New product development and innovation team"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const formData = new FormData();
formData.append('name', 'Product Development Team');
formData.append('address', '123 Innovation Drive, Tech City, TC 12345');
formData.append('photo', fs.createReadStream('/path/to/logo.png'));
formData.append('sub_organization_type_name', 'Development');
formData.append('organization_uuid', 'org_main_001');
formData.append('description', 'New product development and innovation team');

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/api/v2/organizations/sub',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'multipart/form-data'
  },
  data: formData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Sub-Organization Creation Process

1. **Permission Validation**: Verify user has permission to create sub-organizations
2. **Parent Validation**: Confirm parent organization exists and allows sub-organizations
3. **Data Validation**: Validate all required fields and data formats
4. **Photo Processing**: Process and store organization logo if provided
5. **Settings Configuration**: Apply default or custom organization settings
6. **Organization Creation**: Create the sub-organization record
7. **Hierarchy Linking**: Establish parent-child relationship
8. **Audit Logging**: Log the creation event with full details
9. **Notification**: Send notifications to relevant administrators

#### Sub-Organization Types

| Type | Description | Common Use Cases |
|------|-------------|------------------|
| **Department** | Functional departments | Engineering, Marketing, Sales |
| **Division** | Business divisions | Products, Services, Operations |
| **Team** | Project or working teams | Development Team, Support Team |
| **Branch** | Geographic locations | New York Office, London Office |
| **Unit** | Specialized units | Research Unit, Quality Unit |
| **Group** | User groups | Contractors, Partners, Vendors |

#### Organization Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| **allow_sub_orgs** | boolean | true | Allow creation of sub-organizations |
| **credit_sharing** | boolean | true | Enable credit transfers |
| **member_invitation** | boolean | true | Allow member invitations |
| **default_member_role** | string | "member" | Default role for new members |
| **require_approval** | boolean | false | Require approval for new members |
| **max_members** | integer | 100 | Maximum number of members |

#### Photo Requirements

| Requirement | Specification |
|-------------|---------------|
| **Format** | PNG, JPG, JPEG |
| **Max Size** | 5MB |
| **Min Resolution** | 200x200 pixels |
| **Max Resolution** | 2048x2048 pixels |
| **Aspect Ratio** | 1:1 (square) recommended |

#### Use Cases

- **Organizational Restructuring**: Create departments during company reorganization
- **Geographic Expansion**: Set up branch offices in new locations
- **Project Teams**: Create temporary teams for specific projects
- **Functional Groups**: Organize by business functions or specialties
- **Partner Management**: Create separate organizations for partners or clients

#### Important Notes

- **Hierarchy Limits**: Maximum 5 levels of sub-organizations
- **Naming Uniqueness**: Names must be unique within the parent organization
- **Photo Processing**: Images are automatically resized and optimized
- **Default Settings**: Sensible defaults applied if settings not provided
- **Immediate Activation**: New organizations are active immediately

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Parent Organization Admin**: User must be admin of the parent organization
- **Sub-Organization Permission**: Parent organization must allow sub-organizations
- **Valid Parent**: Parent organization must exist and be active
- **Unique Name**: Organization name must be unique within parent

#### Error Responses

**400 Bad Request**: Invalid organization data
```json
{
  "error": {
    "code": "INVALID_ORGANIZATION_DATA",
    "message": "Invalid sub-organization data provided",
    "details": {
      "name": "Organization name is required",
      "organization_uuid": "Invalid parent organization UUID",
      "photo": "Unsupported image format"
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: Insufficient permissions to create sub-organizations
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to create sub-organizations",
    "details": {
      "required_role": "parent_org_admin",
      "user_role": "member",
      "parent_org_settings": "Sub-organizations not allowed"
    }
  }
}
```

**409 Conflict**: Organization name or UUID conflict
```json
{
  "error": {
    "code": "ORGANIZATION_CONFLICT",
    "message": "Organization creation conflict",
    "details": {
      "name": "Organization name already exists",
      "uuid": "UUID already in use"
    }
  }
}
```

**413 Payload Too Large**: Photo file exceeds size limit
```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "Organization photo exceeds maximum size limit",
    "details": {
      "max_size": "5MB",
      "provided_size": "8.5MB"
    }
  }
}
```

**422 Unprocessable Entity**: Business rule violations
```json
{
  "error": {
    "code": "HIERARCHY_LIMIT_EXCEEDED",
    "message": "Maximum organization hierarchy depth exceeded",
    "details": {
      "max_depth": 5,
      "current_depth": 6,
      "solution": "Choose a different parent organization"
    }
  }
}
```

**429 Too Many Requests**: Organization creation rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many organization creation requests. Please wait before trying again",
    "details": {
      "retry_after": "2025-11-02T20:31:00Z",
      "limit": "10 organizations per hour"
    }
  }
}
```

#### Best Practices

- **Naming Conventions**: Use clear, descriptive organization names
- **Photo Optimization**: Prepare images in correct format and size before upload
- **Settings Planning**: Plan organization settings based on intended use
- **Hierarchy Design**: Design organization structure carefully for scalability
- **Documentation**: Document organization purposes and responsibilities

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Permission Validation**: Strict validation of sub-organization creation permissions
- **Data Validation**: Comprehensive validation of organization data and files
- **Audit Logging**: All organization creation events logged
- **Access Control**: Admin-only access to organization creation
- **File Security**: Secure handling and storage of organization photos

---

### 87. Get Specific Sub-Organization

Retrieve detailed information about a specific sub-organization.

**Endpoint**: `GET /api/v2/organizations/sub/{uuid}`

**URL**: `https://stg-api2.doconchain.com/api/v2/organizations/sub/{uuid}?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the sub-organization to retrieve |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |
| `include_members` | boolean | No | Include member list in response (default: false) |
| `include_stats` | boolean | No | Include usage statistics (default: false) |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "data": {
    "organization": {
      "id": 12346,
      "uuid": "org_sub_003",
      "name": "Product Development Team",
      "description": "New product development and innovation team",
      "address": "123 Innovation Drive, Tech City, TC 12345",
      "phone": "+1-555-0123",
      "website": "https://dev.company.com",
      "sub_organization_type_name": "Development",
      "parent_organization_id": 11111,
      "parent_organization_name": "Main Organization",
      "parent_organization_uuid": "org_main_001",
      "status": "active",
      "created_at": "2025-11-02T20:00:00Z",
      "updated_at": "2025-11-02T20:00:00Z",
      "created_by": {
        "user_id": "user_11111",
        "name": "John Admin",
        "email": "admin@company.com"
      },
      "member_count": 12,
      "admin_count": 2,
      "credit_balance": 3500,
      "plan_type": "ENTERPRISE_API",
      "photo_url": "https://api.doconchain.com/storage/organizations/org_sub_003/photo.jpg",
      "settings": {
        "allow_sub_orgs": true,
        "credit_sharing": true,
        "member_invitation": true,
        "default_member_role": "member",
        "require_approval": false,
        "max_members": 100
      }
    },
    "hierarchy": {
      "level": 1,
      "path": ["org_main_001", "org_sub_003"],
      "parent_chain": [
        {
          "id": 11111,
          "uuid": "org_main_001",
          "name": "Main Organization",
          "level": 0
        }
      ],
      "child_organizations": [
        {
          "id": 12347,
          "uuid": "org_sub_003_001",
          "name": "Frontend Team",
          "level": 2
        }
      ]
    },
    "members": [
      {
        "id": "user_22222",
        "email": "jane.dev@company.com",
        "first_name": "Jane",
        "last_name": "Developer",
        "role": "admin",
        "joined_at": "2025-11-02T20:15:00Z",
        "status": "active"
      }
    ],
    "statistics": {
      "total_projects": 45,
      "active_projects": 12,
      "completed_projects": 33,
      "total_documents": 156,
      "signed_documents": 142,
      "pending_signatures": 14,
      "credit_usage": {
        "this_month": 1200,
        "last_month": 980,
        "average_monthly": 1100
      },
      "member_activity": {
        "active_users": 10,
        "inactive_users": 2,
        "new_members_this_month": 3
      }
    }
  },
  "meta": {
    "request_time": "0.45 seconds",
    "cache_status": "fresh",
    "last_updated": "2025-11-02T20:30:00Z"
  }
}
```

#### Examples

**cURL**:
```bash
curl -X GET "https://stg-api2.doconchain.com/api/v2/organizations/sub/org_sub_003?user_type=ENTERPRISE_API&include_members=true&include_stats=true" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/api/v2/organizations/sub/org_sub_003',
  params: {
    user_type: 'ENTERPRISE_API',
    include_members: true,
    include_stats: true
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Response Data Structure

| Section | Description | When Included |
|---------|-------------|---------------|
| **organization** | Basic organization details | Always |
| **hierarchy** | Organizational structure info | Always |
| **members** | Member list with details | When `include_members=true` |
| **statistics** | Usage and activity stats | When `include_stats=true` |

#### Organization Details

| Field | Description | Example |
|-------|-------------|----------|
| **Basic Info** | Name, description, contact details | Product Development Team |
| **Hierarchy** | Parent/child relationships | Level 1 in organization tree |
| **Status** | Current organization status | active/inactive |
| **Membership** | Member counts and roles | 12 members, 2 admins |
| **Resources** | Credits and plan information | 3500 credits, ENTERPRISE_API |
| **Branding** | Logo and visual identity | Photo URL for emails |

#### Hierarchy Information

| Field | Description |
|-------|-------------|
| **level** | Depth in organization hierarchy (0 = root) |
| **path** | Array of UUIDs from root to current org |
| **parent_chain** | Detailed parent organization info |
| **child_organizations** | List of direct child organizations |

#### Member Information (when included)

| Field | Description |
|-------|-------------|
| **Profile** | Basic user information |
| **Role** | Organization role (admin/member) |
| **Status** | Member status and join date |
| **Activity** | Recent activity indicators |

#### Statistics (when included)

| Category | Metrics |
|----------|---------|
| **Projects** | Total, active, completed projects |
| **Documents** | Document counts and signing status |
| **Credits** | Usage patterns and trends |
| **Members** | Activity and growth metrics |

#### Use Cases

- **Organization Dashboard**: Display detailed organization information
- **Member Management**: View and manage organization members
- **Resource Monitoring**: Track credit usage and project activity
- **Hierarchy Navigation**: Understand organizational structure
- **Reporting**: Generate detailed organization reports

#### Important Notes

- **Access Control**: Users can only view organizations they have access to
- **Performance**: Large member lists may impact response time
- **Caching**: Organization data may be cached for performance
- **Real-time**: Statistics reflect current state
- **Optional Data**: Members and stats are optional for performance

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Organization Access**: User must have access to the specified sub-organization
- **Valid UUID**: Organization UUID must exist and be accessible
- **Read Permissions**: User must have permission to view organization details

#### Error Responses

**400 Bad Request**: Invalid UUID format
```json
{
  "error": {
    "code": "INVALID_UUID",
    "message": "Invalid organization UUID format",
    "details": {
      "uuid": "Must be a valid UUID format",
      "example": "org_sub_003"
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: No access to the organization
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to this sub-organization",
    "details": {
      "organization_uuid": "org_sub_003",
      "access_level": "none",
      "required_access": "member"
    }
  }
}
```

**404 Not Found**: Organization not found
```json
{
  "error": {
    "code": "ORGANIZATION_NOT_FOUND",
    "message": "Sub-organization not found",
    "details": {
      "uuid": "org_sub_003",
      "reason": "Organization does not exist or has been deleted"
    }
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many organization detail requests. Please wait before trying again",
    "details": {
      "retry_after": "2025-11-02T21:01:00Z",
      "limit": "100 requests per minute"
    }
  }
}
```

#### Best Practices

- **Conditional Loading**: Use include_members and include_stats judiciously
- **Caching**: Cache organization data for better performance
- **Batch Requests**: Request multiple organizations efficiently
- **Access Checking**: Verify access before making detailed requests
- **Error Handling**: Handle access denied gracefully

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Permission Validation**: Strict validation of organization access permissions
- **Data Protection**: Secure handling of member and organization data
- **Audit Logging**: All organization detail access logged
- **Access Control**: Role-based access to sensitive organization information
- **Rate Limiting**: Protection against data enumeration attacks

---

### 88. Update Specific Sub-Organization

Update the details and settings of a specific sub-organization.

**Endpoint**: `PUT /api/v2/organizations/sub/{uuid}`

**URL**: `https://stg-api2.doconchain.com/api/v2/organizations/sub/{uuid}?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the sub-organization to update |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters** (multipart/form-data):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | No | Updated name of the sub-organization |
| `email` | string | No | Contact email address |
| `address` | string | No | Physical address or contact details |
| `photo` | file | No | New organization logo/branding image |
| `sub_organization_type_name` | string | No | Updated type/category of the sub-organization |
| `description` | string | No | Updated description |
| `phone` | string | No | Contact phone number |
| `website` | string | No | Organization website URL |
| `settings` | string | No | JSON string of updated organization settings |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "message": "Sub-organization updated successfully",
  "data": {
    "organization": {
      "id": 12346,
      "uuid": "org_sub_003",
      "name": "Advanced Product Development Team",
      "description": "Leading innovation in product development and technology",
      "email": "dev.team@company.com",
      "address": "456 Innovation Boulevard, Tech City, TC 12345",
      "phone": "+1-555-0124",
      "website": "https://advanced-dev.company.com",
      "sub_organization_type_name": "Research & Development",
      "status": "active",
      "updated_at": "2025-11-02T21:30:00Z",
      "photo_url": "https://api.doconchain.com/storage/organizations/org_sub_003/photo_updated.jpg",
      "settings": {
        "allow_sub_orgs": true,
        "credit_sharing": true,
        "member_invitation": true,
        "default_member_role": "member",
        "require_approval": true,
        "max_members": 150
      }
    },
    "changes": {
      "fields_updated": ["name", "description", "email", "address", "phone", "website", "sub_organization_type_name", "settings"],
      "photo_updated": true,
      "settings_changes": {
        "require_approval": {"from": false, "to": true},
        "max_members": {"from": 100, "to": 150}
      }
    },
    "updated_by": {
      "user_id": "user_11111",
      "name": "John Admin",
      "email": "admin@company.com"
    }
  },
  "meta": {
    "update_time": "1.8 seconds",
    "cache_invalidated": true,
    "notifications_sent": 2
  }
}
```

#### Examples

**cURL**:
```bash
curl -X PUT "https://stg-api2.doconchain.com/api/v2/organizations/sub/org_sub_003?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "name=Advanced Product Development Team" \
  -F "email=dev.team@company.com" \
  -F "address=456 Innovation Boulevard, Tech City, TC 12345" \
  -F "phone=+1-555-0124" \
  -F "website=https://advanced-dev.company.com" \
  -F "sub_organization_type_name=Research & Development" \
  -F "description=Leading innovation in product development and technology"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const formData = new FormData();
formData.append('name', 'Advanced Product Development Team');
formData.append('email', 'dev.team@company.com');
formData.append('address', '456 Innovation Boulevard, Tech City, TC 12345');
formData.append('phone', '+1-555-0124');
formData.append('website', 'https://advanced-dev.company.com');
formData.append('sub_organization_type_name', 'Research & Development');
formData.append('description', 'Leading innovation in product development and technology');

const options = {
  method: 'PUT',
  url: 'https://stg-api2.doconchain.com/api/v2/organizations/sub/org_sub_003',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'multipart/form-data'
  },
  data: formData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Organization Update Process

1. **Permission Validation**: Verify user has permission to update the sub-organization
2. **Organization Validation**: Confirm organization exists and user has access
3. **Data Validation**: Validate all provided fields and data formats
4. **Photo Processing**: Process new photo if provided (resize, optimize, store)
5. **Settings Validation**: Validate organization settings JSON if provided
6. **Update Application**: Apply all changes to the organization record
7. **Cache Invalidation**: Clear any cached organization data
8. **Audit Logging**: Log all changes with before/after values
9. **Notifications**: Send update notifications to affected members/admins

#### Updatable Fields

| Field | Type | Validation | Impact |
|-------|------|------------|--------|
| **name** | string | 3-100 chars, unique within parent | Display, branding |
| **email** | string | Valid email format | Contact, notifications |
| **address** | string | Max 500 chars | Contact info |
| **phone** | string | Valid phone format | Contact info |
| **website** | string | Valid URL format | External links |
| **photo** | file | PNG/JPG, 5MB max | Branding, emails |
| **sub_organization_type_name** | string | Predefined types | Categorization |
| **description** | string | Max 1000 chars | Organization info |
| **settings** | JSON | Valid settings schema | Organization behavior |

#### Settings Update Format

The `settings` parameter should be a JSON string with updated configuration:

```json
{
  "allow_sub_orgs": true,
  "credit_sharing": false,
  "member_invitation": true,
  "default_member_role": "admin",
  "require_approval": true,
  "max_members": 200
}
```

#### Photo Update Behavior

- **Replace**: New photo completely replaces the old one
- **Processing**: Automatic resizing and optimization
- **Backup**: Old photo retained for 30 days in case of rollback
- **CDN**: Updated photo URL immediately available
- **Cache**: All cached versions invalidated

#### Use Cases

- **Rebranding**: Update organization name and branding after rebranding
- **Contact Updates**: Change address, email, or phone information
- **Structure Changes**: Update organization type or description
- **Settings Adjustment**: Modify organization policies and limits
- **Photo Refresh**: Update logo for current branding standards

#### Important Notes

- **Partial Updates**: Only provided fields are updated
- **Validation**: All provided data is validated before update
- **Atomic Operation**: Either all changes succeed or none do
- **Audit Trail**: Complete change history maintained
- **Cache Updates**: All caches invalidated after update

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Organization Admin**: User must be admin of the sub-organization or parent
- **Valid Organization**: Sub-organization must exist and be accessible
- **Update Permissions**: User must have permission to update organization details
- **Data Validation**: All provided data must pass validation rules

#### Error Responses

**400 Bad Request**: Invalid update data
```json
{
  "error": {
    "code": "INVALID_UPDATE_DATA",
    "message": "Invalid sub-organization update data",
    "details": {
      "name": "Name must be between 3 and 100 characters",
      "email": "Invalid email format",
      "website": "Invalid URL format"
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: Insufficient permissions to update organization
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to update this sub-organization",
    "details": {
      "organization_uuid": "org_sub_003",
      "required_role": "admin",
      "user_role": "member"
    }
  }
}
```

**404 Not Found**: Organization not found
```json
{
  "error": {
    "code": "ORGANIZATION_NOT_FOUND",
    "message": "Sub-organization not found",
    "details": {
      "uuid": "org_sub_003"
    }
  }
}
```

**409 Conflict**: Update conflicts (name uniqueness, etc.)
```json
{
  "error": {
    "code": "UPDATE_CONFLICT",
    "message": "Organization update conflicts with existing data",
    "details": {
      "name": "Organization name already exists in parent organization"
    }
  }
}
```

**413 Payload Too Large**: Photo file exceeds size limit
```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "Organization photo exceeds maximum size limit",
    "details": {
      "max_size": "5MB",
      "provided_size": "7.2MB"
    }
  }
}
```

**422 Unprocessable Entity**: Business rule violations
```json
{
  "error": {
    "code": "SETTINGS_INVALID",
    "message": "Invalid organization settings provided",
    "details": {
      "settings": "max_members cannot be less than current member count",
      "current_members": 45,
      "proposed_max": 30
    }
  }
}
```

**429 Too Many Requests**: Update rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many organization update requests. Please wait before trying again",
    "details": {
      "retry_after": "2025-11-02T22:01:00Z",
      "limit": "20 updates per hour per organization"
    }
  }
}
```

#### Best Practices

- **Backup Data**: Note current values before making changes
- **Test Updates**: Test with non-critical organizations first
- **Batch Changes**: Group related changes in single update
- **Validate Data**: Ensure all data is correct before submission
- **Document Changes**: Record reasons for organizational changes

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Permission Validation**: Strict validation of organization update permissions
- **Data Validation**: Comprehensive validation of all update data
- **Audit Logging**: All organization updates logged with change details
- **Access Control**: Admin-only access to organization modification
- **File Security**: Secure handling of organization photo uploads

---

### 89. Delete Specific Sub-Organization

Permanently delete a sub-organization and all its associated data.

**Endpoint**: `DELETE /api/v2/organizations/sub/{uuid}`

**URL**: `https://stg-api2.doconchain.com/api/v2/organizations/sub/{uuid}?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the sub-organization to delete |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters**: None required

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "message": "Sub-organization deleted successfully",
  "data": {
    "deleted_organization": {
      "id": 12346,
      "uuid": "org_sub_003",
      "name": "Product Development Team",
      "deleted_at": "2025-11-02T22:30:00Z",
      "deleted_by": {
        "user_id": "user_11111",
        "name": "John Admin",
        "email": "admin@company.com"
      }
    },
    "cleanup_summary": {
      "projects_deleted": 0,
      "documents_deleted": 0,
      "templates_deleted": 2,
      "files_removed": 15,
      "credits_refunded": 1250,
      "parent_credits_restored": 1250
    },
    "retention_info": {
      "data_retention_days": 30,
      "restorable_until": "2025-12-02T22:30:00Z",
      "recovery_contact": "support@doconchain.com"
    }
  },
  "meta": {
    "deletion_time": "3.2 seconds",
    "permanent_deletion": true,
    "audit_logged": true
  }
}
```

#### Examples

**cURL**:
```bash
curl -X DELETE "https://stg-api2.doconchain.com/api/v2/organizations/sub/org_sub_003?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'DELETE',
  url: 'https://stg-api2.doconchain.com/api/v2/organizations/sub/org_sub_003',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Sub-Organization Deletion Process

1. **Permission Validation**: Verify user has permission to delete sub-organizations
2. **Organization Validation**: Confirm organization exists and is accessible
3. **Member Check**: Ensure organization has no active members
4. **Dependency Check**: Verify no active projects or critical dependencies
5. **Data Backup**: Create backup of organization data for retention period
6. **Resource Cleanup**: Delete all associated resources (templates, files, etc.)
7. **Credit Refund**: Return unused credits to parent organization
8. **Hierarchy Update**: Remove from organizational hierarchy
9. **Audit Logging**: Log complete deletion details
10. **Final Deletion**: Permanently remove organization record

#### Deletion Prerequisites

| Requirement | Description | Error Code |
|-------------|-------------|------------|
| **No Members** | Organization must have zero members | MEMBERS_EXIST |
| **No Active Projects** | All projects must be completed/deleted | ACTIVE_PROJECTS_EXIST |
| **Admin Permission** | User must be organization admin | INSUFFICIENT_PERMISSIONS |
| **Hierarchy Access** | Access to parent organization | HIERARCHY_ACCESS_DENIED |
| **No Child Orgs** | All child organizations must be deleted first | CHILD_ORGANIZATIONS_EXIST |

#### Data Cleanup Scope

| Data Type | Action | Notes |
|-----------|--------|-------|
| **Organization Record** | Permanently deleted | No recovery |
| **Member Associations** | Removed | Members retain individual access |
| **Projects & Documents** | Must be deleted first | Cannot delete with active content |
| **Templates** | Deleted | Organization-specific templates |
| **Files & Assets** | Deleted | Photos, documents, attachments |
| **Credit Balance** | Refunded to parent | Unused credits returned |
| **Audit Logs** | Retained | Compliance and history |

#### Credit Handling

| Scenario | Credit Action | Details |
|----------|---------------|---------|
| **Unused Credits** | Refunded to parent | Full amount returned |
| **Used Credits** | No refund | Historical usage retained |
| **Bonus Credits** | No refund | One-time allocations |
| **Transferred Credits** | No refund | Transfer history maintained |

#### Recovery and Retention

| Aspect | Policy | Duration |
|--------|--------|----------|
| **Data Recovery** | Possible within retention period | 30 days |
| **Credit Recovery** | Automatic refund | Immediate |
| **Audit Access** | Full history retained | Indefinite |
| **Member Data** | Retained in backups | 90 days |
| **File Recovery** | Not possible | Immediate deletion |

#### Use Cases

- **Organizational Restructuring**: Remove departments during reorganization
- **Project Completion**: Delete temporary project organizations
- **Cleanup**: Remove unused or obsolete sub-organizations
- **Mergers**: Clean up duplicate organizations after mergers
- **Compliance**: Remove organizations that no longer meet requirements

#### Important Notes

- **Irreversible**: Deletion cannot be undone after retention period
- **Member Safety**: Members are removed but retain individual accounts
- **Data Loss**: All organization-specific data is permanently lost
- **Credit Refund**: Unused credits automatically returned to parent
- **Audit Trail**: Complete deletion history maintained for compliance

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Organization Admin**: User must be admin of the sub-organization or parent
- **Empty Organization**: Sub-organization must have no members
- **No Dependencies**: No active projects or child organizations
- **Deletion Permission**: User must have organization deletion rights

#### Error Responses

**400 Bad Request**: Invalid UUID or deletion not allowed
```json
{
  "error": {
    "code": "INVALID_DELETION_REQUEST",
    "message": "Sub-organization deletion request is invalid",
    "details": {
      "reason": "Organization contains active members",
      "member_count": 5,
      "solution": "Remove all members before deletion"
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: Insufficient permissions to delete organization
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to delete this sub-organization",
    "details": {
      "organization_uuid": "org_sub_003",
      "required_role": "admin",
      "user_role": "member"
    }
  }
}
```

**404 Not Found**: Organization not found
```json
{
  "error": {
    "code": "ORGANIZATION_NOT_FOUND",
    "message": "Sub-organization not found",
    "details": {
      "uuid": "org_sub_003"
    }
  }
}
```

**409 Conflict**: Deletion blocked by dependencies
```json
{
  "error": {
    "code": "DELETION_CONFLICT",
    "message": "Sub-organization deletion is blocked",
    "details": {
      "blocking_factor": "active_projects",
      "active_project_count": 3,
      "solution": "Complete or delete all projects first"
    }
  }
}
```

**422 Unprocessable Entity**: Business rule violations
```json
{
  "error": {
    "code": "HIERARCHY_VIOLATION",
    "message": "Deletion violates organizational hierarchy rules",
    "details": {
      "child_organizations": 2,
      "solution": "Delete all child organizations first"
    }
  }
}
```

**429 Too Many Requests**: Deletion rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many organization deletion requests. Please wait before trying again",
    "details": {
      "retry_after": "2025-11-02T23:01:00Z",
      "limit": "5 deletions per hour"
    }
  }
}
```

#### Best Practices

- **Pre-deletion Checklist**: Verify all prerequisites before attempting deletion
- **Member Communication**: Inform members before organization deletion
- **Data Export**: Export important data before deletion
- **Dependency Review**: Check for all active projects and dependencies
- **Parent Notification**: Inform parent organization administrators

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Permission Validation**: Strict validation of organization deletion permissions
- **Dependency Checks**: Prevent deletion of organizations with active dependencies
- **Audit Logging**: All deletion attempts and completions logged
- **Access Control**: Admin-only access to organization deletion
- **Data Protection**: Secure cleanup of all organization data

---

### 90. Get All Sub-Organization Members

Retrieve a comprehensive list of all users (administrators and members) within a specific sub-organization, including their profile information and organizational roles.

**Endpoint**: `GET /api/v2/sub-organizations/{subOrganizationUuid}/members`

**URL**: `https://stg-api2.doconchain.com/api/v2/sub-organizations/{subOrganizationUuid}/members?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subOrganizationUuid` | string | Yes | UUID of the sub-organization to retrieve members from |

**Query Parameters**:

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) | - |
| `page` | integer | No | Page number for pagination | 1 |
| `limit` | integer | No | Number of members per page (max: 100) | 20 |
| `role` | string | No | Filter by role: 'admin', 'member', or 'all' | all |
| `status` | string | No | Filter by status: 'active', 'inactive', or 'all' | active |
| `search` | string | No | Search by name or email | - |
| `sort_by` | string | No | Sort by: 'name', 'email', 'role', 'joined_at' | name |
| `sort_order` | string | No | Sort order: 'asc' or 'desc' | asc |

**Body Parameters**: None required

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "message": "Sub-organization members retrieved successfully",
  "data": {
    "members": [
      {
        "user_id": "user_11111",
        "uuid": "usr_abc123def456",
        "name": "John Smith",
        "email": "john.smith@company.com",
        "role": "admin",
        "status": "active",
        "joined_at": "2025-01-15T10:30:00Z",
        "last_active": "2025-11-02T14:22:00Z",
        "profile": {
          "avatar_url": "https://cdn.doconchain.com/avatars/usr_abc123def456.jpg",
          "phone": "+1-555-0123",
          "department": "Engineering",
          "title": "Senior Developer"
        },
        "permissions": {
          "can_manage_members": true,
          "can_create_projects": true,
          "can_delete_documents": true,
          "can_manage_templates": true,
          "can_view_audit_logs": true
        },
        "activity_stats": {
          "projects_created": 12,
          "documents_uploaded": 45,
          "signatures_completed": 28,
          "last_login": "2025-11-02T09:15:00Z"
        }
      },
      {
        "user_id": "user_22222",
        "uuid": "usr_def789ghi012",
        "name": "Sarah Johnson",
        "email": "sarah.johnson@company.com",
        "role": "member",
        "status": "active",
        "joined_at": "2025-03-20T16:45:00Z",
        "last_active": "2025-11-01T11:30:00Z",
        "profile": {
          "avatar_url": "https://cdn.doconchain.com/avatars/usr_def789ghi012.jpg",
          "phone": "+1-555-0456",
          "department": "Design",
          "title": "UX Designer"
        },
        "permissions": {
          "can_manage_members": false,
          "can_create_projects": true,
          "can_delete_documents": false,
          "can_manage_templates": false,
          "can_view_audit_logs": false
        },
        "activity_stats": {
          "projects_created": 8,
          "documents_uploaded": 23,
          "signatures_completed": 15,
          "last_login": "2025-11-01T11:30:00Z"
        }
      }
    ],
    "organization_info": {
      "uuid": "org_sub_003",
      "name": "Product Development Team",
      "total_members": 2,
      "active_members": 2,
      "admins_count": 1,
      "members_count": 1,
      "created_at": "2025-01-10T08:00:00Z"
    },
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_members": 2,
      "per_page": 20,
      "has_next": false,
      "has_prev": false
    },
    "filters_applied": {
      "role": "all",
      "status": "active",
      "search": null,
      "sort_by": "name",
      "sort_order": "asc"
    }
  },
  "meta": {
    "request_id": "req_abc123def456",
    "timestamp": "2025-11-02T15:30:00Z",
    "processing_time": "0.45 seconds",
    "api_version": "v2"
  }
}
```

#### Examples

**cURL**:
```bash
curl -X GET "https://stg-api2.doconchain.com/api/v2/sub-organizations/org_sub_003/members?user_type=ENTERPRISE_API&page=1&limit=20&role=all&status=active&sort_by=name&sort_order=asc" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/api/v2/sub-organizations/org_sub_003/members',
  params: {
    user_type: 'ENTERPRISE_API',
    page: 1,
    limit: 20,
    role: 'all',
    status: 'active',
    sort_by: 'name',
    sort_order: 'asc'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Member Information Details

| Field | Type | Description |
|-------|------|-------------|
| **user_id** | string | Internal user identifier |
| **uuid** | string | Public user UUID |
| **name** | string | Full display name |
| **email** | string | User email address |
| **role** | string | Organization role: 'admin' or 'member' |
| **status** | string | Account status: 'active' or 'inactive' |
| **joined_at** | datetime | When user joined the organization |
| **last_active** | datetime | Last activity timestamp |
| **profile** | object | User profile information |
| **permissions** | object | Role-based permissions |
| **activity_stats** | object | User activity statistics |

#### Filtering and Sorting Options

| Filter | Values | Description |
|--------|--------|-------------|
| **role** | admin, member, all | Filter by organizational role |
| **status** | active, inactive, all | Filter by account status |
| **search** | string | Search in name and email |
| **sort_by** | name, email, role, joined_at | Sort field |
| **sort_order** | asc, desc | Sort direction |

#### Pagination Details

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| **page** | integer | 1-10000 | 1 | Page number |
| **limit** | integer | 1-100 | 20 | Items per page |

#### Use Cases

- **Member Management**: View all organization members and their roles
- **Access Control**: Check user permissions and activity levels
- **Reporting**: Generate member reports with activity statistics
- **Audit**: Review member access and organizational roles
- **Onboarding**: Identify new members and their integration status

#### Important Notes

- **Role Hierarchy**: Admins have elevated permissions over members
- **Activity Tracking**: Last active timestamps help identify inactive users
- **Permission Levels**: Different roles have different access capabilities
- **Profile Data**: Includes contact information and departmental details
- **Statistics**: Activity metrics help assess user engagement

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Organization Access**: User must have access to the sub-organization
- **Member Permission**: User must be a member of the organization
- **Read Access**: User must have permission to view member information

#### Error Responses

**400 Bad Request**: Invalid parameters or filters
```json
{
  "error": {
    "code": "INVALID_PARAMETERS",
    "message": "Request parameters are invalid",
    "details": {
      "invalid_params": ["limit", "sort_by"],
      "valid_limits": "1-100",
      "valid_sort_fields": ["name", "email", "role", "joined_at"]
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: Insufficient permissions to view organization members
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to view sub-organization members",
    "details": {
      "organization_uuid": "org_sub_003",
      "required_permission": "view_members",
      "user_permissions": ["view_documents"]
    }
  }
}
```

**404 Not Found**: Sub-organization not found
```json
{
  "error": {
    "code": "ORGANIZATION_NOT_FOUND",
    "message": "Sub-organization not found",
    "details": {
      "uuid": "org_sub_003"
    }
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many member list requests. Please wait before trying again",
    "details": {
      "retry_after": "2025-11-02T15:31:00Z",
      "limit": "100 requests per minute"
    }
  }
}
```

#### Best Practices

- **Pagination**: Always use pagination for large organizations
- **Filtering**: Apply filters to reduce data transfer and improve performance
- **Caching**: Cache member lists for frequently accessed organizations
- **Incremental Updates**: Use last_active timestamps to identify changes
- **Role-based Access**: Respect permission levels when displaying member data

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Permission Validation**: Strict validation of member viewing permissions
- **Data Privacy**: Protect sensitive member information and contact details
- **Access Logging**: All member list access attempts logged
- **Rate Limiting**: Prevent abuse with request rate limits
- **Data Encryption**: Secure transmission of member profile data

---

### 91. Add New Sub-Organization Member

Add one or more new users to a specific sub-organization with their profile information, organizational roles, and login credentials.

**Endpoint**: `POST /api/v2/sub-organizations/{subOrganizationUuid}/members`

**URL**: `https://stg-api2.doconchain.com/api/v2/sub-organizations/{subOrganizationUuid}/members?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subOrganizationUuid` | string | Yes | UUID of the sub-organization to add members to |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters** (Form Data):

The request body should contain an array of user data. Each user object supports the following fields:

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `data[0][email]` | string | Yes | User's email address | Valid email format, unique |
| `data[0][first_name]` | string | Yes | User's first name | 2-50 characters |
| `data[0][middle_name]` | string | No | User's middle name | 0-50 characters |
| `data[0][last_name]` | string | Yes | User's last name | 2-50 characters |
| `data[0][company]` | string | No | User's company name | 0-100 characters |
| `data[0][job_title]` | string | No | User's job title | 0-100 characters |
| `data[0][country]` | string | No | User's country | Valid country code |
| `data[0][role]` | string | Yes | Organization role | 'Admin' or 'Member' (default: 'Member') |
| `data[0][password]` | string | Yes | User's password | Min 8 characters, strong password |
| `data[0][organization]` | string | No | Parent organization name | Auto-filled from sub-org |
| `data[0][organization_id]` | string | No | Parent organization ID | Auto-filled from sub-org |

**Multiple Users**: You can add multiple users in a single request by incrementing the array index (data[1], data[2], etc.).

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "message": "Members added to sub-organization successfully",
  "data": {
    "added_members": [
      {
        "user_id": "user_33333",
        "uuid": "usr_xyz789abc123",
        "email": "jane.doe@company.com",
        "name": "Jane Doe",
        "role": "member",
        "status": "active",
        "organization_uuid": "org_sub_003",
        "organization_name": "Product Development Team",
        "joined_at": "2025-11-02T16:00:00Z",
        "profile": {
          "first_name": "Jane",
          "middle_name": "",
          "last_name": "Doe",
          "company": "Tech Solutions Inc",
          "job_title": "Product Manager",
          "country": "US"
        },
        "credentials": {
          "password_set": true,
          "temporary_password": false,
          "password_strength": "strong"
        },
        "permissions": {
          "can_manage_members": false,
          "can_create_projects": true,
          "can_delete_documents": false,
          "can_manage_templates": false,
          "can_view_audit_logs": false
        },
        "welcome_email": {
          "sent": true,
          "sent_at": "2025-11-02T16:00:05Z",
          "email_type": "welcome_with_credentials"
        }
      }
    ],
    "organization_info": {
      "uuid": "org_sub_003",
      "name": "Product Development Team",
      "total_members": 3,
      "active_members": 3,
      "admins_count": 1,
      "members_count": 2
    },
    "batch_info": {
      "total_requested": 1,
      "successfully_added": 1,
      "failed_additions": 0,
      "duplicates_skipped": 0
    },
    "notifications": {
      "admin_notified": true,
      "welcome_emails_sent": 1,
      "invitation_emails_sent": 0
    }
  },
  "meta": {
    "request_id": "req_xyz789abc123",
    "timestamp": "2025-11-02T16:00:00Z",
    "processing_time": "2.3 seconds",
    "api_version": "v2"
  }
}
```

#### Examples

**cURL**:
```bash
curl -X POST "https://stg-api2.doconchain.com/api/v2/sub-organizations/org_sub_003/members?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "data[0][email]=jane.doe@company.com" \
  -F "data[0][first_name]=Jane" \
  -F "data[0][last_name]=Doe" \
  -F "data[0][company]=Tech Solutions Inc" \
  -F "data[0][job_title]=Product Manager" \
  -F "data[0][country]=US" \
  -F "data[0][role]=Member" \
  -F "data[0][password]=SecurePass123!"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('data[0][email]', 'jane.doe@company.com');
formData.append('data[0][first_name]', 'Jane');
formData.append('data[0][last_name]', 'Doe');
formData.append('data[0][company]', 'Tech Solutions Inc');
formData.append('data[0][job_title]', 'Product Manager');
formData.append('data[0][country]', 'US');
formData.append('data[0][role]', 'Member');
formData.append('data[0][password]', 'SecurePass123!');

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/api/v2/sub-organizations/org_sub_003/members',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    'Content-Type': 'multipart/form-data',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  },
  data: formData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Member Addition Process

1. **Permission Validation**: Verify user has permission to add members
2. **Organization Validation**: Confirm sub-organization exists and is accessible
3. **Email Uniqueness**: Check if email is already registered in the system
4. **Data Validation**: Validate all required fields and data formats
5. **Password Security**: Ensure password meets security requirements
6. **User Creation**: Create user account with provided credentials
7. **Organization Assignment**: Add user to the specified sub-organization
8. **Role Assignment**: Assign appropriate permissions based on role
9. **Welcome Email**: Send welcome email with login credentials
10. **Audit Logging**: Log member addition with details

#### Password Requirements

| Requirement | Description | Example |
|-------------|-------------|---------|
| **Minimum Length** | At least 8 characters | MyPass123 |
| **Uppercase Letter** | At least one uppercase letter | MyPass123 |
| **Lowercase Letter** | At least one lowercase letter | mypass123 |
| **Number** | At least one number | Mypass12 |
| **Special Character** | At least one special character | MyPass!23 |
| **No Common Words** | Avoid common passwords | Not "password123" |

#### Role Permissions

| Role | Description | Permissions |
|------|-------------|-------------|
| **Admin** | Full organization access | Manage members, create projects, delete documents, manage templates, view audit logs |
| **Member** | Standard user access | Create projects, upload documents, sign documents, view assigned content |

#### Batch Operations

- **Multiple Users**: Add up to 10 users in a single request
- **Partial Success**: If some users fail validation, others may still be added
- **Error Reporting**: Failed additions are reported with specific error reasons
- **Duplicate Handling**: Existing users are skipped with appropriate messaging

#### Email Notifications

| Notification Type | Trigger | Content |
|------------------|---------|---------|
| **Welcome Email** | New user added | Login credentials, organization info, getting started guide |
| **Admin Notification** | Member added | New member details, addition confirmation |
| **Password Reset** | If needed | Password reset instructions |

#### Use Cases

- **Team Expansion**: Add new team members to growing departments
- **Project Staffing**: Add temporary project team members
- **Department Setup**: Populate new organizational departments
- **Bulk Onboarding**: Add multiple users during organizational changes
- **Role Management**: Assign appropriate access levels during hiring

#### Important Notes

- **Email Uniqueness**: Each email must be unique across the entire system
- **Password Security**: Strong passwords are required for account security
- **Role Assignment**: Admin roles should be assigned carefully
- **Welcome Process**: New users receive automated welcome emails
- **Batch Limits**: Maximum 10 users per request for performance

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Organization Admin**: User must be admin of the sub-organization
- **Member Addition**: User must have permission to add new members
- **Email Access**: System must be able to send emails to new users

#### Error Responses

**400 Bad Request**: Invalid user data or validation errors
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "User data validation failed",
    "details": {
      "field_errors": {
        "data[0][email]": "Email format is invalid",
        "data[0][password]": "Password does not meet security requirements",
        "data[0][first_name]": "First name is required"
      },
      "batch_results": {
        "successful": 0,
        "failed": 1,
        "errors": [
          {
            "index": 0,
            "email": "jane.doe@company.com",
            "errors": ["Invalid email format", "Weak password"]
          }
        ]
      }
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: Insufficient permissions to add members
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to add members to this sub-organization",
    "details": {
      "organization_uuid": "org_sub_003",
      "required_role": "admin",
      "user_role": "member"
    }
  }
}
```

**404 Not Found**: Sub-organization not found
```json
{
  "error": {
    "code": "ORGANIZATION_NOT_FOUND",
    "message": "Sub-organization not found",
    "details": {
      "uuid": "org_sub_003"
    }
  }
}
```

**409 Conflict**: Email already exists or user already in organization
```json
{
  "error": {
    "code": "USER_CONFLICT",
    "message": "User addition conflicts detected",
    "details": {
      "conflicts": [
        {
          "email": "jane.doe@company.com",
          "reason": "User already exists in this organization",
          "existing_user_id": "user_33333"
        }
      ]
    }
  }
}
```

**422 Unprocessable Entity**: Business rule violations
```json
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Member addition violates business rules",
    "details": {
      "violations": [
        {
          "rule": "max_members_per_org",
          "current_count": 95,
          "max_allowed": 100,
          "solution": "Upgrade plan or remove inactive members"
        }
      ]
    }
  }
}
```

**429 Too Many Requests**: Member addition rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many member addition requests. Please wait before trying again",
    "details": {
      "retry_after": "2025-11-02T16:01:00Z",
      "limit": "50 additions per hour"
    }
  }
}
```

#### Best Practices

- **Data Validation**: Always validate user data before submission
- **Strong Passwords**: Generate or enforce strong password requirements
- **Role Assignment**: Carefully consider role assignments for security
- **Batch Processing**: Use batch operations for multiple users when possible
- **Error Handling**: Handle partial failures in batch operations gracefully
- **Email Verification**: Ensure email addresses are valid and accessible

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Permission Validation**: Strict validation of member addition permissions
- **Password Security**: Enforce strong password policies
- **Data Validation**: Comprehensive validation of all user input
- **Email Verification**: Prevent fake email addresses
- **Audit Logging**: All member additions logged with full details
- **Access Control**: Admin-only access to member addition functionality

---

### 92. Get A Specific Sub-Organization Member

Retrieve detailed profile information, organizational role, permissions, and activity history for a specific member within a sub-organization.

**Endpoint**: `GET /api/v2/sub-organizations/{subOrganizationUuid}/members/{subOrgMemberId}`

**URL**: `https://stg-api2.doconchain.com/api/v2/sub-organizations/{subOrganizationUuid}/members/{subOrgMemberId}?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subOrganizationUuid` | string | Yes | UUID of the sub-organization |
| `subOrgMemberId` | integer | Yes | Internal member ID within the sub-organization |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |
| `include_activity` | boolean | No | Include detailed activity history (default: false) |
| `include_permissions` | boolean | No | Include detailed permission breakdown (default: true) |
| `include_stats` | boolean | No | Include activity statistics (default: true) |

**Body Parameters**: None required

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "message": "Sub-organization member details retrieved successfully",
  "data": {
    "member": {
      "user_id": "user_33333",
      "uuid": "usr_xyz789abc123",
      "member_id": 456,
      "name": "Jane Doe",
      "email": "jane.doe@company.com",
      "role": "member",
      "status": "active",
      "joined_at": "2025-11-02T16:00:00Z",
      "last_active": "2025-11-02T17:30:00Z",
      "last_login": "2025-11-02T09:15:00Z",
      "profile": {
        "first_name": "Jane",
        "middle_name": "",
        "last_name": "Doe",
        "avatar_url": "https://cdn.doconchain.com/avatars/usr_xyz789abc123.jpg",
        "phone": "+1-555-0789",
        "company": "Tech Solutions Inc",
        "job_title": "Product Manager",
        "department": "Product",
        "country": "US",
        "timezone": "America/New_York",
        "language": "en"
      },
      "organization": {
        "uuid": "org_sub_003",
        "name": "Product Development Team",
        "parent_organization": "Tech Solutions Inc",
        "role_in_org": "member",
        "joined_via": "admin_invitation"
      },
      "permissions": {
        "can_manage_members": false,
        "can_create_projects": true,
        "can_delete_documents": false,
        "can_manage_templates": false,
        "can_view_audit_logs": false,
        "can_sign_documents": true,
        "can_upload_files": true,
        "can_export_data": false,
        "can_manage_integrations": false,
        "max_file_size_mb": 50,
        "max_projects_per_month": 25
      },
      "activity_stats": {
        "total_logins": 45,
        "documents_created": 23,
        "documents_signed": 18,
        "projects_participated": 8,
        "files_uploaded": 67,
        "comments_posted": 34,
        "last_document_activity": "2025-11-02T15:20:00Z",
        "avg_session_duration": "45 minutes",
        "most_active_day": "Tuesday",
        "most_active_hour": 14
      },
      "account_security": {
        "password_last_changed": "2025-11-02T16:00:00Z",
        "two_factor_enabled": false,
        "login_attempts_today": 1,
        "suspicious_activity": false,
        "password_strength": "strong"
      },
      "recent_activity": [
        {
          "activity_id": "act_abc123",
          "type": "document_signed",
          "description": "Signed document 'Q4 Product Roadmap.pdf'",
          "timestamp": "2025-11-02T15:20:00Z",
          "metadata": {
            "document_id": "doc_789xyz",
            "project_id": "proj_456def"
          }
        },
        {
          "activity_id": "act_def456",
          "type": "project_created",
          "description": "Created project 'Mobile App Redesign'",
          "timestamp": "2025-11-02T14:30:00Z",
          "metadata": {
            "project_id": "proj_789ghi"
          }
        }
      ]
    },
    "organization_context": {
      "uuid": "org_sub_003",
      "name": "Product Development Team",
      "total_members": 3,
      "member_position": 2,
      "admins_count": 1,
      "members_count": 2,
      "created_at": "2025-01-10T08:00:00Z"
    }
  },
  "meta": {
    "request_id": "req_abc456def789",
    "timestamp": "2025-11-02T17:45:00Z",
    "processing_time": "0.8 seconds",
    "api_version": "v2",
    "data_included": ["permissions", "stats"]
  }
}
```

#### Examples

**cURL**:
```bash
curl -X GET "https://stg-api2.doconchain.com/api/v2/sub-organizations/org_sub_003/members/456?user_type=ENTERPRISE_API&include_activity=true&include_permissions=true&include_stats=true" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/api/v2/sub-organizations/org_sub_003/members/456',
  params: {
    user_type: 'ENTERPRISE_API',
    include_activity: true,
    include_permissions: true,
    include_stats: true
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Member Information Details

| Section | Description | Fields Included |
|---------|-------------|-----------------|
| **Basic Info** | Core user information | user_id, uuid, name, email, role, status |
| **Profile** | Extended profile data | avatar, phone, company, job_title, department |
| **Organization** | Organization context | org details, role, join method |
| **Permissions** | Access permissions | granular permission flags, limits |
| **Activity Stats** | Usage statistics | login counts, document activities, project participation |
| **Security** | Account security info | password status, 2FA, login attempts |
| **Recent Activity** | Latest actions | activity feed with timestamps and metadata |

#### Optional Data Inclusion

| Parameter | Description | Default | Impact |
|-----------|-------------|---------|--------|
| **include_activity** | Recent activity feed | false | Adds 5-10 recent activities |
| **include_permissions** | Detailed permissions | true | Shows all permission flags |
| **include_stats** | Activity statistics | true | Includes usage metrics |

#### Activity Statistics

| Metric | Description | Timeframe |
|--------|-------------|-----------|
| **total_logins** | Total successful logins | All time |
| **documents_created** | Documents created/uploaded | All time |
| **documents_signed** | Documents signed | All time |
| **projects_participated** | Projects joined | All time |
| **files_uploaded** | Files uploaded | All time |
| **comments_posted** | Comments added | All time |
| **avg_session_duration** | Average session length | Last 30 days |
| **most_active_day** | Busiest day of week | Last 30 days |
| **most_active_hour** | Peak activity hour | Last 30 days |

#### Permission Breakdown

| Permission Category | Description | Admin | Member |
|-------------------|-------------|-------|--------|
| **Member Management** | Add/remove members | ✓ | ✗ |
| **Project Creation** | Create new projects | ✓ | ✓ |
| **Document Deletion** | Delete documents | ✓ | ✗ |
| **Template Management** | Create/edit templates | ✓ | ✗ |
| **Audit Access** | View audit logs | ✓ | ✗ |
| **Document Signing** | Sign documents | ✓ | ✓ |
| **File Upload** | Upload files | ✓ | ✓ |
| **Data Export** | Export organization data | ✗ | ✗ |
| **Integration Management** | Manage API integrations | ✓ | ✗ |

#### Use Cases

- **Member Profile Review**: Check detailed member information and status
- **Permission Audit**: Verify user access levels and permissions
- **Activity Monitoring**: Track user engagement and productivity
- **Security Review**: Check account security and login patterns
- **Support Assistance**: Access member details for troubleshooting
- **Compliance Reporting**: Generate member activity reports

#### Important Notes

- **Privacy Considerations**: Only admins can view detailed member information
- **Activity Data**: Recent activity is limited to last 30 days by default
- **Performance**: Including activity data increases response time
- **Caching**: Member data can be cached for up to 5 minutes
- **Real-time**: Activity stats are updated in near real-time

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Organization Access**: User must be member of the sub-organization
- **Admin Permission**: User must be admin to view other members' details
- **Member Existence**: The specified member must exist in the organization

#### Error Responses

**400 Bad Request**: Invalid parameters
```json
{
  "error": {
    "code": "INVALID_PARAMETERS",
    "message": "Request parameters are invalid",
    "details": {
      "invalid_params": ["include_activity"],
      "valid_values": "true, false"
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: Insufficient permissions to view member details
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to view this member's details",
    "details": {
      "member_id": 456,
      "organization_uuid": "org_sub_003",
      "required_role": "admin",
      "user_role": "member"
    }
  }
}
```

**404 Not Found**: Member or organization not found
```json
{
  "error": {
    "code": "MEMBER_NOT_FOUND",
    "message": "Member not found in this sub-organization",
    "details": {
      "member_id": 456,
      "organization_uuid": "org_sub_003",
      "possible_reasons": ["member_removed", "invalid_id", "transferred"]
    }
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many member detail requests. Please wait before trying again",
    "details": {
      "retry_after": "2025-11-02T17:46:00Z",
      "limit": "200 requests per minute"
    }
  }
}
```

#### Best Practices

- **Selective Data Loading**: Use include parameters to control response size
- **Caching Strategy**: Cache member data appropriately based on update frequency
- **Permission Checks**: Always verify permissions before displaying sensitive data
- **Activity Monitoring**: Use activity data for user engagement insights
- **Privacy Compliance**: Respect data privacy regulations when handling member information

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Permission Validation**: Strict validation of member detail access permissions
- **Data Privacy**: Protect sensitive member information and activity data
- **Access Logging**: All member detail access attempts logged
- **Rate Limiting**: Prevent abuse with request rate limits
- **Data Encryption**: Secure transmission of member profile and activity data
- **Audit Trail**: Complete access history maintained for compliance

---

### 93. Update A Sub-Organization Member

Update a member's profile information and organizational role within a sub-organization, including name changes and role modifications.

**Endpoint**: `PUT /api/v2/sub-organizations/{subOrganizationUuid}/members/{subOrgMemberId}`

**URL**: `https://stg-api2.doconchain.com/api/v2/sub-organizations/{subOrganizationUuid}/members/{subOrgMemberId}?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subOrganizationUuid` | string | Yes | UUID of the sub-organization |
| `subOrgMemberId` | integer | Yes | Internal member ID within the sub-organization |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters** (Form Data):

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `first_name` | string | No | Updated first name | 2-50 characters, letters only |
| `last_name` | string | No | Updated last name | 2-50 characters, letters only |
| `role` | string | No | Updated organizational role | 'Admin' or 'Member' only |

**Notes**:
- At least one field must be provided for update
- Role changes require admin permissions
- Name changes are restricted to letters, spaces, and hyphens

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "message": "Sub-organization member updated successfully",
  "data": {
    "member": {
      "user_id": "user_33333",
      "uuid": "usr_xyz789abc123",
      "member_id": 456,
      "name": "Jane Smith",
      "email": "jane.doe@company.com",
      "role": "admin",
      "status": "active",
      "updated_at": "2025-11-02T18:15:00Z",
      "updated_by": {
        "user_id": "user_11111",
        "name": "John Admin",
        "role": "admin"
      },
      "changes_made": {
        "first_name": {
          "old_value": "Jane",
          "new_value": "Jane",
          "changed": false
        },
        "last_name": {
          "old_value": "Doe",
          "new_value": "Smith",
          "changed": true
        },
        "role": {
          "old_value": "member",
          "new_value": "admin",
          "changed": true
        }
      },
      "profile": {
        "first_name": "Jane",
        "last_name": "Smith",
        "company": "Tech Solutions Inc",
        "job_title": "Product Manager"
      },
      "permissions": {
        "can_manage_members": true,
        "can_create_projects": true,
        "can_delete_documents": true,
        "can_manage_templates": true,
        "can_view_audit_logs": true
      }
    },
    "organization_context": {
      "uuid": "org_sub_003",
      "name": "Product Development Team",
      "total_members": 3,
      "admins_count": 2,
      "members_count": 1
    },
    "notifications": {
      "member_notified": true,
      "notification_type": "role_change",
      "notification_sent_at": "2025-11-02T18:15:05Z",
      "admin_notified": false
    },
    "audit_trail": {
      "change_id": "chg_abc123def456",
      "timestamp": "2025-11-02T18:15:00Z",
      "changes_logged": true,
      "compliance_recorded": true
    }
  },
  "meta": {
    "request_id": "req_def789ghi012",
    "timestamp": "2025-11-02T18:15:00Z",
    "processing_time": "1.2 seconds",
    "api_version": "v2"
  }
}
```

#### Examples

**cURL**:
```bash
curl -X PUT "https://stg-api2.doconchain.com/api/v2/sub-organizations/org_sub_003/members/456?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "first_name=Jane" \
  -F "last_name=Smith" \
  -F "role=Admin"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('first_name', 'Jane');
formData.append('last_name', 'Smith');
formData.append('role', 'Admin');

const options = {
  method: 'PUT',
  url: 'https://stg-api2.doconchain.com/api/v2/sub-organizations/org_sub_003/members/456',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    'Content-Type': 'multipart/form-data',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  },
  data: formData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Member Update Process

1. **Permission Validation**: Verify user has permission to update members
2. **Member Validation**: Confirm member exists in the sub-organization
3. **Data Validation**: Validate all provided update fields
4. **Role Change Validation**: Check permissions for role modifications
5. **Update Execution**: Apply changes to member profile
6. **Permission Recalculation**: Update permissions based on new role
7. **Notification Dispatch**: Send notifications for role changes
8. **Audit Logging**: Log all changes with before/after values
9. **Cache Invalidation**: Clear any cached member data

#### Update Permissions

| Update Type | Required Permission | Who Can Update |
|-------------|-------------------|----------------|
| **Name Changes** | Admin or Self | Member can update own name, admin can update anyone's |
| **Role Changes** | Admin Only | Only organization admins can change member roles |
| **Profile Updates** | Admin or Self | Members can update their own profile, admins can update anyone's |

#### Role Change Implications

| Role Change | From → To | Permission Changes | Notifications |
|-------------|-----------|-------------------|---------------|
| **Member → Admin** | member → admin | Gains all admin permissions | Member notified, admin logged |
| **Admin → Member** | admin → member | Loses admin permissions | Member notified, admin logged |
| **No Change** | same → same | No permission changes | No notifications |

#### Validation Rules

| Field | Rules | Error Code |
|-------|-------|------------|
| **first_name** | 2-50 chars, letters/spaces/hyphens only | INVALID_FIRST_NAME |
| **last_name** | 2-50 chars, letters/spaces/hyphens only | INVALID_LAST_NAME |
| **role** | Must be 'Admin' or 'Member' (case-insensitive) | INVALID_ROLE |

#### Notification System

| Change Type | Notification Recipients | Content |
|-------------|-----------------------|---------|
| **Role Promotion** | Member only | Congratulations, new permissions listed |
| **Role Demotion** | Member only | Role changed, updated permissions |
| **Name Change** | None | Changes applied silently |
| **Self-Update** | None | Changes applied immediately |

#### Use Cases

- **Role Management**: Promote members to admin or demote admins to members
- **Name Corrections**: Fix spelling errors or update married names
- **Access Control**: Adjust permissions through role changes
- **Organizational Changes**: Update roles during restructuring
- **Profile Maintenance**: Keep member information current

#### Important Notes

- **Role Change Impact**: Role changes immediately affect permissions
- **Self-Update**: Members can update their own names but not roles
- **Admin Requirements**: Role changes require admin permissions
- **Audit Trail**: All changes are logged for compliance
- **Immediate Effect**: Changes take effect immediately

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Organization Admin**: User must be admin to change roles or update others
- **Member Existence**: The member must exist in the sub-organization
- **Update Permission**: User must have permission to make the requested changes

#### Error Responses

**400 Bad Request**: Invalid update data or validation errors
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Member update data validation failed",
    "details": {
      "field_errors": {
        "first_name": "First name contains invalid characters",
        "role": "Role must be 'Admin' or 'Member'"
      },
      "validation_rules": {
        "name_format": "Letters, spaces, and hyphens only",
        "name_length": "2-50 characters",
        "role_values": ["Admin", "Member"]
      }
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: Insufficient permissions to update member
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to update this member",
    "details": {
      "member_id": 456,
      "requested_changes": ["role"],
      "required_permission": "admin",
      "user_role": "member"
    }
  }
}
```

**404 Not Found**: Member not found in organization
```json
{
  "error": {
    "code": "MEMBER_NOT_FOUND",
    "message": "Member not found in this sub-organization",
    "details": {
      "member_id": 456,
      "organization_uuid": "org_sub_003"
    }
  }
}
```

**409 Conflict**: Role change conflicts or business rule violations
```json
{
  "error": {
    "code": "ROLE_CHANGE_CONFLICT",
    "message": "Role change violates organizational rules",
    "details": {
      "requested_role": "admin",
      "conflict_reason": "Maximum admin limit reached",
      "current_admins": 5,
      "max_admins": 5
    }
  }
}
```

**422 Unprocessable Entity**: Business rule violations
```json
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Update violates business rules",
    "details": {
      "violations": [
        {
          "rule": "self_role_change",
          "message": "Users cannot change their own role",
          "solution": "Contact another admin"
        }
      ]
    }
  }
}
```

**429 Too Many Requests**: Update rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many member update requests. Please wait before trying again",
    "details": {
      "retry_after": "2025-11-02T18:16:00Z",
      "limit": "30 updates per hour"
    }
  }
}
```

#### Best Practices

- **Permission Checks**: Always verify permissions before allowing updates
- **Role Change Communication**: Inform members of role changes and new responsibilities
- **Data Validation**: Validate all input data before processing updates
- **Audit Review**: Regularly review update logs for security and compliance
- **Gradual Changes**: Make role changes gradually during organizational transitions
- **Backup Data**: Ensure member data is backed up before major changes

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Permission Validation**: Strict validation of member update permissions
- **Role Change Security**: Admin-only access to role modifications
- **Data Validation**: Comprehensive validation of all update input
- **Audit Logging**: All member updates logged with change details
- **Access Control**: Granular permissions for different update types
- **Change Tracking**: Complete audit trail of all modifications

---

### 94. Delete A Sub-Organization Member

Remove a member from a sub-organization, including subscription management and data cleanup. For Enterprise plans, the member reverts to their previous subscription tier.

**Endpoint**: `DELETE /api/v2/sub-organizations/{subOrganizationUuid}/members/{subOrgMemberId}`

**URL**: `https://stg-api2.doconchain.com/api/v2/sub-organizations/{subOrganizationUuid}/members/{subOrgMemberId}?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subOrganizationUuid` | string | Yes | UUID of the sub-organization |
| `subOrgMemberId` | integer | Yes | Internal member ID within the sub-organization |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters**: None required

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "message": "Member removed from sub-organization successfully",
  "data": {
    "removed_member": {
      "user_id": "user_33333",
      "uuid": "usr_xyz789abc123",
      "member_id": 456,
      "name": "Jane Smith",
      "email": "jane.doe@company.com",
      "role": "admin",
      "removed_at": "2025-11-02T19:00:00Z",
      "removed_by": {
        "user_id": "user_11111",
        "name": "John Admin",
        "role": "admin"
      },
      "removal_reason": "administrative_removal",
      "membership_duration": {
        "joined_at": "2025-11-02T16:00:00Z",
        "total_days": 0,
        "total_hours": 3
      }
    },
    "subscription_changes": {
      "plan_downgrade": true,
      "previous_plan": "Enterprise",
      "new_plan": "Professional",
      "effective_date": "2025-11-02T19:00:00Z",
      "proration_credits": 45.50,
      "next_billing_date": "2025-12-02T00:00:00Z"
    },
    "data_cleanup": {
      "projects_transferred": 0,
      "documents_reassigned": 0,
      "templates_removed": 2,
      "files_cleaned": 15,
      "permissions_revoked": true,
      "access_removed": true
    },
    "organization_impact": {
      "uuid": "org_sub_003",
      "name": "Product Development Team",
      "previous_member_count": 3,
      "new_member_count": 2,
      "admin_count_unchanged": true,
      "remaining_admins": 1
    },
    "notifications": {
      "member_notified": true,
      "notification_type": "removal_confirmation",
      "notification_sent_at": "2025-11-02T19:00:05Z",
      "admin_notified": false,
      "removal_email_subject": "Removed from Product Development Team"
    },
    "audit_trail": {
      "removal_id": "rem_abc123def456",
      "timestamp": "2025-11-02T19:00:00Z",
      "changes_logged": true,
      "compliance_recorded": true,
      "data_retention_days": 90
    }
  },
  "meta": {
    "request_id": "req_ghi012jkl345",
    "timestamp": "2025-11-02T19:00:00Z",
    "processing_time": "2.8 seconds",
    "api_version": "v2"
  }
}
```

#### Examples

**cURL**:
```bash
curl -X DELETE "https://stg-api2.doconchain.com/api/v2/sub-organizations/org_sub_003/members/456?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'DELETE',
  url: 'https://stg-api2.doconchain.com/api/v2/sub-organizations/org_sub_003/members/456',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Member Removal Process

1. **Permission Validation**: Verify user has permission to remove members
2. **Member Validation**: Confirm member exists and can be removed
3. **Self-Removal Check**: Prevent users from removing themselves
4. **Admin Protection**: Ensure organization retains at least one admin
5. **Data Assessment**: Evaluate member's data and ownership
6. **Subscription Downgrade**: Process plan changes for Enterprise users
7. **Data Reassignment**: Handle owned projects and documents
8. **Access Revocation**: Remove all organization permissions
9. **Notification Dispatch**: Send removal confirmation to member
10. **Audit Logging**: Log complete removal details
11. **Cleanup Execution**: Remove member records and clean up data

#### Subscription Management

| Plan Type | Removal Impact | New Plan | Billing |
|-----------|----------------|----------|---------|
| **Enterprise** | Downgrade to previous plan | Professional/Basic | Prorated credits applied |
| **Professional** | No change | Professional | Continues unchanged |
| **Basic/Free** | No change | Basic/Free | Continues unchanged |

#### Data Handling

| Data Type | Action | Notes |
|-----------|--------|-------|
| **Owned Projects** | Must be transferred first | Cannot remove with active ownership |
| **Personal Documents** | Retained by user | User keeps personal files |
| **Shared Documents** | Access revoked | User loses access to org files |
| **Organization Templates** | Removed | Org-specific templates deleted |
| **Member Permissions** | Immediately revoked | All org access removed |
| **Activity History** | Retained | Audit trail maintained |

#### Removal Restrictions

| Restriction | Reason | Error Code |
|-------------|---------|------------|
| **Self-Removal** | Prevent accidental lockout | SELF_REMOVAL_NOT_ALLOWED |
| **Last Admin** | Organization needs admin | LAST_ADMIN_PROTECTION |
| **Active Ownership** | Data ownership transfer required | ACTIVE_OWNERSHIP_EXISTS |
| **Pending Actions** | Complete outstanding tasks | PENDING_ACTIONS_EXIST |

#### Notification System

| Notification Type | Recipient | Timing | Content |
|------------------|-----------|--------|---------|
| **Removal Confirmation** | Member | Immediate | Removal details, new plan info |
| **Access Revocation** | Member | Immediate | Access loss notification |
| **Admin Alert** | Organization admins | Immediate | Member removal notification |
| **Plan Change** | Member | Immediate | Subscription downgrade details |

#### Use Cases

- **Employee Departure**: Remove leaving employees from organization
- **Access Control**: Revoke access for terminated or transferred staff
- **Organizational Changes**: Clean up during restructuring
- **Contractor Management**: Remove temporary contractors
- **Security Incidents**: Emergency access revocation

#### Important Notes

- **Irreversible**: Member removal cannot be undone
- **Data Loss**: Organization-specific data becomes inaccessible
- **Subscription Impact**: Enterprise users lose premium features
- **Admin Protection**: Organizations must maintain at least one admin
- **Audit Trail**: Complete removal history maintained

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Organization Admin**: User must be admin of the sub-organization
- **Member Existence**: The member must exist in the organization
- **Removal Permission**: User must have permission to remove members
- **Business Rules**: All removal restrictions must be satisfied

#### Error Responses

**400 Bad Request**: Invalid removal request
```json
{
  "error": {
    "code": "INVALID_REMOVAL_REQUEST",
    "message": "Member removal request is invalid",
    "details": {
      "reason": "Request parameters incomplete",
      "required_checks": ["member_exists", "permissions_valid", "business_rules"]
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: Insufficient permissions to remove member
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to remove this member",
    "details": {
      "member_id": 456,
      "organization_uuid": "org_sub_003",
      "required_role": "admin",
      "user_role": "member"
    }
  }
}
```

**404 Not Found**: Member not found in organization
```json
{
  "error": {
    "code": "MEMBER_NOT_FOUND",
    "message": "Member not found in this sub-organization",
    "details": {
      "member_id": 456,
      "organization_uuid": "org_sub_003"
    }
  }
}
```

**409 Conflict**: Removal blocked by business rules
```json
{
  "error": {
    "code": "REMOVAL_CONFLICT",
    "message": "Member removal is blocked by business rules",
    "details": {
      "blocking_factors": [
        {
          "factor": "last_admin",
          "description": "Cannot remove the last admin",
          "solution": "Promote another member to admin first"
        }
      ]
    }
  }
}
```

**422 Unprocessable Entity**: Business rule violations
```json
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Removal violates organizational business rules",
    "details": {
      "violations": [
        {
          "rule": "active_ownership",
          "message": "Member owns active projects that must be transferred",
          "owned_projects": 3,
          "solution": "Transfer project ownership before removal"
        }
      ]
    }
  }
}
```

**429 Too Many Requests**: Removal rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many member removal requests. Please wait before trying again",
    "details": {
      "retry_after": "2025-11-02T19:01:00Z",
      "limit": "20 removals per hour"
    }
  }
}
```

#### Best Practices

- **Pre-Removal Checklist**: Verify all prerequisites before removal
- **Data Transfer**: Ensure important data is transferred before removal
- **Communication**: Inform member of removal and reasons
- **Admin Backup**: Ensure another admin exists before removing admins
- **Audit Review**: Regularly review removal logs for compliance
- **Gradual Process**: Use warnings before final removal when possible

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Permission Validation**: Strict validation of member removal permissions
- **Access Revocation**: Immediate removal of all organization access
- **Data Protection**: Secure cleanup of member data and permissions
- **Audit Logging**: All member removals logged with full details
- **Admin Protection**: Prevent removal of last organization admin
- **Subscription Security**: Secure handling of plan downgrades

---

### 95. Get All Client Sub-Organization Types

Retrieve a comprehensive list of all available sub-organization types for Enterprise API users, including their features, limitations, and pricing tiers.

**Endpoint**: `GET /api/v2/sub-organization/types`

**URL**: `https://stg-api2.doconchain.com/api/v2/sub-organization/types?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Path Parameters**: None

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters**: None required

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "message": "Sub-organization types retrieved successfully",
  "data": {
    "organization_types": [
      {
        "type_id": "org_type_basic",
        "name": "Basic Team",
        "description": "Essential collaboration tools for small teams",
        "category": "starter",
        "max_members": 10,
        "max_admins": 2,
        "features": {
          "document_management": true,
          "basic_signing": true,
          "template_library": true,
          "email_notifications": true,
          "basic_reporting": true,
          "api_access": false,
          "advanced_security": false,
          "custom_branding": false,
          "audit_logs": false,
          "priority_support": false
        },
        "limitations": {
          "monthly_documents": 100,
          "storage_gb": 5,
          "api_calls_per_month": 0,
          "max_file_size_mb": 25,
          "retention_days": 365
        },
        "pricing": {
          "monthly_cost": 0,
          "annual_cost": 0,
          "currency": "USD",
          "billing_cycle": "monthly"
        },
        "capabilities": [
          "Create and manage documents",
          "Basic electronic signatures",
          "Team collaboration",
          "Email notifications",
          "Standard templates"
        ],
        "restrictions": [
          "No API access",
          "Limited storage",
          "Basic security features",
          "Community support only"
        ]
      },
      {
        "type_id": "org_type_professional",
        "name": "Professional Organization",
        "description": "Advanced features for growing businesses",
        "category": "professional",
        "max_members": 50,
        "max_admins": 5,
        "features": {
          "document_management": true,
          "advanced_signing": true,
          "template_library": true,
          "email_notifications": true,
          "advanced_reporting": true,
          "api_access": true,
          "advanced_security": true,
          "custom_branding": false,
          "audit_logs": true,
          "priority_support": false
        },
        "limitations": {
          "monthly_documents": 1000,
          "storage_gb": 50,
          "api_calls_per_month": 50000,
          "max_file_size_mb": 100,
          "retention_days": 2555
        },
        "pricing": {
          "monthly_cost": 29.99,
          "annual_cost": 299.99,
          "currency": "USD",
          "billing_cycle": "monthly"
        },
        "capabilities": [
          "All Basic features",
          "Advanced signing workflows",
          "API integration",
          "Enhanced security",
          "Audit logging",
          "Advanced reporting"
        ],
        "restrictions": [
          "No custom branding",
          "Standard support",
          "Limited to 50 members"
        ]
      },
      {
        "type_id": "org_type_enterprise",
        "name": "Enterprise Organization",
        "description": "Full-featured solution for large enterprises",
        "category": "enterprise",
        "max_members": 1000,
        "max_admins": 50,
        "features": {
          "document_management": true,
          "enterprise_signing": true,
          "custom_templates": true,
          "advanced_notifications": true,
          "enterprise_reporting": true,
          "full_api_access": true,
          "enterprise_security": true,
          "custom_branding": true,
          "comprehensive_audit": true,
          "dedicated_support": true,
          "sso_integration": true,
          "compliance_tools": true
        },
        "limitations": {
          "monthly_documents": -1,
          "storage_gb": 1000,
          "api_calls_per_month": 1000000,
          "max_file_size_mb": 500,
          "retention_days": 2555
        },
        "pricing": {
          "monthly_cost": 99.99,
          "annual_cost": 999.99,
          "currency": "USD",
          "billing_cycle": "monthly",
          "custom_pricing": true
        },
        "capabilities": [
          "All Professional features",
          "Unlimited documents",
          "Custom branding",
          "SSO integration",
          "Dedicated support",
          "Compliance tools",
          "Advanced security",
          "Scalable architecture"
        ],
        "restrictions": [
          "Higher cost",
          "Complex setup",
          "Advanced configuration required"
        ]
      }
    ],
    "metadata": {
      "total_types": 3,
      "categories": ["starter", "professional", "enterprise"],
      "last_updated": "2025-11-01T00:00:00Z",
      "version": "2.1"
    },
    "recommendations": {
      "for_small_teams": "org_type_basic",
      "for_growing_businesses": "org_type_professional",
      "for_enterprises": "org_type_enterprise"
    }
  },
  "meta": {
    "request_id": "req_jkl345mno678",
    "timestamp": "2025-11-02T20:00:00Z",
    "processing_time": "0.3 seconds",
    "api_version": "v2"
  }
}
```

#### Examples

**cURL**:
```bash
curl -X GET "https://stg-api2.doconchain.com/api/v2/sub-organization/types?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/api/v2/sub-organization/types',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Organization Type Categories

| Category | Target Users | Key Features | Typical Use Cases |
|----------|--------------|--------------|-------------------|
| **Starter** | Small teams, individuals | Basic collaboration | Personal projects, small teams |
| **Professional** | Growing businesses | Advanced features, API access | SMBs, departments |  
| **Enterprise** | Large organizations | Full features, compliance | Corporations, regulated industries |

#### Feature Comparison

| Feature | Basic | Professional | Enterprise |
|---------|-------|--------------|------------|
| **Document Management** | ✓ | ✓ | ✓ |
| **Electronic Signatures** | Basic | Advanced | Enterprise |
| **API Access** | ✗ | ✓ | ✓ |
| **Custom Branding** | ✗ | ✗ | ✓ |
| **Audit Logs** | ✗ | ✓ | ✓ |
| **Priority Support** | ✗ | ✗ | ✓ |
| **SSO Integration** | ✗ | ✗ | ✓ |
| **Unlimited Documents** | ✗ | ✗ | ✓ |

#### Limitations by Type

| Limitation | Basic | Professional | Enterprise |
|------------|-------|--------------|------------|
| **Max Members** | 10 | 50 | 1000 |
| **Monthly Documents** | 100 | 1000 | Unlimited |
| **Storage (GB)** | 5 | 50 | 1000 |
| **API Calls/Month** | 0 | 50,000 | 1,000,000 |
| **Max File Size (MB)** | 25 | 100 | 500 |
| **Retention (Days)** | 365 | 2555 | 2555 |

#### Use Cases

- **Organization Planning**: Choose appropriate type for new sub-organizations
- **Upgrade Planning**: Compare features when considering plan upgrades
- **Resource Planning**: Understand limitations for capacity planning
- **Cost Analysis**: Compare pricing tiers for budget planning
- **Feature Evaluation**: Assess available features for business needs

#### Important Notes

- **Scalability**: Enterprise type supports unlimited growth
- **API Access**: Professional and Enterprise include API capabilities
- **Security**: Higher tiers include advanced security features
- **Support**: Enterprise includes dedicated support
- **Customization**: Enterprise allows custom branding and configurations

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Enterprise Access**: User must have Enterprise API access
- **Organization Permission**: User must have permission to view organization types

#### Error Responses

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: Insufficient permissions to view organization types
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to organization types",
    "details": {
      "required_access": "ENTERPRISE_API",
      "user_access": "BASIC_API"
    }
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many organization type requests. Please wait before trying again",
    "details": {
      "retry_after": "2025-11-02T20:01:00Z",
      "limit": "100 requests per hour"
    }
  }
}
```

#### Best Practices

- **Type Selection**: Choose organization type based on team size and needs
- **Upgrade Planning**: Monitor usage and plan upgrades before hitting limits
- **Cost Optimization**: Select appropriate tier to balance features and cost
- **Feature Utilization**: Ensure selected type includes required features
- **Scalability Planning**: Consider future growth when selecting organization type

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Access Control**: Enterprise API access required for organization types
- **Data Privacy**: Organization type information is not sensitive
- **Rate Limiting**: Prevent abuse with request rate limits
- **Audit Logging**: All organization type access attempts logged

---

### 96. Create New Sub-Organization Type

Create a new custom sub-organization type in addition to the default types (Department, Client, Partner, Company) for enhanced organizational categorization.

**Endpoint**: `POST /api/v2/sub-organization/types`

**URL**: `https://stg-api2.doconchain.com/api/v2/sub-organization/types?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

**Path Parameters**: None

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters** (Form Data):

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `name` | string | Yes | Name of the custom organization type | 3-50 characters, unique, alphanumeric + spaces/hyphens |
| `description` | string | No | Detailed description of the type | 0-200 characters |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "message": "Custom sub-organization type created successfully",
  "data": {
    "organization_type": {
      "type_id": "org_type_custom_001",
      "name": "Regional Office",
      "description": "Geographic branch offices for regional operations",
      "category": "custom",
      "is_default": false,
      "is_active": true,
      "created_at": "2025-11-02T21:00:00Z",
      "created_by": {
        "user_id": "user_11111",
        "name": "John Admin",
        "organization": "Tech Solutions Inc"
      },
      "usage_stats": {
        "total_organizations": 0,
        "active_organizations": 0,
        "total_members": 0
      },
      "permissions": {
        "can_modify": true,
        "can_delete": true,
        "can_assign": true
      },
      "metadata": {
        "version": "1.0",
        "last_modified": "2025-11-02T21:00:00Z",
        "custom_fields": []
      }
    },
    "available_types": {
      "default_types": [
        {
          "type_id": "org_type_department",
          "name": "Department",
          "description": "Internal organizational departments"
        },
        {
          "type_id": "org_type_client",
          "name": "Client",
          "description": "External client organizations"
        },
        {
          "type_id": "org_type_partner",
          "name": "Partner",
          "description": "Business partner organizations"
        },
        {
          "type_id": "org_type_company",
          "name": "Company",
          "description": "Subsidiary or sister companies"
        }
      ],
      "custom_types": [
        {
          "type_id": "org_type_custom_001",
          "name": "Regional Office",
          "description": "Geographic branch offices for regional operations"
        }
      ],
      "total_types": 5,
      "default_count": 4,
      "custom_count": 1
    },
    "validation_results": {
      "name_valid": true,
      "name_unique": true,
      "description_valid": true,
      "quota_check": true
    }
  },
  "meta": {
    "request_id": "req_mno678pqr901",
    "timestamp": "2025-11-02T21:00:00Z",
    "processing_time": "1.5 seconds",
    "api_version": "v2"
  }
}
```

#### Examples

**cURL**:
```bash
curl -X POST "https://stg-api2.doconchain.com/api/v2/sub-organization/types?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "name=Regional Office" \
  -F "description=Geographic branch offices for regional operations"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('name', 'Regional Office');
formData.append('description', 'Geographic branch offices for regional operations');

const options = {
  method: 'POST',
  url: 'https://stg-api2.doconchain.com/api/v2/sub-organization/types',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    'Content-Type': 'multipart/form-data',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  },
  data: formData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Default Organization Types

| Type | Description | Use Case | Example |
|------|-------------|----------|---------|
| **Department** | Internal organizational departments | Company structure | Engineering, Sales, Marketing |
| **Client** | External client organizations | Customer management | Acme Corp, TechStart Inc |
| **Partner** | Business partner organizations | Partnership management | Consulting Firm, Vendor Co |
| **Company** | Subsidiary or sister companies | Corporate structure | Subsidiary A, Branch Office |

#### Custom Type Creation Process

1. **Permission Validation**: Verify user has permission to create custom types
2. **Input Validation**: Validate name and description format
3. **Uniqueness Check**: Ensure type name is unique across all types
4. **Quota Verification**: Check custom type creation limits
5. **Type Creation**: Generate unique type ID and create type record
6. **Permission Assignment**: Set appropriate permissions for the creator
7. **Audit Logging**: Log type creation with details
8. **Response Generation**: Return created type information

#### Validation Rules

| Field | Rules | Error Code |
|-------|-------|------------|
| **name** | 3-50 chars, alphanumeric + spaces/hyphens, unique | INVALID_TYPE_NAME |
| **description** | 0-200 chars, optional | INVALID_DESCRIPTION |

#### Naming Guidelines

| Do | Don't |
|----|-------|
| Use clear, descriptive names | Use abbreviations or codes |
| Capitalize properly | Use special characters |
| Keep names concise | Make names too long |
| Use industry terms | Use internal jargon |

#### Use Cases

- **Organizational Structure**: Create types for unique company structures
- **Industry Specific**: Add types for specialized business categories
- **Geographic Units**: Create regional or location-based types
- **Functional Groups**: Add types for specific business functions
- **Project Teams**: Create types for temporary project organizations

#### Important Notes

- **Custom Limits**: May have limits on number of custom types
- **Naming**: Choose clear, descriptive names for organizational clarity
- **Management**: Custom types can be modified or deleted by creators
- **Visibility**: Custom types are available to all organization members
- **Integration**: Custom types work with all existing features

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Enterprise Access**: User must have Enterprise API access
- **Creation Permission**: User must have permission to create custom types
- **Quota Available**: Organization must have available custom type slots

#### Error Responses

**400 Bad Request**: Invalid type data or validation errors
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Organization type data validation failed",
    "details": {
      "field_errors": {
        "name": "Type name must be 3-50 characters and unique",
        "description": "Description cannot exceed 200 characters"
      },
      "validation_rules": {
        "name_format": "Alphanumeric characters, spaces, and hyphens only",
        "name_length": "3-50 characters",
        "description_length": "0-200 characters",
        "uniqueness": "Name must be unique across all types"
      }
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: Insufficient permissions to create custom types
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to create custom organization types",
    "details": {
      "required_access": "ENTERPRISE_API",
      "required_permission": "create_custom_types",
      "user_permissions": ["view_types"]
    }
  }
}
```

**409 Conflict**: Type name already exists
```json
{
  "error": {
    "code": "TYPE_NAME_CONFLICT",
    "message": "Organization type name already exists",
    "details": {
      "conflicting_name": "Regional Office",
      "existing_type_id": "org_type_custom_002",
      "suggestion": "Try 'Regional Branch Office' or 'Geo Office'"
    }
  }
}
```

**422 Unprocessable Entity**: Business rule violations
```json
{
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Custom organization type quota exceeded",
    "details": {
      "current_custom_types": 5,
      "max_custom_types": 5,
      "upgrade_required": true,
      "solution": "Contact support to increase custom type limit"
    }
  }
}
```

**429 Too Many Requests**: Creation rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many organization type creation requests. Please wait before trying again",
    "details": {
      "retry_after": "2025-11-02T21:01:00Z",
      "limit": "10 creations per hour"
    }
  }
}
```

#### Best Practices

- **Descriptive Names**: Use clear, descriptive names that convey purpose
- **Consistent Naming**: Follow consistent naming conventions across types
- **Plan Ahead**: Consider future organizational needs when creating types
- **Documentation**: Document the purpose and usage of custom types
- **Regular Review**: Periodically review and clean up unused custom types
- **Collaboration**: Involve stakeholders when creating organization-wide types

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Permission Validation**: Strict validation of custom type creation permissions
- **Input Validation**: Comprehensive validation of type name and description
- **Uniqueness Enforcement**: Prevent duplicate type names
- **Quota Management**: Control custom type creation limits
- **Audit Logging**: All custom type creation logged with full details
- **Access Control**: Enterprise API access required for custom type creation

---

### 97. Get A Client Sub-Organization Type

Retrieve detailed information about a specific sub-organization type, including its configuration, usage statistics, and associated organizations.

**Endpoint**: `GET /api/v2/sub-organization/types/{subOrgTypeId}`

**URL**: `https://stg-api2.doconchain.com/api/v2/sub-organization/types/{subOrgTypeId}?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subOrgTypeId` | integer | Yes | ID of the sub-organization type to retrieve |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |
| `include_usage` | boolean | No | Include detailed usage statistics (default: true) |
| `include_organizations` | boolean | No | Include list of organizations using this type (default: false) |

**Body Parameters**: None required

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "message": "Sub-organization type details retrieved successfully",
  "data": {
    "organization_type": {
      "type_id": "org_type_department",
      "internal_id": 1,
      "name": "Department",
      "description": "Internal organizational departments",
      "category": "default",
      "is_default": true,
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z",
      "created_by": {
        "user_id": "system",
        "name": "System",
        "organization": "DOCONCHAIN"
      },
      "last_modified": "2025-01-01T00:00:00Z",
      "usage_stats": {
        "total_organizations": 45,
        "active_organizations": 42,
        "total_members": 1250,
        "active_members": 1180,
        "total_documents": 5600,
        "documents_this_month": 320,
        "average_members_per_org": 28,
        "most_popular_region": "North America",
        "growth_rate": 12.5
      },
      "permissions": {
        "can_modify": false,
        "can_delete": false,
        "can_assign": true,
        "requires_admin_approval": false
      },
      "features": {
        "document_management": true,
        "member_collaboration": true,
        "reporting_access": true,
        "api_integration": true,
        "custom_workflows": false,
        "advanced_security": true
      },
      "limitations": {
        "max_members": 100,
        "max_storage_gb": 100,
        "monthly_document_limit": 1000,
        "api_rate_limit": 10000
      },
      "associated_organizations": [
        {
          "org_uuid": "org_dept_eng_001",
          "org_name": "Engineering Department",
          "member_count": 35,
          "created_at": "2025-06-15T10:30:00Z",
          "status": "active"
        },
        {
          "org_uuid": "org_dept_sales_001",
          "org_name": "Sales Department",
          "member_count": 28,
          "created_at": "2025-07-20T14:15:00Z",
          "status": "active"
        }
      ],
      "metadata": {
        "version": "1.0",
        "schema_version": "2.1",
        "tags": ["internal", "department", "organizational"],
        "custom_fields": []
      }
    },
    "related_types": {
      "similar_types": [
        {
          "type_id": "org_type_team",
          "name": "Team",
          "similarity_score": 85
        },
        {
          "type_id": "org_type_division",
          "name": "Division",
          "similarity_score": 75
        }
      ],
      "upgrade_options": [
        {
          "type_id": "org_type_enterprise_dept",
          "name": "Enterprise Department",
          "benefits": ["Advanced security", "Custom workflows", "Higher limits"]
        }
      ]
    }
  },
  "meta": {
    "request_id": "req_pqr901stu234",
    "timestamp": "2025-11-02T22:00:00Z",
    "processing_time": "0.7 seconds",
    "api_version": "v2",
    "data_included": ["usage_stats", "associated_organizations"]
  }
}
```

#### Examples

**cURL**:
```bash
curl -X GET "https://stg-api2.doconchain.com/api/v2/sub-organization/types/1?user_type=ENTERPRISE_API&include_usage=true&include_organizations=true" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/api/v2/sub-organization/types/1',
  params: {
    user_type: 'ENTERPRISE_API',
    include_usage: true,
    include_organizations: true
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Type Information Details

| Section | Description | Included Data |
|---------|-------------|---------------|
| **Basic Info** | Core type information | ID, name, description, category |
| **Usage Stats** | Adoption and usage metrics | Organization count, member stats, activity metrics |
| **Permissions** | Access and modification rights | Modification permissions, assignment rules |
| **Features** | Available capabilities | Feature flags and enabled options |
| **Limitations** | Usage constraints | Member limits, storage limits, rate limits |
| **Associated Orgs** | Organizations using this type | List of organizations with basic info |
| **Metadata** | Additional type information | Version, tags, custom fields |

#### Optional Data Inclusion

| Parameter | Description | Default | Performance Impact |
|-----------|-------------|---------|-------------------|
| **include_usage** | Detailed usage statistics | true | Low - cached data |
| **include_organizations** | Associated organizations list | false | Medium - requires queries |

#### Usage Statistics

| Metric | Description | Update Frequency |
|--------|-------------|------------------|
| **total_organizations** | Total orgs using this type | Real-time |
| **active_organizations** | Currently active orgs | Real-time |
| **total_members** | Total members across all orgs | Daily |
| **active_members** | Currently active members | Real-time |
| **total_documents** | Total documents created | Daily |
| **documents_this_month** | Current month activity | Real-time |
| **average_members_per_org** | Average org size | Daily |
| **growth_rate** | Monthly growth percentage | Monthly |

#### Use Cases

- **Type Analysis**: Understand how specific organization types are being used
- **Usage Monitoring**: Track adoption and growth of different organization types
- **Capacity Planning**: Monitor usage against limitations
- **Feature Evaluation**: Assess which features are most valuable
- **Migration Planning**: Plan organization type migrations or upgrades

#### Important Notes

- **Performance**: Including organizations can impact response time
- **Privacy**: Organization lists respect access permissions
- **Caching**: Usage statistics are cached and updated periodically
- **Real-time**: Some metrics update in real-time, others daily
- **Historical**: Usage data provides trends over time

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Enterprise Access**: User must have Enterprise API access
- **Type Access**: User must have permission to view organization types
- **Organization Permission**: User must have access to view associated organizations

#### Error Responses

**400 Bad Request**: Invalid type ID or parameters
```json
{
  "error": {
    "code": "INVALID_TYPE_ID",
    "message": "Invalid sub-organization type ID",
    "details": {
      "provided_id": "abc",
      "expected_format": "integer",
      "valid_range": "1-999999"
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: Insufficient permissions to view type details
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to view organization type details",
    "details": {
      "type_id": 1,
      "required_access": "ENTERPRISE_API",
      "user_access": "BASIC_API"
    }
  }
}
```

**404 Not Found**: Organization type not found
```json
{
  "error": {
    "code": "TYPE_NOT_FOUND",
    "message": "Sub-organization type not found",
    "details": {
      "type_id": 1,
      "possible_reasons": ["deleted", "invalid_id", "access_restricted"]
    }
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many organization type detail requests. Please wait before trying again",
    "details": {
      "retry_after": "2025-11-02T22:01:00Z",
      "limit": "200 requests per minute"
    }
  }
}
```

#### Best Practices

- **Selective Loading**: Use include parameters to control response size
- **Caching Strategy**: Cache type information for better performance
- **Usage Monitoring**: Regularly review usage statistics for planning
- **Access Control**: Respect organization privacy when viewing associations
- **Performance Optimization**: Avoid including organizations for bulk operations

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Permission Validation**: Strict validation of type detail access permissions
- **Data Privacy**: Protect sensitive usage statistics and organization associations
- **Access Logging**: All type detail access attempts logged
- **Rate Limiting**: Prevent abuse with request rate limits
- **Data Encryption**: Secure transmission of type information and statistics

---

### 98. Update A Client Sub-Organization Type

Modify the name and description of a specific sub-organization type. Note that default types (Department, Client, Partner, Company) cannot be modified.

**Endpoint**: `PUT /api/v2/sub-organization/types/{subOrgTypeId}`

**URL**: `https://stg-api2.doconchain.com/api/v2/sub-organization/types/{subOrgTypeId}?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subOrgTypeId` | integer | Yes | ID of the sub-organization type to update |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters** (Form Data):

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `name` | string | No | Updated name of the organization type | 3-50 characters, unique, alphanumeric + spaces/hyphens |
| `description` | string | No | Updated description | 0-200 characters |

**Notes**:
- At least one field must be provided for update
- Default types cannot be modified
- Name changes require uniqueness across all types

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "message": "Sub-organization type updated successfully",
  "data": {
    "organization_type": {
      "type_id": "org_type_custom_001",
      "internal_id": 5,
      "name": "Regional Branch Office",
      "description": "Geographic branch offices and regional operational units",
      "category": "custom",
      "is_default": false,
      "is_active": true,
      "updated_at": "2025-11-02T23:00:00Z",
      "updated_by": {
        "user_id": "user_11111",
        "name": "John Admin",
        "organization": "Tech Solutions Inc"
      },
      "changes_made": {
        "name": {
          "old_value": "Regional Office",
          "new_value": "Regional Branch Office",
          "changed": true
        },
        "description": {
          "old_value": "Geographic branch offices for regional operations",
          "new_value": "Geographic branch offices and regional operational units",
          "changed": true
        }
      },
      "version_history": {
        "current_version": "1.1",
        "previous_version": "1.0",
        "change_count": 2,
        "last_changed": "2025-11-02T23:00:00Z"
      },
      "impact_assessment": {
        "affected_organizations": 3,
        "notification_required": true,
        "breaking_changes": false,
        "backward_compatible": true
      }
    },
    "notifications": {
      "admin_notified": true,
      "affected_users_notified": false,
      "notification_type": "type_updated",
      "notification_sent_at": "2025-11-02T23:00:05Z"
    },
    "audit_trail": {
      "update_id": "upd_abc123def456",
      "timestamp": "2025-11-02T23:00:00Z",
      "changes_logged": true,
      "rollback_available": true,
      "rollback_window": "24 hours"
    }
  },
  "meta": {
    "request_id": "req_stu234vwx567",
    "timestamp": "2025-11-02T23:00:00Z",
    "processing_time": "1.8 seconds",
    "api_version": "v2"
  }
}
```

#### Examples

**cURL**:
```bash
curl -X PUT "https://stg-api2.doconchain.com/api/v2/sub-organization/types/5?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "name=Regional Branch Office" \
  -F "description=Geographic branch offices and regional operational units"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('name', 'Regional Branch Office');
formData.append('description', 'Geographic branch offices and regional operational units');

const options = {
  method: 'PUT',
  url: 'https://stg-api2.doconchain.com/api/v2/sub-organization/types/5',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    'Content-Type': 'multipart/form-data',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  },
  data: formData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Type Update Process

1. **Permission Validation**: Verify user has permission to update types
2. **Type Validation**: Confirm type exists and is modifiable
3. **Default Type Check**: Ensure type is not a default (unmodifiable) type
4. **Input Validation**: Validate name and description format
5. **Uniqueness Check**: Ensure new name is unique if changed
6. **Impact Assessment**: Evaluate effects on existing organizations
7. **Update Execution**: Apply changes to type record
8. **Notification Dispatch**: Notify affected administrators
9. **Audit Logging**: Log all changes with before/after values
10. **Cache Invalidation**: Clear any cached type information

#### Update Restrictions

| Type Category | Can Modify | Restrictions |
|---------------|------------|--------------|
| **Default Types** | ✗ | Department, Client, Partner, Company cannot be changed |
| **Custom Types** | ✓ | Created by users, fully modifiable by creators/admins |
| **System Types** | ✗ | Reserved types maintained by system |

#### Validation Rules

| Field | Rules | Error Code |
|-------|-------|------------|
| **name** | 3-50 chars, alphanumeric + spaces/hyphens, unique | INVALID_TYPE_NAME |
| **description** | 0-200 chars | INVALID_DESCRIPTION |

#### Impact Assessment

| Change Type | Potential Impact | Notification Required |
|-------------|-----------------|----------------------|
| **Name Change** | UI updates, reports, exports | Yes - admin notification |
| **Description Change** | Documentation, help text | No - silent update |
| **Major Name Change** | User confusion, re-training | Yes - user notification |

#### Use Cases

- **Clarification**: Update type names for better clarity
- **Rebranding**: Change names during organizational rebranding
- **Expansion**: Update descriptions as type usage expands
- **Correction**: Fix typos or improve descriptions
- **Standardization**: Align names with organizational standards

#### Important Notes

- **Default Types**: Cannot modify Department, Client, Partner, Company
- **Ownership**: Only creators or admins can modify custom types
- **Uniqueness**: Name changes must maintain uniqueness
- **Impact**: Name changes may affect existing organizations
- **Rollback**: Changes can be rolled back within 24 hours

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Enterprise Access**: User must have Enterprise API access
- **Type Ownership**: User must be creator or admin of the custom type
- **Modification Rights**: User must have permission to modify organization types

#### Error Responses

**400 Bad Request**: Invalid update data or validation errors
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Organization type update data validation failed",
    "details": {
      "field_errors": {
        "name": "Type name must be 3-50 characters and unique",
        "description": "Description cannot exceed 200 characters"
      },
      "current_values": {
        "existing_name": "Regional Office",
        "existing_description": "Geographic branch offices for regional operations"
      }
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: Insufficient permissions or attempting to modify default type
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to update organization type",
    "details": {
      "type_id": 1,
      "type_name": "Department",
      "is_default": true,
      "reason": "Default types cannot be modified",
      "solution": "Create a custom type instead"
    }
  }
}
```

**404 Not Found**: Organization type not found
```json
{
  "error": {
    "code": "TYPE_NOT_FOUND",
    "message": "Sub-organization type not found",
    "details": {
      "type_id": 5,
      "possible_reasons": ["deleted", "invalid_id"]
    }
  }
}
```

**409 Conflict**: Name uniqueness violation
```json
{
  "error": {
    "code": "NAME_CONFLICT",
    "message": "Organization type name already exists",
    "details": {
      "attempted_name": "Regional Branch Office",
      "conflicting_type_id": 6,
      "conflicting_type_name": "Regional Branch Office",
      "suggestion": "Try 'Regional Operations Office' or 'Branch Operations'"
    }
  }
}
```

**422 Unprocessable Entity**: Business rule violations
```json
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Update violates organizational business rules",
    "details": {
      "violations": [
        {
          "rule": "type_ownership",
          "message": "Only the creator or admin can modify this type",
          "current_owner": "user_22222",
          "your_user_id": "user_11111"
        }
      ]
    }
  }
}
```

**429 Too Many Requests**: Update rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many organization type update requests. Please wait before trying again",
    "details": {
      "retry_after": "2025-11-02T23:01:00Z",
      "limit": "20 updates per hour"
    }
  }
}
```

#### Best Practices

- **Impact Assessment**: Consider effects on existing organizations before changes
- **Communication**: Notify stakeholders of significant name changes
- **Version Control**: Keep track of changes for documentation purposes
- **Testing**: Test changes in development before production updates
- **Rollback Planning**: Have rollback procedures ready for major changes
- **Documentation**: Update any documentation referencing the old names

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Permission Validation**: Strict validation of type update permissions
- **Ownership Verification**: Ensure users can only modify their own custom types
- **Default Type Protection**: Prevent modification of system default types
- **Input Validation**: Comprehensive validation of all update input
- **Audit Logging**: All type updates logged with full change details
- **Access Control**: Enterprise API access required for type modifications

---

### 99. Delete A Client Sub-Organization Type

Permanently remove a custom sub-organization type from the system. Default types (Department, Client, Partner, Company) cannot be deleted.

**Endpoint**: `DELETE /api/v2/sub-organization/types/{subOrgTypeId}/delete`

**URL**: `https://stg-api2.doconchain.com/api/v2/sub-organization/types/{subOrgTypeId}/delete?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subOrgTypeId` | integer | Yes | ID of the sub-organization type to delete |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters**: None required

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "message": "Sub-organization type deleted successfully",
  "data": {
    "deleted_type": {
      "type_id": "org_type_custom_001",
      "internal_id": 5,
      "name": "Regional Branch Office",
      "description": "Geographic branch offices and regional operational units",
      "category": "custom",
      "is_default": false,
      "deleted_at": "2025-11-03T00:00:00Z",
      "deleted_by": {
        "user_id": "user_11111",
        "name": "John Admin",
        "organization": "Tech Solutions Inc"
      },
      "deletion_reason": "administrative_cleanup",
      "usage_summary": {
        "total_organizations": 3,
        "total_members": 85,
        "total_documents": 1200,
        "lifetime_usage": "6 months"
      }
    },
    "data_reassignment": {
      "organizations_affected": 3,
      "fallback_type_assigned": "org_type_department",
      "fallback_type_name": "Department",
      "reassignment_method": "automatic",
      "organizations_updated": [
        {
          "org_uuid": "org_branch_east_001",
          "old_type": "Regional Branch Office",
          "new_type": "Department",
          "members_notified": true
        },
        {
          "org_uuid": "org_branch_west_001",
          "old_type": "Regional Branch Office",
          "new_type": "Department",
          "members_notified": true
        }
      ]
    },
    "cleanup_summary": {
      "type_record_removed": true,
      "references_cleaned": 15,
      "cache_invalidated": true,
      "search_index_updated": true,
      "audit_logs_preserved": true
    },
    "notifications": {
      "admin_notified": true,
      "affected_users_notified": true,
      "notification_type": "type_deleted_reassigned",
      "notification_sent_at": "2025-11-03T00:00:05Z",
      "reassignment_explanation": "Your organization type has been updated to 'Department' due to type deletion"
    },
    "audit_trail": {
      "deletion_id": "del_abc123def456",
      "timestamp": "2025-11-03T00:00:00Z",
      "permanent_deletion": true,
      "recovery_available": false,
      "compliance_recorded": true
    }
  },
  "meta": {
    "request_id": "req_vwx567yza890",
    "timestamp": "2025-11-03T00:00:00Z",
    "processing_time": "3.2 seconds",
    "api_version": "v2"
  }
}
```

#### Examples

**cURL**:
```bash
curl -X DELETE "https://stg-api2.doconchain.com/api/v2/sub-organization/types/5/delete?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'DELETE',
  url: 'https://stg-api2.doconchain.com/api/v2/sub-organization/types/5/delete',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Type Deletion Process

1. **Permission Validation**: Verify user has permission to delete types
2. **Type Validation**: Confirm type exists and is deletable
3. **Default Type Check**: Ensure type is not a default (undeletable) type
4. **Usage Assessment**: Evaluate organizations currently using the type
5. **Reassignment Planning**: Determine fallback type for affected organizations
6. **Impact Notification**: Notify affected organization administrators
7. **Data Reassignment**: Update all organizations to fallback type
8. **Reference Cleanup**: Remove all references to the deleted type
9. **Type Deletion**: Permanently remove type record
10. **Audit Logging**: Log complete deletion details
11. **Cache Invalidation**: Clear all cached type information

#### Deletion Restrictions

| Type Category | Can Delete | Restrictions |
|---------------|------------|--------------|
| **Default Types** | ✗ | Department, Client, Partner, Company cannot be deleted |
| **Custom Types** | ✓ | Created by users, deletable by creators/admins |
| **System Types** | ✗ | Reserved types maintained by system |
| **In-Use Types** | ⚠ | Can delete but organizations reassigned to fallback |

#### Fallback Type Assignment

| Scenario | Fallback Type | Reasoning |
|----------|---------------|-----------|
| **Department-like** | Department | Most similar organizational structure |
| **Client-like** | Client | External relationship focus |
| **Partner-like** | Partner | Business relationship focus |
| **Company-like** | Company | Subsidiary/corporate structure |
| **Generic Custom** | Department | Default organizational type |

#### Data Reassignment

| Data Type | Action | Notes |
|-----------|--------|-------|
| **Organization Records** | Updated to fallback type | Immediate reassignment |
| **Member Permissions** | Adjusted if needed | Based on new type capabilities |
| **Reports & Analytics** | Updated references | Historical data preserved |
| **API Responses** | Return fallback type | Seamless transition |
| **Search Indexes** | Re-indexed | Updated type information |

#### Notification System

| Recipient | Notification Type | Content |
|-----------|------------------|---------|
| **Type Creator** | Deletion Confirmation | Type deleted, reassignment summary |
| **Org Admins** | Type Change Notice | Organization type updated, explanation |
| **Org Members** | Type Update Info | Organization category changed |
| **System Admins** | Audit Notification | Type deletion logged |

#### Use Cases

- **Cleanup**: Remove unused or obsolete custom types
- **Reorganization**: Delete types during organizational restructuring
- **Consolidation**: Merge similar types and remove duplicates
- **Standardization**: Remove non-standard types in favor of defaults
- **Maintenance**: Clean up types created for temporary purposes

#### Important Notes

- **Irreversible**: Type deletion cannot be undone
- **Default Protection**: Cannot delete Department, Client, Partner, Company
- **Automatic Reassignment**: Affected organizations automatically reassigned
- **Data Preservation**: All organization data and history preserved
- **Notification**: All affected parties notified of changes

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Enterprise Access**: User must have Enterprise API access
- **Type Ownership**: User must be creator or admin of the custom type
- **Deletion Rights**: User must have permission to delete organization types

#### Error Responses

**400 Bad Request**: Invalid type ID or deletion not allowed
```json
{
  "error": {
    "code": "INVALID_DELETION_REQUEST",
    "message": "Sub-organization type deletion request is invalid",
    "details": {
      "reason": "Request parameters incomplete",
      "required_checks": ["type_exists", "deletable", "permissions"]
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: Insufficient permissions or attempting to delete default type
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to delete organization type",
    "details": {
      "type_id": 1,
      "type_name": "Department",
      "is_default": true,
      "reason": "Default types cannot be deleted",
      "solution": "Default types are permanent system types"
    }
  }
}
```

**404 Not Found**: Organization type not found
```json
{
  "error": {
    "code": "TYPE_NOT_FOUND",
    "message": "Sub-organization type not found",
    "details": {
      "type_id": 5,
      "possible_reasons": ["already_deleted", "invalid_id"]
    }
  }
}
```

**409 Conflict**: Deletion blocked by dependencies or business rules
```json
{
  "error": {
    "code": "DELETION_CONFLICT",
    "message": "Type deletion is blocked by system constraints",
    "details": {
      "blocking_factors": [
        {
          "factor": "system_dependency",
          "description": "Type is required by system processes",
          "solution": "Contact support for system type deletion"
        }
      ]
    }
  }
}
```

**422 Unprocessable Entity**: Business rule violations
```json
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Deletion violates organizational business rules",
    "details": {
      "violations": [
        {
          "rule": "type_ownership",
          "message": "Only the creator or admin can delete this type",
          "type_creator": "user_22222",
          "your_user_id": "user_11111"
        }
      ]
    }
  }
}
```

**429 Too Many Requests**: Deletion rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many organization type deletion requests. Please wait before trying again",
    "details": {
      "retry_after": "2025-11-03T00:01:00Z",
      "limit": "5 deletions per hour"
    }
  }
}
```

#### Best Practices

- **Impact Assessment**: Review all organizations using the type before deletion
- **Communication**: Notify organization admins before deletion
- **Fallback Planning**: Choose appropriate fallback type for reassignment
- **Testing**: Test reassignment in development environment first
- **Documentation**: Update any documentation referencing the deleted type
- **Audit Review**: Review deletion logs for compliance and tracking

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Permission Validation**: Strict validation of type deletion permissions
- **Ownership Verification**: Ensure users can only delete their own custom types
- **Default Type Protection**: Prevent deletion of system default types
- **Data Reassignment**: Secure handling of organization type reassignments
- **Audit Logging**: All type deletions logged with complete details
- **Access Control**: Enterprise API access required for type deletion

---

### 100. Get Billing Details

Retrieve a user's complete billing information including saved payment methods, billing addresses, and payment history for secure billing management.

**Endpoint**: `GET /api/v2/billing-details`

**URL**: `https://stg-api2.doconchain.com/api/v2/billing-details?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Authorization: Bearer {token}
```

**Path Parameters**: None

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters**: None required

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "message": "Billing details retrieved successfully",
  "data": {
    "billing_profile": {
      "customer_id": "cus_abc123def456",
      "account_status": "active",
      "billing_email": "billing@company.com",
      "tax_id": "US123456789",
      "currency": "USD",
      "timezone": "America/New_York",
      "created_at": "2025-01-15T10:00:00Z"
    },
    "payment_methods": [
      {
        "payment_method_id": "pm_visa_1234",
        "type": "card",
        "card": {
          "brand": "visa",
          "last4": "4242",
          "exp_month": 12,
          "exp_year": 2026,
          "funding": "credit",
          "country": "US"
        },
        "billing_details": {
          "name": "John Smith",
          "email": "john.smith@company.com",
          "phone": "+1-555-0123",
          "address": {
            "line1": "123 Business St",
            "line2": "Suite 456",
            "city": "New York",
            "state": "NY",
            "postal_code": "10001",
            "country": "US"
          }
        },
        "status": "active",
        "is_default": true,
        "created_at": "2025-01-15T10:00:00Z",
        "last_used": "2025-11-01T14:30:00Z"
      },
      {
        "payment_method_id": "pm_mastercard_5678",
        "type": "card",
        "card": {
          "brand": "mastercard",
          "last4": "8888",
          "exp_month": 8,
          "exp_year": 2027,
          "funding": "debit",
          "country": "US"
        },
        "billing_details": {
          "name": "John Smith",
          "email": "john.smith@company.com",
          "phone": "+1-555-0123",
          "address": {
            "line1": "123 Business St",
            "line2": "Suite 456",
            "city": "New York",
            "state": "NY",
            "postal_code": "10001",
            "country": "US"
          }
        },
        "status": "active",
        "is_default": false,
        "created_at": "2025-06-20T09:15:00Z",
        "last_used": "2025-10-15T11:45:00Z"
      }
    ],
    "billing_history": {
      "total_invoices": 12,
      "paid_invoices": 12,
      "pending_invoices": 0,
      "failed_payments": 0,
      "total_spent": 1299.99,
      "average_monthly": 108.33,
      "last_payment": {
        "amount": 99.99,
        "date": "2025-11-01T00:00:00Z",
        "status": "paid",
        "invoice_id": "inv_nov2025_001"
      }
    },
    "subscription_info": {
      "current_plan": "Enterprise",
      "plan_status": "active",
      "billing_cycle": "monthly",
      "next_billing_date": "2025-12-01T00:00:00Z",
      "current_period_start": "2025-11-01T00:00:00Z",
      "current_period_end": "2025-11-30T23:59:59Z",
      "cancel_at_period_end": false
    },
    "security_info": {
      "pci_compliant": true,
      "data_encryption": "AES-256",
      "tokenization": true,
      "fraud_protection": true,
      "last_security_review": "2025-10-01T00:00:00Z"
    }
  },
  "meta": {
    "request_id": "req_yza890bcd123",
    "timestamp": "2025-11-03T01:00:00Z",
    "processing_time": "0.8 seconds",
    "api_version": "v2",
    "data_masked": true
  }
}
```

#### Examples

**cURL**:
```bash
curl -X GET "https://stg-api2.doconchain.com/api/v2/billing-details?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const options = {
  method: 'GET',
  url: 'https://stg-api2.doconchain.com/api/v2/billing-details',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  }
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Billing Information Details

| Section | Description | Included Data |
|---------|-------------|---------------|
| **Billing Profile** | Account billing information | Customer ID, email, tax info, currency |
| **Payment Methods** | Saved payment methods | Cards with billing addresses |
| **Billing History** | Payment and invoice history | Totals, averages, last payment |
| **Subscription Info** | Current plan details | Plan status, billing cycle, dates |
| **Security Info** | Payment security features | PCI compliance, encryption |

#### Payment Method Details

| Field | Description | Security Notes |
|-------|-------------|----------------|
| **payment_method_id** | Unique payment identifier | Tokenized, not actual card number |
| **card.brand** | Card network (visa, mastercard, etc.) | Display only |
| **card.last4** | Last 4 digits of card | Safe to display |
| **card.exp_month/year** | Expiration date | Safe to display |
| **billing_details** | Cardholder information | Full address for billing |

#### Card Status Values

| Status | Description | Can Use for Payment |
|--------|-------------|-------------------|
| **active** | Card is active and valid | ✓ |
| **inactive** | Card deactivated by user | ✗ |
| **expired** | Card has expired | ✗ |
| **failed** | Recent payment failure | ⚠ (may work) |
| **blocked** | Card blocked by issuer | ✗ |

#### Billing History Metrics

| Metric | Description | Update Frequency |
|--------|-------------|------------------|
| **total_invoices** | Total invoices generated | Real-time |
| **paid_invoices** | Successfully paid invoices | Real-time |
| **pending_invoices** | Awaiting payment | Real-time |
| **failed_payments** | Failed payment attempts | Real-time |
| **total_spent** | Total amount paid | Real-time |
| **average_monthly** | Monthly spending average | Monthly |

#### Use Cases

- **Payment Management**: View and manage saved payment methods
- **Billing Review**: Check billing history and payment status
- **Address Updates**: Verify and update billing addresses
- **Subscription Monitoring**: Track current plan and billing cycle
- **Security Audit**: Review payment method security features

#### Important Notes

- **Data Masking**: Sensitive card data is tokenized and masked
- **PCI Compliance**: All payment data handling meets PCI standards
- **Tokenization**: Actual card numbers never stored or transmitted
- **Encryption**: All billing data encrypted at rest and in transit
- **Access Control**: Users can only view their own billing information

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Billing Access**: User must have billing management permissions
- **Account Status**: User account must be in good standing
- **Payment Setup**: User must have billing profile configured

#### Error Responses

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**: Insufficient permissions to view billing details
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to billing information",
    "details": {
      "required_permission": "billing_read",
      "user_permissions": ["document_read"]
    }
  }
}
```

**404 Not Found**: Billing profile not found
```json
{
  "error": {
    "code": "BILLING_PROFILE_NOT_FOUND",
    "message": "Billing profile not found for this user",
    "details": {
      "user_id": "user_11111",
      "possible_reasons": ["not_configured", "account_suspended"]
    }
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many billing detail requests. Please wait before trying again",
    "details": {
      "retry_after": "2025-11-03T01:01:00Z",
      "limit": "30 requests per hour"
    }
  }
}
```

#### Best Practices

- **Secure Storage**: Never store billing responses in insecure locations
- **Data Masking**: Always respect data masking in displays
- **Regular Review**: Periodically review and update payment methods
- **Address Verification**: Keep billing addresses current and accurate
- **Payment Monitoring**: Monitor billing history for unauthorized charges

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Data Encryption**: All billing data encrypted in transit and at rest
- **Tokenization**: Payment methods tokenized to prevent data exposure
- **PCI Compliance**: Meets PCI DSS standards for payment processing
- **Access Logging**: All billing data access logged for audit purposes
- **Data Masking**: Sensitive data masked in API responses
- **Rate Limiting**: Prevents abuse of billing information access

---

### 101. Save Billing Details

Create and securely save a new payment method with complete billing information for subscription payments and future transactions.

**Endpoint**: `PUT /api/v2/billing-details`

**URL**: `https://stg-api2.doconchain.com/api/v2/billing-details?user_type=ENTERPRISE_API`

#### Request

**Headers**:
```
Accept: application/json
Content-Type: application/json
Authorization: Bearer {token}
```

**Path Parameters**: None

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_type` | string | Yes | The type of user (e.g., ENTERPRISE_API) |

**Body Parameters** (JSON):

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `payment_method` | object | Yes | Payment method details | Valid payment method object |
| `payment_method.type` | string | Yes | Payment type ('card') | Must be 'card' |
| `payment_method.card` | object | Yes | Card details | Valid card object |
| `payment_method.card.number` | string | Yes | Card number | 13-19 digits, valid format |
| `payment_method.card.exp_month` | integer | Yes | Expiration month | 1-12 |
| `payment_method.card.exp_year` | integer | Yes | Expiration year | Current year or later |
| `payment_method.card.cvc` | string | Yes | Security code | 3-4 digits |
| `payment_method.billing_details` | object | Yes | Billing information | Complete address required |
| `payment_method.billing_details.name` | string | Yes | Cardholder name | 2-50 characters |
| `payment_method.billing_details.email` | string | No | Billing email | Valid email format |
| `payment_method.billing_details.phone` | string | No | Billing phone | Valid phone format |
| `payment_method.billing_details.address` | object | Yes | Billing address | Complete address |
| `payment_method.billing_details.address.line1` | string | Yes | Street address | 1-100 characters |
| `payment_method.billing_details.address.line2` | string | No | Apartment/suite | 0-100 characters |
| `payment_method.billing_details.address.city` | string | Yes | City | 1-50 characters |
| `payment_method.billing_details.address.state` | string | Yes | State/province | 1-50 characters |
| `payment_method.billing_details.address.postal_code` | string | Yes | Postal code | Valid format |
| `payment_method.billing_details.address.country` | string | Yes | Country code | 2-letter ISO code |
| `set_as_default` | boolean | No | Set as default payment method | Default: false |

#### Response

**Status**: `200 OK`

**Response Body**:
```json
{
  "message": "Billing details saved successfully",
  "data": {
    "payment_method": {
      "payment_method_id": "pm_visa_9876",
      "type": "card",
      "card": {
        "brand": "visa",
        "last4": "9876",
        "exp_month": 12,
        "exp_year": 2026,
        "funding": "credit",
        "country": "US"
      },
      "billing_details": {
        "name": "Jane Smith",
        "email": "jane.smith@company.com",
        "phone": "+1-555-0456",
        "address": {
          "line1": "456 Corporate Blvd",
          "line2": "Floor 12",
          "city": "San Francisco",
          "state": "CA",
          "postal_code": "94105",
          "country": "US"
        }
      },
      "status": "active",
      "is_default": true,
      "created_at": "2025-11-03T02:00:00Z",
      "validation_status": "verified"
    },
    "billing_profile": {
      "customer_id": "cus_abc123def456",
      "payment_methods_count": 3,
      "default_payment_method": "pm_visa_9876",
      "billing_address_verified": true,
      "last_updated": "2025-11-03T02:00:00Z"
    },
    "validation_results": {
      "card_valid": true,
      "address_valid": true,
      "security_checks_passed": true,
      "fraud_score": "low",
      "validation_timestamp": "2025-11-03T02:00:00Z"
    },
    "security_info": {
      "tokenization_applied": true,
      "pci_compliant": true,
      "encryption_level": "AES-256",
      "data_retention": "tokenized_only"
    },
    "notifications": {
      "confirmation_email_sent": true,
      "email_address": "jane.smith@company.com",
      "email_type": "payment_method_added",
      "sent_at": "2025-11-03T02:00:05Z"
    }
  },
  "meta": {
    "request_id": "req_bcd123efg456",
    "timestamp": "2025-11-03T02:00:00Z",
    "processing_time": "2.1 seconds",
    "api_version": "v2"
  }
}
```

#### Examples

**cURL**:
```bash
curl -X PUT "https://stg-api2.doconchain.com/api/v2/billing-details?user_type=ENTERPRISE_API" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "payment_method": {
      "type": "card",
      "card": {
        "number": "4242424242424242",
        "exp_month": 12,
        "exp_year": 2026,
        "cvc": "123"
      },
      "billing_details": {
        "name": "Jane Smith",
        "email": "jane.smith@company.com",
        "phone": "+1-555-0456",
        "address": {
          "line1": "456 Corporate Blvd",
          "line2": "Floor 12",
          "city": "San Francisco",
          "state": "CA",
          "postal_code": "94105",
          "country": "US"
        }
      }
    },
    "set_as_default": true
  }'
```

**Axios (JavaScript)**:
```javascript
import axios from 'axios';

const billingData = {
  payment_method: {
    type: 'card',
    card: {
      number: '4242424242424242',
      exp_month: 12,
      exp_year: 2026,
      cvc: '123'
    },
    billing_details: {
      name: 'Jane Smith',
      email: 'jane.smith@company.com',
      phone: '+1-555-0456',
      address: {
        line1: '456 Corporate Blvd',
        line2: 'Floor 12',
        city: 'San Francisco',
        state: 'CA',
        postal_code: '94105',
        country: 'US'
      }
    }
  },
  set_as_default: true
};

const options = {
  method: 'PUT',
  url: 'https://stg-api2.doconchain.com/api/v2/billing-details',
  params: {
    user_type: 'ENTERPRISE_API'
  },
  headers: {
    accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN'
  },
  data: billingData
};

axios
  .request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

#### Payment Method Creation Process

1. **Input Validation**: Validate all payment and billing data
2. **Card Verification**: Verify card number format and expiration
3. **Address Validation**: Validate billing address completeness
4. **Fraud Detection**: Run security and fraud checks
5. **Tokenization**: Securely tokenize payment information
6. **Billing Profile Update**: Add to user's billing profile
7. **Default Setting**: Set as default if requested
8. **Confirmation**: Send confirmation email
9. **Audit Logging**: Log payment method addition
10. **Response Generation**: Return tokenized payment method details

#### Card Validation Rules

| Field | Rules | Error Code |
|-------|-------|------------|
| **number** | 13-19 digits, valid checksum | INVALID_CARD_NUMBER |
| **exp_month** | 1-12, not expired | INVALID_EXPIRATION |
| **exp_year** | Current year or later | INVALID_EXPIRATION |
| **cvc** | 3-4 digits | INVALID_SECURITY_CODE |

#### Address Validation Requirements

| Field | Required | Format | Example |
|-------|----------|--------|---------|
| **line1** | Yes | 1-100 chars | "123 Main St" |
| **line2** | No | 0-100 chars | "Apt 4B" |
| **city** | Yes | 1-50 chars | "New York" |
| **state** | Yes | 1-50 chars | "NY" |
| **postal_code** | Yes | Valid format | "10001" |
| **country** | Yes | 2-letter ISO | "US" |

#### Security and Fraud Checks

| Check Type | Description | Action on Failure |
|------------|-------------|-------------------|
| **Card Validation** | Luhn algorithm, format check | Reject with error |
| **Expiration Check** | Not expired, reasonable future date | Reject with error |
| **Address Verification** | Complete address provided | Warning or rejection |
| **Fraud Scoring** | Behavioral analysis | Hold for review or reject |
| **Velocity Checks** | Rate of payment method additions | Temporary block |

#### Use Cases

- **New Subscription**: Add payment method for new subscription
- **Payment Method Backup**: Add secondary payment method
- **Address Update**: Update billing address with new card
- **Account Recovery**: Restore payment method after loss
- **Business Expansion**: Add corporate payment methods

#### Important Notes

- **Tokenization**: Card numbers are never stored, only tokens
- **PCI Compliance**: All processing meets PCI DSS requirements
- **Confirmation**: Users receive email confirmation of addition
- **Default Setting**: Only one payment method can be default
- **Validation**: All data is validated before saving

#### Prerequisites

- **Authentication**: User must be authenticated with valid token
- **Billing Access**: User must have billing management permissions
- **Account Status**: User account must be in good standing
- **Payment Setup**: User must have billing profile configured

#### Error Responses

**400 Bad Request**: Invalid payment or billing data
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Payment method data validation failed",
    "details": {
      "field_errors": {
        "payment_method.card.number": "Invalid card number format",
        "payment_method.card.exp_year": "Expiration year must be current or future",
        "payment_method.billing_details.address.postal_code": "Invalid postal code format"
      },
      "validation_rules": {
        "card_number": "13-19 digits with valid checksum",
        "expiration": "Not expired, reasonable future date",
        "address": "Complete billing address required"
      }
    }
  }
}
```

**401 Unauthorized**: Invalid or missing authentication token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**402 Payment Required**: Payment method validation failed
```json
{
  "error": {
    "code": "PAYMENT_METHOD_INVALID",
    "message": "Payment method could not be validated",
    "details": {
      "validation_errors": [
        {
          "type": "card_declined",
          "message": "Card was declined by issuer",
          "decline_code": "insufficient_funds"
        }
      ],
      "suggested_actions": ["Try different card", "Contact card issuer"]
    }
  }
}
```

**403 Forbidden**: Insufficient permissions to save billing details
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied to save billing information",
    "details": {
      "required_permission": "billing_write",
      "user_permissions": ["billing_read"]
    }
  }
}
```

**409 Conflict**: Billing profile issues
```json
{
  "error": {
    "code": "BILLING_CONFLICT",
    "message": "Billing operation conflicts with existing data",
    "details": {
      "conflicts": [
        {
          "type": "duplicate_card",
          "message": "This card is already saved to your account",
          "existing_payment_method_id": "pm_visa_9876"
        }
      ]
    }
  }
}
```

**422 Unprocessable Entity**: Business rule violations
```json
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Payment method addition violates business rules",
    "details": {
      "violations": [
        {
          "rule": "max_payment_methods",
          "message": "Maximum payment methods per account reached",
          "current_count": 5,
          "max_allowed": 5
        }
      ]
    }
  }
}
```

**429 Too Many Requests**: Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many billing update requests. Please wait before trying again",
    "details": {
      "retry_after": "2025-11-03T02:01:00Z",
      "limit": "10 requests per hour"
    }
  }
}
```

#### Best Practices

- **Secure Transmission**: Always use HTTPS for payment data
- **Data Validation**: Validate all data client-side before submission
- **Error Handling**: Handle validation errors gracefully
- **User Feedback**: Provide clear feedback on validation failures
- **Confirmation**: Wait for confirmation before proceeding
- **Storage**: Never store card data locally

#### Security Considerations

- **Authorization Required**: Bearer token authentication mandatory
- **Data Encryption**: All payment data encrypted in transit and at rest
- **Tokenization**: Immediate tokenization of payment information
- **PCI Compliance**: Meets PCI DSS standards for payment processing
- **Fraud Detection**: Advanced fraud detection and prevention
- **Audit Logging**: All payment method additions logged
- **Data Masking**: Sensitive data never returned in responses
















