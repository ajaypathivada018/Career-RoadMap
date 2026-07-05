import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
  try {
    logger.info('🔍 Checking available Gemini models...\n');
    if (API_KEY) logger.debug(`API Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 4)}\n`);

    const genAI = new GoogleGenerativeAI(API_KEY);

    // Try to list models
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );

    if (!response.ok) {
      logger.error(`❌ Error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      logger.error(text);
      return;
    }

    const data = await response.json();
    logger.info('✅ Available Models:\n');

    if (data.models && data.models.length > 0) {
      data.models.forEach((model) => {
        if (model.supportedGenerationMethods?.includes('generateContent')) {
          logger.info(`   ✓ ${model.name}`);
          logger.debug(`      Display: ${model.displayName}`);
          logger.debug(`      Methods: ${model.supportedGenerationMethods.join(', ')}\n`);
        }
      });
    } else {
      logger.info('No models found!');
    }
  } catch (error) {
    logger.error('❌ Error:', error.message);
  }
}

listModels();
