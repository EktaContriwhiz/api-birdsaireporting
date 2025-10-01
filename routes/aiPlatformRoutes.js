const express = require("express");
const router = express.Router();
const aiPlatformController = require("../controllers/aiPlatformController");

router.post("/add", aiPlatformController.createAIPlatform);
router.get("/list", aiPlatformController.getAIPlatform)
router.patch("/update/:id", aiPlatformController.updateAIPlatform)
router.get("/popular-ai-list", aiPlatformController.getMostPopularAIPlatform)
router.get("/get-list", aiPlatformController.plarformsList)

module.exports = router;