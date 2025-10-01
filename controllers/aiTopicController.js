const AI_Theme = require("../models/aiThemeModel");
const AI_Topic = require("../models/aiTopicModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const xlsx = require("xlsx");

exports.createAITopic = catchAsync(async (req, res) => {
    try {
        const topic = await AI_Topic.create(req.body);

        return res.status(201).json({
            status: "success",
            msg: "AI Topic created successfully",
            data: topic,
        });
    } catch (error) {
        console.log(error, "--error--");
        return res.status(500).json({
            status: "error",
            msg: error,
        });
    }
});

// exports.addTopicsIfNotExist = async (req, res) => {
//     try {
//         if (!req.file) {
//             return res.status(400).json({
//                 status: "error",
//                 msg: "No file uploaded"
//             });
//         }

//         const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
//         let createdTopics = [];

//         if (workbook.Sheets["Topics"]) {
//             const topicRows = xlsx.utils.sheet_to_json(workbook.Sheets["Topics"]);
//             try {
//                 for (const row of topicRows) {
//                     if (row.Topic && row.Keywords) {
//                         const topicName = row.Topic?.trim();
//                         const keywordsStr = row.Keywords?.trim();

//                         const keywords = keywordsStr?.split(",")?.map(k => k?.trim());

//                         for (const keyword of keywords) {
//                             const existing = await AI_Topic.findOne({
//                                 name: topicName,
//                                 keyword: keyword
//                             });

//                             console.log(existing, 'Existing topic');

//                             if (!existing) {
//                                 const newTopic = await AI_Topic.create({
//                                     name: topicName,
//                                     keyword: keyword
//                                 });
//                                 createdTopics.push(newTopic);
//                             }
//                         }
//                     }
//                 }
//             } catch (rowError) {
//                 console.error("Error in row:", rowError);
//             }
//         }

//         if (res.headersSent) return;

//         return res.status(201).json({
//             status: "success",
//             msg: "AI Topic created successfully",
//             data: createdTopics,
//         });

//     } catch (error) {
//         console.error("Error in addTopicsIfNotExist:", error);
//         return res.status(500).json({
//             status: "error",
//             msg: error.message,
//             data: []
//         });
//     }
// };


exports.addTopicsIfNotExist = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: "error",
                msg: "No file uploaded",
            });
        }

        const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
        let createdTopics = [];

        if (workbook.Sheets["Topics"]) {
            const topicRows = xlsx.utils.sheet_to_json(workbook.Sheets["Topics"]);

            // Collect all topic-keyword pairs from Excel
            const topicKeywordPairs = [];

            for (const row of topicRows) {
                if (row.Topic && row.Keywords) {
                    const topicName = row.Topic.trim();
                    const keywords = row.Keywords.split(",").map(k => k.trim());

                    for (const keyword of keywords) {
                        topicKeywordPairs.push({ name: topicName, keyword });
                    }
                }
            }

            if (topicKeywordPairs.length === 0) {
                return res.status(400).json({
                    status: "fail",
                    msg: "No valid topic-keyword pairs found in the file",
                });
            }

            // Find existing topics matching any of the pairs
            const existingTopics = await AI_Topic.find({
                $or: topicKeywordPairs,
            }).lean();

            console.log(existingTopics, 'Existing topic');

            // Create a Set for quick lookup of existing pairs
            const existingSet = new Set(
                existingTopics.map(t => `${t.name}|||${t.keyword}`)
            );

            // Filter only new topics to insert
            const topicsToInsert = topicKeywordPairs.filter(
                pair => !existingSet.has(`${pair.name}|||${pair.keyword}`)
            );

            // Bulk insert new topics
            if (topicsToInsert.length > 0) {
                const inserted = await AI_Topic.insertMany(topicsToInsert);
                createdTopics.push(...inserted);
            }
        } else {
            return res.status(400).json({
                status: "fail",
                msg: "No 'Topics' sheet found in the Excel file",
            });
        }

        return res.status(201).json({
            status: "success",
            msg: "AI Topics processed successfully",
            data: createdTopics,
        });

    } catch (error) {
        console.error("Error in addTopicsIfNotExist:", error);
        return res.status(500).json({
            status: "error",
            msg: error.message,
            data: [],
        });
    }
};


