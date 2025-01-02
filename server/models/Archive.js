const mongoose = require('mongoose');

const archiveSchema = new mongoose.Schema({
    source: {
        type: String,
        required: true
    },
    element: {
        type: String,
        required: true,
        unique: true
    },
    customData: {
        type: Map,
        of: String
    },
    rawCustomData: {
        type: String
    },
    tags: [{
        type: String
    }],
    subArchives: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubArchive'
    }],
    createdBy: {
        type: String,
        required: true
    },
    clientIP: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Archive', archiveSchema); 