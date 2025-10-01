const { mongoose } = require("mongoose");
const AI_Tracking = require("../models/aiTrackingModel");
const Company_Employee = require("../models/companyEmployeeModel");
const Company = require("../models/companyModel");
const Employee_Extension_History = require("../models/employeeExtensionHistoryModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.createCompanyEmployee = catchAsync(async (req, res) => {
    try {
        let {
            company_id,
            firstName,
            lastName,
            email,
            department_id,
            chrome_status,
            edge_status,
            mozilla_status,
        } = req.body;

        console.log("Create Company Employee API", req.body);

        // Validate required fields
        if (!company_id || !firstName || !lastName || !email) {
            return res.status(400).json({ msg: "Missing required fields." });
        }

        const company = await Company.findOne({ _id: company_id, status: 1 });

        console.log("Fetch Company Data", company);

        if (company?.id !== company_id) {
            return res.status(400).json({
                status: "error",
                msg: "Extension is not valid. Check with your admin.",
                data: []
            });
        }

        const extensions = [
            { name: "chrome", status: chrome_status },
            { name: "edge", status: edge_status },
            { name: "firefox", status: mozilla_status },
        ].filter((ext) => ext.status === 1 || ext.status === "1");

        console.log("Fetch extensions Data", extensions);

        if (extensions.length !== 1) {
            return res.status(400).json({
                msg: "Send only one extension status with value 1 (chrome, edge, or firefox).",
            });
        }

        const selectedExtension = extensions[0];

        // Check if employee already exists
        let employee = await Company_Employee.findOne({
            email,
            company_id: company._id,
        });

        console.log("Fetch employee Data", employee);

        const now = new Date();
        const updatedData = {
            first_name: firstName,
            last_name: lastName,
            department_id: department_id,
            company_id: company?._id,
            chrome_status: employee?.chrome_status || 0,
            edge_status: employee?.edge_status || 0,
            mozilla_status: employee?.mozilla_status || 0,
            chrome_last_login: employee?.chrome_last_login || null,
            edge_last_login: employee?.edge_last_login || null,
            mozilla_last_login: employee?.mozilla_last_login || null,
        };

        if (selectedExtension.name === "chrome") {
            updatedData.chrome_status = 1;
            updatedData.chrome_last_login = now;
        } else if (selectedExtension.name === "edge") {
            updatedData.edge_status = 1;
            updatedData.edge_last_login = now;
        } else if (selectedExtension.name === "firefox") {
            updatedData.mozilla_status = 1;
            updatedData.mozilla_last_login = now;
        }

        let message = "";
        if (employee) {
            await Company_Employee.updateOne({ _id: employee._id }, updatedData);
            message = "Employee logged in successfully.";
        } else {
            employee = await Company_Employee.create({
                ...updatedData,
                email,
            });
            message = "Employee created successfully.";
        }

        console.log("Fetch Update employee Data", employee);

        await Employee_Extension_History.create({
            employee_id: employee._id,
            extension: selectedExtension.name,
            status: 1,
        });

        return res.status(201).json({
            status: "success",
            msg: message,
            data: {
                employee_id: employee._id,
                data: updatedData
            },
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

exports.deactivateExtension = catchAsync(async (req, res) => {
    try {
        // const { employee_id, extension } = req.body;
        const { employee_id, extension } = req.query;

        if (!employee_id || !extension) {
            return res.status(400).json({ msg: "Missing required query parameters" });
        }

        // Fetch the employee
        const employee = await Company_Employee.findById(employee_id);
        if (!employee) {
            return res.status(404).json({ msg: "Employee not found", data: [] });
        }

        const updateField = {};
        updateField[`${extension}_status`] = 0;

        // Update employee table
        await Company_Employee.updateOne({ _id: employee_id }, { $set: updateField });

        // Create extension history entry
        let history = await Employee_Extension_History.create({
            employee_id,
            extension,
            status: 0,
        });

        return res.status(200).json({
            status: "success",
            msg: "Thanks for using the extension! We hope it made your experience better.",
            // data: history,
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

exports.getCompanyEmployeeList = catchAsync(async (req, res) => {
    try {
        const {
            page = 1,
            count = 25,
            sortby = "created_at",
            sort_order = "DESC",
            search,
            status,
            extension,
            company_id
        } = req.query;

        const pageInt = parseInt(page);
        const countInt = parseInt(count);
        const sortOrderVal = sort_order.toUpperCase() === "ASC" ? 1 : -1;

        const allowedSortFields = ["created_at", "updated_at", "first_name", "email"];
        if (!allowedSortFields.includes(sortby)) {
            return res.status(400).json({
                status: "error",
                msg: `Invalid sortby field: ${sortby}`,
                data: [],
            });
        }

        const sortObj = { [sortby]: sortOrderVal };

        let andConditions = [];

        if (company_id) {
            andConditions.push({ company_id: company_id });
        }

        // Search filter
        if (search) {
            const searchRegex = new RegExp(search, "i");
            andConditions.push({
                $or: [
                    { first_name: searchRegex },
                    { last_name: searchRegex },
                    { email: searchRegex },
                ],
            });
        }

        // Status filter
        if (status !== undefined && status !== null) {
            andConditions.push({ status: parseInt(status) });
        }

        // Extension filter
        if (extension && extension !== "null") {
            const extField = `${extension.toLowerCase()}_status`;
            andConditions.push({ [extField]: 1 }); // Assuming 1 means active
        } else if (extension === "null") {
            andConditions.push({
                $or: [
                    { chrome_status: null },
                    { edge_status: null },
                    { mozilla_status: null },
                ],
            });
        }

        // let query = {};
        // if (andConditions.length > 0) {
        //     query.$and = andConditions;
        // }

        // Build query
        const query = andConditions.length > 0 ? { $and: andConditions } : {};

        // const matchStage = andConditions.length > 0 ? { $match: { $and: andConditions } } : {};

        const totalEmployees = await Company_Employee.countDocuments(query);

        // const employees = await Company_Employee.find(query)
        //     .sort(sortObj)
        //     .skip((pageInt - 1) * countInt)
        //     .limit(countInt)
        //     .lean();

        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);

        // Build aggregation pipeline
        const pipeline = [];

        if (andConditions.length > 0) {
            pipeline.push({ $match: { $and: andConditions } });
        }

        pipeline.push(
            { $sort: sortObj },
            { $skip: (pageInt - 1) * countInt },
            { $limit: countInt },
            {
                $lookup: {
                    from: "ai_trackings",
                    let: { employeeId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$employee_id", "$$employeeId"] },
                                        { $gte: ["$created_at", thirtyDaysAgo] }
                                    ]
                                }
                            }
                        },
                        {
                            $count: "usageCount"
                        }
                    ],
                    as: "aiUsage"
                }
            },
            {
                $addFields: {
                    usageCount: {
                        $cond: {
                            if: { $gt: [{ $size: "$aiUsage" }, 0] },
                            then: { $arrayElemAt: ["$aiUsage.usageCount", 0] },
                            else: 0
                        }
                    }
                }
            },
            // Convert department_id to ObjectId for lookup to work
            {
                $addFields: {
                    department_id: { $toObjectId: "$department_id" }
                }
            },
            {
                $lookup: {
                    from: "company_departments",
                    localField: "department_id",
                    foreignField: "_id",
                    as: "department"
                }
            },
            {
                $addFields: {
                    department_name: {
                        $ifNull: [{ $arrayElemAt: ["$department.name", 0] }, null]
                    }
                }
            },
            {
                $project: {
                    aiUsage: 0,
                    department: 0
                }
            }
        );

        const employees = await Company_Employee.aggregate(pipeline);

        return res.status(200).json({
            status: "success",
            msg: "Employees fetched successfully",
            meta: {
                total: totalEmployees,
                page: pageInt,
                count: countInt,
                totalPages: Math.ceil(totalEmployees / countInt),
            },
            data: employees,
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

// Get Company Employee With ID 
exports.getCompanyEmployeeWithID = catchAsync(async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const id = req.params.id

        if (!id) {
            return next(new AppError("Employee ID is required", 400));
        }

        const employee = await Company_Employee.findById(id)
        if (!employee) {
            return res.status(200).json({
                status: "success",
                msg: "No Employee found",
                data: []
            })
        }

        let matchStage = { employee_id: new mongoose.Types.ObjectId(id) };
        if (startDate && endDate) {
            matchStage.created_at = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // AI usage count
        const usage = await AI_Tracking.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$ai_platform_id",
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "ai_platforms",
                    localField: "_id",
                    foreignField: "_id",
                    as: "platform"
                }
            },
            {
                $project: {
                    count: 1,
                    ai_name: { $arrayElemAt: ["$platform.domain_name", 0] }
                }
            },
            { $sort: { count: -1 } }
        ]);

        return res.status(200).json({
            status: "success",
            msg: "Employee details with AI usage",
            data: {
                employee,
                usage
            }
        });

    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({
            status: "error",
            msg: error,
            data: [],
        });
    }
})

// Get Employee Themes
exports.getEmployeeTrendingThemes = catchAsync(async (req, res, next) => {
    try {
        const { employee_id, startDate, endDate } = req.query;

        let start, end;
        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
            end.setDate(end.getDate() + 1);
        }

        if (!employee_id) {
            return next(new AppError("Employee ID is required", 400));
        }

        const matchStage = {};
        if (start && end) {
            matchStage.created_at = { $gte: start, $lte: end };
        }

        if (employee_id) {
            matchStage.employee_id = new mongoose.Types.ObjectId(employee_id);
        }

        const trendingThemes = await AI_Tracking.aggregate([
            { $match: matchStage },

            {
                $addFields: {
                    themeIds: {
                        $cond: [
                            { $gt: [{ $size: { $ifNull: ["$ai_theme_id", []] } }, 0] },
                            "$ai_theme_id",
                            [],
                        ],
                    },
                },
            },
            { $unwind: "$themeIds" },

            {
                $group: {
                    _id: {
                        theme: "$themeIds",
                        employee: "$employee_id",
                    },
                    count: { $sum: 1 },
                },
            },

            {
                $lookup: {
                    from: "ai_themes",
                    localField: "_id.theme",
                    foreignField: "_id",
                    as: "themeDoc",
                },
            },

            {
                $project: {
                    _id: 0,
                    employee_id: "$_id.employee",
                    count: 1,
                    keyword: {
                        $ifNull: [{ $arrayElemAt: ["$themeDoc.keyword", 0] }, "Unknown"],
                    },
                },
            },

            { $sort: { count: -1 } }
        ]);

        return res.status(200).json({
            status: "success",
            msg: "Trending themes fetched successfully",
            data: trendingThemes,
        });
    } catch (error) {
        console.log("error", error);
        return res.status(500).json({
            status: "error",
            msg: error.message,
            data: [],
        });
    }
});


// Get Employee Topic
exports.getEmployeeTrendingTopic = catchAsync(async (req, res, next) => {
    try {
        const { employee_id, startDate, endDate } = req.query;

        let start, end;
        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
            end.setDate(end.getDate() + 1);
        }

        if (!employee_id) {
            return next(new AppError("Employee ID is required", 400));
        }

        const matchStage = {};
        if (start && end) {
            matchStage.created_at = { $gte: start, $lte: end };
        }
        if (employee_id) {
            matchStage.employee_id = new mongoose.Types.ObjectId(employee_id);
        }

        const trendingTopic = await AI_Tracking.aggregate([
            { $match: matchStage },
            {
                $addFields: {
                    topicIds: {
                        $cond: [
                            { $gt: [{ $size: { $ifNull: ["$ai_topic_id", []] } }, 0] },
                            "$ai_topic_id",
                            [],
                        ],
                    },
                },
            },
            { $unwind: "$topicIds" },
            {
                $group: {
                    _id: {
                        topic: "$topicIds",
                        employee: "$employee_id",
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: "ai_topics", // ⚠️ collection ka exact naam check karna (AI_Topic ka pluralized)
                    localField: "_id.topic",
                    foreignField: "_id",
                    as: "topicDoc",
                },
            },
            {
                $project: {
                    _id: 0,
                    employee_id: "$_id.employee",
                    count: 1,
                    // topic_id: "$_id.topic",
                    // topic_name: { $ifNull: [{ $arrayElemAt: ["$topicDoc.name", 0] }, "Unknown"] },
                    keyword: { $ifNull: [{ $arrayElemAt: ["$topicDoc.keyword", 0] }, "Unknown"] },
                },
            },
            { $sort: { count: -1 } }
        ]);

        return res.status(200).json({
            status: "success",
            msg: "Trending topics fetched successfully",
            data: trendingTopic,
        });
    } catch (error) {
        console.log("error", error);
        return res.status(500).json({
            status: "error",
            msg: error.message,
            data: [],
        });
    }
});

