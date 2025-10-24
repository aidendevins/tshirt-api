import Replicate from 'replicate';
import OpenAI from 'openai';
import sharp from 'sharp';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Helper function to preprocess image for DALL-E edit API
async function preprocessImageForEdit(base64Data) {
  try {
    // Remove data URL prefix
    const base64String = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const inputBuffer = Buffer.from(base64String, 'base64');
    
    // Use sharp to ensure proper PNG format with alpha channel
    const processedBuffer = await sharp(inputBuffer)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .png({ compressionLevel: 9, palette: false }) // Force RGBA PNG
      .toBuffer();
    
    return new Blob([processedBuffer], { type: 'image/png' });
  } catch (error) {
    console.error('Image preprocessing error:', error);
    // If preprocessing fails, return original
    const base64String = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64String, 'base64');
    return new Blob([buffer], { type: 'image/png' });
  }
}

// Enhanced prompt engineering function
function enhancePromptForEdit(userPrompt) {
  // Add hidden instructions that preserve original characteristics
  return `${userPrompt}. Important: Maintain the exact same art style, color palette, lighting, and composition as the original image. Only modify what was specifically requested. Keep all other visual elements identical to the source image.`;
}

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

    // If image is provided, use enhanced DALL-E workflow
    if (image) {
      console.log('Processing image edit with enhanced workflow:', prompt);
      
      // QUICK WIN #1: Preprocess image for better compatibility
      const preprocessedImage = await preprocessImageForEdit(image);
      
      // QUICK WIN #2: Enhanced prompt engineering
      const enhancedPrompt = enhancePromptForEdit(prompt);
      console.log('Enhanced prompt:', enhancedPrompt);
      
      try {
        // Try DALL-E edit API with preprocessed image and enhanced prompt
        const dalleResponse = await openai.images.edit({
          model: "dall-e-2",
          image: preprocessedImage,
          prompt: enhancedPrompt,
          n: 1,
          size: "1024x1024"
        });
        
        const dalleImageUrl = dalleResponse.data[0].url;
        console.log('DALL-E edit successful:', dalleImageUrl);
        
        // Download and convert to base64
        const imageResponse = await fetch(dalleImageUrl);
        const resultBuffer = await imageResponse.arrayBuffer();
        const base64Image = `data:image/png;base64,${Buffer.from(resultBuffer).toString('base64')}`;
        
        res.status(200).json({
          success: true,
          imageUrl: base64Image,
          prompt: prompt,
          model: 'dall-e-2-edit-enhanced'
        });
        
      } catch (editError) {
        console.error('Edit API failed, using advanced fallback:', editError);
        
        // QUICK WIN #3: Smarter GPT-4o analysis with better instructions
        const visionResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are an expert AI image analyst and DALL-E 3 prompt engineer. Your job is to analyze images in extreme detail and create prompts that will make DALL-E 3 recreate the EXACT same image with specific modifications.

When creating prompts, you must:
1. Describe EVERY visual detail: exact colors (use hex codes if possible), art style, lighting direction and quality, composition, camera angle, background elements
2. Describe the subject in extreme detail: pose, expression, clothing/accessories, textures, patterns, materials
3. Specify the modification clearly and how it integrates with the existing image
4. Use phrases like "maintaining the exact same style as the original" and "preserving the identical composition"
5. Be extremely specific about what should NOT change

Your prompts should be 200-400 words and read like instructions to a precise artist.`
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `I need to modify this image with the following change: "${prompt}"

Analyze every aspect of this image and create a comprehensive DALL-E 3 prompt that will:
1. Recreate this EXACT image (describe all visual details precisely)
2. Apply ONLY this modification: "${prompt}"
3. Preserve everything else identically

Be extremely detailed about colors, style, lighting, composition, and all visual elements. Provide ONLY the DALL-E prompt, no other commentary.`
                },
                {
                  type: "image_url",
                  image_url: { url: image }
                }
              ]
            }
          ],
          max_tokens: 800,
          temperature: 0.3 // Lower temperature for more consistent, precise descriptions
        });
        
        const optimizedPrompt = visionResponse.choices[0].message.content.trim();
        console.log('GPT-4o optimized prompt (length: ' + optimizedPrompt.length + '):', optimizedPrompt);
        
        // Generate with DALL-E 3 using the optimized prompt
        const dalleResponse = await openai.images.generate({
          model: "dall-e-3",
          prompt: optimizedPrompt,
          n: 1,
          size: "1024x1024",
          quality: "standard"
        });
        
        const dalleImageUrl = dalleResponse.data[0].url;
        const imageResponse = await fetch(dalleImageUrl);
        const resultBuffer = await imageResponse.arrayBuffer();
        const base64Image = `data:image/png;base64,${Buffer.from(resultBuffer).toString('base64')}`;
        
        res.status(200).json({
          success: true,
          imageUrl: base64Image,
          prompt: prompt,
          model: 'dall-e-3-enhanced-vision',
          optimizedPrompt: optimizedPrompt.substring(0, 200) + '...', // Include snippet
          note: 'Used advanced GPT-4o vision analysis with DALL-E 3'
        });
      }
      
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
      error: 'Failed to generate design. Please try again.',
      details: error.message
    });
  }
}
