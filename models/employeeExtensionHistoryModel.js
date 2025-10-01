const mongoose = require('mongoose');

const employeeExtensionHistorySchema = new mongoose.Schema(
    {
        employee_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company_Employee',
        },
        extension: {
            type: String,
            enum: ['chrome', 'edge', 'firefox'],
        },
        status: {
            type: Number,
            enum: [0, 1],
        }
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

const Employee_Extension_History = mongoose.model('Employee_Extension_History', employeeExtensionHistorySchema);

module.exports = Employee_Extension_History 