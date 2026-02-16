const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const excelPath = path.resolve(__dirname, '../../../apps/frontend/public/DAP PROCESS.xlsx');

if (!fs.existsSync(excelPath)) {
    console.error('File not found:', excelPath);
    process.exit(1);
}

const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { defval: "" }); // defval ensures empty cells are present

console.log('Total rows:', data.length);
console.log('First 5 rows:', JSON.stringify(data.slice(0, 5), null, 2));

// Check for rows with TIMELINE to see their structure
const timelineRows = data.filter(r => r['TIMELINE'] && r['TIMELINE'].trim() !== '');
console.log('Number of rows with TIMELINE:', timelineRows.length);
console.log('Sample timeline row:', JSON.stringify(timelineRows[0], null, 2));

let mainHeaders = 0;
let subHeaders = 0;

data.forEach(row => {
    const docType = row['DOCUMENT TYPE'];
    if (docType) {
        const trimmed = docType.trim();
        if (trimmed === trimmed.toUpperCase() && trimmed.length > 10 && !/^\d/.test(trimmed)) {
            mainHeaders++;
            // console.log('Main Header:', trimmed);
        } else if (/^\d+\./.test(trimmed)) {
            subHeaders++;
            // console.log('Sub Header:', trimmed);
        }
    }
});

console.log('Main Headers found:', mainHeaders);
console.log('Sub Headers found:', subHeaders);
