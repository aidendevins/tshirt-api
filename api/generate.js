import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  // Allow all origins (temporary fix for CORS)
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

    console.log('Generating design for:', prompt);

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `Create a t-shirt graphic design: ${prompt}. The design should be centered, bold, and suitable for screen printing on a t-shirt.`,
      n: 1,
      size: "1024x1024",
      quality: "standard"
    });

    const imageUrl = response.data[0].url;

    res.status(200).json({
      success: true,
      imageUrl: imageUrl,
      prompt: prompt
    });

  } catch (error) {
    console.error('Error:', error);
    
    if (error.status === 400) {
      return res.status(400).json({ 
        error: 'Invalid prompt. Please try a different description.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to generate design. Please try again.' 
    });
  }
}
