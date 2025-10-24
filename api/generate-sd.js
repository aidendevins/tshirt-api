import Replicate from 'replicate';
import OpenAI from 'openai';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Helper function to convert base64 data URL to Blob
function base64ToBlob(base64Data) {
  // Remove data URL prefix if present
  const base64String = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64String, 'base64');
  
  // Create a Blob (works better than File in Node.js environment)
  return new Blob([buffer], { type: 'image/png' });
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

    // If image is provided, use DALL-E images.edit() API (the CORRECT way!)
    if (image) {
      console.log('Generating with DALL-E images.edit() API:', prompt);
      
      try {
        // Convert base64 to buffer
        const base64String = image.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64String, 'base64');
        
        // Create a proper file for the OpenAI API
        const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
        
        // Use DALL-E's edit endpoint - this is what ChatGPT actually uses!
        const dalleResponse = await openai.images.edit({
          model: "dall-e-2", // Note: edit() only works with dall-e-2, not dall-e-3
          image: imageBlob,
          prompt: prompt,
          n: 1,
          size: "1024x1024"
        });
        
        const dalleImageUrl = dalleResponse.data[0].url;
        console.log('DALL-E edited image URL:', dalleImageUrl);
        
        // Download the image from OpenAI to bypass CORS
        const imageResponse = await fetch(dalleImageUrl);
        const resultBuffer = await imageResponse.arrayBuffer();
        
        // Convert to base64 data URL
        const base64Image = `data:image/png;base64,${Buffer.from(resultBuffer).toString('base64')}`;
        
        res.status(200).json({
          success: true,
          imageUrl: base64Image,
          prompt: prompt,
          model: 'dall-e-2-edit'
        });
        
      } catch (editError) {
        console.error('Edit API error:', editError);
        
        // If edit fails, fall back to DALL-E 3 generation with vision
        console.log('Falling back to DALL-E 3 generation with vision analysis');
        
        const visionResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are an expert at analyzing images and creating optimal DALL-E 3 prompts. Create a detailed prompt that preserves the original image's characteristics while incorporating the requested changes."
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyze this image and create a DALL-E 3 prompt that: 1) Preserves the style, colors, and composition, 2) Incorporates this modification: "${prompt}". Provide only the prompt, no other text.`
                },
                {
                  type: "image_url",
                  image_url: { url: image }
                }
              ]
            }
          ],
          max_tokens: 500
        });
        
        const optimizedPrompt = visionResponse.choices[0].message.content.trim();
        
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
          model: 'dall-e-3-fallback',
          note: 'Edit API failed, used generation with vision analysis'
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
    
    // More specific error for image format issues
    if (error.message && error.message.includes('image')) {
      return res.status(400).json({
        error: 'Invalid image format. Please try a different image.'
      });
    }

    res.status(500).json({
      error: 'Failed to generate design. Please try again.'
    });
  }
}
