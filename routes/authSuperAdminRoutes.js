const express = require("express");
const router = express.Router();
const authSuperAdminController = require("../controllers/authSuperAdminController");

router.post("/login", authSuperAdminController.superAdminLogin)
router.patch("/update-profile/:id", authSuperAdminController.updateProfile)
router.get("/get/:id", authSuperAdminController.getUserById)


module.exports = router