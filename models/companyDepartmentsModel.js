const mongoose = require("mongoose");

const companydepartmentSchema = new mongoose.Schema({
    company_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
    },
    name: {
        type: String
    },
    status: {
        type: String
    },
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
}, {
    versionKey: false
})

const Company_Departments = mongoose.model("Company_Departments", companydepartmentSchema);

module.exports = Company_Departments;
