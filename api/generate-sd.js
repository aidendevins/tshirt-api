import Replicate from 'replicate';
import OpenAI from 'openai';
import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// needed for temp file handling (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req, res) {
  // basic CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt, image } = req.body;

    if (!prompt || prompt.length < 3) {
      return res.status(400).json({ error: 'Please provide a detailed prompt.' });
    }

    /** ──────────────────────────────
     *  CASE 1: image provided → OpenAI edit
     *  ────────────────────────────── */
    if (image) {
      console.log('🖼️ Image edit with DALL·E:', prompt);

      // download base64 / URL image → temp file
      const response = await fetch(image);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const tempPath = path.join(__dirname, 'temp_image.png');
      fs.writeFileSync(tempPath, buffer);

      // call OpenAI Images API for edit/extension
      const result = await openai.images.edits({
        model: 'gpt-image-1', // DALL·E 3 edit endpoint
        image: fs.createReadStream(tempPath),
        prompt: prompt,
        size: '1024x1024',
        n: 1,
      });

      fs.unlinkSync(tempPath); // clean up temp file

      const editedImageUrl = result.data[0].url;

      // convert to base64 to bypass CORS
      const imgResp = await fetch(editedImageUrl);
      const imgBuf = await imgResp.arrayBuffer();
      const base64 = `data:image/png;base64,${Buffer.from(imgBuf).toString('base64')}`;

      return res.status(200).json({
        success: true,
        imageUrl: base64,
        model: 'openai-dalle3-edit',
        prompt
      });
    }

    /** ──────────────────────────────
     *  CASE 2: text-only → Replicate SDXL
     *  ────────────────────────────── */
    console.log('🎨 Text-only prompt via SDXL:', prompt);

    const inputConfig = {
      prompt: `${prompt}, high quality, detailed, professional art`,
      negative_prompt: 'ugly, blurry, low quality, distorted, watermark',
      width: 1024,
      height: 1024,
      num_outputs: 1,
      num_inference_steps: 30,
      guidance_scale: 7.5,
    };

    const output = await replicate.run(
      'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
      { input: inputConfig }
    );

    const imageUrl = output[0];

    return res.status(200).json({
      success: true,
      imageUrl,
      model: 'stable-diffusion-xl',
      prompt
    });

  } catch (err) {
    console.error('Generation error:', err);

    const message = err?.message || '';
    if (message.includes('safety') || message.includes('content_policy')) {
      return res.status(400).json({ error: 'Content policy violation or unsafe prompt.' });
    }

    return res.status(500).json({ error: 'Image generation failed. Please try again.' });
  }
}
