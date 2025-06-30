// api/generate-image.js
import axios from 'axios';
import { Buffer } from 'buffer'; // Import Buffer for Node.js environments

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const userPrompt = req.body.prompt;
  if (!userPrompt) {
    return res.status(400).json({ message: 'Prompt is required' });
  }

  // Retrieve API Token and URL from environment variables
  const HF_API_TOKEN = process.env.HF_API_TOKEN;
  const HF_API_URL = process.env.HF_API_URL;

  if (!HF_API_TOKEN || !HF_API_URL) {
    console.error('Server configuration error: Hugging Face API Token or URL is missing.');
    return res.status(500).json({ message: 'Server configuration error: API token or URL missing.' });
  }

  try {
    const headers = {
    'Authorization': `Bearer ${HF_API_TOKEN}`,
    'Content-Type': 'application/json',
    'Accept': 'image/png', // <--- CHANGE THIS LINE TO THIS
    };

    // Refine the prompt for pixel art style, flying pose, and isolated sprite
    const payload = {
      inputs: `A ${userPrompt}, pixel art style, 8-bit, 16-bit, side view, flying pose, character sprite, in motion, looking right, isolated on a solid white background, no shadow, clean lines, simple design, game asset.`,
    };

    // Make the initial request to Hugging Face
    // responseType: 'arraybuffer' is crucial for handling binary image data
    const response = await axios.post(HF_API_URL, payload, { headers, responseType: 'arraybuffer' });

    // Check for a 503 status, which often means the model is loading (cold start)
    if (response.status === 503 && response.data && response.data.toString('utf8').includes("is currently loading")) {
      console.log("Hugging Face model is currently loading (cold start). Client should retry.");
      return res.status(503).json({ message: 'Model is loading. Please try again in a few seconds.' });
    }

    // Process a successful image response (binary data)
    if (response.headers['content-type'] && response.headers['content-type'].startsWith('image/')) {
        const imageBuffer = Buffer.from(response.data); // Convert ArrayBuffer to Node.js Buffer
        const base64Image = imageBuffer.toString('base64');
        const imageUrl = `data:${response.headers['content-type']};base64,${base64Image}`;
        return res.status(200).json({ imageUrl });
    }
    // Handle other non-error, non-image responses (e.g., unexpected JSON, or a different 2xx status)
    else {
        const responseText = response.data.toString('utf8'); // Try to read as text if not image
        console.warn('Hugging Face API returned unexpected response type or content:', response.headers['content-type'], responseText);
        return res.status(500).json({ message: `Unexpected response from Hugging Face API: ${responseText}` });
    }

  } catch (error) {
    // Detailed error logging and response
    if (error.response) {
      const errorResponseData = error.response.data ? error.response.data.toString('utf8') : 'No response data';
      console.error('Hugging Face API Error:', error.response.status, errorResponseData);
      if (error.response.status === 503 && errorResponseData.includes("is currently loading")) {
        return res.status(503).json({ message: 'Model is loading. Please try again in a few seconds.' });
      }
      return res.status(error.response.status).json({ message: `API Error ${error.response.status}: ${errorResponseData}` });
    } else if (error.request) {
      console.error('Hugging Face API Error: No response received from server.', error.message);
      return res.status(500).json({ message: 'No response from Hugging Face API. Check network connection or API URL.' });
    } else {
      console.error('Hugging Face API Error: Request setup failed.', error.message);
      return res.status(500).json({ message: 'Error setting up Hugging Face API request.' });
    }
  }
}