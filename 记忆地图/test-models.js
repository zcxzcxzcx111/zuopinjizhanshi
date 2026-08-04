const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').find(l => l.startsWith('NEWAPI_API_KEY='));
const key = env ? env.split('=')[1].replace(/["']/g, '') : null;
if (key) {
  fetch('https://new.suxi.ai/v1/models', { headers: { Authorization: 'Bearer ' + key } })
    .then(r => r.json())
    .then(d => {
      const models = d.data ? d.data.map(m => m.id) : d;
      console.log(models.filter(m => m.includes('gemini') || m.includes('image') || m.includes('1.5')));
    })
    .catch(console.error);
} else {
  console.log('No key');
}
