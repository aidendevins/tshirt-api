import Replicate from 'replicate';
import OpenAI from 'openai';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  // Allow all origins (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, image } = req.body;
    
    if (!prompt || prompt.length < 3) {
      return res.status(400).json({ error: 'Please provide a detailed prompt' });
    }

    // If image is provided, use GPT-4o Mini Vision + Stable Diffusion XL
    if (image) {
      console.log('Generating with GPT-4o Mini Vision + Stable Diffusion XL (image provided):', prompt);
      
      // Step 1: Use GPT-4o Mini Vision to analyze the uploaded image
      const visionResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Describe this image in detail for use in generating a similar t-shirt design. Focus on: main subject, colors, style, composition, mood, and any notable visual elements. Be specific and descriptive."
              },
              {
                type: "image_url",
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
        max_tokens: 300
      });
      
      const imageDescription = visionResponse.choices[0].message.content;
      console.log('Vision analysis:', imageDescription);
      
      // Step 2: Combine user prompt with vision description for Stable Diffusion
      const enhancedPrompt = `${prompt}. Based on this reference: ${imageDescription}`;
      
      console.log('Enhanced prompt for SD:', enhancedPrompt);
      
      // Step 3: Use Stable Diffusion XL to generate
      const inputConfig = {
        prompt: `${enhancedPrompt}, high quality, detailed, vibrant artwork, professional t-shirt design`,
        negative_prompt: "ugly, blurry, low quality, distorted, text, watermark, photograph, realistic photo",
        width: 1024,
        height: 1024,
        num_outputs: 1,
        num_inference_steps: 30,
        guidance_scale: 7.5
      };
      
      const output = await replicate.run(
        "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        { input: inputConfig }
      );

      // output is an array of image URLs
      const imageUrl = output[0];

      res.status(200).json({
        success: true,
        imageUrl: imageUrl,
        prompt: prompt,
        model: 'gpt-4o-mini-vision-sd-xl',
        visionAnalysis: imageDescription
      });
      
    } else {
      // No image provided, use Stable Diffusion XL (standard text-to-image)
      console.log('Generating with Stable Diffusion XL (text-only):', prompt);
      
      const inputConfig = {
        prompt: `${prompt}, high quality, detailed, vibrant artwork, professional t-shirt design`,
        negative_prompt: "ugly, blurry, low quality, distorted, text, watermark",
        width: 1024,
        height: 1024,
        num_outputs: 1,
        num_inference_steps: 30,
        guidance_scale: 7.5
      };
      
      const output = await replicate.run(
        "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        { input: inputConfig }
      );

      // output is an array of image URLs
      const imageUrl = output[0];

      res.status(200).json({
        success: true,
        imageUrl: imageUrl,
        prompt: prompt,
        model: 'stable-diffusion-xl'
      });
    }

  } catch (error) {
    console.error('Generation error:', error);
    
    if (error.message && error.message.includes('safety')) {
      return res.status(400).json({
        error: 'Invalid prompt. Please try a different description.'
      });
    }
    
    if (error.message && error.message.includes('content_policy')) {
      return res.status(400).json({
        error: 'Content policy violation. Please try a different prompt or image.'
      });
    }

    res.status(500).json({
      error: 'Failed to generate design. Please try again.'
    });
  }
}
