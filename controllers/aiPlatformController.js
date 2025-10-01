const AI_Platform = require("../models/aiPlatformModel");
const AI_Tracking = require("../models/aiTrackingModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.createAIPlatform = catchAsync(async (req, res) => {
    try {
        // const { domain_name } = req.body;
        // let platform = await AI_Platform.findOne({ domain_name: domain_name });

        // if (platform) {
        //     // If exists, update it
        //     platform = await AI_Platform.findOneAndUpdate(
        //         { domain_name },
        //         req.body,
        //         { new: true }
        //     );

        //     return res.status(200).json({
        //         status: "success",
        //         msg: "AI Platform created successfully",
        //         data: platform
        //     });
        // } else {
        // If not exists, create a new one
        const newPlatform = await AI_Platform.create(req.body);

        return res.status(201).json({
            status: "success",
            msg: "AI Platform created successfully",
            data: newPlatform,
        });
        // }
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({
            status: "error",
            msg: error,
            data: [],
        });
    }
});

exports.getAIPlatform = catchAsync(async (req, res) => {
    try {
        const {
            domain_name,
            page = 1,
            count = 10,
            sortby = "createdAt",
            sort_order = "DESC",
        } = req.query;

        const pageInt = parseInt(page);
        const countInt = parseInt(count);
        const sortOrderVal = sort_order.toUpperCase() === "ASC" ? 1 : -1;

        let filter = { status: { $ne: 0 } };
        if (domain_name) {
            filter.domain_name = { $regex: domain_name, $options: "i" };
        }

        const total = await AI_Platform.countDocuments(filter);
        const plarforms = await AI_Platform.find(filter)
            .sort({ [sortby]: sortOrderVal })
            .skip((pageInt - 1) * countInt)
            .limit(countInt);

        console.log("Get plarforms:", plarforms);

        return res.status(201).json({
            status: "success",
            msg: "AI Plarform get successfully",
            meta: {
                total,
                page: pageInt,
                count: countInt,
                totalPages: Math.ceil(total / countInt),
            },
            data: plarforms,
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

exports.updateAIPlatform = catchAsync(async (req, res, next) => {
    try {
        const id = req.params.id;

        if (!id) {
            return next(new AppError("ID is required!", 400));
        }

        const data = await AI_Platform.findById(id);

        if (!data) {
            return next(new AppError("No data found with that ID", 404));
        }

        const updatedData = await AI_Platform.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        });

        return res.status(200).json({
            status: "success",
            msg: "Data update successfully",
            data: updatedData,
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

exports.getMostPopularAIPlatform = catchAsync(async (req, res, next) => {
    try {
        const result = await AI_Tracking.aggregate([
            {
                $group: {
                    _id: "$ai_platform_id",
                    usage_count: { $sum: 1 },
                },
            },
            {
                $sort: { usage_count: -1 },
            },
            {
                $limit: 1,
            },
            {
                $lookup: {
                    from: "ai_platforms",
                    localField: "_id",
                    foreignField: "_id",
                    as: "platform",
                },
            },
            {
                $unwind: "$platform",
            },
            {
                $project: {
                    _id: 0,
                    usage_count: 1,
                    platform_name: "$platform.domain_name",
                },
            },
        ]);

        if (result.length === 0) {
            return res.status(200).json({
                status: "success",
                msg: "No usage data found.",
                data: [],
            });
        }

        return res.status(200).json({
            status: "success",
            msg: "Most popular AI platform fetched successfully.",
            data: result[0],
        });
    } catch (error) {
        console.error(error, "--error--");
        return res.status(500).json({
            status: "error",
            msg: error,
            data: [],
        });
    }
});


exports.plarformsList = catchAsync(async (req, res, next) => {
    try {
        const list = await AI_Platform.find()

        return res.status(200).json({
            status: "success",
            msg: "AI list fetched successfully",
            data: list,
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