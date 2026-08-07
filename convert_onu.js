const fs = require('fs');

const text = fs.readFileSync('onu_data.csv', 'utf8');
const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

const configs = [];
let currentBrand = '';
let currentMode = '';
let currentDetails = '';

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if it's a new Brand (e.g., "1. Huawei", "2. ZTE")
    if (/^\d+\.\s+[A-Za-z]+/.test(line)) {
        if (currentBrand && currentMode) {
            configs.push({ Brand: currentBrand, Mode: currentMode, Details: currentDetails.trim() });
            currentMode = '';
            currentDetails = '';
        } else if (currentBrand && !currentMode && currentDetails) {
            // Push general config if no mode was specified yet
            configs.push({ Brand: currentBrand, Mode: 'General', Details: currentDetails.trim() });
            currentDetails = '';
        }
        currentBrand = line.replace(/^\d+\.\s+/, '').trim();
        continue;
    }

    // Check if it's a new Mode (e.g., "Router Mode (PPPoE)", "Bridge Mode", "การตั้งค่า Wi-Fi (WLAN Configuration)")
    if (line.includes('Mode') || line.includes('Wi-Fi') || line.includes('สถานะ') || line.includes('ตั้งค่าอินเทอร์เน็ต')) {
        // Exclude specific lines that contain "Mode" but are just instructions
        if (!line.includes('-') && !line.includes('เลือก') && line.length < 50) {
            if (currentBrand && currentMode) {
                configs.push({ Brand: currentBrand, Mode: currentMode, Details: currentDetails.trim() });
            } else if (currentBrand && !currentMode && currentDetails) {
                configs.push({ Brand: currentBrand, Mode: 'General', Details: currentDetails.trim() });
            }
            currentMode = line.replace(':', '').trim();
            currentDetails = '';
            continue;
        }
    }

    // Otherwise, append to current details
    if (currentBrand) {
        currentDetails += line + '\n';
    }
}

// Push the last one
if (currentBrand && currentMode) {
    configs.push({ Brand: currentBrand, Mode: currentMode, Details: currentDetails.trim() });
} else if (currentBrand && !currentMode && currentDetails) {
    configs.push({ Brand: currentBrand, Mode: 'General', Details: currentDetails.trim() });
}

const jsContent = 'const fastOnuData = ' + JSON.stringify(configs, null, 4) + ';\nmodule.exports = fastOnuData;\n';
fs.writeFileSync('onu_data.js', jsContent, 'utf8');
console.log('Generated onu_data.js');
