from flask import Flask, request, jsonify
import cv2
import numpy as np
from keras.models import load_model
from keras.preprocessing.image import img_to_array
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

# Load the pre-trained CNN model (assuming you've saved it)
cnn_model = load_model('model/cnn_weights.hdf5')

# Function to process the image and make predictions
def analyze_injury(image):
    # Resize the image to match the input size of the model (64x64)
    image = cv2.resize(image, (64, 64))
    image = img_to_array(image)
    image = np.expand_dims(image, axis=0)

    # Predict the class
    prediction = cnn_model.predict(image)
    predicted_class = np.argmax(prediction, axis=1)

    # Return the prediction result (severity, injury type, steps to take)
    severity = ["Low", "Moderate", "High", "Critical"][predicted_class[0]]
    injury_type = "Fracture"  # Example, map it to your actual classes
    steps_to_take = "Seek medical attention immediately"  # Example step

    return severity, injury_type, steps_to_take

@app.route('/analyze', methods=['POST'])
def analyze():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    # Save the uploaded file to the server temporarily
    temp_file_path = "temp_image.jpg"
    file.save(temp_file_path)
    
    try:
        # Read the image
        image = cv2.imread(temp_file_path)
        
        # Analyze the injury
        severity, injury_type, steps_to_take = analyze_injury(image)

        # Return the result as JSON
        return jsonify({
            'severity': severity,
            'injury_type': injury_type,
            'steps_to_take': steps_to_take
        })
    finally:
        # Ensure the temporary file is deleted
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

if __name__ == '__main__':
    app.run(debug=True)