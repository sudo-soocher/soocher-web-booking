import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchSpecialities } from "@/lib/specialities";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

// Function to get available specialities
const getAvailableSpecialities = async (): Promise<string[]> => {
  try {
    // Shared cache rather than a second read of `Specialities/available` — this
    // module is currently unreferenced, but re-enabling the AI assistant would
    // otherwise reintroduce a duplicate billed read of a document the home page
    // has already fetched.
    const specialities = await fetchSpecialities();
    return specialities.map((s) => s.name);
  } catch (error) {
    console.error("Error fetching specialities:", error);
    return [];
  }
};

// Create context with dynamic specialities
const createContext = async () => {
  const specialities = await getAvailableSpecialities();

  return `You are a medical consultation assistant for Soocher, a telemedicine platform. 
Your role is to help users find the right medical specialist based on their symptoms. 
Be empathetic, professional, and clear in your responses. 
Always suggest consulting with a qualified medical professional for proper diagnosis.

Provide your response in the following JSON format:
{
  "message": "A clear explanation of your analysis and recommendations",
  "suggestedSpecialities": ["Specialist Type 1", "Specialist Type 2"]
}

Guidelines for your response:
1. The message should be empathetic and professional
2. Include a brief analysis of the symptoms
3. Explain why you're suggesting each specialist
4. Keep specialities to a maximum of 3 suggestions
5. Use the exact speciality names as they appear in this list, without any modifications: 
   ${specialities.join(", ")}

Example response format:
{
  "message": "Based on your symptoms of [symptoms], I recommend consulting with a specialist. [Explanation of why]. Here are the recommended specialists who can help you:",
  "suggestedSpecialities": ["General Physician (M.B.B.S)", "Neurology"]
}`;
};

export const generateGeminiResponse = async (
  userInput: string
): Promise<{
  message: string;
  suggestedSpecialities: string[];
}> => {
  try {
    // Get context with current specialities
    const context = await createContext();

    // Start a chat
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: "I need help finding the right specialist." }],
        },
        {
          role: "model",
          parts: [
            {
              text: "I'll help you find the right medical specialist based on your symptoms. Please describe what you're experiencing.",
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
      },
    });

    // Send message and get response
    const result = await chat.sendMessage([
      {
        text:
          context +
          "\n\nUser symptoms: " +
          userInput +
          "\n\nProvide a response in JSON format with 'message' for the explanation and 'suggestedSpecialities' as an array of specialist types.",
      },
    ]);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    try {
      // Extract JSON from the response (it might be wrapped in code blocks or have additional text)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      const parsedResponse = JSON.parse(jsonMatch[0]);
      return {
        message: parsedResponse.message,
        suggestedSpecialities: parsedResponse.suggestedSpecialities,
      };
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      // Fallback if JSON parsing fails
      return {
        message: text,
        suggestedSpecialities: [],
      };
    }
  } catch (error) {
    console.error("Error generating response:", error);
    throw error;
  }
};
