const express = require("express");
const router = express.Router();
const aiTrackingController = require("../controllers/aiTrackingController");

router.post("/add", aiTrackingController.trackAiQuestion);

module.exports = router;