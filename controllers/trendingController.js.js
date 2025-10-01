const { default: mongoose } = require("mongoose");
const AI_Tracking = require("../models/aiTrackingModel");
const catchAsync = require("../utils/catchAsync");
const Company = require("../models/companyModel");
const Company_Employee = require("../models/companyEmployeeModel");
const AI_Platform = require("../models/aiPlatformModel");
const moment = require('moment');

// Get Trending Topic
exports.getTrendingTopic = catchAsync(async (req, res) => {
    try {
        const { startDate, endDate, company_id, ai_name } = req.query;

        const matchStage = {};
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setDate(end.getDate() + 1);
            matchStage.created_at = { $gte: start, $lt: end };
        }
        if (company_id) {
            matchStage.company_id = new mongoose.Types.ObjectId(company_id);
        }

        let pipeline = [
            { $match: matchStage },
            {
                $lookup: {
                    from: "ai_platforms",
                    localField: "ai_platform_id",
                    foreignField: "_id",
                    as: "platformDoc",
                },
            },
            { $unwind: "$platformDoc" },
            ...(ai_name
                ? [
                    {
                        $match: {
                            "platformDoc.domain_name": { $regex: ai_name, $options: "i" }
                        },
                    },
                ]
                : []),
            {
                $addFields: {
                    topicIds: {
                        $cond: [
                            { $gt: [{ $size: { $ifNull: ["$ai_topic_id", []] } }, 0] },
                            "$ai_topic_id",
                            [null],
                        ],
                    },
                },
            },
            { $unwind: "$topicIds" },
            {
                $group: {
                    _id: {
                        topic: "$topicIds",
                        company: "$company_id",
                        ...(ai_name ? { platform: "$ai_platform_id" } : {}),
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: "ai_topics",
                    localField: "_id.topic",
                    foreignField: "_id",
                    as: "topicDoc",
                },
            },
            {
                $project: {
                    _id: 0,
                    company_id: "$_id.company",
                    // ai_platform_id: ai_name ? "$_id.platform" : null,
                    count: 1,
                    keyword: {
                        $cond: [
                            { $eq: ["$_id.topic", null] },
                            "Other",
                            {
                                $ifNull: [
                                    { $arrayElemAt: ["$topicDoc.keyword", 0] },
                                    "Unknown",
                                ],
                            },
                        ],
                    },
                },
            },
            {
                $addFields: {
                    _sortOtherFirst: { $cond: [{ $eq: ["$keyword", "Other"] }, 0, 1] },
                },
            },
            { $sort: { _sortOtherFirst: 1, count: -1 } },
            { $project: { _sortOtherFirst: 0 } },
        ];

        // Top 10 only when platform is filtered
        if (ai_name) {
            pipeline.push({ $limit: 10 });
        }

        if (!company_id) {
            pipeline.push({
                $group: {
                    _id: "$keyword",
                    count: { $sum: "$count" },
                },
            });

            pipeline.push({
                $project: {
                    keyword: "$_id",
                    count: 1,
                    _id: 0
                }
            });

            pipeline.push({
                $addFields: {
                    _sortOtherFirst: { $cond: [{ $eq: ["$keyword", "Other"] }, 0, 1] },
                }
            });

            pipeline.push({ $sort: { _sortOtherFirst: 1, count: -1 } });
            pipeline.push({ $project: { _sortOtherFirst: 0 } });
        }
        const trending = await AI_Tracking.aggregate(pipeline);

        return res.status(200).json({
            status: "success",
            msg: ai_name ? "Get Top 10 Trending Topics for AI Platform" : "Get Trending Topics successfully",
            data: trending,
        });
    } catch (error) {
        console.error("Trending Error:", error);
        return res.status(500).json({
            status: "error",
            msg: error?.message || "Something went wrong",
            data: [],
        });
    }
});

