const express = require("express");
const router = express.Router();
const aiTopicController = require("../controllers/aiTopicController");

// Multer setup (memory storage)
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/add-topic", aiTopicController.createAITopic);
router.post("/add", upload.single("file"), aiTopicController.addTopicsIfNotExist)
router.get("/list", aiTopicController.getTopicList);
router.patch("/update/:id", aiTopicController.updateTopic)

// router.post("/add-data", upload.single("file"), aiTopicController.addTopicAndTheme)

module.exports = router;