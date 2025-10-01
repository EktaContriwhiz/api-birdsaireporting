const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const levenshtein = require('fast-levenshtein');

// Read Manifest
function readManifest(folderPath) {
    const manifestPath = path.join(folderPath, "manifest.json");
    if (!fs.existsSync(manifestPath)) return null;

    try {
        const json = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
        if (!json.version_name || !json.version) return null;
        return { company_id: json.version_name, version: json.version };
    } catch (err) {
        console.error("Invalid JSON in", manifestPath, err);
        return null;
    }
}

// Folder copy helper
async function copyFolderSync(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            await copyFolderSync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
};

// Manifest update helper
async function updateManifestCompanyId(folder, companyId) {
    const manifestPath = path.join(folder, "manifest.json");
    if (fs.existsSync(manifestPath)) {
        const data = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
        data.version_name = companyId;
        fs.writeFileSync(manifestPath, JSON.stringify(data, null, 2), "utf-8");
    }
};

// Create Zip For Company
async function createZipForCompany(baseFolder, companyId, version, folders) {
    return new Promise((resolve, reject) => {
        const zipName = `${companyId}_${version}.zip`;
        const outputPath = path.join(baseFolder, zipName);

        // Remove old ZIPs for this company
        const existingZips = fs.readdirSync(baseFolder).filter(file =>
            file.startsWith(`${companyId}_`) && file.endsWith(".zip") && file !== zipName
        );
        existingZips.forEach(file => fs.unlinkSync(path.join(baseFolder, file)));


        const output = fs.createWriteStream(outputPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        output.on("close", () => resolve(zipName));
        archive.on("error", err => reject(err));

        archive.pipe(output);
        folders.forEach(folder => {
            const folderName = path.basename(folder);
            archive.directory(folder, folderName);
        });

        archive.finalize();
    });
}


// Helper function to calculate similarity %
// const calculateSimilarity = (a, b) => {
//     const distance = levenshtein.get(a.toLowerCase(), b.toLowerCase());
//     const maxLen = Math.max(a.length, b.length);
//     return ((maxLen - distance) / maxLen) * 100;
// };

const calculateSimilarity = (a, b) => {
    const distance = levenshtein.get(a, b);
    const maxLen = Math.max(a.length, b.length);
    return ((maxLen - distance) / maxLen) * 100;
};

const getMatchingIds = (items, lowerCasedQuestion, wordsInText) => {
    return items
        .filter((item) => {
            const keyword = item.keyword.trim().toLowerCase();

            // Exact Match
            if (lowerCasedQuestion.includes(keyword)) {
                return true;
            }

            const keywordLength = keyword.split(/\s+/).length;

            // 90% Similarity Match (Sliding N-gram)
            return wordsInText.some((_, i) => {
                if (i + keywordLength > wordsInText.length) return false;

                const segment = wordsInText.slice(i, i + keywordLength).join(" ");
                const sim = calculateSimilarity(keyword, segment);
                return sim >= 90;
            });
        })
        .map((item) => item._id);
};

module.exports = {
    readManifest,
    createZipForCompany,
    copyFolderSync,
    updateManifestCompanyId,
    getMatchingIds
};


