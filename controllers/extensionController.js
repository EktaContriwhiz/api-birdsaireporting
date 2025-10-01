const fs = require("fs");
const path = require("path");
const catchAsync = require("../utils/catchAsync");
const { readManifest, createZipForCompany, copyFolderSync, updateManifestCompanyId } = require("../utils/helper");
const Company = require("../models/companyModel");

// Main function
exports.createExtensionZip = catchAsync(async (req, res) => {
    try {
        const { cid } = req.query;
        const BASE_FOLDER = path.join(__dirname, "..", "extension");
        const BIRDSAI_FOLDER = path.join(BASE_FOLDER, "birdsai_ext");
        const COMPANY_FOLDER = path.join(BASE_FOLDER, "company_ext");
        // const baseURL = `${req.protocol}://${req.get("host")}/downloads`;
        const baseURL = `${process.env.BASE_URL}/downloads`

        let companies = [];
        if (cid) {
            const company = await Company.findOne({ _id: cid });
            if (!company) {
                return res.status(404).json({ message: `Company not found with id: ${cid}` });
            }
            companies = [company];
        } else {
            companies = await Company.find();
            if (!companies) {
                return res.status(200).json({ status: "success", message: "Company not found", data: [] });
            }
        }

        const downloads = [];
        const tempFoldersToDelete = [];

        // Process all companies in parallel
        await Promise.all(
            companies.map(async (company) => {
                const companyId = company._id.toString();
                const NEW_COMPANY_FOLDER = path.join(COMPANY_FOLDER, companyId);

                // Step 1: Copy browser extension folders
                if (!fs.existsSync(NEW_COMPANY_FOLDER)) {
                    fs.mkdirSync(NEW_COMPANY_FOLDER, { recursive: true });
                    const browsers = ["chrome-ext", "edge-ext", "firefox-ext"];
                    for (const browser of browsers) {

                        const src = path.join(BIRDSAI_FOLDER, browser);
                        const dest = path.join(NEW_COMPANY_FOLDER, browser);

                        if (fs.existsSync(src)) {
                            await copyFolderSync(src, dest);
                            await updateManifestCompanyId(dest, companyId);
                        }
                    }
                }

                // Step 2: Read build folders for this company
                const buildFolders = fs
                    .readdirSync(NEW_COMPANY_FOLDER)
                    .map((sub) => path.join(NEW_COMPANY_FOLDER, sub))
                    .filter((p) => fs.statSync(p).isDirectory());

                if (buildFolders.length === 0) {
                    console.log("No build folders found for company:", companyId);
                    return;
                }

                const manifest = readManifest(buildFolders[0]);
                if (!manifest) {
                    console.log("No valid manifest found for company:", companyId);
                    return;
                }

                const { version } = manifest;

                // Step 3: Create zip
                try {
                    const zipName = await createZipForCompany(COMPANY_FOLDER, companyId, version, buildFolders);
                    downloads.push(zipName);
                    tempFoldersToDelete.push(NEW_COMPANY_FOLDER);
                } catch (error) {
                    console.error("Error creating zip for company:", companyId, error);
                }
            })
        );

        // Step 4: Delete temp folders AFTER all zips created
        for (const folder of tempFoldersToDelete) {
            if (fs.existsSync(folder)) {
                fs.rmSync(folder, { recursive: true, force: true });
            }
        }

        // Step 5: Send download links to client
        const downloadUrls = downloads.map(file => `${baseURL}/${file}`);

        return res.status(200).json({
            status: "success",
            msg: "Zips created successfully",
            data: downloadUrls
        });
    } catch (err) {
        console.error(err);
        // res.status(500).send(`<h1>Internal Server Error</h1><p>${err.message}</p>`);
        console.log(err, "error");
        return res.status(500).json({
            status: "error",
            msg: err.message || err,
            data: [],
        });
    }
});


