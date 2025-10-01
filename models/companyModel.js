const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    name: {
        type: String,
    },
    email: {
        type: String,
    },
    status: {
        type: Number,
        enum: [0, 1],
        default: 1
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
);

const Company = mongoose.model("Company", companySchema);

module.exports = Company;