// Get Trending Theme
exports.getTrendingTheme = catchAsync(async (req, res, next) => {
    try {
        const { startDate, endDate, company_id, ai_name } = req.query;

        let start, end;
        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
            end.setDate(end.getDate() + 1);
        }

        const matchStage = {};
        if (start && end) {
            matchStage.created_at = { $gte: start, $lte: end };
        }
        if (company_id) {
            matchStage.company_id = new mongoose.Types.ObjectId(company_id);
        }

        let pipeline = [
            { $match: matchStage },
            {
                $lookup: {
                    from: "ai_platforms",
                    localField: "ai_platform_id",
                    foreignField: "_id",
                    as: "platformDoc",
                },
            },
            { $unwind: "$platformDoc" },
            ...(ai_name
                ? [
                    {
                        $match: {
                            $or: [
                                { "platformDoc.domain_name": { $regex: ai_name, $options: "i" } },
                                { "platformDoc.platform_name": { $regex: ai_name, $options: "i" } }
                            ]
                        },
                    },
                ]
                : []),
            {
                $addFields: {
                    themeIds: {
                        $cond: [
                            { $gt: [{ $size: { $ifNull: ["$ai_theme_id", []] } }, 0] },
                            "$ai_theme_id",
                            [null],
                        ],
                    },
                },
            },
            { $unwind: "$themeIds" },
            {
                $group: {
                    _id: {
                        theme: "$themeIds",
                        company: "$company_id",
                        ...(ai_name ? { platform: "$ai_platform_id" } : {}),
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
                    company_id: "$_id.company",
                    count: 1,
                    keyword: {
                        $cond: [
                            { $eq: ["$_id.theme", null] },
                            "Other",
                            {
                                $ifNull: [
                                    { $arrayElemAt: ["$themeDoc.keyword", 0] },
                                    "Unknown",
                                ],
                            },
                        ],
                    },
                },
            },
            {
                $addFields: {
                    _sortOtherFirst: { $cond: [{ $eq: ["$keyword", "Other"] }, 0, 1] },
                },
            },
            { $sort: { _sortOtherFirst: 1, count: -1 } },
            { $project: { _sortOtherFirst: 0 } },
        ];

        // Top 10 only when platform is filtered
        if (ai_name) {
            pipeline.push({ $limit: 10 });
        }

        if (!company_id) {
            pipeline.push({
                $group: {
                    _id: "$keyword",
                    count: { $sum: "$count" },
                },
            });

            pipeline.push({
                $project: {
                    keyword: "$_id",
                    count: 1,
                    _id: 0
                }
            });

            pipeline.push({
                $addFields: {
                    _sortOtherFirst: { $cond: [{ $eq: ["$keyword", "Other"] }, 0, 1] },
                }
            });

            pipeline.push({ $sort: { _sortOtherFirst: 1, count: -1 } });
            pipeline.push({ $project: { _sortOtherFirst: 0 } });
        }

        const trending = await AI_Tracking.aggregate(pipeline);

        return res.status(200).json({
            status: "success",
            msg: ai_name
                ? "Get Top 10 Trending Themes for AI Platform"
                : "Get Trending Themes successfully",
            data: trending,
        });
    } catch (error) {
        console.error("Trending Error:", error);
        res.status(500).json({
            status: "error",
            msg: error?.message || "Something went wrong",
            data: [],
        });
    }
});


