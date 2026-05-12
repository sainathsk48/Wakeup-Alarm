/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

export interface ImageVerificationResult {
  isValid: boolean;
  error?: string;
}

type LocalPrediction = {
  class: string;
  score: number;
};

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();
const GEMINI_MODEL = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
const LOCAL_DETECTION_MIN_SCORE = 0.42;

const OBJECT_ALIASES: Record<string, string[]> = {
  bottle: ['water bottle', 'metal bottle', 'thermos', 'flask', 'vacuum bottle', 'plastic bottle', 'drink bottle'],
  mug: ['cup', 'coffee mug', 'tea mug', 'tea cup', 'coffee cup'],
  sink: ['wash basin', 'basin', 'kitchen sink', 'bathroom sink'],
  toothbrush: ['tooth brush', 'electric toothbrush'],
  keyboard: ['computer keyboard', 'laptop keyboard', 'mechanical keyboard'],
  shoe: ['sneaker', 'boot', 'sandal', 'slipper', 'footwear'],
  chair: ['office chair', 'stool', 'armchair', 'seat', 'dining chair'],
};

const LOCAL_OBJECT_LABELS: Record<string, string[]> = {
  bottle: ['bottle'],
  chair: ['chair'],
  keyboard: ['keyboard'],
  mug: ['cup'],
  sink: ['sink'],
  toothbrush: ['toothbrush'],
};

let localDetectorPromise: Promise<any> | null = null;

const describeObject = (expectedObject: string) => {
  const aliases = OBJECT_ALIASES[expectedObject.toLowerCase()] || [];
  return [expectedObject, ...aliases].join(', ');
};

const localModelUrl = () => {
  return new URL('./models/coco-ssd/ssdlite_mobilenet_v2/model.json', window.location.href).href;
};

const loadLocalDetector = async () => {
  if (!localDetectorPromise) {
    localDetectorPromise = (async () => {
      const tf = await import('@tensorflow/tfjs');
      await import('@tensorflow/tfjs-backend-webgl');
      const cocoSsd = await import('@tensorflow-models/coco-ssd');

      try {
        await tf.setBackend('webgl');
      } catch {
        await tf.setBackend('cpu');
      }

      await tf.ready();
      return cocoSsd.load({
        base: 'lite_mobilenet_v2',
        modelUrl: localModelUrl(),
      });
    })().catch((error) => {
      localDetectorPromise = null;
      throw error;
    });
  }

  return localDetectorPromise;
};

const imageFromDataUrl = (dataUrl: string) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to read captured image.'));
    image.src = dataUrl.startsWith('data:') ? dataUrl : `data:image/jpeg;base64,${dataUrl}`;
  });
};

const verifyWithLocalDetector = async (
  base64Image: string,
  expectedObject: string
): Promise<ImageVerificationResult> => {
  const labels = LOCAL_OBJECT_LABELS[expectedObject.toLowerCase()];
  if (!labels) {
    return {
      isValid: false,
      error: `Local detector does not support "${expectedObject}". Add GEMINI_API_KEY for this object.`,
    };
  }

  try {
    const [detector, image] = await Promise.all([
      loadLocalDetector(),
      imageFromDataUrl(base64Image),
    ]);
    const predictions: LocalPrediction[] = await detector.detect(image);
    const isValid = predictions.some((prediction) => {
      return labels.includes(prediction.class.toLowerCase()) && prediction.score >= LOCAL_DETECTION_MIN_SCORE;
    });

    console.log('[ImageVerify] Local detector predictions:', predictions);
    return { isValid };
  } catch (error) {
    console.error('[ImageVerify] Local detector error:', error);
    return {
      isValid: false,
      error: 'Local image detector could not start. Connect to the internet once, reopen the app, and try again.',
    };
  }
};

const verifyWithGemini = async (
  base64Image: string,
  expectedObject: string
): Promise<ImageVerificationResult> => {
  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const imageData = base64Image.split(',')[1] || base64Image;

    if (!imageData || imageData.length < 100) {
      return { isValid: false, error: 'Captured image was empty or too small. Try taking the photo again.' };
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          parts: [
            {
              text:
                `Look at this photo carefully. Does it contain a ${expectedObject} ` +
                `(or any of these variants: ${describeObject(expectedObject)})? ` +
                'Be lenient - if anything in the image reasonably looks like the requested object, answer YES. ' +
                'Respond with ONLY the single word YES or NO, nothing else.',
            },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: imageData,
              },
            },
          ],
        },
      ],
    });

    const text = (response.text || '').trim().toUpperCase();
    const hasYes = /\bYES\b/.test(text);
    const hasNo = /^NO\b/.test(text);

    console.log('[ImageVerify] Gemini response:', text);
    return { isValid: hasYes && !hasNo };
  } catch (error: any) {
    const errMsg = error?.message || error?.toString() || 'Unknown error';
    console.error('[ImageVerify] Gemini verification error:', errMsg, error);

    if (errMsg.includes('API_KEY') || errMsg.includes('403') || errMsg.includes('401')) {
      return { isValid: false, error: 'Invalid Gemini API key. Check GEMINI_API_KEY and rebuild the APK.' };
    }
    if (errMsg.includes('404') || errMsg.includes('not found')) {
      return { isValid: false, error: `Gemini model "${GEMINI_MODEL}" was not found.` };
    }
    if (errMsg.includes('network') || errMsg.includes('fetch') || errMsg.includes('ECONNREFUSED')) {
      return { isValid: false, error: 'Network error. Check your internet connection and try again.' };
    }

    return { isValid: false, error: `Gemini error: ${errMsg.substring(0, 100)}` };
  }
};

export async function verifyImage(base64Image: string, expectedObject: string): Promise<ImageVerificationResult> {
  console.log('[ImageVerify] Verifying object:', expectedObject, 'Gemini key present:', !!GEMINI_API_KEY);

  const supportsLocalDetection = Boolean(LOCAL_OBJECT_LABELS[expectedObject.toLowerCase()]);

  if (supportsLocalDetection) {
    const localResult = await verifyWithLocalDetector(base64Image, expectedObject);
    if (localResult.isValid || !GEMINI_API_KEY) {
      return localResult;
    }

    const geminiResult = await verifyWithGemini(base64Image, expectedObject);
    if (geminiResult.isValid) {
      return geminiResult;
    }

    return {
      isValid: false,
      error: localResult.error || `Could not detect "${expectedObject}". Point the camera directly at it and try again.`,
    };
  }

  if (GEMINI_API_KEY) {
    return verifyWithGemini(base64Image, expectedObject);
  }

  return verifyWithLocalDetector(base64Image, expectedObject);
}
