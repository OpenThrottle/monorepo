import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { getVectorStore } from './stores';
import { getChatModel } from './models/index';
import { loadMarkdownFile } from './loaders/markdown';

/**
 * @description Just ignore this file for now, not being used or exported.
 * What will come however is the following
 *
 *     - Read all the markdown files in the Monorepo
 *     - Extract some metadata from each as we go
 *     - Then vectorize and toss it into the Postgres DB
 */
async function main() {
  console.log('🤖 More to come...');

  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

  if (!projectId) {
    throw new Error('GOOGLE_CLOUD_PROJECT_ID is not set');
  }

  const model = getChatModel({
    model: 'llama3.2',
    projectId,
    provider: 'Ollama',
    temperature: 0,
    // verbose: true,
  });

  const vectorStore = await getVectorStore({
    connectionString: getConnectionString(),
    provider: 'Ollama',
    tableName: 'example',
  });

  const file = `/Users/matt/Development/monorepo/README.md`;
  const documents = await loadMarkdownFile(file);
  const content = documents.map((document) => document.metadata);

  console.log('🌟 Content:', content.length);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkOverlap: 64,
    chunkSize: 512,
  });

  const _documentChunks = await splitter.splitDocuments(documents);
  // await vectorStore.addDocuments(_documentChunks);

  const question = `What technology is used?`;
  const retrievedDocs = await vectorStore.similaritySearch(question);

  console.log('🌟 Similarity search:', { retrievedDocs });

  const response = await model.invoke('Who created this project?');

  console.log('🤖 Response:', response.content);
}

const getConnectionString = () => {
  const config = {
    database: process.env.POSTGRES_DB,
    host: `localhost`,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT,
    username: process.env.POSTGRES_USER,
  };

  const password = encodeURIComponent(config.password!);
  const connectionString = `postgresql://${config.username}:${password}@${config.host}:${config.port}/${config.database}`;

  return connectionString;
};

main();
