
const fetch = require('node-fetch');

async function test() {
    const baseUrl = 'http://localhost:8080/api/v1/examcell';
    try {
        const res = await fetch(`${baseUrl}/branches`);
        const data = await res.json();
        console.log('Branches:', data);

        const res2 = await fetch(`${baseUrl}/programs`);
        const data2 = await res2.json();
        console.log('Programs:', data2);

        const res3 = await fetch(`${baseUrl}/batches`);
        const data3 = await res3.json();
        console.log('Batches:', data3);
    } catch (e) {
        console.error('Fetch failed:', e.message);
    }
}

test();
