import { jsonToToon, calculateMetrics } from './src/toonConverter.js';
import fs from 'fs';

// Read example JSON
const jsonString = fs.readFileSync('./example.json', 'utf-8');

console.log('Input JSON:');
console.log(jsonString);
console.log('\n' + '='.repeat(50) + '\n');

// Convert to TOON
const toonOutput = jsonToToon(jsonString);

console.log('TOON Output:');
console.log(toonOutput);
console.log('\n' + '='.repeat(50) + '\n');

// Calculate metrics
const metrics = calculateMetrics(jsonString, toonOutput);

console.log('Metrics:');
console.log(`JSON Tokens: ${metrics.jsonTokens}`);
console.log(`TOON Tokens: ${metrics.toonTokens}`);
console.log(`Tokens Saved: ${metrics.tokensSaved}`);
console.log(`Reduction: ${metrics.reductionPercent}%`);
