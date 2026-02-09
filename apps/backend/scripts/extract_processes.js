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
const data = XLSX.utils.sheet_to_json(sheet);

const processes = [];
let currentMainHeader = '';
let currentSubHeader = '';

function parseDuration(durationStr) {
    if (!durationStr) return { value: null, unit: 'days' };
    
    // Normalize string
    const str = durationStr.toLowerCase().replace(/,/g, '').replace('&', 'and');
    
    if (str.includes('varies')) {
        return { value: null, unit: 'days' };
    }

    let totalMinutes = 0;
    
    // Regex for "X days", "Y hours", "Z minutes"
    const dayMatch = str.match(/(\d+)\s*days?/);
    const hourMatch = str.match(/(\d+)\s*hours?/);
    const minMatch = str.match(/(\d+)\s*minutes?/); // and "mins"
    const minMatchShort = str.match(/(\d+)\s*mins?/);

    if (dayMatch) totalMinutes += parseInt(dayMatch[1]) * 24 * 60;
    if (hourMatch) totalMinutes += parseInt(hourMatch[1]) * 60;
    if (minMatch) totalMinutes += parseInt(minMatch[1]);
    else if (minMatchShort) totalMinutes += parseInt(minMatchShort[1]);

    if (totalMinutes === 0) return { value: null, unit: 'days' };

    if (totalMinutes % (24 * 60) === 0) {
        return { value: totalMinutes / (24 * 60), unit: 'days' };
    } else if (totalMinutes % 60 === 0) {
        return { value: totalMinutes / 60, unit: 'hours' };
    } else {
        return { value: totalMinutes, unit: 'minutes' };
    }
}

function generateCode(name) {
    return name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_') // Replace non-alphanumeric with underscore
        .replace(/^_+|_+$/g, '') // Trim underscores
        .substring(0, 100);
}

data.forEach(row => {
    const docType = row['DOCUMENT TYPE'];
    const timeline = row['TIMELINE'];

    if (docType) {
        const trimmedDocType = docType.trim();
        // Check for Main Header (Uppercase and length > 10 to avoid short words, and not starting with number)
        if (trimmedDocType === trimmedDocType.toUpperCase() && trimmedDocType.length > 10 && !/^\d/.test(trimmedDocType)) {
            currentMainHeader = trimmedDocType;
            currentSubHeader = '';
        } 
        // Check for Sub Header (starts with number like "1.")
        else if (/^\d+\./.test(trimmedDocType)) {
            currentSubHeader = trimmedDocType;
        }
    }

    if (timeline && (!docType || docType.trim() === '')) {
        // Found a timeline row for the current process
        let name = currentMainHeader;
        if (currentSubHeader) {
            // Clean subheader "1. Name" -> "Name"
            const subName = currentSubHeader.replace(/^\d+\.\s*/, '');
            name = `${currentMainHeader} - ${subName}`;
        }
        
        // Remove newlines from name
        name = name.replace(/\r?\n|\r/g, ' ');

        const { value, unit } = parseDuration(timeline);
        
        // Avoid duplicates if parsing logic hits same thing
        if (!processes.find(p => p.name === name)) {
             processes.push({
                name: name,
                code: generateCode(name),
                description: name, // Use name as description for now
                duration_value: value,
                duration_unit: unit
            });
        }
        
        // Reset subheader
        currentSubHeader = '';
    }
});

const outputContent = `export const processes = ${JSON.stringify(processes, null, 2)};`;
fs.writeFileSync(path.resolve(__dirname, '../prisma/process_data.ts'), outputContent);
console.log('Process data generated in apps/backend/prisma/process_data.ts');
