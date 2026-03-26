/**
 * Test Enhanced NLP Intent Extraction
 * Tests the improved flexible question format recognition
 */

import { extractIntent } from './services/intentExtractor.js';

async function testFlexibleQuestions() {
  console.log('🧪 Testing Enhanced NLP Intent Extraction\n');
  
  // Test flow selection with various formats
  console.log('=== FLOW SELECTION TESTS ===');
  const flowTests = [
    // Home visit variations
    'i want to select home visit',
    'can you select home visit', 
    'i have to select home visit',
    'could you book appointment for home visit',
    'I prefer home',
    'Visit me at home',
    'Can doctor come to my house?',
    'want someone to come',
    'medical visit at home',
    
    // Diagnostic center variations  
    'i want to select diagnostic center',
    'can you book diagnostic center',
    'i need to visit center',
    'I\'ll go to a center',
    'Lab visit',
    'prefer going out',
    'want to visit',
    'go to medical place',
    
    // Out of scope
    'What time is it?',
    'Who is the president?'
  ];

  for (const test of flowTests) {
    try {
      const result = await extractIntent(test, 'flow_selection');
      console.log(`"${test}" → ${result}`);
    } catch (error) {
      console.log(`"${test}" → ERROR: ${error.message}`);
    }
  }

  console.log('\n=== CENTER SELECTION TESTS ===');
  const centerTests = [
    // Healthcare variations
    'i want to select healthcare',
    'can you choose healthcare',
    'i have to pick healthcare',
    'could you book healthcare',
    'The first one',
    'healthcare center',
    'prefer healthcare',
    
    // City Lab variations
    'i want to select city lab',
    'can you choose city lab',
    'i have to pick city lab',
    'could you book city lab',
    'City lab',
    'lab in city',
    'second option',
    
    // MedPlus variations
    'i want to select medplus',
    'can you choose medplus',
    'i have to pick medplus',
    'could you book the closest one',
    'The closest',
    'MedPlus',
    'nearest center',
    'prefer medplus',
    
    // Out of scope
    'What time is it?'
  ];

  for (const test of centerTests) {
    try {
      const result = await extractIntent(test, 'center_selection');
      console.log(`"${test}" → ${result}`);
    } catch (error) {
      console.log(`"${test}" → ERROR: ${error.message}`);
    }
  }

  console.log('\n=== TIME SELECTION TESTS ===');
  const timeTests = [
    // 7 AM variations
    'i want to select 7 am',
    'can you choose 7 am',
    'i have to pick 7 am',
    'could you book 7 am',
    'Early morning',
    'first slot',
    'seven in morning',
    'earliest time',
    
    // 8 AM variations
    'i want to select 8 am',
    'can you choose 8 am',
    'i have to pick 8 am',
    'could you book 8 am',
    '8 o\'clock',
    'middle slot',
    'eight in morning',
    
    // 9 AM variations
    'i want to select 9 am',
    'can you choose 9 am',
    'i have to pick 9 am',
    'could you book the last slot',
    'late morning',
    'last slot',
    'latest time',
    
    // Invalid times
    '6 pm',
    '10 am',
    '5 pm',
    
    // Out of scope
    'What time is it?'
  ];

  for (const test of timeTests) {
    try {
      const result = await extractIntent(test, 'time_selection');
      console.log(`"${test}" → ${result}`);
    } catch (error) {
      console.log(`"${test}" → ERROR: ${error.message}`);
    }
  }

  console.log('\n=== DISTANCE CONFIRMATION TESTS ===');
  const distanceTests = [
    // Accept variations
    'i want to accept',
    'can you proceed',
    'i have to accept',
    'could you continue',
    'That\'s fine',
    'sounds good',
    'let\'s do it',
    'go ahead',
    
    // Reject variations
    'i want to reject',
    'can you choose another',
    'i have to change',
    'could you pick different',
    'that\'s too far',
    'prefer closer',
    'don\'t like this distance',
    
    // Out of scope
    'What is the capital of France?'
  ];

  for (const test of distanceTests) {
    try {
      const result = await extractIntent(test, 'distance_confirmation');
      console.log(`"${test}" → ${result}`);
    } catch (error) {
      console.log(`"${test}" → ERROR: ${error.message}`);
    }
  }

  console.log('\n✅ Enhanced NLP Testing Complete!');
}

// Run tests
testFlexibleQuestions().catch(console.error);