// Get Most Active Platforms
exports.getMostActivePlatforms = catchAsync(async (req, res) => {
    try {
        let { startDate, endDate, company_id } = req.query;

        let matchStage = {};

        if (startDate && endDate) {
            let start = new Date(startDate);
            let end = new Date(endDate);
            end.setDate(end.getDate() + 1);

            matchStage.created_at = { $gte: start, $lt: end };
        }

        const pipeline = [
            {
                $lookup: {
                    from: "company_employees",
                    localField: "employee_id",
                    foreignField: "_id",
                    as: "employee",
                },
            },
            { $unwind: "$employee" },
        ];

        if (matchStage.created_at) {
            pipeline.push({ $match: { created_at: matchStage.created_at } });
        }

        if (company_id) {
            pipeline.push({
                $match: { company_id: new mongoose.Types.ObjectId(company_id) },
            });
        }

        pipeline.push(
            {
                $group: {
                    _id: {
                        platform: "$ai_platform_id",
                        company: "$company_id",
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: "ai_platforms",
                    localField: "_id.platform",
                    foreignField: "_id",
                    as: "platform",
                },
            },
            { $unwind: "$platform" },
            {
                $project: {
                    _id: 0,
                    company_id: "$_id.company",
                    platform_id: "$platform._id",
                    platform_name: "$platform.domain_name",
                    usage_count: "$count",
                },
            },
            { $sort: { usage_count: -1 } }
        );

        const result = await AI_Tracking.aggregate(pipeline);

        return res.status(200).json({
            status: "success",
            msg: "Get Active Platform List Successfully!",
            data: result,
        });
    } catch (err) {
        console.error(err, "--err--");
        return res.status(500).json({
            status: "error",
            msg: err,
            data: [],
        });
    }
});

// Get Employee Platform Activity
exports.getEmployeePlatformActivity = catchAsync(async (req, res) => {
    try {
        let { startDate, endDate, company_id, employee_id } = req.query;
        let matchStage = {};

        if (startDate && endDate) {
            let start = new Date(startDate);
            let end = new Date(endDate);
            end.setDate(end.getDate() + 1);

            matchStage.created_at = { $gte: start, $lt: end };
        }

        if (company_id) {
            matchStage["company_id"] = new mongoose.Types.ObjectId(company_id);
        }

        if (employee_id) {
            matchStage["employee._id"] = new mongoose.Types.ObjectId(employee_id);
        }

        const result = await AI_Tracking.aggregate([
            {
                $lookup: {
                    from: "company_employees",
                    localField: "employee_id",
                    foreignField: "_id",
                    as: "employee",
                },
            },
            { $unwind: "$employee" },
            {
                $lookup: {
                    from: "ai_platforms",
                    localField: "ai_platform_id",
                    foreignField: "_id",
                    as: "platform",
                },
            },
            { $unwind: "$platform" },
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        company_id: "$company_id",
                        employee_id: "$employee._id",
                        employee_name: "$employee.name",
                        platform_name: "$platform.domain_name",
                    },
                    usage_count: { $sum: 1 },
                },
            },
            {
                $group: {
                    _id: {
                        company_id: "$_id.company_id",
                        employee_id: "$_id.employee_id",
                        employee_name: "$_id.employee_name",
                    },
                    platforms: {
                        $push: {
                            platform: "$_id.platform_name",
                            count: "$usage_count",
                        },
                    },
                    total_usage: { $sum: "$usage_count" },
                },
            },
            {
                $project: {
                    _id: 0,
                    company_id: "$_id.company_id",
                    employee_id: "$_id.employee_id",
                    employee_name: "$_id.employee_name",
                    total_usage: 1,
                    platforms: 1,
                },
            },
            { $sort: { total_usage: -1 } },
        ]);

        return res.status(200).json({
            status: "success",
            msg: "List Fetch Successfully!",
            data: result,
        });
    } catch (err) {
        console.error(err, "--err");
        return res.status(500).json({
            status: "error",
            msg: err || "Something went wrong",
            data: [],
        });
    }
});

// Get Top Usage By Company
exports.getTopUsageByCompany = catchAsync(async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;

        const matchStage = {};

        if (startDate && endDate) {
            matchStage.created_at = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        const usage = await AI_Tracking.aggregate([
            { $match: matchStage },
            {
                $lookup: {
                    from: "companies",
                    localField: "company_id",
                    foreignField: "_id",
                    as: "company"
                }
            },
            { $unwind: "$company" },
            {
                $lookup: {
                    from: "ai_platforms",
                    localField: "ai_platform_id",
                    foreignField: "_id",
                    as: "platform"
                }
            },
            { $unwind: "$platform" },
            {
                $group: {
                    _id: { company: "$company._id", platform: "$platform.domain_name" },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: "$_id.company",
                    company_name: { $first: "$company._id" },
                    usage: {
                        $push: {
                            platform: "$_id.platform",
                            count: "$count"
                        }
                    },
                    totalUsage: { $sum: "$count" }
                }
            },
            {
                $lookup: {
                    from: "companies",
                    localField: "_id",
                    foreignField: "_id",
                    as: "companyDoc"
                }
            },
            { $unwind: "$companyDoc" },
            {
                $project: {
                    _id: 0,
                    company_id: "$_id",
                    company_name: "$companyDoc.name",
                    usage: 1,
                    totalUsage: 1
                }
            },
            { $sort: { totalUsage: -1 } }
        ]);

        return res.status(200).json({
            status: "success",
            msg: "Top AI usage per company fetched successfully",
            data: usage
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: "error",
            msg: error.message,
            data: []
        });
    }
});

