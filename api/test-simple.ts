import https from 'https';

function testEndpoint(url: string) {
  return new Promise<void>((resolve) => {
    console.log(`Testing: ${url}`);

    const options = {
      rejectUnauthorized: false,
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${data.substring(0, 100)}`);
        resolve();
      });
    }).on('error', (err) => {
      console.error(`Error: ${err.message}`);
      resolve();
    });
  });
}

async function run() {
  await testEndpoint('https://liftwatch-api-flex.azurewebsites.net/api/health');
}

run();
