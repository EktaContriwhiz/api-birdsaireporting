const catchAsync = require("../utils/catchAsync");
const AI_Topic = require("../models/aiTopicModel");
const AI_Theme = require("../models/aiThemeModel");
const AI_Tracking = require("../models/aiTrackingModel");
const { getMatchingIds } = require("../utils/helper");

// exports.trackAiQuestion = catchAsync(async (req, res) => {
//     try {
//         const { employee_id, ai_platform_id, ai_question, user_session_id, company_id } = req.body;
//         console.log("Track Ai Question", req.body);

//         if (!employee_id || !ai_platform_id || !ai_question) {
//             return res.status(400).json({ msg: 'Missing required fields.' });
//         }

//         const lowerCasedQuestion = ai_question.toLowerCase();
//         const matchedTopicIds = await AI_Topic.distinct('_id', {
//             $expr: {
//                 $regexMatch: {
//                     input: lowerCasedQuestion,
//                     regex: { $concat: ["\\b", { $toLower: "$keyword" }, "\\b"] }
//                 }
//             }
//         });

//         const matchedThemeIds = await AI_Theme.distinct('_id', {
//             $expr: {
//                 $regexMatch: {
//                     input: lowerCasedQuestion,
//                     regex: { $concat: ["\\b", { $toLower: "$keyword" }, "\\b"] }
//                 }
//             }
//         });

//         const tracking = new AI_Tracking({
//             employee_id,
//             ai_platform_id,
//             company_id: company_id,
//             ai_question,
//             user_session_id,
//             ai_topic_id: matchedTopicIds,
//             ai_theme_id: matchedThemeIds,
//             created_at: new Date()
//         });

//         console.log("Track Ai Question Response", tracking);

//         await tracking.save();

//         return res.status(200).json({
//             status: "success",
//             msg: 'Tracking saved successfully.',
//             data: tracking
//         });
//     } catch (error) {
//         console.error(error, 'error');
//         return res.status(500).json({
//             status: "error",
//             msg: error.message || 'Something went wrong.',
//             data: []
//         });
//     }
// });


// exports.trackAiQuestion = catchAsync(async (req, res) => {
//     try {
//         const { employee_id, ai_platform_id, ai_question, user_session_id, company_id } = req.body;
//         console.log("Track Ai Question", req.body);

//         if (!employee_id || !ai_platform_id || !ai_question) {
//             return res.status(400).json({ msg: 'Missing required fields.' });
//         }

//         const lowerCasedQuestion = ai_question.toLowerCase();

//         // Step 1: Get all keywords
//         const topics = await AI_Topic.find({}, '_id keyword');
//         const themes = await AI_Theme.find({}, '_id keyword');


//         // Step 2: Match logic
//         const matchedTopicIds = [];
//         for (const topic of topics) {
//             const keyword = topic.keyword.trim().toLowerCase();

//             if (lowerCasedQuestion.includes(keyword)) {
//                 matchedTopicIds.push(topic._id);
//                 continue;
//             }

//             // Sliding n-gram logic
//             const keywordWordCount = keyword.split(/\s+/).length;
//             const wordsInText = lowerCasedQuestion.split(/\s+/);

//             for (let i = 0; i <= wordsInText.length - keywordWordCount; i++) {
//                 const segment = wordsInText.slice(i, i + keywordWordCount).join(' ');
//                 const similarity = calculateSimilarity(keyword, segment);
//                 if (similarity >= 90) {
//                     matchedTopicIds.push(topic._id);
//                     break;
//                 }
//             }
//         }

//         const matchedThemeIds = [];
//         for (const theme of themes) {
//             const keyword = theme.keyword.trim().toLowerCase();

//             if (lowerCasedQuestion.includes(keyword)) {
//                 matchedThemeIds.push(theme._id);
//                 continue;
//             }

//             const keywordWordCount = keyword.split(/\s+/).length;
//             const wordsInText = lowerCasedQuestion.split(/\s+/);

//             for (let i = 0; i <= wordsInText.length - keywordWordCount; i++) {
//                 const segment = wordsInText.slice(i, i + keywordWordCount).join(' ');
//                 const similarity = calculateSimilarity(keyword, segment);
//                 if (similarity >= 90) {
//                     matchedThemeIds.push(theme._id);
//                     break;
//                 }
//             }
//         }

//         // Step 3: Save tracking
//         const tracking = new AI_Tracking({
//             employee_id,
//             ai_platform_id,
//             company_id,
//             ai_question,
//             user_session_id,
//             ai_topic_id: matchedTopicIds,
//             ai_theme_id: matchedThemeIds,
//             created_at: new Date()
//         });

//         await tracking.save();

//         return res.status(200).json({
//             status: "success",
//             msg: 'Tracking saved successfully.',
//             data: tracking
//         });
//     } catch (error) {
//         console.error(error, 'error');
//         return res.status(500).json({
//             status: "error",
//             msg: error.message || 'Something went wrong.',
//             data: []
//         });
//     }
// });

exports.trackAiQuestion = catchAsync(async (req, res) => {
    try {
        const { employee_id, ai_platform_id, ai_question, user_session_id, company_id } = req.body;

        if (!employee_id || !ai_platform_id || typeof ai_question !== 'string' || ai_question.trim() === '') {
            return res.status(400).json({
                status: "error",
                msg: "Missing required fields.",
                data: []
            });
        }

        // const lowerCasedQuestion = ai_question.toLowerCase();
        const lowerCasedQuestion = (ai_question || '').toString().toLowerCase();
        const wordsInText = lowerCasedQuestion.split(/\s+/);

        // Fetch topics and themes
        // const [topics, themes] = await Promise.all([
        //     AI_Topic.find({}, "_id keyword"),
        //     AI_Theme.find({}, "_id keyword")
        // ]);

        const [topics, themes] = await Promise.all([
            AI_Topic.find({ keyword: { $exists: true, $ne: null } }, "_id keyword"),
            AI_Theme.find({ keyword: { $exists: true, $ne: null } }, "_id keyword")
        ]);

        const matchedTopicIds = getMatchingIds(topics, lowerCasedQuestion, wordsInText);
        const matchedThemeIds = getMatchingIds(themes, lowerCasedQuestion, wordsInText);

        // Save tracking
        const tracking = new AI_Tracking({
            employee_id,
            ai_platform_id,
            company_id,
            ai_question,
            user_session_id,
            ai_topic_id: matchedTopicIds,
            ai_theme_id: matchedThemeIds,
            created_at: new Date()
        });

        await tracking.save();

        return res.status(200).json({
            status: "success",
            msg: "Tracking saved successfully.",
            data: tracking
        });

    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({
            status: "error",
            msg: error.message || "Something went wrong.",
            data: []
        });
    }
});