// List Trending Company By per moanth forWeek
// exports.listTrendingCompanyByWeek = catchAsync(async (req, res, next) => {
//     try {
//         const today = new Date();
//         const thirtyDaysAgo = new Date();
//         thirtyDaysAgo.setDate(today.getDate() - 30);

//         const WEEK_IN_MS = 1000 * 60 * 60 * 24 * 7;

//         const result = await Company.aggregate([
//             {
//                 $match: {
//                     created_at: {
//                         $gte: thirtyDaysAgo,
//                         $lte: today
//                     }
//                 }
//             },
//             {
//                 $addFields: {
//                     weekIndex: {
//                         $floor: {
//                             $divide: [
//                                 { $subtract: ["$created_at", thirtyDaysAgo] },
//                                 WEEK_IN_MS
//                             ]
//                         }
//                     }
//                 }
//             },
//             {
//                 $group: {
//                     _id: "$weekIndex",
//                     count: { $sum: 1 }
//                 }
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     count: 1,
//                     weekStart: {
//                         $toDate: {
//                             $add: [
//                                 thirtyDaysAgo.getTime(),
//                                 { $multiply: ["$_id", WEEK_IN_MS] }
//                             ]
//                         }
//                     },
//                     weekEnd: {
//                         $toDate: {
//                             $add: [
//                                 thirtyDaysAgo.getTime(),
//                                 { $multiply: [{ $add: ["$_id", 1] }, WEEK_IN_MS] }
//                             ]
//                         }
//                     }
//                 }
//             },
//             {
//                 $match: {
//                     weekEnd: { $lte: today }
//                 }
//             },
//             {
//                 $sort: { weekStart: 1 }
//             }
//         ]);

//         const count = await Company.countDocuments();

//         return res.status(200).json({
//             status: "success",
//             msg: "Companies grouped by week",
//             total: count,
//             data: result
//         });

//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({
//             status: "error",
//             msg: error.message,
//             data: []
//         });
//     }
// });

// // Get Trending User By per moanth forWeek
// exports.listTrendingUserByWeek = catchAsync(async (req, res, next) => {
//     try {
//         const today = new Date();
//         const thirtyDaysAgo = new Date();
//         thirtyDaysAgo.setDate(today.getDate() - 30);

//         const WEEK_IN_MS = 1000 * 60 * 60 * 24 * 7;

//         const result = await Company_Employee.aggregate([
//             {
//                 $match: {
//                     created_at: {
//                         $gte: thirtyDaysAgo,
//                         $lte: today
//                     }
//                 }
//             },
//             {
//                 $addFields: {
//                     weekIndex: {
//                         $floor: {
//                             $divide: [
//                                 { $subtract: ["$created_at", thirtyDaysAgo] },
//                                 WEEK_IN_MS
//                             ]
//                         }
//                     }
//                 }
//             },
//             {
//                 $group: {
//                     _id: "$weekIndex",
//                     count: { $sum: 1 }
//                 }
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     count: 1,
//                     weekStart: {
//                         $toDate: {
//                             $add: [
//                                 thirtyDaysAgo.getTime(),
//                                 { $multiply: ["$_id", WEEK_IN_MS] }
//                             ]
//                         }
//                     },
//                     weekEnd: {
//                         $toDate: {
//                             $add: [
//                                 thirtyDaysAgo.getTime(),
//                                 { $multiply: [{ $add: ["$_id", 1] }, WEEK_IN_MS] }
//                             ]
//                         }
//                     }
//                 }
//             },
//             {
//                 $match: {
//                     weekEnd: { $lte: today }
//                 }
//             },
//             {
//                 $sort: { weekStart: 1 }
//             },
//         ]);

//         const count = await Company_Employee.countDocuments()