exports.getTopicList = catchAsync(async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = req.query.limit;
        const skip = (page - 1) * limit;

        const list = await AI_Topic.find()
            .sort({ name: 1 })
            .skip(skip)
            .limit(limit);

        if (!list || list.length === 0) {
            return res.status(200).json({
                status: "success",
                msg: "data not found!",
                data: list,
            });
        }
        const totalTopic = await AI_Topic.countDocuments();

        return res.status(200).json({
            status: "success",
            msg: "Topic fecthed successfully",
            data: list,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalTopic / limit),
                totalTopic,
                pageSize: parseInt(limit)
            }
        });
    } catch (error) {
        console.log(error, "--error--");
        return res.status(500).json({
            status: "error",
            msg: error,
        });
    }
});

exports.updateTopic = catchAsync(async (req, res, next) => {
    try {
        const id = req.params.id;

        if (!id) {
            return next(new AppError("ID is required", 400));
        }

        const findTopic = await AI_Topic.findById(id);
        if (!findTopic) {
            return next(new AppError("No Topic found with that ID", 404));
        }

        const topic = await AI_Topic.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!topic) {
            return next(new AppError("No Topic found with that ID", 404));
        }

        return res.status(200).json({
            status: "success",
            msg: "Topic update successfully!",
            data: topic,
        });
    } catch (error) {
        console.log(error, "--error--");
        return res.status(500).json({
            status: "error",
            msg: error,
        });
    }
});


// exports.addTopicAndTheme = catchAsync(async (req, res) => {
//     try {
//         if (!req.file) {
//             return res.status(400).json({ status: "error", msg: "No file uploaded" });
//         }

//         // Read Excel buffer
//         const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
//         const sheet = workbook.Sheets[workbook.SheetNames[0]];
//         const rows = xlsx.utils.sheet_to_json(sheet);

//         let createdThemes = [];
//         let createdTopics = [];

//         for (const row of rows) {
//             // Insert Theme
//             if (row.Theme) {
//                 const theme = await AI_Theme.create({ name: row.Theme });
//                 createdThemes.push(theme);
//             }

//             // Insert Topic (with multiple keywords)
//             if (row.Topic && row.Keywords) {
//                 const keywords = row.Keywords.split(",").map((k) => k.trim());
//                 for (const keyword of keywords) {
//                     const topic = await AI_Topic.create({ name: row.Topic, keyword });
//                     createdTopics.push(topic);
//                 }
//             }
//         }

//         res.json({
//             status: "success",
//             msg: "File uploaded and data inserted successfully",
//             themes: createdThemes.length,
//             topics: createdTopics.length,
//         });
//     } catch (error) {
//         res.status(500).json({ status: "error", msg: error.message });
//     }
// });

// exports.addTopicAndTheme = async (req, res) => {
//     try {
//         if (!req.file) {
//             return res.status(400).json({ status: "error", msg: "No file uploaded" });
//         }

//         // Read Excel buffer
//         const workbook = xlsx.read(req.file.buffer, { type: "buffer" });

//         // let createdThemes = [];
//         let createdTopics = [];

//         // --- Process Themes sheet ---
//         // if (workbook.Sheets["Themes"]) {
//         //     const themeRows = xlsx.utils.sheet_to_json(workbook.Sheets["Themes"]);
//         //     for (const row of themeRows) {
//         //         if (row.Theme && row.Keywords) {
//         //             const keywords = row.Keywords.split(",").map((k) => k.trim());
//         //             for (const keyword of keywords) {
//         //                 // const theme = await AI_Theme.create({ name: row.Theme });
//         //                 const theme = await AI_Theme.create({ name: row.Theme, keyword });
//         //                 createdThemes.push(theme);
//         //             }
//         //         }
//         //     }
//         // }

//         // --- Process Topics sheet ---
//         if (workbook.Sheets["Topics"]) {
//             const topicRows = xlsx.utils.sheet_to_json(workbook.Sheets["Topics"]);
//             for (const row of topicRows) {
//                 if (row.Topic && row.Keywords) {
//                     const keywords = row.Keywords.split(",").map((k) => k.trim());
//                     for (const keyword of keywords) {
//                         // Check if topic with the same name and keyword already exists
//                         const existing = await AI_Topic.findOne({
//                             where: { name: row.Topic, keyword }
//                         });

//                         if (!existing) {
//                             const newTopic = await AI_Topic.create({ name: row.Topic, keyword });
//                             createdTopics.push(newTopic);
//                         }

//                         // const topic = await AI_Topic.create({ name: row.Topic, keyword });
//                         // createdTopics.push(topic);
//                     }
//                 }
//             }
//         }

//         return res.json({
//             status: "success",
//             msg: "File uploaded and data inserted successfully",
//             themes: createdThemes.length,
//             topics: createdTopics.length,
//         });
//     } catch (error) {
//         return res.status(500).json({ status: "error", msg: error.message });
//     }
// };
