const AI_Theme = require("../models/aiThemeModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const xlsx = require("xlsx");

exports.createAITheme = catchAsync(async (req, res) => {
    try {
        const theme = await AI_Theme.create(req.body);

        return res.status(201).json({
            status: "success",
            msg: "AI Theme created successfully",
            data: theme,
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

// exports.addThemesIfNotExist = async (req, res) => {
//     try {
//         if (!req.file) {
//             return res.status(400).json({
//                 status: "error",
//                 msg: "No file uploaded"
//             });
//         }

//         const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
//         let createdThemes = [];

//         if (workbook.Sheets["Themes"]) {
//             const themeRows = xlsx.utils.sheet_to_json(workbook.Sheets["Themes"]);
//             for (const row of themeRows) {
//                 if (row.Theme && row.Keywords) {
//                     const themeName = row.Theme?.trim();
//                     const keywordsStr = row.Keywords?.trim();
//                     // const keywords = row.Keywords.split(",").map((k) => k.trim());

//                     const keywords = keywordsStr?.split(",")?.map(k => k?.trim());
//                     for (const keyword of keywords) {

//                         const existing = await AI_Theme.findOne({
//                             name: themeName,
//                             keyword: keyword
//                         });

//                         console.log(existing, 'Existing Theme');

//                         if (!existing) {
//                             const newTopic = await AI_Theme.create({
//                                 name: themeName,
//                                 keyword: keyword
//                             });
//                             createdThemes.push(newTopic);
//                         }
//                     }
//                 }
//             }
//         }

//         return res.status(201).json({
//             status: "success",
//             msg: "AI Theme created successfully",
//             data: createdThemes,
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

exports.addThemesIfNotExist = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: "error",
                msg: "No file uploaded"
            });
        }

        const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
        let createdThemes = [];

        if (workbook.Sheets["Themes"]) {
            const themeRows = xlsx.utils.sheet_to_json(workbook.Sheets["Themes"]);

            const themeKeywordPairs = [];

            // Collect all pairs
            for (const row of themeRows) {
                if (row.Theme && row.Keywords) {
                    const themeName = row.Theme.trim();
                    const keywords = row.Keywords.split(",").map(k => k.trim());

                    for (const keyword of keywords) {
                        themeKeywordPairs.push({ name: themeName, keyword });
                    }
                }
            }

            if (themeKeywordPairs.length === 0) {
                return res.status(400).json({
                    status: "fail",
                    msg: "No valid Theme-Keyword pairs found in the file",
                });
            }

            // Find all existing themes in one DB query
            const existingThemes = await AI_Theme.find({
                $or: themeKeywordPairs
            }).lean();

            console.log(existingThemes, '---Exist Theme');

            // Create a Set of existing theme-keyword pairs
            const existingSet = new Set(
                existingThemes.map(t => `${t.name}|||${t.keyword}`)
            );

            // Filter new themes to insert
            const themesToInsert = themeKeywordPairs.filter(
                pair => !existingSet.has(`${pair.name}|||${pair.keyword}`)
            );

            // Insert missing themes
            if (themesToInsert.length > 0) {
                const inserted = await AI_Theme.insertMany(themesToInsert);
                createdThemes.push(...inserted);
            }

        } else {
            return res.status(400).json({
                status: "fail",
                msg: "No 'Themes' sheet found in the Excel file",
            });
        }

        return res.status(201).json({
            status: "success",
            msg: "AI Themes processed successfully",
            data: createdThemes,
        });

    } catch (error) {
        console.error("Error in addThemesIfNotExist:", error);
        return res.status(500).json({
            status: "error",
            msg: error.message,
            data: []
        });
    }
};

exports.getThemeList = catchAsync(async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = req.query.limit;
        const skip = (page - 1) * limit;

        const theme = await AI_Theme.find()
            .sort({ name: 1 })
            .skip(skip)
            .limit(limit);

        if (!theme || theme.length === 0) {
            return res.status(200).json({
                status: "success",
                msg: "data not found!",
                data: theme,
            });
        }

        const totalTheme = await AI_Theme.countDocuments();

        return res.status(200).json({
            status: "success",
            msg: "AI Theme fetched successfully",
            data: theme,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalTheme / limit),
                totalTheme,
                pageSize: parseInt(limit)
            }
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

exports.updateTheme = catchAsync(async (req, res, next) => {
    try {
        const id = req.params.id;

        if (!id) {
            return next(new AppError("Please provide me ID", 400));
        }

        const theme = await AI_Theme.findById(id);
        if (!theme) {
            return next(new AppError("No Theme found with that ID", 404));
        }

        const updateTheme = await AI_Theme.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!updateTheme) {
            return next(new AppError("No Theme found with that ID", 404));
        }

        return res.status(200).json({
            status: "success",
            msg: "Theme update successfully!",
            data: updateTheme,
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
