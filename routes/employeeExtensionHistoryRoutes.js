const express = require("express");
const router = express.Router();
const employeeExtensionHistoryController = require("../controllers/employeeExtensionHistoryController");

router.get("/list/:id", employeeExtensionHistoryController.getEmployeeExtensionHistory)

module.exports = router;
