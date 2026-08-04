const fetch = require('node-fetch');

async function test() {
  const res = await fetch('https://new.suxi.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer sk-EtvNysI8Ra80twn5od4WsU02pnWHLU6pl0f97tEgFefIqSyX'
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      messages: [{ role: 'user', content: 'A red apple' }],
      stream: true
    })
  });
  
  if (!res.ok) {
    console.log('Error:', res.status, await res.text());
    return;
  }
  
  for await (const chunk of res.body) {
    console.log('CHUNK:', chunk.toString());
  }
}

test();
