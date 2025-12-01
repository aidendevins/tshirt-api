import { GoogleGenerativeAI } from '@google/generative-ai';
import Replicate from 'replicate';
import dotenv from 'dotenv';
import { getAdminDb, FieldValue } from '../firebase-admin.js';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize Replicate for Stable Diffusion with transparency
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Helper function to convert base64 data URL to buffer for Gemini
function base64ToBuffer(base64Data) {
  const base64String = base64Data.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64String, 'base64');
}

// Helper function to get mime type from base64 data URL
function getMimeType(base64Data) {
  const match = base64Data.match(/^data:(image\/\w+);base64,/);
  return match ? match[1] : 'image/png';
}

// Helper function to fetch image and convert to base64
async function urlToBase64(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');
  const contentType = response.headers.get('content-type') || 'image/png';
  return `data:${contentType};base64,${base64}`;
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
    const { prompt, images, creatorId, options = {}, sprites = [], fullPrompt } = req.body;

    if (!prompt || prompt.length < 3) {
      return res.status(400).json({ error: 'Please provide a detailed prompt' });
    }

    // Track token usage if creatorId is provided
    let creatorData = null;
    let creatorRef = null;

    if (creatorId) {
      try {
        const adminDb = getAdminDb();
        if (!adminDb) {
          // Firebase not configured, skip token tracking
          console.log('⚠️  Skipping token tracking - Firebase not configured');
        } else {
          creatorRef = adminDb.collection('creators').doc(creatorId);
          const creatorDoc = await creatorRef.get();

          if (creatorDoc.exists) {
            creatorData = creatorDoc.data();
            const currentMonth = new Date().toISOString().slice(0, 7);

            // Reset monthly counter if new month
            if (creatorData.tokenUsage?.lastResetDate !== currentMonth) {
              await creatorRef.update({
                'tokenUsage.monthlyUsed': 0,
                'tokenUsage.lastResetDate': currentMonth
              });
              creatorData.tokenUsage.monthlyUsed = 0;
            }

            // Check if under limit (default to unlimited)
            const monthlyLimit = creatorData.tokenLimits?.monthly || 999999999;
            const monthlyUsed = creatorData.tokenUsage?.monthlyUsed || 0;

            // Only enforce limit if it's not the unlimited value
            if (monthlyLimit < 999999999 && monthlyUsed >= monthlyLimit) {
              return res.status(429).json({
                error: 'Monthly token limit reached. Please contact support.',
                limit: monthlyLimit,
                used: monthlyUsed
              });
            }
          }
        }
      } catch (error) {
        console.error('Error checking token limits:', error);
        // Continue without token tracking if there's an error
      }
    }

    // Build final prompt by merging base prompt + options + sprites if provided
    let finalPrompt = (fullPrompt && typeof fullPrompt === 'string' && fullPrompt.trim().length > 3)
      ? fullPrompt.trim()
      : (prompt || '').trim();

    if (!finalPrompt) {
      return res.status(400).json({ error: 'Please provide a detailed prompt' });
    }

    // Append options to prompt if they are present (defensive; frontend already composes a rich prompt)
    try {
      const {
        imageStyle,
        customImageStyle,
        colorTreatment,
        customPaletteColors,
        effectFilter,
        moodVibe,
        textInGenPrompt,
        textStyleOption,
        customTextStyle
      } = options || {};

      const computedImageStyle = imageStyle === 'Custom' ? (customImageStyle || '') : (imageStyle || '');
      if (computedImageStyle && !/realistic photo/i.test(computedImageStyle)) {
        finalPrompt += ` Render in a ${computedImageStyle} art style.`;
      }
      if (colorTreatment && !/keep original colors/i.test(colorTreatment)) {
        if (colorTreatment === 'Custom palette' && Array.isArray(customPaletteColors) && customPaletteColors.length > 0) {
          finalPrompt += ` Use a custom color palette with colors: ${customPaletteColors.join(', ')}.`;
        } else {
          finalPrompt += ` Apply ${colorTreatment} color treatment.`;
        }
      }
      if (effectFilter && effectFilter !== 'None') {
        finalPrompt += ` Add ${effectFilter} visual effect.`;
      }
      if (moodVibe) {
        finalPrompt += ` The overall mood should be ${moodVibe}.`;
      }
      if (textInGenPrompt && textInGenPrompt.trim()) {
        finalPrompt += ` Incorporate this text: "${textInGenPrompt.trim()}"`;
        if (textStyleOption && textStyleOption !== 'Bold statement') {
          finalPrompt += ` in a ${textStyleOption} style.`;
        } else if (customTextStyle && customTextStyle.trim()) {
          finalPrompt += ` in this text style: ${customTextStyle.trim()}.`;
        } else {
          finalPrompt += `.`;
        }
      }
    } catch (e) {
      // Non-fatal
      console.warn('Prompt options merge warning:', e?.message);
    }

    // If images are provided, use Gemini Flash with multiple images
    if (images && images.length > 0) {
      try {
        // Use Gemini 2.0 Flash for fast vision capabilities
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

        // Prepare all image parts for Gemini
        const imageParts = images.map((image) => {
          const imageBuffer = base64ToBuffer(image);
          const mimeType = getMimeType(image);

          return {
            inlineData: {
              data: imageBuffer.toString('base64'),
              mimeType: mimeType
            }
          };
        });

        // Prepare sprite parts (optional). We attach the entire sprite images and instruct Gemini to extract the described element.
        const validSprites = Array.isArray(sprites) ? sprites.filter(s => s && (s.imageData || s.url)) : [];
        const spriteParts = validSprites.map((s) => {
          const dataUrl = s.imageData || s.url;
          const buf = base64ToBuffer(dataUrl);
          const mime = getMimeType(dataUrl);
          return {
            inlineData: {
              data: buf.toString('base64'),
              mimeType: mime
            }
          };
        });

        // Describe sprites to the model if present
        if (validSprites.length > 0) {
          const spriteDescriptions = validSprites
            .map((s, i) => (s.description && s.description.trim()) ? `${i + 1}) ${s.description.trim()}` : `${i + 1}) sprite image`)
            .join('; ');
          finalPrompt += ` Extract the following elements from the attached sprite images and incorporate them into the final design: ${spriteDescriptions}.`;
        }

        // Build prompt text that references image positions
        const imageReferences = images.map((_, i) => `${i === 0 ? 'first' : i === 1 ? 'second' : i === 2 ? 'third' : i === 3 ? 'fourth' : 'fifth'} image`).join(', ');
        let promptText = images.length === 1
          ? `Based on this reference image, ${finalPrompt} Generate a high-quality, print-ready design.`
          : `Based on these ${images.length} reference images (${imageReferences}), ${finalPrompt} Generate a high-quality, print-ready design.`;

        promptText += ` Never change the integrity of the original image. Keep the main elements, background, and overall visual consistency of the original image unless the user specifically asks for a change. Maintain the same background style and appearance as the reference image.`;

        // Generate new image with Gemini native image generation
        const result = await model.generateContent({
          contents: [{
            role: 'user',
            parts: [
              { text: promptText },
              ...imageParts,
              ...spriteParts
            ]
          }],
          generationConfig: {
            responseModalities: ['IMAGE'],
            temperature: 0.4,
            topK: 32,
            topP: 1,
          }
        });

        const response = await result.response;
        const generatedImage = response.candidates[0]?.content?.parts?.find(
          part => part.inlineData
        );

        if (!generatedImage) {
          throw new Error('No image generated by Gemini');
        }

        const base64Image = `data:${generatedImage.inlineData.mimeType};base64,${generatedImage.inlineData.data}`;

        // Track token usage
        const tokensUsed = response.usageMetadata?.totalTokenCount || 0;
        if (creatorRef && tokensUsed > 0) {
          try {
            await creatorRef.update({
              'tokenUsage.totalUsed': FieldValue.increment(tokensUsed),
              'tokenUsage.monthlyUsed': FieldValue.increment(tokensUsed),
              'tokenUsage.byOperation.imageGeneration': FieldValue.increment(tokensUsed)
            });
            console.log(`✅ Tracked ${tokensUsed} tokens for creator ${creatorId}`);
          } catch (error) {
            console.error('Error updating token usage:', error);
          }
        }

        res.status(200).json({
          success: true,
          imageUrl: base64Image,
          prompt: finalPrompt,
          model: 'gemini-2.0-flash-imagen',
          tokensUsed: tokensUsed
        });

      } catch (visionError) {
        console.error('Gemini Flash 2.0 error:', visionError);

        res.status(200).json({
          success: false,
          error: visionError.message,
          prompt: finalPrompt,
          model: 'gemini-2.0-flash-error'
        });
      }

    } else {
      // No image provided - use Stable Diffusion via Replicate
      try {
        console.log('🎨 Generating with SDXL via Replicate...');
        
        const enhancedPrompt = `${finalPrompt}, isolated subject, centered composition, simple clean background, high quality, detailed, vibrant artwork, professional design, print-ready, no background clutter`;

        const output = await replicate.run(
          "stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
          {
            input: {
              prompt: enhancedPrompt,
              negative_prompt: "blurry, low quality, distorted, deformed, ugly, bad anatomy, background clutter",
              width: 1024,
              height: 1024,
              num_outputs: 1,
              scheduler: "K_EULER",
              guidance_scale: 7.5,
              num_inference_steps: 25
            }
          }
        );

        console.log('✅ SDXL output:', output);

        // Replicate returns URL(s)
        let generatedImageUrl;
        if (Array.isArray(output)) {
          generatedImageUrl = output[0];
        } else if (typeof output === 'string') {
          generatedImageUrl = output;
        } else if (output?.output) {
          generatedImageUrl = Array.isArray(output.output) ? output.output[0] : output.output;
        }

        if (!generatedImageUrl) {
          throw new Error('No image generated by Stable Diffusion');
        }

        // Step 2: Remove background using Replicate's background removal model
        console.log('🔄 Removing background...');
        
        const bgRemovalOutput = await replicate.run(
          "lucataco/remove-bg:95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1",
          {
            input: {
              image: generatedImageUrl
            }
          }
        );

        console.log('✅ Background removal complete');

        // Get the transparent image URL
        let transparentImageUrl;
        if (typeof bgRemovalOutput === 'string') {
          transparentImageUrl = bgRemovalOutput;
        } else if (Array.isArray(bgRemovalOutput)) {
          transparentImageUrl = bgRemovalOutput[0];
        } else if (bgRemovalOutput?.output) {
          transparentImageUrl = bgRemovalOutput.output;
        } else {
          // Fallback to original if bg removal fails
          console.warn('⚠️ Background removal output unexpected, using original');
          transparentImageUrl = generatedImageUrl;
        }

        // Convert URL to base64 for consistent response format
        const base64Image = await urlToBase64(transparentImageUrl);

        // Track usage
        if (creatorRef) {
          try {
            await creatorRef.update({
              'tokenUsage.totalUsed': FieldValue.increment(1),
              'tokenUsage.monthlyUsed': FieldValue.increment(1),
              'tokenUsage.byOperation.imageGeneration': FieldValue.increment(1)
            });
            console.log(`✅ Tracked 1 image generation for creator ${creatorId}`);
          } catch (error) {
            console.error('Error updating token usage:', error);
          }
        }

        res.status(200).json({
          success: true,
          imageUrl: base64Image,
          prompt: finalPrompt,
          model: 'sdxl+remove-bg',
          hasTransparency: true
        });

      } catch (error) {
        console.error('SDXL generation error:', error);

        res.status(500).json({
          success: false,
          error: error.message,
          prompt: finalPrompt,
          model: 'sdxl+remove-bg'
        });
      }

    }

  } catch (error) {
    console.error('Generation error:', error);

    if (error.message && error.message.includes('safety')) {
      return res.status(400).json({
        error: 'Invalid prompt. Please try a different description.'
      });
    }

    if (error.message && error.message.includes('SAFETY')) {
      return res.status(400).json({
        error: 'Content safety filter triggered. Please try a different prompt or image.'
      });
    }

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
