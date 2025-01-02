const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
    filename: String,
    path: String,
    size: Number,
    mimetype: String,
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

const subArchiveSchema = new mongoose.Schema({
    parentArchive: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Archive',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    images: [imageSchema],
    createdBy: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('SubArchive', subArchiveSchema); 