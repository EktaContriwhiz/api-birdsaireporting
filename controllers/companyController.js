const Company = require("../models/companyModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const path = require("path");
const fs = require("fs");
const sendEmail = require("../utils/sendEmail");
const {
    copyFolderSync,
    updateManifestCompanyId,
    readManifest,
    createZipForCompany,
} = require("../utils/helper");
const Company_Departments = require("../models/companyDepartmentsModel");
const Company_Employee = require("../models/companyEmployeeModel");

exports.addCompany = catchAsync(async (req, res) => {
    try {
        const { name, email } = req.body;

        // Basic validation
        if (!name || !email) {
            return res.status(400).json({
                status: "error",
                msg: "Name, email are required",
                data: []
            });
        }

        // Check if user with same email exists already
        const existingUser = await Company.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                status: "error",
                msg: "Company already exists",
                data: []
            });
        }

        // Create company document
        let company = await Company.create({ name, email });

        // Send invite email
        await sendEmail({
            to: email,
            subject: "Welcome to Birds AI",
            html: `<p>Hello ${name},</p>
                    <p><strong>Welcome to Birds AI!</strong></p>`,
            text: `Hello ${name},\nWelcome to Birds AI!`,
        });

        // Generate ZIP for the company
        const BASE_FOLDER = path.join(__dirname, "..", "extension");
        const BIRDSAI_FOLDER = path.join(BASE_FOLDER, "birdsai_ext");
        const COMPANY_FOLDER = path.join(BASE_FOLDER, "company_ext");
        // const baseURL = `${req.protocol}://${req.get("host")}/downloads`;
        const baseURL = `${process.env.BASE_URL}/downloads`;
        const tempFoldersToDelete = [];

        const companyId = company._id.toString();
        const NEW_COMPANY_FOLDER = path.join(COMPANY_FOLDER, companyId);

        let zipUrl = null;

        // Step 1: Copy browser extension folders
        if (!fs.existsSync(NEW_COMPANY_FOLDER)) {
            fs.mkdirSync(NEW_COMPANY_FOLDER, { recursive: true });
            const browsers = ["chrome-ext", "edge-ext", "firefox-ext"];
            for (const browser of browsers) {
                const src = path.join(BIRDSAI_FOLDER, browser);
                const dest = path.join(NEW_COMPANY_FOLDER, browser);

                if (fs.existsSync(src)) {
                    await copyFolderSync(src, dest);
                    await updateManifestCompanyId(dest, companyId);
                }
            }
        }

        // Step 2: Read build folders for this company
        const buildFolders = fs
            .readdirSync(NEW_COMPANY_FOLDER)
            .map((sub) => path.join(NEW_COMPANY_FOLDER, sub))
            .filter((p) => fs.statSync(p).isDirectory());

        if (buildFolders.length === 0) {
            console.log("No build folders found for company:", companyId);
            return;
        }

        const manifest = readManifest(buildFolders[0]);
        if (!manifest) {
            console.log("No valid manifest found for company:", companyId);
            return;
        }

        const { version } = manifest;

        // Step 3: Create zip
        try {
            const zipName = await createZipForCompany(
                COMPANY_FOLDER,
                companyId,
                version,
                buildFolders
            );
            zipUrl = zipName;
            tempFoldersToDelete.push(NEW_COMPANY_FOLDER);
        } catch (error) {
            console.error("Error creating zip for company:", companyId, error);
        }

        // Step 4: Delete temp folders AFTER all zips created
        for (const folder of tempFoldersToDelete) {
            if (fs.existsSync(folder)) {
                fs.rmSync(folder, { recursive: true, force: true });
            }
        }

        company = company.toObject();
        company.zipUrl = `${baseURL}/${zipUrl}`;
        company.zipVersion = version;

        // Return success message
        return res.status(201).json({
            status: "success",
            msg: "Company added successfully.",
            data: company,
        });
    } catch (error) {
        console.log(error, "--error--");
        return res.status(500).json({
            status: "error",
            msg: error,
            data: [],
        });
    }
});

