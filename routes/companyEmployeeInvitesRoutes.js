const express = require("express");
const router = express.Router();
const companyEmployeeInvitesController = require("../controllers/companyEmployeeInvitesController");

router.post("/send-invites", companyEmployeeInvitesController.sendCompanyEmployeeInvites);
router.get("/list/:id", companyEmployeeInvitesController.getInvites)

module.exports = router;