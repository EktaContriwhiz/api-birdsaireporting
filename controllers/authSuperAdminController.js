const User = require("../models/userModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

exports.superAdminLogin = catchAsync(async (req, res, next) => {
    try {
        const { email, password } = req.body;

        //If email and pass exist
        if (!email || !password) {
            return next(new AppError("Please provide us email and password!", 400));
        }

        // Check if user exists && password is correct
        let user = await User.findOne({ email }).select("+password");

        if (!user) {
            return res.status(400).json({
                status: 'error',
                msg: 'Incorrect email or password',
                data: []
            });
        }

        // Password match
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Incorrect password' });
        }

        // Generate token if everything is fine
        const token = signToken(user._id);

        user = user.toObject();
        user.role = "superadmin"

        return res.status(200).json({
            status: "success",
            msg: "Super admin login successful.",
            id: user._id,
            token,
            user
        });

    } catch (error) {
        console.log(error, '--error--');
        return res.status(500).json({
            status: "error",
            msg: error,
            data: []
        })
    }
})

exports.getUserById = catchAsync(async (req, res, next) => {
    try {
        const userId = req.params.id;

        if (!userId) {
            return next(new AppError("Provide me ID", 400))
        }
        const user = await User.findById(userId);
        if (!user) {
            return next(new AppError("User not found", 404))
        }

        return res.status(200).json({
            status: "success",
            msg: "User fetch successful.",
            data: user
        });
    } catch (error) {
        console.log(error, '--error--');
        return res.status(500).json({
            status: "error",
            msg: error,
            data: []
        })
    }
})

exports.updateProfile = catchAsync(async (req, res, next) => {
    try {
        let { password } = req.body;
        const userId = req.params.id;

        if (!userId) {
            return next(new AppError("Provide me ID", 400))
        }

        const user = await User.findById(userId).select("+password");
        if (!user) {
            return next(new AppError("No user found with that ID", 404));
        }

        // If user has a password (not a Google login)
        if (user.password && typeof password === 'string' && password.trim() !== "" && password !== "null") {
            const isSamePassword = await bcrypt.compare(password, user.password);

            if (!isSamePassword) {
                const salt = await bcrypt.genSalt(12);
                const hashedPassword = await bcrypt.hash(password, salt);
                req.body.password = hashedPassword;
            } else {
                delete req.body.password;
            }
        } else {
            delete req.body.password;
        }

        const updatedUser = await User.findByIdAndUpdate(userId, req.body, {
            new: true,
            runValidators: true,
        });

        return res.status(200).json({
            status: "success",
            msg: "Profile update successful.",
            data: updatedUser
        });
    } catch (error) {
        console.log(error, '--error--');
        return res.status(500).json({
            status: "error",
            msg: error,
            data: []
        })
    }
})