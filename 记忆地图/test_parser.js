const fetch = require('node-fetch');

async function test() {
  const res = await fetch('https://new.suxi.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer sk-EtvNysI8Ra80twn5od4WsU02pnWHLU6pl0f97tEgFefIqSyX'
    },
    body: JSON.stringify({
      model: 'gemini-3.1-flash-image',
      messages: [{ role: 'user', content: 'A red apple' }],
      stream: true
    })
  });
  
  if (!res.ok) {
    console.log('Error:', res.status);
    return;
  }
  
  const decoder = new TextDecoder('utf-8');
  let done = false;
  let fullContent = '';
  let buffer = '';

  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
        try {
          const data = JSON.parse(trimmed.slice(6));
          const deltaContent = data.choices?.[0]?.delta?.content;
          if (deltaContent) {
            fullContent += deltaContent;
          }
        } catch (e) {
          console.log('Parse error:', e.message, 'Snippet:', trimmed.substring(0, 100));
        }
      }
    }
  }
  
  console.log('fullContent length:', fullContent.length);
  if (fullContent.length < 100) console.log('fullContent:', fullContent);
}

test();
