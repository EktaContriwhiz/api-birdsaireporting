const mongoose = require('mongoose');

const aiPlatformSchema = new mongoose.Schema(
    {
        domain_name: {
            type: String,
        },
        rules: {
            type: Object,
        },
        status: {
            type: Number,
            enum: [0, 1], // 0 = inactive, 1 = active
            default: 1
        }
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    },
    {
        versionKey: false
    }
);

const AI_Platform = mongoose.model("AI_Platform", aiPlatformSchema);

module.exports = AI_Platform;