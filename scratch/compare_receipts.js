const fs = require('fs');
const pdf = require('pdf-parse');

async function comparePDFs(generatedPath, templatePath) {
    try {
        const genBuffer = fs.readFileSync(generatedPath);
        const tempBuffer = fs.readFileSync(templatePath);

        const genData = await pdf(genBuffer);
        const tempData = await pdf(tempBuffer);

        console.log('--- TEMPLATE TEXT (Partial) ---');
        console.log(tempData.text.replace(/\s+/g, ' ').substring(0, 500));
        console.log('\n--- GENERATED TEXT (Partial) ---');
        console.log(genData.text.replace(/\s+/g, ' ').substring(0, 500));

        const keyFields = [
            'KITS AKSHAR INSTITUTE OF TECHNOLOGY',
            'AUTONOMOUS',
            'FEE RECEIPT',
            'OFFICE COPY',
            'STUDENT COPY',
            'HT No',
            'Rec No',
            'Receipt Date',
            'Semester',
            'Student Name',
            'Branch',
            'Grand Total',
            'Total Due',
            'Note:-',
            'Authorised Signatory'
        ];

        console.log('\n--- FIELD CHECK ---');
        keyFields.forEach(field => {
            const inTemp = tempData.text.toUpperCase().includes(field.toUpperCase());
            const inGen = genData.text.toUpperCase().includes(field.toUpperCase());
            console.log(`${field.padEnd(25)} | Template: ${inTemp ? '✅' : '❌'} | Generated: ${inGen ? '✅' : '❌'}`);
        });

        // Check for specific text like "Rupees Only"
        const wordsOk = genData.text.includes('Rupees Only');
        console.log(`\nCurrency Words Check: ${wordsOk ? '✅' : '❌'}`);

    } catch (err) {
        console.error('Error during comparison:', err);
    }
}

const args = process.argv.slice(2);
comparePDFs(args[0], args[1]);
