const express = require("express");
const router = express.Router();
const companyDepartmentsController = require("../controllers/companyDepartmentsController");

router.post("/add", companyDepartmentsController.addDepartments);
router.get("/list", companyDepartmentsController.getDepartment);
router.patch("/update/:id", companyDepartmentsController.updateDepartment)

module.exports = router;