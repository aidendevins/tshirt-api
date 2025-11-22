#!/usr/bin/env python3
import sys
import io
import json
import base64
import numpy as np
from PIL import Image, ImageFilter
import os

def data_url_to_bytes(data_url: str) -> bytes:
    header, b64data = data_url.split(',', 1)
    return base64.b64decode(b64data)

def bytes_to_data_url(b: bytes, mime: str = 'image/png') -> str:
    return f'data:{mime};base64,' + base64.b64encode(b).decode('utf-8')

def tight_crop_alpha(img: Image.Image) -> Image.Image:
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    bbox = img.split()[-1].getbbox()
    if bbox:
        return img.crop(bbox)
    return img

def apply_mask(img: Image.Image, mask: np.ndarray) -> Image.Image:
    """Apply binary mask to image, making background transparent"""
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # Ensure mask is same size as image
    if mask.shape[:2] != img.size[::-1]:
        from PIL import Image as PILImage
        mask_pil = PILImage.fromarray(mask).resize(img.size, PILImage.LANCZOS)
        mask = np.array(mask_pil)
    
    # Convert mask to alpha channel
    if len(mask.shape) == 3:
        mask = mask[:, :, 0]  # Take first channel if RGB
    
    mask_8bit = (mask * 255).astype(np.uint8) if mask.dtype != np.uint8 else mask
    
    # Apply mask to alpha channel
    img_array = np.array(img)
    img_array[:, :, 3] = mask_8bit
    
    return Image.fromarray(img_array, 'RGBA')

def extract_with_grounding_sam(image: Image.Image, text_prompt: str):
    """
    Use GroundingDINO + SAM to extract object based on text description
    Returns masked image with transparent background
    """
    try:
        import torch
        try:
            from groundingdino.util.inference import load_model, load_image, predict, annotate
        except ImportError:
            # Alternative import path
            import sys
            import os
            gdino_path = os.path.expanduser("~/myenv/GroundingDINO")
            if os.path.exists(gdino_path):
                sys.path.insert(0, gdino_path)
                from groundingdino.util.inference import load_model, load_image, predict, annotate
            else:
                raise
        from segment_anything import sam_model_registry, SamPredictor
    except ImportError as e:
        raise RuntimeError(f'GroundingDINO or SAM not installed: {e}')
    
    # Convert PIL to numpy array
    image_np = np.array(image.convert('RGB'))
    
    # Initialize GroundingDINO
    # Note: You'll need to download models - these paths should be configurable
    config_path = os.path.expanduser("~/.cache/groundingdino/GroundingDINO_SwinT_OGC.py")
    weights_path = os.path.expanduser("~/.cache/groundingdino/groundingdino_swint_ogc.pth")
    
    if not os.path.exists(weights_path):
        raise RuntimeError(f'GroundingDINO weights not found at {weights_path}')
    
    grounding_model = load_model(config_path, weights_path)
    
    # Run GroundingDINO detection
    boxes, logits, phrases = predict(
        model=grounding_model,
        image=image_np,
        caption=text_prompt,
        box_threshold=0.3,
        text_threshold=0.25
    )
    
    if len(boxes) == 0:
        raise RuntimeError(f'No objects detected for: {text_prompt}')
    
    # Use the highest confidence box
    best_box = boxes[0]
    
    # Initialize SAM
    sam_checkpoint = os.path.expanduser("~/.cache/sam/sam_vit_h_4b8939.pth")
    if not os.path.exists(sam_checkpoint):
        raise RuntimeError(f'SAM weights not found at {sam_checkpoint}')
    
    sam = sam_model_registry["vit_h"](checkpoint=sam_checkpoint)
    sam.to(device='cuda' if torch.cuda.is_available() else 'cpu')
    predictor = SamPredictor(sam)
    
    # Run SAM to get precise mask
    predictor.set_image(image_np)
    masks, scores, logits = predictor.predict(
        box=best_box,
        multimask_output=False
    )
    
    # Apply mask to create transparent background
    mask = masks[0].astype(np.float32)
    result = apply_mask(image, mask)
    
    return result

