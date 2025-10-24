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

    // If image is provided, use GPT-4o (full) + DALL-E 3 (ChatGPT method)
    if (image) {
      console.log('Generating with GPT-4o + DALL-E 3 (ChatGPT method):', prompt);
      
      // Step 1: Use GPT-4o (full model) to analyze image and create optimal DALL-E prompt
      // This mimics what ChatGPT does internally
      const visionResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert at analyzing images and creating optimal DALL-E 3 prompts. When given an image and a user's modification request, create a detailed DALL-E 3 prompt that will preserve the key characteristics, style, and essence of the original image while incorporating the user's requested changes. Be extremely detailed about colors, art style, composition, lighting, and specific visual elements that should be maintained."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `I have an image and want to make the following modification: "${prompt}"\n\nPlease analyze this image in extreme detail and create a comprehensive DALL-E 3 prompt that will:\n1. Preserve all the key visual characteristics (style, colors, composition, lighting, art style)\n2. Incorporate my requested modification: "${prompt}"\n3. Be specific about what should stay the same and what should change\n\nProvide ONLY the DALL-E prompt, no other text.`
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
        max_tokens: 500
      });
      
      const optimizedPrompt = visionResponse.choices[0].message.content.trim();
      console.log('GPT-4o optimized DALL-E prompt:', optimizedPrompt);
      
      // Step 2: Use DALL-E 3 to generate based on the optimized prompt
      const dalleResponse = await openai.images.generate({
        model: "dall-e-3",
        prompt: optimizedPrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard"
      });
      
      const dalleImageUrl = dalleResponse.data[0].url;
      console.log('DALL-E generated image URL:', dalleImageUrl);
      
      // Step 3: Download the image from OpenAI to bypass CORS
      const imageResponse = await fetch(dalleImageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      
      // Step 4: Convert to base64 data URL
      const base64Image = `data:image/png;base64,${Buffer.from(imageBuffer).toString('base64')}`;
      
      res.status(200).json({
        success: true,
        imageUrl: base64Image,
        prompt: prompt,
        model: 'gpt-4o-chatgpt-method',
        optimizedPrompt: optimizedPrompt
      });
      
    } else {
      // No image provided, use Stable Diffusion XL (cheaper for text-only)
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
