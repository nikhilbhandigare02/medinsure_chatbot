/**
 * Appointment Booking Flow Controller
 * Handles the conversation state machine for appointment booking
 * Supports multiple channels: chat, voice, call
 */

import sessionManager from './bookingSessionManager.js';
import { extractIntent } from './dynamicIntentExtractor.js';
import {
  DEMO_USERS,
  FLOW_TYPES,
  STEPS,
  TIME_SLOTS,
  DIAGNOSTIC_CENTERS,
  checkSlotAvailability,
  getAvailableSlots,
  getUserById,
  getCenterById
} from './bookingMockData.js';

class BookingFlowController {
  /**
   * Start a new booking session
   */
  startSession(userId, channelType = 'chat') {
    // Validate user
    const user = getUserById(userId);
    if (!user) {
      return {
        success: false,
        message: 'Invalid user ID',
        error: 'User not found'
      };
    }

    const sessionId = sessionManager.createSession(userId, channelType);
    const session = sessionManager.getSession(sessionId);

    // Update with user name
    sessionManager.updateSession(sessionId, { userName: user.name });

    // Get entry message
    const response = this.getEntryMessage(session);

    return {
      success: true,
      sessionId,
      userId,
      userName: user.name,
      ...response
    };
  }

  /**
   * Handle user input and return next step
   * Now uses AI intent extraction for natural language understanding
   */
  async handleUserInput(sessionId, userInput) {
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        message: 'Session not found',
        error: 'Invalid session ID'
      };
    }

    const currentStep = session.currentStep;

    // Use AI to extract intent from natural language
    const extractedInput = await extractIntent(userInput, currentStep);

    let response;

    switch (currentStep) {
      case STEPS.ENTRY:
        response = this.handleFlowSelection(session, extractedInput);
        break;

      case STEPS.FLOW_SELECTION:
        response = this.handleFlowSelection(session, extractedInput);
        break;

      case STEPS.CENTER_SELECTION:
        response = this.handleCenterSelection(session, extractedInput);
        break;

      case STEPS.DISTANCE_CONFIRMATION:
        response = this.handleDistanceConfirmation(session, extractedInput);
        break;

      case STEPS.TIME_SELECTION:
        response = this.handleTimeSelection(session, extractedInput);
        break;

      default:
        response = {
          success: false,
          message: 'Invalid step',
          error: 'Unknown step in flow'
        };
    }

    return response;
  }

  /**
   * Handle flow selection (Home vs Diagnostic Center)
   */
  handleFlowSelection(session, userInput) {
    const input = userInput.toString().trim().toLowerCase();
    const userName = session.userName || 'friend';

    // Handle out_of_scope responses
    if (input === 'out_of_scope') {
      return {
        success: true,
        message: "I'm sorry, I can only help you with booking your medical appointment. I'm here to assist you with scheduling your mandatory medical check-up through MedInsure.\n\nWould you prefer a doctor to visit you at home, or would you like to visit one of our diagnostic centers?\n\nJust say \"home visit\" or \"diagnostic center\".",
        options: ['Home Visit', 'Diagnostic Center Visit'],
        type: 'selection',
        channelType: session.channelType,
        currentStep: STEPS.ENTRY
      };
    }

    // Handle incomplete responses
    if (input === 'incomplete') {
      return {
        success: true,
        message: "I'm sorry, I didn't catch the complete request. Could you please tell me your preference?\n\nWould you prefer a doctor to visit you at home, or would you like to visit one of our diagnostic centers?\n\nJust say \"home visit\" or \"diagnostic center\".",
        options: ['Home Visit', 'Diagnostic Center Visit'],
        type: 'selection',
        channelType: session.channelType,
        currentStep: STEPS.ENTRY
      };
    }

    if (input === '1' || input === 'one' || input === 'home' || input === 'home visit') {
      // Home Visit selected
      sessionManager.updateSession(session.sessionId, {
        selectedFlow: FLOW_TYPES.HOME,
        currentStep: STEPS.TIME_SELECTION
      });

      return this.getHomeVisitTimeSelection(session);
    } else if (input === '2' || input === 'two' || input === 'center' || input === 'diagnostic' || input === 'diagnostic center') {
      // Diagnostic Center selected
      sessionManager.updateSession(session.sessionId, {
        selectedFlow: FLOW_TYPES.CENTER,
        currentStep: STEPS.CENTER_SELECTION
      });

      return this.getCenterSelection(session);
    } else {
      // Invalid input - ask again with acknowledgment
      return {
        success: true,
        message: `Sorry, I didn't catch that. Please say "home visit" or "diagnostic center".`,
        options: ['Home Visit', 'Diagnostic Center Visit'],
        type: 'selection',
        channelType: session.channelType,
        currentStep: STEPS.ENTRY
      };
    }
  }

  /**
   * Handle center selection
   */
  handleCenterSelection(session, userInput) {
    const input = userInput.toString().trim();

    // Handle out_of_scope responses
    if (input === 'out_of_scope') {
      return {
        success: true,
        message: "I'm sorry, I can only help you with booking your medical appointment. I'm here to assist you with scheduling your mandatory medical check-up through MedInsure.\n\nWe have 3 centers available:\n\n1. HealthCare - 2 km away\n2. City Lab - 5 km away\n3. MedPlus - 8 km away\n\nWhich center would you prefer? Just say the center name like \"HealthCare\", \"City Lab\", or \"MedPlus\".",
        options: ['HealthCare', 'City Lab', 'MedPlus'],
        type: 'selection',
        channelType: session.channelType,
        currentStep: STEPS.CENTER_SELECTION
      };
    }

    // Handle incomplete responses
    if (input === 'incomplete') {
      return {
        success: true,
        message: "I'm sorry, I didn't catch the complete center name. Could you please tell me which center you prefer?\n\nWe have 3 centers available:\n\n1. HealthCare - 2 km away\n2. City Lab - 5 km away\n3. MedPlus - 8 km away\n\nJust say the center name like \"HealthCare\", \"City Lab\", or \"MedPlus\".",
        options: ['HealthCare', 'City Lab', 'MedPlus'],
        type: 'selection',
        channelType: session.channelType,
        currentStep: STEPS.CENTER_SELECTION
      };
    }

    if (isNaN(input) || input < 1 || input > 3) {
      // Invalid center number - help user
      return {
        success: true,
        message: `Sorry, I didn't catch that. Please say "HealthCare", "City Lab", or "MedPlus" for the center you prefer.`,
        options: ['HealthCare', 'City Lab', 'MedPlus'],
        type: 'selection',
        channelType: session.channelType,
        currentStep: STEPS.CENTER_SELECTION
      };
    }

    const selectedCenter = DIAGNOSTIC_CENTERS[input - 1];

    if (selectedCenter.isFar) {
      // Center is far - need confirmation
      sessionManager.updateSession(session.sessionId, {
        selectedCenter: selectedCenter.id,
        currentStep: STEPS.DISTANCE_CONFIRMATION
      });

      return this.getDistanceConfirmation(session, selectedCenter);
    } else {
      // Center is near - go to time selection
      sessionManager.updateSession(session.sessionId, {
        selectedCenter: selectedCenter.id,
        currentStep: STEPS.TIME_SELECTION
      });

      return this.getDiagnosticCenterTimeSelection(session, selectedCenter);
    }
  }

  /**
   * Handle distance confirmation
   */
  handleDistanceConfirmation(session, userInput) {
    const input = userInput.toString().trim().toLowerCase();

    // Handle out_of_scope responses
    if (input === 'out_of_scope') {
      const center = getCenterById(session.selectedCenter);
      return {
        success: true,
        message: "I'm sorry, I can only help you with booking your medical appointment. I'm here to assist you with scheduling your mandatory medical check-up through MedInsure.\n\nI see you've selected " + center.name + ". Just a heads up - it's about " + center.distance + " from your location. Is that okay with you, or would you like to choose a closer center?\n\nJust say \"yes\" to continue or \"no\" to choose another center.",
        options: ['Yes', 'No'],
        type: 'selection',
        channelType: session.channelType,
        currentStep: STEPS.DISTANCE_CONFIRMATION
      };
    }

    // Handle incomplete responses
    if (input === 'incomplete') {
      const center = getCenterById(session.selectedCenter);
      return {
        success: true,
        message: "I'm sorry, I didn't catch your complete response. Could you please confirm if the distance is okay?\n\nI see you've selected " + center.name + ". It's about " + center.distance + " from your location. Is that okay with you, or would you like to choose a closer center?\n\nJust say \"yes\" to continue or \"no\" to choose another center.",
        options: ['Yes', 'No'],
        type: 'selection',
        channelType: session.channelType,
        currentStep: STEPS.DISTANCE_CONFIRMATION
      };
    }

    if (input === 'yes' || input === '1' || input === 'one' || input === 'okay' || input === 'ok') {
      // User wants to proceed
      const center = getCenterById(session.selectedCenter);

      sessionManager.updateSession(session.sessionId, {
        currentStep: STEPS.TIME_SELECTION
      });

      return this.getDiagnosticCenterTimeSelection(session, center);
    } else if (input === 'no' || input === '2' || input === 'two' || input === 'nope') {
      // User wants to select different center
      sessionManager.updateSession(session.sessionId, {
        selectedCenter: null,
        currentStep: STEPS.CENTER_SELECTION
      });

      return this.getCenterSelection(session);
    } else {
      // Invalid input
      const center = getCenterById(session.selectedCenter);
      return {
        success: true,
        message: `Sorry, I didn't catch that. Do you want to continue with ${center.name} or choose a different center? Please say "yes" or "no".`,
        options: ['Yes', 'No'],
        type: 'selection',
        channelType: session.channelType,
        currentStep: STEPS.DISTANCE_CONFIRMATION
      };
    }
  }

  /**
   * Handle time selection
   */
  handleTimeSelection(session, userInput) {
    console.log(`[DEBUG] handleTimeSelection called with userInput: ${userInput}`);
    
    const input = userInput.toString().trim();

    // Handle out_of_scope responses
    if (input === 'out_of_scope') {
      return {
        success: true,
        message: "I'm sorry, I can only help you with booking your medical appointment. I'm here to assist you with scheduling your mandatory medical check-up through MedInsure.\n\nNow, what time works best for you? We have these slots available:\n\nJust say \"7 AM\", \"8 AM\", or \"9 AM\".",
        options: ['7 AM', '8 AM', '9 AM'],
        type: 'selection',
        channelType: session.channelType,
        currentStep: STEPS.TIME_SELECTION
      };
    }

    // Handle incomplete responses
    if (input === 'incomplete') {
      return {
        success: true,
        message: "I'm sorry, I didn't catch the complete time. Could you please tell me what time you prefer?\n\nWe have these slots available:\n\nJust say \"7 AM\", \"8 AM\", or \"9 AM\".",
        options: ['7 AM', '8 AM', '9 AM'],
        type: 'selection',
        channelType: session.channelType,
        currentStep: STEPS.TIME_SELECTION
      };
    }

    // Handle invalid response from intent extractor
    if (input === 'invalid') {
      return {
        success: true,
        message: `I'm sorry, but that time is not available. Please choose from our available slots: "7 AM", "8 AM", or "9 AM".`,
        options: ['7 AM', '8 AM', '9 AM'],
        type: 'selection',
        channelType: session.channelType,
        currentStep: STEPS.TIME_SELECTION
      };
    }

    const availableSlots = getAvailableSlots(TIME_SLOTS, session.selectedFlow);

    // First check if input is a specific time format (like "8 AM", "8:30 AM", "8 a.m.", etc.)
    const timeMatch = input.match(/^(\d{1,2})(?::(\d{2}))?\s*(?:a\.?m\.?|p\.?m\.?)?$/i);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      
      // Determine AM/PM - default to AM for morning hours
      let period = 'AM';
      if (input.toLowerCase().includes('pm') || input.toLowerCase().includes('p.m.')) {
        period = 'PM';
      }
      
      // For hours 7-9, assume AM unless explicitly PM
      if (hour >= 7 && hour <= 9 && !input.toLowerCase().includes('pm') && !input.toLowerCase().includes('p.m.')) {
        period = 'AM';
      }
      
      const extractedTime = `${hour}:${minute.toString().padStart(2, '0')} ${period}`;
      console.log(`[DEBUG] Extracted time: ${extractedTime}`);
      
      // Check if this time matches one of our predefined slots
      const matchingSlot = TIME_SLOTS.find(slot => slot === extractedTime);
      if (matchingSlot) {
        // Found exact match in predefined slots
        const slotIndex = TIME_SLOTS.indexOf(matchingSlot);
        
        // Check if slot is available
        if (!checkSlotAvailability(matchingSlot, session.selectedFlow)) {
          return this.getUnavailableSlotMessage(session, matchingSlot);
        }
        
        // Time is available - proceed with booking
        sessionManager.updateSession(session.sessionId, {
          selectedTime: matchingSlot,
          currentStep: STEPS.CONFIRMATION
        });
        return this.getConfirmationMessage(session);
      } else {
        // Time format is valid but not in our predefined slots
        if (checkSlotAvailability(extractedTime, session.selectedFlow)) {
          // Time is within valid range but not a predefined slot
          sessionManager.updateSession(session.sessionId, {
            selectedTime: extractedTime,
            currentStep: STEPS.CONFIRMATION
          });
          return this.getConfirmationMessage(session);
        } else {
          // Time is outside valid range
          return {
            success: true,
            message: `I'm sorry, but "${extractedTime}" is not available. Please choose a time between 7:00 AM and 9:00 AM.`,
            options: ['7 AM', '8 AM', '9 AM'],
            type: 'selection',
            channelType: session.channelType,
            currentStep: STEPS.TIME_SELECTION
          };
        }
      }
    }

    // Check if it's a more complex time format (like "8:30 AM" with explicit AM/PM)
    const complexTimeMatch = input.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm|a\.m\.|p\.m\.)/i);
    if (complexTimeMatch) {
      const hour = complexTimeMatch[1];
      const minute = complexTimeMatch[2];
      const period = complexTimeMatch[3].replace(/\./g, '').toUpperCase();
      const extractedTime = `${hour}:${minute} ${period}`;
      
      // Validate the extracted time is within allowed range
      if (checkSlotAvailability(extractedTime, session.selectedFlow)) {
        // Time is valid - proceed with booking
        sessionManager.updateSession(session.sessionId, {
          selectedTime: extractedTime,
          currentStep: STEPS.CONFIRMATION
        });
        return this.getConfirmationMessage(session);
      } else {
        // Time is outside valid range
        return {
          success: true,
          message: `I'm sorry, but "${extractedTime}" is not available. Please choose a time between 7:00 AM and 9:00 AM.`,
          options: ['7 AM', '8 AM', '9 AM'],
          type: 'selection',
          channelType: session.channelType,
          currentStep: STEPS.TIME_SELECTION
        };
      }
    }

    // If not a time format, treat as slot number selection
    const parsedInput = parseInt(input);
    
    // Validate selection is a number between 1 and 3
    if (isNaN(parsedInput) || parsedInput < 1 || parsedInput > 3) {
      // Invalid input
      return {
        success: true,
        message: `I didn't quite catch that. Please say "7 AM", "8 AM", or "9 AM" for your preferred time.`,
        options: ['7 AM', '8 AM', '9 AM'],
        type: 'selection',
        channelType: session.channelType,
        currentStep: STEPS.TIME_SELECTION
      };
    }

    const selectedTime = TIME_SLOTS[parsedInput - 1];

    // Check if slot is available
    if (!checkSlotAvailability(selectedTime, session.selectedFlow)) {
      // Slot not available - show available slots
      sessionManager.updateSession(session.sessionId, {
        currentStep: STEPS.TIME_SELECTION
      });

      return this.getUnavailableSlotMessage(session, selectedTime);
    }

    // Time is available - confirm booking
    sessionManager.updateSession(session.sessionId, {
      selectedTime: selectedTime,
      currentStep: STEPS.CONFIRMATION
    });

    return this.getConfirmationMessage(session);
  }

  // ============ MESSAGE GENERATION METHODS ============

  /**
   * Entry message - Welcome and flow selection
   */
  getEntryMessage(session) {
    const channelType = session.channelType;
    const userName = session.userName || 'valued customer';

    let message = `Hi ${userName}, welcome to MedInsure!\n\nCongratulations on your new insurance policy. Now we need to schedule your mandatory medical check-up.\n\nWould you prefer a doctor to visit you at home, or would you like to visit one of our diagnostic centers?\n\nJust say "home visit" or "diagnostic center".`;

    const options = ['Home Visit', 'Diagnostic Center Visit'];

    return {
      success: true,
      message,
      options,
      type: 'selection',
      channelType,
      currentStep: STEPS.ENTRY
    };
  }

  /**
   * Home visit time selection
   */
  getHomeVisitTimeSelection(session) {
    const message = `I've noted that you prefer a home visit. One of our medical professionals will visit you at your home.\n\nNow, what time works best for you? We have these slots available:\n\nJust say "7 AM", "8 AM", or "9 AM".`;

    return {
      success: true,
      message,
      options: ['7 AM', '8 AM', '9 AM'],
      type: 'selection',
      channelType: session.channelType,
      currentStep: STEPS.TIME_SELECTION
    };
  }

  /**
   * Diagnostic center selection
   */
  getCenterSelection(session) {
    let message = `Let me find the best diagnostic center near you.\n\nWe have 3 centers available:\n`;
    DIAGNOSTIC_CENTERS.forEach((center, index) => {
      message += `${index + 1}. ${center.name} - ${center.distance} away\n`;
    });
    message += `\nWhich center would you prefer? Just say the center name like \"HealthCare\", \"City Lab\", or \"MedPlus\".`;

    const options = ['HealthCare', 'City Lab', 'MedPlus'];

    return {
      success: true,
      message,
      options,
      type: 'selection',
      channelType: session.channelType,
      currentStep: STEPS.CENTER_SELECTION
    };
  }

  /**
   * Distance confirmation for far centers
   */
  getDistanceConfirmation(session, center) {
    const message = `I see you've selected ${center.name}. Just a heads up - it's about ${center.distance} from your location. Is that okay with you, or would you like to choose a closer center?\n\nJust say \"yes\" to continue or \"no\" to choose another center.`;

    return {
      success: true,
      message,
      options: ['Yes', 'No'],
      type: 'selection',
      channelType: session.channelType,
      currentStep: STEPS.DISTANCE_CONFIRMATION
    };
  }

  /**
   * Diagnostic center time selection
   */
  getDiagnosticCenterTimeSelection(session, center) {
    const centerName = center.name;
    const message = `I've confirmed your appointment at ${centerName}.\n\nNow let's pick a time that works for you. We have these slots available:\n\nJust say "7 AM", "8 AM", or "9 AM".`;

    return {
      success: true,
      message,
      options: ['7 AM', '8 AM', '9 AM'],
      type: 'selection',
      channelType: session.channelType,
      currentStep: STEPS.TIME_SELECTION
    };
  }

  /**
   * Unavailable slot message
   */
  getUnavailableSlotMessage(session, selectedTime) {
    console.log(`[DEBUG] getUnavailableSlotMessage called with selectedTime: ${selectedTime}`);
    const availableSlots = getAvailableSlots(TIME_SLOTS, session.selectedFlow);
    let message = `I'm sorry, but ${selectedTime} is not available right now.`;
    console.log(`[DEBUG] Generated message: ${message}`);

    if (session.selectedFlow === FLOW_TYPES.HOME) {
      message += ` For home visits, we have these times available:\n`;
    } else {
      const center = getCenterById(session.selectedCenter);
      message += ` At ${center.name}, we have these times available:\n`;
    }

    availableSlots.forEach((slot, index) => {
      const slotIndex = TIME_SLOTS.indexOf(slot) + 1;
      message += `${slotIndex}. ${slot}\n`;
    });

    message += `\nWhich of these times works better for you?`;

    const slotOptions = availableSlots.map(
      slot => `${TIME_SLOTS.indexOf(slot) + 1} - ${slot}`
    );

    return {
      success: true,
      message,
      options: slotOptions,
      type: 'selection',
      channelType: session.channelType,
      currentStep: STEPS.TIME_SELECTION
    };
  }

  /**
   * Time selection message (generic)
   */
  getTimeSelectionMessage(session) {
    if (session.selectedFlow === FLOW_TYPES.HOME) {
      return this.getHomeVisitTimeSelection(session);
    } else {
      const center = getCenterById(session.selectedCenter);
      return this.getDiagnosticCenterTimeSelection(session, center);
    }
  }

  /**
   * Invalid input retry message
   */
  getInvalidInputMessage(session) {
    const currentStep = session.currentStep;

    if (currentStep === STEPS.TIME_SELECTION) {
      return {
        success: true,
        message: `I didn't catch that. Please say 1 for 8 AM, 2 for 9 AM, or 3 for 10 AM.`,
        options: ['1 - 8:00 AM', '2 - 9:00 AM', '3 - 10:00 AM'],
        type: 'selection',
        channelType: session.channelType,
        currentStep: STEPS.TIME_SELECTION
      };
    } else if (currentStep === STEPS.CENTER_SELECTION) {
      return this.getCenterSelection(session);
    } else if (currentStep === STEPS.DISTANCE_CONFIRMATION) {
      const center = getCenterById(session.selectedCenter);
      return this.getDistanceConfirmation(session, center);
    }

    return this.getEntryMessage(session);
  }

  /**
   * Confirmation message - Booking confirmed
   */
  getConfirmationMessage(session) {
    let message = `Your medical appointment is all set.`;

    if (session.selectedFlow === FLOW_TYPES.HOME) {
      message += ` A medical professional will visit you at your home tomorrow at ${session.selectedTime}.`;
    } else {
      const center = getCenterById(session.selectedCenter);
      message += ` Your appointment is confirmed at ${center.name} tomorrow at ${session.selectedTime}.`;
    }

    message += `\n\nHere are some important instructions:\n`;
    message += `- Please come or be present for a fasting blood test if required.\n`;
    message += `- Keep your ID proof and insurance policy card ready.\n`;

    if (session.selectedFlow === FLOW_TYPES.HOME) {
      message += `- Our medical professional will call you 30 minutes before arrival.\n`;
    } else {
      const center = getCenterById(session.selectedCenter);
      message += `- Location: ${center.address}\n`;
      message += `- Please arrive 10 minutes early.\n`;
    }

    message += `\nThank you for choosing MedInsure. We're committed to your health!`;

    sessionManager.updateSession(session.sessionId, {
      currentStep: STEPS.COMPLETED
    });

    return {
      success: true,
      message,
      options: [],
      type: 'confirmation',
      channelType: session.channelType,
      currentStep: STEPS.CONFIRMATION,
      bookingDetails: {
        flow: session.selectedFlow,
        center: session.selectedFlow === FLOW_TYPES.CENTER ? session.selectedCenter : null,
        time: session.selectedTime,
        user: session.userName
      }
    };
  }

  /**
   * Get session details
   */
  getSessionDetails(sessionId) {
    return sessionManager.getSession(sessionId);
  }
}

export default new BookingFlowController();
