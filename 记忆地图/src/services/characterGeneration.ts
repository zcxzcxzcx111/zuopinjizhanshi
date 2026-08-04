export interface GeneratedCharacter {
  imageDataUrl: string;
  model: string;
}

import { uploadToCOS } from './cos';

function loadImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('无法读取人物照片'));
    image.src = uri;
  });
}

export async function resizePortraitForGeneration(uri: string): Promise<string> {
  const image = await loadImage(uri);
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = Math.min(1, 1024 / Math.max(1, longestSide));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前浏览器无法处理人物照片');
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

export function parseGeneratedCharacter(payload: unknown): GeneratedCharacter {
  const result = payload as Partial<GeneratedCharacter> | null;
  if (
    !result
    || typeof result.imageDataUrl !== 'string'
    || (!result.imageDataUrl.startsWith('data:image/') && !result.imageDataUrl.startsWith('https://'))
    || typeof result.model !== 'string'
    || !result.model
  ) {
    throw new Error('动漫人物生成结果无效');
  }
  return { imageDataUrl: result.imageDataUrl, model: result.model };
}

export async function requestGeneratedCharacter(
  imageDataUrl: string,
  peopleCount: number = 1,
  personProfiles?: Array<{ name: string; baseCharacterUri?: string; id: string } | null>,
  subjectType: 'person' | 'object' = 'person'
): Promise<GeneratedCharacter> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000); // 3-minute timeout
  try {
    // STEP 1: Get fetch configuration and prompt from our backend
    const buildResponse = await fetch('/api/generate-character', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 'build', imageDataUrl, peopleCount, personProfiles, subjectType }),
      signal: controller.signal,
    });
    
    if (!buildResponse.ok) {
      const errorData = await buildResponse.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to prepare image generation');
    }
    
    const { upstreamUrl, upstreamHeaders, upstreamBody } = await buildResponse.json();

    // STEP 2: Execute long-running request directly from the browser to bypass Vercel timeout
    // The model returns a non-streaming JSON response, so we read it directly.
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: upstreamHeaders,
      body: JSON.stringify(upstreamBody),
      signal: controller.signal,
    });

    if (!upstreamResponse.ok) {
      let errText = '';
      try { errText = await upstreamResponse.text(); } catch (_) {}
      throw new Error(`Upstream request failed: ${upstreamResponse.status} ${errText.substring(0, 200)}`);
    }

    // Read full response body as text first, then parse
    const responseText = await upstreamResponse.text();
    let upstreamPayload: unknown = null;

    // Try to parse as JSON directly (non-streaming response)
    try {
      upstreamPayload = JSON.parse(responseText);
    } catch (_) {
      // If JSON parse fails, it might be an SSE stream – extract last complete JSON data line
      const lines = responseText.split('\n');
      let combinedContent = '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
          try {
            const data = JSON.parse(trimmed.slice(6));
            // Streaming delta
            const deltaContent = data?.choices?.[0]?.delta?.content;
            if (typeof deltaContent === 'string') {
              combinedContent += deltaContent;
            }
            // Non-delta full message (some providers send complete object in stream)
            const messageContent = data?.choices?.[0]?.message?.content;
            if (typeof messageContent === 'string' && messageContent.length > combinedContent.length) {
              combinedContent = messageContent;
            }
          } catch (_) {}
        }
      }
      upstreamPayload = { choices: [{ message: { content: combinedContent } }] };
    }

    // STEP 3: Pass upstream payload to backend for image extraction and processing
    const processResponse = await fetch('/api/generate-character', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 'process', upstreamPayload }),
      signal: controller.signal,
    });

    const processPayload = await processResponse.json().catch(() => ({}));

    if (!processResponse.ok || processPayload.error) {
      throw new Error(processPayload.error || '图片处理失败');
    }

    return parseGeneratedCharacter(processPayload);
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error('动漫人物生成超时，请稍后重试');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateCharacterSticker(
  imageUri: string,
  peopleCount: number = 1,
  personProfiles?: Array<{ name: string; baseCharacterUri?: string; id: string } | null>,
  subjectType: 'person' | 'object' = 'person'
): Promise<GeneratedCharacter> {
  const imageDataUrl = await resizePortraitForGeneration(imageUri);
  const result = await requestGeneratedCharacter(imageDataUrl, peopleCount, personProfiles, subjectType);
  
  try {
    const response = await fetch(result.imageDataUrl);
    const blob = await response.blob();
    const cosUrl = await uploadToCOS(blob, `character-${Date.now()}.png`);
    return { ...result, imageDataUrl: cosUrl };
  } catch (err) {
    console.error('Failed to upload generated character to COS', err);
    return result; // Fallback to base64 if COS fails
  }
}
