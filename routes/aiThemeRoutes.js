const express = require("express");
const router = express.Router();
const aiThemeController = require("../controllers/aiThemeController");

// Multer setup (memory storage)
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/add-theme", aiThemeController.createAITheme);
router.post("/add", upload.single("file"), aiThemeController.addThemesIfNotExist)

router.get("/list", aiThemeController.getThemeList)
router.patch("/update/:id", aiThemeController.updateTheme)

module.exports = router;