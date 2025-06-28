import axios from 'axios';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const userPrompt = req.body.prompt;
  if (!userPrompt) {
    return res.status(400).json({ message: 'Prompt is required' });
  }
  try {
    // In api/generate-image.js
    const startResponse = await 
    axios.post('https://api.replicate.com/v1/predictions', {
    // Use a fast, FREE model perfect for emojis/icons
    version:
  'de1f499fe6821182281c74147d25687714856b37016e7520330626002f231e06', 
    input: { 
      prompt: `An emoji of a ${userPrompt}, pixel art style`,
    },
   }, {
  headers: {
     'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
     'Content-Type': 'application/json',
  },
});
    

    let prediction = startResponse.data;
    const predictionId = prediction.id;

    while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
      await sleep(1000);
      const pollResponse = await axios.get(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: {
          'Authorization': `Token ${process.env.REACT_API_TOKEN}`,
        },
      });
      prediction = pollResponse.data;
    }

    if (prediction.status === 'failed') {
      return res.status(500).json({ message: 'AI image generation failed', error: prediction.error });
    }
    res.status(200).json({ imageUrl: prediction.output[0] });
  } catch (error) {
    console.error('Replicate API Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ message: 'Error calling Replicate API' });
  }
}