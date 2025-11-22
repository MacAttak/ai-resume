import { config } from 'dotenv';
// Load environment variables first
config({ path: '.env.local' });

import { evaluate, evaluator } from 'honeyhive';
import { createDanielAgent, createRunnerConfig } from '../src/lib/agent-config';
import { Runner } from '@openai/agents';
import OpenAI from 'openai';

const openai = new OpenAI();

const HONEYHIVE_API_KEY = process.env.HONEYHIVE_API_KEY;
const HONEYHIVE_PROJECT = process.env.HONEYHIVE_PROJECT || 'ai-resume';

if (!HONEYHIVE_API_KEY) {
  console.error('Missing HONEYHIVE_API_KEY environment variable');
  process.exit(1);
}

// Define the agent function to evaluate
async function runAgent(input: { message: string }) {
  const conversationId = `eval-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const runnerConfig = createRunnerConfig(conversationId);
  const runner = new Runner(runnerConfig);
  const daniel = createDanielAgent('eval-user');

  const result = await runner.run(daniel, [
    {
      role: 'user',
      content: [{ type: 'input_text', text: input.message }],
    },
  ]);

  if (result && (result as any).finalOutput) {
    return (result as any).finalOutput;
  }
  
  // Handle streaming response if necessary, but for eval we likely want the final output
  // If the runner returns a stream, we'd need to consume it.
  // Based on agent-stream.ts, the runner might return an async iterable.
  
  if (result && typeof (result as any)[Symbol.asyncIterator] === 'function') {
    let fullResponse = '';
    for await (const event of result as unknown as AsyncIterable<any>) {
      if (event.type === 'done' || event.type === 'complete') {
         // Try to get content from event
         if (event.data?.content) return event.data.content;
         if (event.content) return event.content;
      }
      // Accumulate content if available in other events
      const content = event.data?.content || event.content || event.delta || '';
      if (content) fullResponse += content;
    }
    return fullResponse;
  }

  return 'No response';
}

// Define the evaluation dataset
// Define the evaluation dataset
// --- Custom Evaluators ---

const relevanceEvaluator = evaluator(async (output: string, input: { message: string }) => {
  const prompt = `
    You are an AI evaluator. Rate the relevance of the following response to the user's message on a scale of 0 to 1.
    
    User Message: "${input.message}"
    Response: "${output}"
    
    Return ONLY the numeric score (e.g., 0.9).
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
  });

  const score = parseFloat(response.choices[0].message.content || '0');
  return isNaN(score) ? 0 : score;
}, { name: 'Relevance', target: 'relevance' });

const coherenceEvaluator = evaluator(async (output: string) => {
  const prompt = `
    You are an AI evaluator. Rate the coherence and readability of the following response on a scale of 0 to 1.
    
    Response: "${output}"
    
    Return ONLY the numeric score (e.g., 0.9).
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
  });

  const score = parseFloat(response.choices[0].message.content || '0');
  return isNaN(score) ? 0 : score;
}, { name: 'Coherence', target: 'coherence' });

// --- Dataset ---

const dataset = [
  {
    inputs: { message: 'Hello, who are you?' },
    ground_truths: { expected_concepts: ['Daniel McCarthy', 'Data Platform Architect', 'AI Engineer', 'Sydney'] },
  },
  {
    inputs: { message: 'What data platforms have you worked with?' },
    ground_truths: { expected_concepts: ['Snowflake', 'Teradata', 'Azure Data Lake', 'Cloudera', 'AWS'] },
  },
  {
    inputs: { message: 'Tell me about your AI engineering experience' },
    ground_truths: { expected_concepts: ['LangChain', 'LangGraph', 'OpenAI Agents SDK', 'RAG', 'Altus Feature Engineering Agent'] },
  },
  {
    inputs: { message: "What's your leadership philosophy?" },
    ground_truths: { expected_concepts: ['Hands-on leadership', 'Production-first mindset', 'Cross-functional collaboration', 'Culture transformation'] },
  },
  {
    inputs: { message: 'I want to book a time to chat with the real Dan!' },
    ground_truths: { expected_concepts: ['book a meeting', 'availability', 'get_user_details', 'check_meeting_availability'] },
  },
];

// --- Evaluation ---

async function main() {
  console.log('Starting evaluation...');
  
  try {
    const result = await evaluate({
      project: 'ai-resume',
      name: 'Daniel Agent Enhanced Evaluation',
      dataset,
      function: runAgent,
      apiKey: process.env.HONEYHIVE_API_KEY,
      evaluators: [relevanceEvaluator, coherenceEvaluator],
    });

    console.log('Evaluation complete:', result);
  } catch (error) {
    console.error('Evaluation failed:', error);
    process.exit(1);
  }
}

main();
