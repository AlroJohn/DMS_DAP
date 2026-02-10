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
const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });

const processMap = new Map(); // Name -> minutes (number)

let currentMainHeader = '';
let currentSubHeader = '';

function parseMinutes(durationStr) {
    if (!durationStr) return 0;
    
    // Normalize string
    const str = durationStr.toLowerCase().replace(/,/g, '').replace('&', 'and');
    if (str.includes('varies')) return 0;

    let totalMinutes = 0;
    
    const dayMatch = str.match(/(\d+)\s*days?/);
    const hourMatch = str.match(/(\d+)\s*hours?/);
    const minMatch = str.match(/(\d+)\s*minutes?/);
    const minMatchShort = str.match(/(\d+)\s*mins?/);

    if (dayMatch) totalMinutes += parseInt(dayMatch[1]) * 24 * 60;
    if (hourMatch) totalMinutes += parseInt(hourMatch[1]) * 60;
    if (minMatch) totalMinutes += parseInt(minMatch[1]);
    else if (minMatchShort) totalMinutes += parseInt(minMatchShort[1]);

    return totalMinutes;
}

function formatDuration(minutes) {
    if (minutes === 0) return { value: null, unit: 'days' };
    
    // If exact days
    if (minutes % (24 * 60) === 0) {
        return { value: minutes / (24 * 60), unit: 'days' };
    } 
    // If exact hours
    else if (minutes % 60 === 0) {
        return { value: minutes / 60, unit: 'hours' };
    } 
    // Otherwise minutes
    else {
        return { value: minutes, unit: 'minutes' };
    }
}

function generateCode(name) {
    const parts = name.split(' - ');
    return parts.map(part => {
        // Remove content in parentheses e.g. (PMDP) -> PMDP is usually in the acronym
        return part
            .replace(/\([^\)]*\)/g, '') 
            .match(/\b[a-zA-Z0-9]/g)
            ?.join('')
            .toUpperCase() || '';
    }).join('-');
}

data.forEach(row => {
    const docType = row['DOCUMENT TYPE'] ? row['DOCUMENT TYPE'].trim() : '';
    const timeline = row['TIMELINE'] ? row['TIMELINE'].trim() : '';

    // Main Header: Uppercase, > 10 chars, not starting with number
    const isMain = docType === docType.toUpperCase() && docType.length > 10 && !/^\d/.test(docType);
    
    // Sub Header: Starts with "Number."
    const isSub = /^\d+\./.test(docType);

    if (isMain) {
        currentMainHeader = docType;
        currentSubHeader = '';
    } else if (isSub) {
        currentSubHeader = docType.replace(/^\d+\.\s*/, ''); // Remove numbering
    }

    // Process Timeline rows (excluding the headers themselves)
    if (timeline && !isMain && !isSub) {
        if (!currentMainHeader) return;

        // Construct Process Name
        const name = currentSubHeader 
            ? ${currentMainHeader} - 
            : currentMainHeader;
            
        // Clean name (remove newlines)
        const cleanName = name.replace(/\r?\n|\r/g, ' ');

        const minutes = parseMinutes(timeline);

        if (!processMap.has(cleanName)) {
            processMap.set(cleanName, 0);
        }
        processMap.set(cleanName, processMap.get(cleanName) + minutes);
    }
});

const processes = [];
for (const [name, minutes] of processMap.entries()) {
    const { value, unit } = formatDuration(minutes);
    processes.push({
        name: name,
        code: generateCode(name),
        description: name,
        duration_value: value,
        duration_unit: unit
    });
}

const outputContent = xport const processes = ;;
fs.writeFileSync(path.resolve(__dirname, '../prisma/process_data.ts'), outputContent);
console.log(✅ Generated  processes in apps/backend/prisma/process_data.ts);
