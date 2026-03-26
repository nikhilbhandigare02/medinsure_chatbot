/**
 * Test Dynamic NLP Intent Extraction
 * Tests the semantic understanding approach without hardcoded patterns
 */

import { extractIntent } from './services/dynamicIntentExtractor.js';

async function testDynamicNLP() {
  console.log('🧪 Testing Dynamic NLP Intent Extraction\n');
  
  // Test flow selection with semantic understanding
  console.log('=== DYNAMIC FLOW SELECTION TESTS ===');
  const flowTests = [
    // Various ways to express home visit intent
    'i want to select home visit',
    'can you select home visit', 
    'i have to select home visit',
    'could you book appointment for home visit',
    'doctor should come to my house',
    'I prefer someone comes to me',
    'medical visit at home please',
    'need a house call',
    'can doctor visit my residence?',
    'want medical professional at home',
    
    // Various ways to express center visit intent  
    'i want to select diagnostic center',
    'can you book diagnostic center',
    'i need to visit center',
    'I\'ll go to a center',
    'need to go somewhere medical',
    'prefer to visit a clinic',
    'can I visit the diagnostic facility?',
    'want to go to medical place',
    'should I go to a lab?',
    'need to travel for medical test',
    
    // Out of scope
    'What time is it?',
    'Who is the president?',
    'How is the weather?'
  ];

  for (const test of flowTests) {
    try {
      const result = await extractIntent(test, 'flow_selection');
      console.log(`"${test}" → ${result}`);
    } catch (error) {
      console.log(`"${test}" → ERROR: ${error.message}`);
    }
  }

  console.log('\n=== DYNAMIC CENTER SELECTION TESTS ===');
  const centerTests = [
    // Various ways to express center preferences
    'i want to select healthcare',
    'can you choose healthcare',
    'i have to pick healthcare',
    'could you book healthcare',
    'The first option please',
    'healthcare center sounds good',
    'prefer the first one',
    'what about healthcare?',
    'let\'s go with healthcare',
    
    'i want to select city lab',
    'can you choose city lab',
    'i have to pick city lab',
    'could you book city lab',
    'City lab seems good',
    'the middle option',
    'what about city lab?',
    'let\'s choose city lab',
    
    'i want to select medplus',
    'can you choose medplus',
    'i have to pick medplus',
    'could you book the closest one',
    'The nearest center',
    'MedPlus looks good',
    'which one is closest?',
    'prefer the nearest option',
    'let\'s go with medplus',
    
    // Out of scope
    'What time is it?',
    'Tell me a joke'
  ];

  for (const test of centerTests) {
    try {
      const result = await extractIntent(test, 'center_selection');
      console.log(`"${test}" → ${result}`);
    } catch (error) {
      console.log(`"${test}" → ERROR: ${error.message}`);
    }
  }

  console.log('\n=== DYNAMIC TIME SELECTION TESTS ===');
  const timeTests = [
    // Various ways to express time preferences
    'i want to select 7 am',
    'can you choose 7 am',
    'i have to pick 7 am',
    'could you book 7 am',
    'the earliest slot please',
    'prefer early morning',
    'first available time',
    'what about 7 in the morning?',
    'let\'s go with 7 am',
    
    'i want to select 8 am',
    'can you choose 8 am',
    'i have to pick 8 am',
    'could you book 8 am',
    '8 o\'clock is good',
    'the middle time slot',
    'what about 8 in the morning?',
    'let\'s choose 8 am',
    
    'i want to select 9 am',
    'can you choose 9 am',
    'i have to pick 9 am',
    'could you book the last slot',
    'prefer late morning',
    'the latest time slot',
    'what about 9 in the morning?',
    'let\'s go with 9 am',
    
    // Invalid times
    '6 pm',
    '10 am',
    '5 pm',
    'noon',
    'midnight',
    
    // Out of scope
    'What time is it?',
    'Is it lunch time yet?'
  ];

  for (const test of timeTests) {
    try {
      const result = await extractIntent(test, 'time_selection');
      console.log(`"${test}" → ${result}`);
    } catch (error) {
      console.log(`"${test}" → ERROR: ${error.message}`);
    }
  }

  console.log('\n=== DYNAMIC DISTANCE CONFIRMATION TESTS ===');
  const distanceTests = [
    // Various ways to express acceptance
    'i want to accept this',
    'can you proceed with this?',
    'i have to accept this distance',
    'could you continue',
    'That distance works for me',
    'sounds good, let\'s continue',
    'no problem with the distance',
    'that\'s acceptable',
    'let\'s move forward',
    'this distance is fine',
    
    // Various ways to express rejection
    'i want to choose another',
    'can you pick a different one?',
    'i have to change this',
    'could you find something closer?',
    'that\'s too far for me',
    'prefer a closer option',
    'this distance is unacceptable',
    'need something nearer',
    'let\'s find a better location',
    'the distance is a problem',
    
    // Out of scope
    'What is the capital of France?',
    'How far is the moon?'
  ];

  for (const test of distanceTests) {
    try {
      const result = await extractIntent(test, 'distance_confirmation');
      console.log(`"${test}" → ${result}`);
    } catch (error) {
      console.log(`"${test}" → ERROR: ${error.message}`);
    }
  }

  console.log('\n✅ Dynamic NLP Testing Complete!');
  console.log('📝 The system now understands intent semantically rather than relying on hardcoded patterns.');
}

// Run tests
testDynamicNLP().catch(console.error);
