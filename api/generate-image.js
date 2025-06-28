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
    const startResponse = await axios.post('https://api.replicate.com/v1/predictions', {
      version: '7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc',
      input: { 
        prompt: `pixel art of a ${userPrompt}, white background`,
        negative_prompt: "blurry, abstract, text, letters, watermark, low quality"
      },
    }, {
      headers: {
         'Authorization': `Token ${process.env.REACT_APP_REPLICATE_API_TOKEN}`,
         'Content-Type': 'application/json',
      },
    });

    let prediction = startResponse.data;
    const predictionId = prediction.id;

    while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
      await sleep(1000);
      const pollResponse = await axios.get(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: {
          'Authorization': `Token ${process.env.REACT_APP_REPLICATE_API_TOKEN}`,
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