const express = require("express");
const router = express.Router();
const companyController = require("../controllers/companyController");

router.post("/add", companyController.addCompany)
router.get("/list", companyController.getCompanyList);
router.get("/get/:id", companyController.getCompany);
router.patch("/update/:id", companyController.updateCompany);
router.patch("/update-status/:id", companyController.updateCompnayStatus)
router.get("/details/:id", companyController.getCompanyDetails)

module.exports = router;