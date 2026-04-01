import { VertexAI } from '@langchain/google-vertexai';

export const getVertexAI = () => {
  const model = new VertexAI({
    authOptions: {
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    },

    modelName: 'gemini-2.0-flash-001',
    // location: 'us-west1',
    temperature: 0.1,
  });

  return model;
};
