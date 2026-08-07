const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    title: { type: String, required: true },
    subtitle: { type: String, required: false },
    phone: { type: String, required: true },
    extension: { type: String, required: false }
});

const phonebookGroupSchema = new mongoose.Schema({
    title: { type: String, required: true },
    icon: { type: String, required: false },
    color: { type: String, required: false },
    bgColor: { type: String, required: false },
    contacts: { type: [contactSchema], default: [] }
}, {
    timestamps: true
});

module.exports = mongoose.model('PhonebookGroup', phonebookGroupSchema);