exports.getCompany = catchAsync(async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                status: "error",
                msg: "ID is required",
            });
        }

        let company = await Company.findOne({ _id: id, status: 1 });

        const departments = await Company_Departments.find({
            company_id: id,
            status: "1",
        }).select("name status");

        if (company == null) {
            return res.status(400).json({
                status: "error",
                msg: "Extension is not valid. Check with your admin.",
                data: [],
            });
        }

        // Check if ZIP exists
        const COMPANY_FOLDER = path.join(
            __dirname,
            "..",
            "extension",
            "company_ext"
        );
        const zipPrefix = `${company._id.toString()}_`;
        const zipFile = fs
            .readdirSync(COMPANY_FOLDER)
            .find((file) => file.startsWith(zipPrefix) && file.endsWith(".zip"));

        // Build zip URL if it exists
        let zipUrl = null;
        if (zipFile) {
            // zipUrl = `${req.protocol}://${req.get("host")}/downloads/${zipFile}`;
            zipUrl = `${process.env.BASE_URL}/downloads/${zipFile}`;
        }

        const employeeCount = await Company_Employee.countDocuments({ company_id: id });

        company = company.toObject();
        company.zipUrl = zipUrl;
        company.departments = departments;
        company.employeeCount = employeeCount;

        console.log("Fetch compnay data:", company);

        return res.status(200).json({
            status: "success",
            msg: "Company get successfully",
            data: company,
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

exports.updateCompany = catchAsync(async (req, res, next) => {
    try {
        const id = req.params.id;

        if (!id) {
            return next(new AppError("ID is required", 400));
        }

        const company = await Company.findById(id);
        if (!company) {
            return next(new AppError("No Company found with that ID", 404));
        }

        const updateCompany = await Company.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!updateCompany) {
            return next(new AppError("No Company found with that ID", 404));
        }

        return res.status(200).json({
            status: "success",
            msg: "Company update successfully!",
            data: updateCompany,
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

exports.updateCompnayStatus = catchAsync(async (req, res, next) => {
    try {
        const id = req.params.id;
        const status = req.body.status;
        if (!id) {
            return next(new AppError("Please provide ID", 400));
        }

        const data = await Company.findById(id);
        if (!data) {
            return next(new AppError("No company found with that ID", 404));
        }

        const updatedCompany = await Company.findOneAndUpdate(
            { _id: id },
            { status: status },
            { new: true }
        );

        return res.status(200).json({
            status: "success",
            msg: "Company status updated successfully",
            data: updatedCompany,
        });
    } catch (error) {
        console.log(error, "--error--");
        return res.status(500).json({
            status: "error",
            msg: error,
            data: [],
        });
    }
});

exports.getCompanyList = catchAsync(async (req, res) => {
    try {
        const {
            page = 1,
            count = 25,
            sortby = "created_at",
            sort_order,
            search,
            status,
            extension,
        } = req.query;

        const pageInt = parseInt(page);
        const countInt = parseInt(count);
        let andConditions = [];

        // Search filter
        if (search) {
            const searchRegex = new RegExp(search, "i");
            andConditions.push({
                $or: [
                    { name: searchRegex },
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
            andConditions.push({ [extField]: 1 });
        } else if (extension === "null") {
            andConditions.push({
                $or: [
                    { chrome_status: null },
                    { edge_status: null },
                    { mozilla_status: null },
                ],
            });
        }

        let query = {};
        if (andConditions.length > 0) {
            query.$and = andConditions;
        }

        // Get Last 30 Days for AI tracking lookup
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);

        // Total count for pagination meta
        const total = await Company.countDocuments(query);

        let companiesWithCounts = [];

        // Define sorting conditions for created_at or updated_at sorting
        let sortConditions = {};
        if (sortby === "created_at") {
            sortConditions = { created_at: -1, updated_at: -1, name: 1 };
        } else if (sortby === "updated_at") {
            sortConditions = { updated_at: -1, created_at: -1, name: 1 };
        } else if (sortby !== "name") {
            // Default fallback
            sortConditions = { created_at: -1, updated_at: -1, name: 1 };
        }

        if (sortby === "name") {
            companiesWithCounts = await Company.aggregate([
                { $match: query },
                {
                    $lookup: {
                        from: "company_employees",
                        let: { companyId: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: [
                                            { $toObjectId: "$company_id" },
                                            "$$companyId"
                                        ]
                                    }
                                }
                            }
                        ],
                        as: "employees"
                    }
                },
                {
                    $addFields: {
                        employeeCount: { $size: "$employees" }
                    }
                },
                {
                    $lookup: {
                        from: "ai_trackings",
                        let: { companyId: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$company_id", "$$companyId"] },
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
                        aiUsageCount: {
                            $cond: {
                                if: { $gt: [{ $size: "$aiUsage" }, 0] },
                                then: { $arrayElemAt: ["$aiUsage.usageCount", 0] },
                                else: 0
                            }
                        }
                    }
                },
                {
                    $project: {
                        employees: 0,
                        aiUsage: 0
                    }
                }
            ]);

            // Sort by name 
            const sortOrder = (sort_order || "ASC").toUpperCase();
            companiesWithCounts = companiesWithCounts.sort((a, b) => {
                return sortOrder === "DESC"
                    ? b.name.localeCompare(a.name)
                    : a.name.localeCompare(b.name);
            });

            // Manual pagination after sorting
            const startIndex = (pageInt - 1) * countInt;
            const endIndex = startIndex + countInt;
            companiesWithCounts = companiesWithCounts.slice(startIndex, endIndex);
        } else {
            // For other sorts, use MongoDB's $sort + pagination
            companiesWithCounts = await Company.aggregate([
                { $match: query },
                { $sort: sortConditions },
                { $skip: (pageInt - 1) * countInt },
                { $limit: countInt },
                {
                    $lookup: {
                        from: "company_employees",
                        let: { companyId: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: [
                                            { $toObjectId: "$company_id" },
                                            "$$companyId"
                                        ]
                                    }
                                }
                            }
                        ],
                        as: "employees"
                    }
                },
                {
                    $addFields: {
                        employeeCount: { $size: "$employees" }
                    }
                },
                {
                    $lookup: {
                        from: "ai_trackings",
                        let: { companyId: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$company_id", "$$companyId"] },
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
                        aiUsageCount: {
                            $cond: {
                                if: { $gt: [{ $size: "$aiUsage" }, 0] },
                                then: { $arrayElemAt: ["$aiUsage.usageCount", 0] },
                                else: 0
                            }
                        }
                    }
                },
                {
                    $project: {
                        employees: 0,
                        aiUsage: 0
                    }
                }
            ]);
        }

        // Populate departments, zipUrl, employeeCount for each company
        companiesWithCounts = await Promise.all(
            companiesWithCounts.map(async (company) => {
                const companyId = company._id.toString();

                const departments = await Company_Departments.find({
                    company_id: companyId,
                    status: "1",
                }).select("name status");

                // ZIP file logic
                const COMPANY_FOLDER = path.join(
                    __dirname,
                    "..",
                    "extension",
                    "company_ext"
                );
                const zipPrefix = `${companyId}_`;
                const zipFile = fs
                    .readdirSync(COMPANY_FOLDER)
                    .find(
                        (file) => file.startsWith(zipPrefix) && file.endsWith(".zip")
                    );

                let zipUrl = null;
                if (zipFile) {
                    // zipUrl = `${req.protocol}://${req.get("host")}/downloads/${zipFile}`;
                    zipUrl = `${process.env.BASE_URL}/downloads/${zipFile}`;
                }

                const employeeCount = await Company_Employee.countDocuments({
                    company_id: companyId,
                });

                const version = zipUrl?.split('_')?.pop()?.replace('.zip', '');

                company.zipUrl = zipUrl;
                company.departments = departments;
                company.employeeCount = employeeCount;
                company.zipVersion = version
                return company;
            })
        );

        return res.status(200).json({
            status: "success",
            msg: "Company admin fetched successfully",
            meta: {
                total: total,
                page: pageInt,
                count: countInt,
                totalPages: Math.ceil(total / countInt),
            },
            data: companiesWithCounts,
        });
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({
            status: "error",
            msg: error.message || error,
            data: [],
        });
    }
});

exports.getCompanyDetails = catchAsync(async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({
                status: "error",
                msg: "Please provide me ID!"
            })
        }

        let company = await Company.findOne({ _id: id, status: 1 });

        if (!company) {
            return res.status(200).json({
                status: "success",
                msg: "No data found",
                data: []
            })
        }

        const departments = await Company_Departments.find({
            company_id: id,
            status: "1",
        }).select("name status");

        if (company == null) {
            return res.status(400).json({
                status: "error",
                msg: "Extension is not valid. Check with your admin.",
                data: [],
            });
        }

        // Check if ZIP exists
        const COMPANY_FOLDER = path.join(
            __dirname,
            "..",
            "extension",
            "company_ext"
        );
        const zipPrefix = `${company._id.toString()}_`;
        const zipFile = fs
            .readdirSync(COMPANY_FOLDER)
            .find((file) => file.startsWith(zipPrefix) && file.endsWith(".zip"));

        // Build zip URL if it exists
        let zipUrl = null;
        if (zipFile) {
            // zipUrl = `${req.protocol}://${req.get("host")}/downloads/${zipFile}`;
            zipUrl = `${process.env.BASE_URL}/downloads/${zipFile}`;
        }

        const employeeCount = await Company_Employee.countDocuments({ company_id: id });

        company = company.toObject();
        company.zipUrl = zipUrl;
        company.departments = departments;
        company.employeeCount = employeeCount;

        return res.status(200).json({
            status: "success",
            msg: "Company fetched successfully",
            data: company,
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