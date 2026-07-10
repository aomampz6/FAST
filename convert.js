const fs = require('fs');
const text = fs.readFileSync('data.csv', 'utf8');

// Proper CSV parser that handles newlines in quotes
const parseCSV = (csvStr) => {
    const result = [];
    let row = [];
    let val = '';
    let inQuotes = false;
    for (let i = 0; i < csvStr.length; i++) {
        let char = csvStr[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            row.push(val.trim());
            val = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && csvStr[i+1] === '\n') {
                i++; // skip \n
            }
            row.push(val.trim());
            if (row.some(x => x !== '')) {
                result.push(row);
            }
            row = [];
            val = '';
        } else {
            val += char;
        }
    }
    if (val || row.length > 0) {
        row.push(val.trim());
        result.push(row);
    }
    return result;
};

const rows = parseCSV(text);

let headerIdx = -1;
for(let i=0; i<rows.length; i++) {
    if(rows[i][0] === 'ID' && rows[i][1] === 'กลุ่มประเภทเหตุเสีย') {
        headerIdx = i;
        break;
    }
}

const data = [];
let lastID = '';
let lastGroup = '';
let lastScoms = '';

for (let i = headerIdx + 1; i < rows.length; i++) {
    let row = rows[i];
    if (row.length < 8) continue;

    if (row[0]) lastID = row[0];
    if (row[1]) lastGroup = row[1];
    if (row[2]) lastScoms = row[2];

    let obj = {
        ID: lastID,
        Group: lastGroup,
        Scoms: lastScoms,
        Symptom: row[3] || '',
        CheckPoint: row[4] || '',
        Steps: row[5] || '',
        NormalValue: row[6] || '',
        Equipment: row[7] || ''
    };
    
    // Only add if there is actual content for this row
    if (obj.Symptom || obj.CheckPoint || obj.Steps) {
        data.push(obj);
    }
}

const jsContent = 'const fastData = ' + JSON.stringify(data, null, 4) + ';\n';
fs.writeFileSync('data.js', jsContent, 'utf8');
console.log('Successfully regenerated data.js with proper multi-line parsing and UTF-8 encoding!');
