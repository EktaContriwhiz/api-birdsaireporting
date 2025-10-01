const mongoose = require('mongoose');

const aithemeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
        },
        keyword: {
            type: String,
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

const AI_Theme = mongoose.model("AI_Theme", aithemeSchema)

module.exports = AI_Theme
