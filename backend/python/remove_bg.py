#!/usr/bin/env python3
"""
Simple script to remove background using rembg library
Usage: python3 remove_bg.py <input_path> <output_path>
"""
import sys
import os

def main():
    if len(sys.argv) != 3:
        print('Usage: python3 remove_bg.py <input_path> <output_path>', file=sys.stderr)
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    if not os.path.exists(input_path):
        print(f'Error: Input file not found: {input_path}', file=sys.stderr)
        sys.exit(1)
    
    try:
        from rembg import remove
        from PIL import Image
        
        # Read input image
        with open(input_path, 'rb') as input_file:
            input_data = input_file.read()
        
        # Remove background
        output_data = remove(input_data)
        
        # Save output
        with open(output_path, 'wb') as output_file:
            output_file.write(output_data)
        
        print(f'Successfully processed: {input_path} -> {output_path}', file=sys.stderr)
        sys.exit(0)
        
    except ImportError as e:
        print(f'Error: Required library not found: {e}', file=sys.stderr)
        print('Please install rembg: pip install rembg', file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f'Error processing image: {e}', file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

