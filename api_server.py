from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile
import os
import sys
from pathlib import Path

# Add the project to Python path
project_root = Path(__file__).parent
sys.path.append(str(project_root))

from grocery_organizer.src.core.processor import GroceryListProcessor

app = Flask(__name__)
CORS(app)

@app.route('/api/process-grocery-list', methods=['POST'])
def process_grocery_list():
    try:
        print("Processing grocery list request...")
        
        # Check if file is in request
        if 'file' not in request.files:
            print("No file in request")
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            print("Empty filename")
            return jsonify({'error': 'No file selected'}), 400

        print(f"Processing file: {file.filename}")

        # Get optional parameters
        output_format = request.form.get('output_format', 'aisle')
        store = request.form.get('store', '4500S Smiths')
        
        print(f"Output format: {output_format}, Store: {store}")

        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(mode='w+', suffix='.txt', delete=False) as temp_file:
            # Read and write the file content
            content = file.read().decode('utf-8')
            temp_file.write(content)
            temp_file_path = temp_file.name
            print(f"Saved temp file: {temp_file_path}")
            print(f"File content preview: {content[:100]}...")

        try:
            # Process the grocery list
            print("Creating processor...")
            processor = GroceryListProcessor(
                file=temp_file_path,
                store=store,
                output_format=output_format
            )
            print("Processing list...")
            result = processor.process_list()
            print(f"Processing complete. Result length: {len(result)}")
            
            return result, 200, {'Content-Type': 'text/plain'}
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                print("Cleaned up temp file")
            
    except Exception as e:
        print(f"Error processing grocery list: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)