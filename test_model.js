const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testModel(modelName) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  console.log(`Testing model: ${modelName}`);
  
  try {
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const prompt = 'Return a list of 2 movies in JSON format with title and year.';
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log('Response text:', text);
  } catch (err) {
    console.error('Model error:', err.message);
  }
}

const modelToTest = process.argv[2] || 'gemma-4-31b-it';
testModel(modelToTest);
