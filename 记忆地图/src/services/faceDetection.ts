declare global {
  interface Window {
    faceapi: any;
  }
}

let isModelLoaded = false;
let isLoading = false;
let loadPromise: Promise<void> | null = null;

// 使用 jsdelivr 加载轻量级 tiny_face_detector 模型
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
const SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js';

export async function loadFaceApiModels() {
  if (isModelLoaded) return;
  if (isLoading && loadPromise) return loadPromise;

  isLoading = true;
  loadPromise = new Promise(async (resolve, reject) => {
    try {
      if (!window.faceapi) {
        await new Promise((res, rej) => {
          const script = document.createElement('script');
          script.src = SCRIPT_URL;
          script.onload = res;
          script.onerror = rej;
          document.head.appendChild(script);
        });
      }
      // 需要加载多个模型来进行特征提取
      await Promise.all([
        window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      isModelLoaded = true;
      resolve();
    } catch (error) {
      console.error('Failed to load face-api models:', error);
      reject(error);
    } finally {
      isLoading = false;
    }
  });

  return loadPromise;
}

export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  descriptor?: number[]; // 128D descriptor for face recognition
}

export async function detectFaces(imageUri: string): Promise<FaceBoundingBox[]> {
  try {
    await loadFaceApiModels();
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        try {
          // scoreThreshold 0.6: only report high-confidence faces
          // Reduces false positives from scenery, objects, textures
          const detections = await window.faceapi.detectAllFaces(
            img, 
            new window.faceapi.TinyFaceDetectorOptions({ inputSize: 640, scoreThreshold: 0.6 })
          ).withFaceLandmarks().withFaceDescriptors();
          
          // Map to relative coordinates (0 to 1)
          // Filter out tiny boxes that are almost certainly false positives:
          //   - face area must be at least 0.5% of total image
          //   - each dimension must be at least 3% of image side
          const MIN_FACE_AREA = 0.005;
          const MIN_DIM = 0.03;

          const boxes: FaceBoundingBox[] = detections
            .map((d: any) => ({
              x: d.detection.box.x / img.naturalWidth,
              y: d.detection.box.y / img.naturalHeight,
              width: d.detection.box.width / img.naturalWidth,
              height: d.detection.box.height / img.naturalHeight,
              descriptor: Array.from(d.descriptor) as number[],
            }))
            .filter((b: FaceBoundingBox) =>
              b.width * b.height >= MIN_FACE_AREA &&
              b.width >= MIN_DIM &&
              b.height >= MIN_DIM
            );
          
          resolve(boxes);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image for face detection'));
      img.src = imageUri;
    });
  } catch (error) {
    console.error('Face detection failed:', error);
    return []; // Return empty array on failure instead of crashing
  }
}
