const mongoose = require('mongoose');

const aiTopicSchema = new mongoose.Schema(
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

const AI_Topic = mongoose.model("AI_Topic", aiTopicSchema)

module.exports = AI_Topic
