const fs = require('fs');

const appjs = fs.readFileSync('app.js', 'utf8');
const indexhtml = fs.readFileSync('index.html', 'utf8');

const idRegex = /getElementById\(['"]([^'"]+)['"]\)/g;
let match;
const idsInApp = new Set();
while ((match = idRegex.exec(appjs)) !== null) {
    idsInApp.add(match[1]);
}

const missingIds = [];
for (const id of idsInApp) {
    if (!indexhtml.includes(`id="${id}"`) && !indexhtml.includes(`id='${id}'`)) {
        missingIds.push(id);
    }
}

console.log("Missing IDs in index.html:", missingIds);
