import fs from 'fs';
import pdf from 'pdf-parse';

async function comparePDFs(generatedPath: string, templatePath: string) {
    const genBuffer = fs.readFileSync(generatedPath);
    const tempBuffer = fs.readFileSync(templatePath);

    const genData = await pdf(genBuffer);
    const tempData = await pdf(tempBuffer);

    console.log('--- TEMPLATE TEXT ---');
    console.log(tempData.text.substring(0, 1000));
    console.log('--- GENERATED TEXT ---');
    console.log(genData.text.substring(0, 1000));

    const keyFields = [
        'KITS AKSHAR INSTITUTE OF TECHNOLOGY',
        'AUTONOMOUS',
        'FEE RECEIPT',
        'OFFICE COPY',
        'STUDENT COPY',
        'HT No',
        'Rec No',
        'Semester',
        'Branch',
        'Grand Total',
        'Total Due',
        'Note:-',
        'Cashier',
        'Authorised Signatory'
    ];

    console.log('\n--- FIELD CHECK ---');
    keyFields.forEach(field => {
        const inTemp = tempData.text.includes(field);
        const inGen = genData.text.includes(field);
        console.log(`${field.padEnd(35)} | Template: ${inTemp ? '✅' : '❌'} | Generated: ${inGen ? '✅' : '❌'}`);
    });
}

const args = process.argv.slice(2);
comparePDFs(args[0], args[1]).catch(console.error);
