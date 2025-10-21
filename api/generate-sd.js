import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
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
    const { prompt } = req.body;

    if (!prompt || prompt.length < 3) {
      return res.status(400).json({ error: 'Please provide a detailed prompt' });
    }

    console.log('Generating with Stable Diffusion XL:', prompt);

    // Run Stable Diffusion XL
    const output = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          prompt: `${prompt}, high quality, detailed, vibrant artwork`,
          negative_prompt: "ugly, blurry, low quality, distorted, text, watermark",
          width: 1024,
          height: 1024,
          num_outputs: 1,
          num_inference_steps: 30,
          guidance_scale: 7.5
        }
      }
    );

    // output is an array of image URLs
    const imageUrl = output[0];

    res.status(200).json({
      success: true,
      imageUrl: imageUrl,
      prompt: prompt,
      model: 'stable-diffusion-xl'
    });

  } catch (error) {
    console.error('Stable Diffusion error:', error);
    
    if (error.message && error.message.includes('safety')) {
      return res.status(400).json({ 
        error: 'Invalid prompt. Please try a different description.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to generate design. Please try again.'
    });
  }
}
