const fetch = require('node-fetch');

async function getModels() {
  const res = await fetch('https://new.suxi.ai/v1/models', {
    headers: { 'Authorization': 'Bearer sk-EtvNysI8Ra80twn5od4WsU02pnWHLU6pl0f97tEgFefIqSyX' }
  });
  const data = await res.json();
  const models = data.data.map(m => m.id);
  console.log("All models:\n" + models.join('\n'));
}

getModels();
