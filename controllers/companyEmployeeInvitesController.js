const { default: mongoose } = require("mongoose");
const Company_Employee_Invites = require("../models/companyEmployeeInvitesModel");
const catchAsync = require("../utils/catchAsync");
const sendEmail = require("../utils/sendEmail");
const Company_Employee = require("../models/companyEmployeeModel");

exports.sendCompanyEmployeeInvites = catchAsync(async (req, res) => {
    try {
        const { company_id, email } = req.body;

        let results = [];

        email && email?.forEach(async (item) => {
            // Find exist document
            let invite = await Company_Employee_Invites.findOne({
                company_id: company_id,
                email: item,
            });

            if (invite) {
                invite.count += 1;
                await invite.save();
                results.push({
                    email,
                    count: invite.count
                });
            } else {
                // Create new document
                invite = await Company_Employee_Invites.create({
                    company_id: company_id,
                    email: item,
                    count: 1
                });
                results.push({
                    email,
                    count: 1
                });
            }
            // Send the invite email
            await sendEmail({
                to: email,
                subject: "Welcome to AI BirdsAI",
                html: `
                        <p><strong>Welcome to AI BirdsAI!</strong></p>
                        <p>Hello Dear,</p>
                        <p>We're excited to have you join us at <strong>AI BirdsAI</strong>! 🎉</p>
                        <p>We believe you’ll enjoy exploring our platform and the exciting opportunities we offer. To get started, please log in and start exploring the amazing features tailored just for you.</p>
                        <p>If you have any questions or need help getting started, feel free to reach out to us.</p>
                        <p>Best regards,</p>
                        <p><strong>The AI BirdsAI Team</strong></p>
                `,
            });
        });

        return res.status(200).json({
            status: "success",
            msg: "Invites sent successfully",
        });
    } catch (error) {
        console.log(error, '--error-');
        return res.status(500).json({
            status: "error",
            msg: error.message,
            data: [],
        });
    }
});

// exports.getInvites = catchAsync(async (req, res) => {
//     try {
//         const company_id = req.params.id
//         let data = await Company_Employee_Invites.find({ company_id: company_id });
//         const list = await Company_Employee.find({ company_id: company_id });

//         let email = data[0]?.email;
//         let sss = list?.[1]?.email;
//         if (data[0]) {
//             let firstInvite = data[0].toObject();
//             firstInvite.isExist = (sss === email);
//             data[0] = firstInvite;
//         }

//         return res.status(200).json({
//             status: "success",
//             msg: "Invites fetched successfully",
//             data: data,
//             list
//         });

//     } catch (error) {
//         console.log(error, '--error-');
//         return res.status(500).json({
//             status: "error",
//             msg: error.message,
//             data: [],
//         });
//     }
// })

exports.getInvites = catchAsync(async (req, res) => {
    try {
        const companyId = new mongoose.Types.ObjectId(req.params.id);

        const data = await Company_Employee_Invites.aggregate([
            { $match: { company_id: companyId } },
            {
                $lookup: {
                    from: "company_employees",
                    let: { cid: { $toString: "$company_id" } },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$company_id", "$$cid"] }
                            }
                        }
                    ],
                    as: "employees"
                }
            },
            {
                $addFields: {
                    isExist: {
                        $in: [
                            "$email",
                            {
                                $map: {
                                    input: "$employees",
                                    as: "emp",
                                    in: "$$emp.email"
                                }
                            }
                        ]
                    }
                }
            },
            { $project: { employees: 0 } }
        ]);

        return res.status(200).json({
            status: "success",
            msg: "Invites fetched successfully",
            data
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: "error", msg: error.message, data: [] });
    }
});

