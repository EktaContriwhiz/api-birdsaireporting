const Company_Employee = require("../models/companyEmployeeModel");
const Employee_Extension_History = require("../models/employeeExtensionHistoryModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.getEmployeeExtensionHistory = catchAsync(async (req, res, next) => {
    try {
        const employeeId = req.params.id;
        if (!employeeId) {
            return next(new AppError("Employee ID is required", 400));
        }

        const employee = await Company_Employee.findById(employeeId)

        if (!employee) {
            return next(new AppError("Employee not found with that ID", 404));
        }

        const history = await Employee_Extension_History.find({ employee_id: employeeId })

        return res.status(200).json({
            status: "success",
            msg: "Extesntion fetched successfully",
            data: history
        })
    } catch (error) {
        console.log(error, '--error--');
        return res.status(500).json({
            status: "error",
            msg: error,
            data: []
        })
    }
})