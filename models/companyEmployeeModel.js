const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
    {
        company_id: {
            type: String,
        },
        first_name: {
            type: String,
        },
        last_name: {
            type: String,
        },
        email: {
            type: String,
        },
        department_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company_Departments',
        },
        chrome_status: {
            type: Number,
            enum: [0, 1],
            default: 0
        },
        edge_status: {
            type: Number,
            enum: [0, 1],
            default: 0
        },
        mozilla_status: {
            type: Number,
            enum: [0, 1],
            default: 0
        },
        chrome_last_login: {
            type: Date
        },
        mozilla_last_login: {
            type: Date
        },
        edge_last_login: {
            type: Date
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

employeeSchema.pre(/^find/, function (next) {
    this.populate({
        path: "department_id",
        select: ['name']
    });
    next();
});


const Company_Employee = mongoose.model('Company_Employee', employeeSchema);

module.exports = Company_Employee