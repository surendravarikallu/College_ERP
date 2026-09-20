const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('client/public/report_23JK1A05I7.pdf');

pdf(dataBuffer).then(function(data) {
    console.log('--- PDF TEXT ---');
    console.log(data.text);
    console.log('--- END TEXT ---');
}).catch(err => {
    console.error(err);
});
