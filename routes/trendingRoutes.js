const express = require("express");
const router = express.Router();
const trendingController = require("../controllers/trendingController.js");

router.get("/topic/list", trendingController.getTrendingTopic)
router.get("/theme/list", trendingController.getTrendingTheme)
router.get("/platfrom/list", trendingController.getMostActivePlatforms)
router.get("/employee-platform-activity/list", trendingController.getEmployeePlatformActivity)
router.get("/list", trendingController.getTopUsageByCompany)
router.get("/trending-companies-last-week", trendingController.listTrendingCompanyByWeek)
router.get("/trending-user-last-week", trendingController.listTrendingUserByWeek)
router.get("/trending-ai-last-week", trendingController.listTrendingAIByWeek)
router.get("/dashobard/recodes", trendingController.getDashboardRecord)

module.exports = router;