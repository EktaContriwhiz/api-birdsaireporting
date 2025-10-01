const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, html, text }) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: "developer1.contriwhiz@gmail.com",
            pass: "gclh nvmq pfnz vsgy",
        },
    });

    const mailOptions = {
        from: "developer1.contriwhiz@gmail.com",
        to,
        subject,
        html,
        text
    };
    await transporter.sendMail(mailOptions);
}

module.exports = sendEmail;