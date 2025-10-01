const Department = require("../models/companyDepartmentsModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Company_Departments = require("../models/companyDepartmentsModel");

exports.addDepartments = catchAsync(async (req, res) => {
    try {
        const { company_id, name, status } = req.body;

        // Validate input
        if (!company_id || !Array.isArray(name) || name.length === 0) {
            return res.status(400).json({
                status: "fail",
                msg: "Invalid input. 'company_id' and non-empty 'name' array are required.",
                data: [],
            });
        }

        const departmentsToCreate = name.map((deptName) => ({
            company_id,
            name: deptName,
            status,
        }));

        const department = await Department.create(departmentsToCreate);

        return res.status(201).json({
            status: "success",
            msg: "Department created successfully",
            data: department,
        });
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({
            status: "error",
            msg: error,
            data: [],
        });
    }
});

exports.getDepartment = catchAsync(async (req, res, next) => {
    try {
        const companyId = req?.query?.id;

        if (!companyId) {
            return next(new AppError("Company ID is required", 400));
        }

        const departments = await Company_Departments.find({
            company_id: companyId,
            status: "1",
        }).select("name status");

        return res.status(200).json({
            status: "success",
            msg: "Department get successfully",
            data: departments,
        });
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({
            status: "error",
            msg: error,
            data: [],
        });
    }
});

exports.updateDepartment = catchAsync(async (req, res, next) => {
    try {
        const id = req.params.id;

        if (!id) {
            return next(new AppError("ID is required", 400));
        }

        const department = await Company_Departments.findById(id);

        if (!department) {
            return next(new AppError("Department not found", 404));
        }

        if (department.company_id.toString() !== req.body.company_id) {
            return next(new AppError("Company ID mismatch", 403));
        }

        const data = await Company_Departments.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!data) {
            return next(new AppError("Department not found", 404));
        }

        return res.status(200).json({
            status: "success",
            msg: "Department updated successfully",
            data: data,
        });

    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({
            status: "error",
            msg: error,
            data: [],
        });
    }
});