def remove_bg_rmbg_v2(image: Image.Image) -> Image.Image:
    """
    Try improved RemBG models - better quality than u2net
    Requires: pip install rembg[new]
    Tries: briarmbg (best) -> rmbg-2 -> silueta -> u2net (fallback)
    """
    try:
        from rembg import remove, new_session
        
        # Try models in order of quality
        models_to_try = ['briarmbg', 'rmbg-2', 'silueta', 'u2net']
        
        for model_name in models_to_try:
            try:
                session = new_session(model_name)
                output = remove(image, session=session)
                if output.mode != 'RGBA':
                    output = output.convert('RGBA')
                return output
            except Exception:
                continue  # Try next model
        
        # Final fallback to default
        output = remove(image)
        if output.mode != 'RGBA':
            output = output.convert('RGBA')
        return output
        
    except Exception as e:
        raise RuntimeError(f'RMBG failed: {e}')

def remove_bg_clipdrop(image: Image.Image) -> Image.Image:
    """
    Use ClipDrop API for high-quality background removal
    Requires: CLIPDROP_API_KEY env var
    """
    try:
        import requests
        api_key = os.environ.get('CLIPDROP_API_KEY')
        if not api_key:
            raise RuntimeError('CLIPDROP_API_KEY not set')
        
        # Convert to bytes
        buf = io.BytesIO()
        image.save(buf, format='PNG')
        buf.seek(0)
        
        # Call ClipDrop API
        response = requests.post(
            'https://clipdrop-api.co/remove-background/v1',
            files={'image_file': buf},
            headers={'x-api-key': api_key},
            timeout=30
        )
        
        if response.status_code != 200:
            raise RuntimeError(f'ClipDrop API error: {response.status_code}')
        
        result = Image.open(io.BytesIO(response.content)).convert('RGBA')
        return result
    except Exception as e:
        raise RuntimeError(f'ClipDrop failed: {e}')

def refine_mask_edges(img: Image.Image) -> Image.Image:
    """Refine edges using morphological operations and blur"""
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # Apply subtle edge refinement
    alpha = img.split()[3]
    
    # Sharpen alpha channel slightly
    alpha_sharp = alpha.filter(ImageFilter.UnsharpMask(radius=1, percent=100, threshold=3))
    
    # Combine back
    img_array = np.array(img)
    img_array[:, :, 3] = np.array(alpha_sharp)
    
    return Image.fromarray(img_array, 'RGBA')

def main():
    # Allow reading payload either from stdin or a file path in argv[1]
    payload = {}
    if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
        with open(sys.argv[1], 'r', encoding='utf-8') as f:
            payload = json.load(f)
    else:
        data = sys.stdin.read()
        payload = json.loads(data or '{}')
    
    image_data_url = payload.get('imageData')
    element_description = payload.get('elementDescription', '').strip()

    if not image_data_url or not image_data_url.startswith('data:image/'):
        print(json.dumps({'error': 'Invalid imageData'}))
        return

    # Decode input image
    img_bytes = data_url_to_bytes(image_data_url)
    pil_img = Image.open(io.BytesIO(img_bytes)).convert('RGBA')
    
    try:
        # Strategy 1: If description provided, try GroundingDINO + SAM (most accurate)
        if element_description:
            try:
                result = extract_with_grounding_sam(pil_img, element_description)
            except Exception as gs_error:
                # Fallback to ClipDrop if available
                try:
                    result = remove_bg_clipdrop(pil_img)
                except Exception:
                    # Final fallback to RMBG-2
                    try:
                        result = remove_bg_rmbg_v2(pil_img)
                    except Exception as rm_error:
                        print(json.dumps({
                            'error': f'All extraction methods failed. GroundingDINO+SAM: {gs_error}, RMBG: {rm_error}'
                        }))
                        return
        else:
            # No description - use ClipDrop or RMBG for full background removal
            try:
                result = remove_bg_clipdrop(pil_img)
            except Exception:
                try:
                    result = remove_bg_rmbg_v2(pil_img)
                except Exception as e:
                    print(json.dumps({'error': f'Background removal failed: {e}'}))
                    return
        
        # Refine edges for cleaner output
        result = refine_mask_edges(result)
        
        # Tight crop to remove transparent padding
        result = tight_crop_alpha(result)
        
        # Encode to PNG data URL
        buf = io.BytesIO()
        result.save(buf, format='PNG', optimize=True)
        out_data_url = bytes_to_data_url(buf.getvalue(), 'image/png')

        print(json.dumps({'spriteImageUrl': out_data_url}))
        
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()