//         return res.status(200).json({
//             status: "success",
//             msg: "Employee grouped by week",
//             total: count,
//             data: result
//         });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({
//             status: "error",
//             msg: error.message,
//             data: []
//         });
//     }
// });

// exports.listTrendingAIByWeek = catchAsync(async (req, res, next) => {
//     try {
//         const today = new Date(); // 1. Today
//         const thirtyDaysAgo = new Date(); // 2. 30 days ago
//         thirtyDaysAgo.setDate(today.getDate() - 30);

//         const weeks = []; // To store all weekly ranges
//         const WEEK_IN_MS = 1000 * 60 * 60 * 24 * 7;

//         let currentStart = new Date(thirtyDaysAgo);

//         // 3. Build weekly ranges until we reach today (or pass it)
//         while (currentStart < today) {
//             const currentEnd = new Date(currentStart.getTime() + WEEK_IN_MS);

//             // Only include weeks whose END is <= today
//             if (currentEnd > today) break;

//             weeks.push({
//                 weekStart: new Date(currentStart),
//                 weekEnd: new Date(currentEnd)
//             });

//             // Move to the next week
//             currentStart = currentEnd;
//         }

//         // 4. For each week, count companies created in that range
//         const weeklyData = await Promise.all(
//             weeks.map(async ({ weekStart, weekEnd }) => {
//                 const count = await AI_Platform.countDocuments({
//                     created_at: {
//                         $gte: weekStart,
//                         $lt: weekEnd
//                     }
//                 });

//                 return {
//                     weekStart,
//                     weekEnd,
//                     count
//                 };
//             })
//         );

//         // 5. Send response
//         return res.status(200).json({
//             status: "success",
//             msg: "Employee grouped by week",
//             data: weeklyData
//         });

//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({
//             status: "error",
//             msg: error.message,
//             data: []
//         });
//     }
// });

// Get Trending AI By per moanth forWeek
// exports.listTrendingAIByWeek = catchAsync(async (req, res, next) => {
//     try {
//         const today = new Date();
//         today.setHours(23, 59, 59, 999);

//         const sevenDaysAgo = new Date();
//         sevenDaysAgo.setDate(today.getDate() - 6);
//         sevenDaysAgo.setHours(0, 0, 0, 0);

//         return;

//         const WEEK_IN_MS = 1000 * 60 * 60 * 24 * 7;

//         const result = await AI_Tracking.aggregate([
//             {
//                 $match: {
//                     created_at: {
//                         $gte: thirtyDaysAgo,
//                         $lte: today
//                     }
//                 }
//             },
//             {
//                 $addFields: {
//                     weekIndex: {
//                         $floor: {
//                             $divide: [
//                                 { $subtract: ["$created_at", thirtyDaysAgo] },
//                                 WEEK_IN_MS
//                             ]
//                         }
//                     }
//                 }
//             },
//             {
//                 $group: {
//                     _id: {
//                         weekIndex: "$weekIndex",
//                         ai_platform_id: "$ai_platform_id"
//                     },
//                     count: { $sum: 1 }
//                 }
//             },
//             {
//                 $addFields: {
//                     weekStart: {
//                         $toDate: {
//                             $add: [
//                                 thirtyDaysAgo.getTime(),
//                                 { $multiply: ["$_id.weekIndex", WEEK_IN_MS] }
//                             ]
//                         }
//                     },
//                     weekEnd: {
//                         $toDate: {
//                             $add: [
//                                 thirtyDaysAgo.getTime(),
//                                 { $multiply: [{ $add: ["$_id.weekIndex", 1] }, WEEK_IN_MS] }
//                             ]
//                         }
//                     }
//                 }
//             },
//             {
//                 $match: {
//                     weekEnd: { $lte: today }
//                 }
//             },
//             {
//                 $lookup: {
//                     from: "ai_platforms",
//                     localField: "_id.ai_platform_id",
//                     foreignField: "_id",
//                     as: "ai_platform"
//                 }
//             },
//             {
//                 $unwind: {
//                     path: "$ai_platform",
//                     preserveNullAndEmptyArrays: true
//                 }
//             },
//             {
//                 $group: {
//                     _id: "$_id.weekIndex",
//                     weekStart: { $first: "$weekStart" },
//                     weekEnd: { $first: "$weekEnd" },
//                     platforms: {
//                         $push: {
//                             ai_platform_id: "$_id.ai_platform_id",
//                             name: "$ai_platform.domain_name",
//                             count: "$count",
//                         }
//                     }
//                 }
//             },
//             {
//                 $sort: {
//                     weekStart: 1
//                 }
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     weekStart: 1,
//                     weekEnd: 1,
//                     platforms: 1
//                 }
//             }
//         ]);

