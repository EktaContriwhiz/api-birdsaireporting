const express = require("express");
const router = express.Router();
const companyEmployeeController = require("../controllers/companyEmployeeController");

router.post("/add", companyEmployeeController.createCompanyEmployee);
router.get("/extension", companyEmployeeController.deactivateExtension)
router.get("/list", companyEmployeeController.getCompanyEmployeeList)
router.get("/deatils/:id", companyEmployeeController.getCompanyEmployeeWithID)
router.get("/tranding/theme", companyEmployeeController.getEmployeeTrendingThemes)
router.get("/tranding/topic", companyEmployeeController.getEmployeeTrendingTopic)

module.exports = router;