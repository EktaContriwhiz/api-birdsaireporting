const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type"]
}))

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const companyDepartmentsRouter = require("./routes/companyDepartmentsRoutes")
const comapanyRouter = require("./routes/companyRoutes");
const aiPlatformRouter = require("./routes/aiPlatformRoutes")
const aithemeRouter = require("./routes/aiThemeRoutes");
const aiTopicRouter = require("./routes/aiTopicRoutes");
const employeeRouter = require("./routes/companyEmployeeRoutes")
const aiTrackQuestionRouter = require("./routes/aiTrackingRoutes");
const authSuperAdminRourter = require("./routes/authSuperAdminRoutes");
const employeeExtensionHistoryRouter = require("./routes/employeeExtensionHistoryRoutes")
const extensionRouter = require("./routes/extensionRoutes")
const trendingRouter = require("./routes/trendingRoutes")
const companyEmployeeInvitesRouter = require("./routes/companyEmployeeInvitesRoutes");

app.use(express.json());

app.get("/", (req, res) => {
    res.status(200).send(`
            <html>
                <body>
                    <h4>Welcome to Birdsai APIs portal.</h4>
                    <h4>Please refer to the documentation: 
                        <a href="https://documenter.getpostman.com/view/31719219/2sB3BKE8BJ" target="_blank">
                            https://documenter.getpostman.com/view/31719219/2sB3BKE8BJ
                        </a>
                    </h4>
                </body>
            </html>
    `);
})

app.use("/api/v1/super-admin", authSuperAdminRourter);
app.use("/api/v1/company", comapanyRouter);
app.use("/api/v1/company/department", companyDepartmentsRouter);
app.use("/api/v1/company/employee/invite", companyEmployeeInvitesRouter)
app.use("/api/v1/company/employee", employeeRouter);
app.use("/api/v1/ai-platform", aiPlatformRouter)
app.use("/api/v1/ai-theme", aithemeRouter);
app.use("/api/v1/ai-topic", aiTopicRouter);
app.use("/api/v1/ai-question", aiTrackQuestionRouter);
app.use("/api/v1/extension-history", employeeExtensionHistoryRouter)
app.use("/api/v1/extension", extensionRouter)
app.use("/api/v1/trending", trendingRouter)
app.use("/downloads", express.static(path.join(__dirname, "extension/company_ext")));

// app.all('*', (req, res, next) => {
app.all(/(.*)/, (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on the server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
