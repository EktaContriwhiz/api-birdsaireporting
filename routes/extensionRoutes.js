const express = require("express");
const router = express.Router();
const extensionController = require("../controllers/extensionController");

router.get('/create-zip', extensionController.createExtensionZip);

module.exports = router;