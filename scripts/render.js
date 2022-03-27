const ejs = require('ejs');
const fs = require('fs-extra');
const path = require('path');

const readmeTemplate = fs.readFileSync(path.join(__dirname, 'templates', 'README.md.ejs'), 'utf8');

const contents = ejs.render(readmeTemplate, {});
fs.writeFileSync(path.join(__dirname, '..', 'README.md'), contents);
