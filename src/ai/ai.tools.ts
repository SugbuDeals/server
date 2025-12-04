import Groq from "groq-sdk";

const tools: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "findProducts",
      description: "Search and get an array of products with the following key",
      parameters: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description: "Keyword to search in product titles, descriptions, and categories"
          },
        },
        required: ["key"],  // <-- ADD THIS
        additionalProperties: false  // <-- ADD THIS
      }
    }
  },
  {
    type: "function",
    function: {
      name: "findStores",
      description: "Search and get an array of stores with the following key",
      parameters: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description: "Keyword to search in store names and descriptions"
          },
        },
        required: ["key"],  // <-- ADD THIS
        additionalProperties: false  // <-- ADD THIS
      }
    }
  }
];

export default tools;