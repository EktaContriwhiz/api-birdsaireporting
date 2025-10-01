const mongoose = require("mongoose");

const companyEmployeeInvitesSchema = new mongoose.Schema(
    {
        company_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
        },
        email: {
            type: String
        },
        count: {
            type: Number
        },
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
)

const Company_Employee_Invites = mongoose.model('Company_Employee_Invites', companyEmployeeInvitesSchema);

module.exports = Company_Employee_Invites