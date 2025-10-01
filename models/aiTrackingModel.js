const mongoose = require("mongoose")

const aiTrackingSchema = new mongoose.Schema({
    employee_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company_Employee',
    },
    company_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company"
    },
    ai_platform_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AI_Platform',
    },
    ai_question: {
        type: String,
    },
    user_session_id: {
        type: String
    },
    ai_theme_id: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AI_Theme',
    }],
    ai_topic_id: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AI_Topic',
    }],
},
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: false
        }
    },
    {
        versionKey: false
    }
);

aiTrackingSchema.pre(/^find/, function (next) {
    this.populate({
        path: "ai_theme_id",
        select: ['name', 'keyword']
    });
    this.populate({
        "path": "ai_topic_id",
        select: ['name', 'keyword']
    });
    this.populate({
        "path": "ai_platform_id",
        select: ['domain_name', 'rules', 'status']
    })
    next();
});


const AI_Tracking = mongoose.model("AI_Tracking", aiTrackingSchema)

module.exports = AI_Tracking