//         return res.status(200).json({
//             status: "success",
//             msg: "AI Platforms usage grouped by week",
//             data: result
//         });

//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({
//             status: "error",
//             msg: error.message,
//             data: []
//         });
//     }
// });

// Get Dashboard Record
exports.getDashboardRecord = catchAsync(async (req, res) => {
    try {
        // Get today's date
        const today = new Date();
        const currentWeekStart = moment(today).toDate();
        const sevenDaysAgo = moment(today).subtract(7, 'days').toDate();
        const currentWeekEnd = sevenDaysAgo;
        const previousWeekEnd = moment(currentWeekEnd).subtract(7, 'days').startOf('day').utc().toDate();

        let percentageCompany = 0.00;
        // Get First week
        const currentWeekCompanies = await Company.find({
            created_at: {
                $gte: currentWeekEnd,
                $lte: currentWeekStart
            }
        });

        // Get Last week
        const previousWeekCompanies = await Company.find({
            created_at: {
                $gte: previousWeekEnd,
                $lte: currentWeekEnd
            }
        });

        // 1. Get total company count
        const companyStats = await Company.aggregate([
            {
                $group: {
                    _id: null,
                    totalCompanies: { $sum: 1 }
                }
            }
        ]);
        const totalCompanies = companyStats[0]?.totalCompanies || 0;

        // Get counts for previous and current week
        const previousWeekCount = parseFloat(previousWeekCompanies.length);
        const currentWeekCount = parseFloat(currentWeekCompanies.length);
        // percentageCompany = (currentWeekCount / (previousWeekCount + currentWeekCount)) * 100;
        // percentageCompany = Math.min(100, Math.max(0, percentageCompany));
        // percentageCompany = percentageCompany.toFixed(2);
        if (previousWeekCount > 0) {
            percentageCompany = ((currentWeekCount - previousWeekCount) / previousWeekCount) * 100;
        }
        percentageCompany = percentageCompany.toFixed(2);

        // Get Company_Employee Table - Current Week
        const currentWeekEmployees = await Company_Employee.find({
            created_at: {
                $gte: currentWeekEnd,
                $lte: currentWeekStart
            }
        });

        // Get Company_Employee Table - Previous Week
        const previousWeekEmployees = await Company_Employee.find({
            created_at: {
                $gte: previousWeekEnd,
                $lte: currentWeekEnd
            }
        });

        // 2. Get total employees count (Company_Employee Table)
        const employeeStats = await Company_Employee.aggregate([
            {
                $group: {
                    _id: null,
                    totalEmployees: { $sum: 1 }
                }
            }
        ]);
        const totalEmployees = employeeStats[0]?.totalEmployees || 0;

        let percentageEmployee = 0.00
        const previousWeekEmployeeCount = parseFloat(previousWeekEmployees.length);
        const currentWeekEmployeeCount = parseFloat(currentWeekEmployees.length);
        // percentageEmployee = (currentWeekEmployeeCount / (previousWeekEmployeeCount + currentWeekEmployeeCount)) * 100;
        // percentageEmployee = Math.min(100, Math.max(0, percentageEmployee));
        // percentageEmployee = percentageEmployee.toFixed(2);
        if (previousWeekEmployeeCount > 0) {
            percentageEmployee = ((currentWeekEmployeeCount - previousWeekEmployeeCount) / previousWeekEmployeeCount) * 100;
        }
        percentageEmployee = percentageEmployee.toFixed(2);

        // Get AI_Tracking Table - Current Week (AI usage)
        const currentWeekAITracking = await AI_Tracking.find({
            created_at: {
                $gte: currentWeekEnd,
                $lte: currentWeekStart
            }
        });

        // Get AI_Tracking Table - Previous Week (AI usage)
        const previousWeekAITracking = await AI_Tracking.find({
            created_at: {
                $gte: previousWeekEnd,
                $lte: currentWeekEnd
            }
        });

        // 2. Get total employees count (AI_Platform Table)
        // const aiStats = await AI_Platform.aggregate([
        //     {
        //         $group: {
        //             _id: null,
        //             totalAI: { $sum: 1 }
        //         }
        //     }
        // ]);

        // Get Usages ai
        today.setHours(23, 59, 59, 999);
        sevenDaysAgo.setDate(today.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const aiStats = await AI_Tracking.aggregate([
            {
                $match: {
                    created_at: {
                        $gte: sevenDaysAgo,
                        $lte: today
                    }
                }
            },
            {
                $count: "totalAI"
            }
        ]);

        const totalAIUsage = aiStats[0]?.totalAI || 0;

        let percentagAI = 0.00
        const previousWeekAI = parseFloat(previousWeekAITracking.length);
        const currentWeekAI = parseFloat(currentWeekAITracking.length);
        // percentagAI = (currentWeekAI / (previousWeekAI + currentWeekAI)) * 100;
        // percentagAI = Math.min(100, Math.max(0, percentagAI));
        // percentagAI = percentagAI.toFixed(2);
        if (previousWeekAI > 0) {
            percentagAI = ((currentWeekAI - previousWeekAI) / previousWeekAI) * 100;
        }

        const result = {
            company: {
                count: totalCompanies,
                percentage: Number(percentageCompany),
            },
            employees: {
                count: totalEmployees,
                percentage: Number(percentageEmployee),
            },
            ai: {
                count: totalAIUsage,
                percentage: Number(percentagAI),
            }
        };

        return res.status(200).json({
            status: "success",
            msg: "list fetched successfully!",
            data: result
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: "error",
            msg: error.message,
            data: []
        });
    }
});

// Get User per week 
exports.listTrendingUserByWeek = catchAsync(async (req, res, next) => {
    try {
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const result = await Company_Employee.aggregate([
            {
                $match: {
                    created_at: {
                        $gte: sevenDaysAgo,
                        $lte: today
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$created_at" }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 } // sort by date ascending
            },
            {
                $project: {
                    _id: 0,
                    date: "$_id",
                    count: 1
                }
            }
        ]);

        return res.status(200).json({
            status: "success",
            msg: "Employee grouped by week",
            data: result
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: "error",
            msg: error.message,
            data: []
        });
    }
});

// Get Company per week 
exports.listTrendingCompanyByWeek = catchAsync(async (req, res, next) => {
    try {
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const result = await Company.aggregate([
            {
                $match: {
                    created_at: {
                        $gte: sevenDaysAgo,
                        $lte: today
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$created_at" }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 } // sort by date ascending
            },
            {
                $project: {
                    _id: 0,
                    date: "$_id",
                    count: 1
                }
            }
        ]);

        return res.status(200).json({
            status: "success",
            msg: "Companies grouped by week",
            data: result
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: "error",
            msg: error.message,
            data: []
        });
    }
});

// Get AI per week 
exports.listTrendingAIByWeek = catchAsync(async (req, res, next) => {
    try {
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 6); // Include today
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const result = await AI_Tracking.aggregate([
            {
                $match: {
                    created_at: {
                        $gte: sevenDaysAgo,
                        $lte: today
                    }
                }
            },
            {
                $group: {
                    _id: {
                        date: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$created_at"
                            }
                        },
                        ai_platform_id: "$ai_platform_id"
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "ai_platforms",
                    localField: "_id.ai_platform_id",
                    foreignField: "_id",
                    as: "platform"
                }
            },
            {
                $unwind: {
                    path: "$platform",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 0,
                    date: "$_id.date",
                    count: 1,
                    name: "$platform.domain_name"
                }
            },
            {
                $sort: {
                    date: 1,
                    name: 1
                }
            }
        ]);

        return res.status(200).json({
            status: "success",
            msg: "AI platform usage in the last 7 days",
            data: result
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: "error",
            msg: error.message,
            data: []
        });
    }
});
