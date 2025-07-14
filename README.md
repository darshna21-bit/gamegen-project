# GenPlay Studio!
Empowering Everyone to Create Personalized HTML5 Games with AI  

## Table of Contents

- [About the Project](#about-the-project)
- [Features](#features)
- [Key Strengths & Criteria Alignment](#key-strengths--criteria-alignment)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
- [Future Enhancements](#future-enhancements)
- [What's Open for Exploration](#whats-open-for-exploration)
- [Contributing](#contributing)
- [Submission Terms](#submission-terms)
- [Contact](#contact)

## About the Project

GenPlay Studio! is a cutting-edge, web-based tool designed to make game creation accessible to everyone, regardless of their coding background. Leveraging advanced artificial intelligence, our platform allows users to select from a variety of classic game templates, then personalize them with unique AI-generated visuals and fine-tune gameplay parameters, all culminating in a fully playable, exportable HTML5 (H5) game. Our mission is to transform complex game development into a simple, intuitive, and fun experience for non-technical users.

### Built With
Frontend: React.js, HTML5 Canvas, Tailwind CSS  
Backend/AI Integration: Node.js (Express.js, path, fs, fs/promises, cors, archiver), Hugging Face API (for text generation and image generation, potentially Tone.js for sound generation)  
Deployment: Locally Hosted

## Features

GenPlay Studio! offers a robust set of features designed for simplicity and power:

### Intuitive User Workflow:

The user experience begins with a welcoming screen, followed by a selection interface for five classic game templates.

Users can choose any of the available templates: Flappy Bird, Speed Runner, Whack-the-Mole, Simple Match-3, and Crossy Road.

The workflow is streamlined: Pick Template → Reskin (AI) → Set Parameters → Export.

### Five Classic Game Templates:

Start creating instantly with pre-built templates for:

- Flappy Bird  
- Speed Runner  
- Whack-the-Mole  
- Simple Match-3  
- Crossy Road

### AI Reskinning:

Generate new characters, backgrounds, obstacles, and other artistic assets using simple text prompts. The platform utilizes the Hugging Face text-to-image model (stabilityai/stable-diffusion-xl-base-1.0) for on-the-fly generation and also provides a library of pre-generated AI assets for quick selection.  
(For this demonstration, the primary visual customization leverages these pre-generated AI assets to ensure optimal speed and reliability due to API credit considerations.) Customize:

- Environment/Background  
- NPCs & Main Character

### AI-Driven Game Parameter Controls:

Modify game mechanics through natural language or smart AI suggestions.

For Flappy Bird: Adjust gravity, pipe gap, and game speed via a dedicated left panel. Change character, pipes, and background image using AI prompts or pre-generated AI assets.

For Speed Runner: Modify player horizontal speed and obstacle spawn delay. Change the main character and obstacles using AI prompts.

### Dynamic Difficulty Settings:

AI adjusts game parameters based on "Easy," "Medium," or "Hard" selections.

### Rapid Customization:

Experience quick AI reskinning, aiming for under 1 minute per instance.

### One-Click H5 Export:

Download your customized game as a zipped folder containing an index.html file, ready to play offline.

## Key Strengths & Criteria Alignment

Our project is built with the judging criteria firmly in mind:

- **Technical Execution**: Demonstrates smooth AI integration for both visual and parameter generation, resulting in robust and playable H5 games.  
- **Usability**: Prioritizes a user-friendly interface and a clear, step-by-step workflow, ensuring true accessibility for non-technical users.  
- **Export Quality**: Guarantees fully functional H5 games that accurately reflect all user customizations and run seamlessly offline.  
- **AI/LLM Usage**: Leverages AI effectively for generating unique art assets (via Hugging Face text-to-image model and pre-generated assets), influencing gameplay mechanics.  
- **Speed**: Optimizes the reskinning process to be highly efficient, targeting under 1 minute per instance.  
- **Bonus Features**: We have explored and potentially implemented features beyond the core requirements to enhance the user experience and showcase advanced AI capabilities.

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js (for frontend and backend)  
- npm or yarn  
- Git

### Installation

Clone the repository:

```bash
git clone https://github.com/darshna21-bit/gamegen-project.git
```

Navigate to the project directory:

```bash
cd gamegen-project
```

Install frontend dependencies:

```bash
npm install
```

Install backend dependencies:

```bash
# For a typical Node.js/Express app, this might be:
# If your package.json for backend is in a 'backend' subdirectory:
# cd backend
# npm install 
# cd ..
# If your backend package.json is in the root alongside frontend:
npm install # or yarn install (if all dependencies are in one package.json)
```

Configure API Keys (Optional for Demo):

While GenPlay Studio! is designed to leverage the Hugging Face API for real-time asset generation, you can still run the demo using the included pre-generated AI assets without an API key.

If you wish to enable real-time AI generation, you will need to obtain an API token from Hugging Face.

Create a `.env` file in your backend directory and add your Hugging Face API token:

```env
HUGGING_FACE_API_TOKEN=your_token_here
```

## Usage

Start the frontend development server:

```bash
npm start
```

This will typically start the frontend on http://localhost:3000.

Start the backend server:

```bash
node server.js
```

This will typically start the backend on http://localhost:5000.

Open your web browser and navigate to http://localhost:3000.

Follow the intuitive 4-step workflow:

1. Pick a game template.  
2. Use AI prompts to reskin its visuals.  
3. Adjust gameplay parameters with AI assistance.  
4. Click "Export" to download your customized H5 game!

## Future Enhancements

We are actively exploring or have implemented the following beyond the core requirements:

- **AI-Generated Background Music (BGM)**: Allowing users to create or select unique background music for their games, powered by AI.  
- **AI-Driven Logic Extension**: Capabilities for users to prompt for minor gameplay logic modifications (e.g., "Make moles shake before they appear") and have the game's code adapt.  
- **Mobile Game Controls**: Incorporating touch and sensor-based controls into the exported H5 games for optimal mobile experience.

## What's Open for Exploration

We believe there's immense potential for further innovation:

- Adding more diverse game templates.  
- Introducing more advanced AI-driven personalization options.  
- Developing novel user interaction paradigms for game design.  
- Exploring unique export formats or direct publishing options.

## Contributing

Contributions are highly valued! If you'd like to contribute:

1. Fork the Project  
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)  
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)  
4. Push to the Branch (`git push origin feature/AmazingFeature`)  
5. Open a Pull Request

## Submission Terms

This project is submitted to the KGen.io hackathon in accordance with their terms and conditions, which state that all submissions, including code, assets, and exported games, will become the property of the organizer if the project is selected among the top entries.

## Contact

**Team PromptPlay**  
Solo Developer: **Darshna Shingavi**  
📧 Email: [darshnashingavi21@gmail.com](mailto:darshnashingavi21@gmail.com)  
🔗 Project Link: [https://github.com/darshna21-bit/gamegen-project#readme](https://github.com/darshna21-bit/gamegen-project#readme)
