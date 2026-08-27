const ModeTopic = require('../features/onu-configs/modeTopics.model');
const logger = require('../shared/logger');

// Bootstraps the central Mode dropdown with the topics the ONU setup page's
// icon matching already expects (see OnuSetupPage's getTopicIcon). Runs only
// once per device type: skipped once any topic already exists for it, so an
// admin's later edits/deletes are never overwritten on restart.
const DEFAULT_TOPICS = {
    ONU: [
        'เตรียมพร้อม & Login',
        'ตั้งค่า Bridge Mode',
        'ตั้งค่า Route Mode',
        'ตั้งค่า TR069 (ACS)',
        'เปิดเข้าผ่าน WAN'
    ],
    ATA: [
        'เตรียมพร้อม & Login',
        'ตั้งค่า Bridge Mode',
        'ตั้งค่า Route Mode',
        'ตั้งค่า TR069 (ACS)',
        'เปิดเข้าผ่าน WAN'
    ]
};

async function seedModeTopics() {
    for (const [deviceType, labels] of Object.entries(DEFAULT_TOPICS)) {
        const exists = await ModeTopic.exists({ DeviceType: deviceType });
        if (exists) continue;

        await ModeTopic.insertMany(
            labels.map((Label, i) => ({ Label, DeviceType: deviceType, Order: i }))
        );
        logger.info(`Seeded default Mode topics for ${deviceType}`);
    }
}

module.exports = seedModeTopics;
