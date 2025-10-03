# CSV Upload Flow Documentation

## **FREEZE FRAME: CSV Upload Route**

### **Route:** `POST /api/orgs/:orgId/supporters/csv`
- **File:** `routes/supportersRoute.js` (line 29)
- **Middleware:** `multer.single('file')` - stores file in memory as buffer
- **Service:** `parseContactsCSV()` from `services/csvService.js`

## **CSV Processing Pipeline**

### **1. File Upload (Multer)**
```javascript
const upload = multer({ storage: multer.memoryStorage() });
```
- Receives file as `req.file.buffer`
- No disk storage - pure memory processing
- File name: `req.file.originalname`

### **2. CSV Parsing Service (`csvService.js`)**

#### **parseContactsCSV(csvBuffer)**
- **Library:** `csv-parse/sync` 
- **Options:**
  - `columns: true` - Use first row as headers
  - `skip_empty_lines: true` - Ignore blank rows
  - `trim: true` - Remove whitespace

#### **Field Normalization**
```javascript
function normalizeFieldName(fieldName) {
  const fieldMap = {
    'first name': 'firstName',
    'firstname': 'firstName', 
    'fname': 'firstName',
    'goes by': 'goesBy',
    'nickname': 'goesBy',
    'last name': 'lastName',
    'lastname': 'lastName',
    'email': 'email',
    'phone': 'phone',
    'street': 'street',
    'city': 'city', 
    'state': 'state',
    'zip': 'zip',
    'employer': 'employer',
    'company': 'employer',
    'years with organization': 'yearsWithOrganization'
  };
}
```

#### **Validation Rules**
- **Required:** `firstName`, `lastName`, `email`
- **Optional:** All other fields
- **Email:** Must be valid format
- **Default:** `categoryOfEngagement = "general"` for CSV imports

### **3. Database Operations**
```javascript
// Bulk upsert supporters
const operations = contacts.map(c => ({
  updateOne: {
    filter: { orgId, email: c.email },
    update: { ...c, orgId },
    upsert: true
  }
}));

const result = await Supporter.bulkWrite(operations);
```

## **Error Handling**

### **CSV Parsing Errors**
- Missing required fields
- Invalid email format
- Malformed CSV structure

### **Database Errors**
- Duplicate email conflicts
- MongoDB connection issues
- Validation failures

### **Response Format**
```javascript
{
  success: true,
  inserted: result.upsertedCount,
  updated: result.modifiedCount, 
  total: contacts.length,
  errors: [] // If any parsing errors
}
```

## **Frontend Flow**
1. **UploadSupportersCSV.jsx** → File selection
2. **UploadPreview.jsx** → Field mapping (client-side)
3. **ContactValidation.jsx** → Results display
4. **ResolveErrors.jsx** → Error resolution (if needed)

## **Key Points**
- **No file storage** - CSV processed in memory only
- **Field normalization** - Handles various header formats
- **Bulk upsert** - Updates existing, inserts new
- **Error recovery** - Detailed error reporting for fixes
- **HubSpot-style** - Field mapping with dropdowns

## **Debugging**
- Console logs added to route for file upload tracking
- CSV parse results logged
- Error details returned in response
