// Advanced Booking Enhancement Utilities
import { supabase } from '../config/supabase.js';

export class BookingEnhancements {
  constructor() {
    this.initializePersonalization();
    this.initializeVoiceInput();
  }

  // 1. CONVERSION OPTIMIZATION
  getSmartTimeDefault() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Business logic for smart defaults
    if (day === 0 || day === 6) return 'next-week'; // Weekend
    if (hour < 9) return 'today-morning';
    if (hour < 17) return 'today';
    if (hour < 20) return 'tomorrow';
    return 'next-available';
  }

  getOptimalTimeSlots() {
    const now = new Date();
    const slots = [];
    
    // Generate realistic time slots based on current time
    if (now.getHours() < 17) {
      slots.push({
        value: 'today',
        label: 'Today',
        sublabel: 'Next available',
        priority: 1,
        available: true
      });
    }
    
    slots.push({
      value: 'tomorrow',
      label: 'Tomorrow',
      sublabel: 'Morning preferred',
      priority: 2,
      available: true
    });
    
    slots.push({
      value: 'this-week',
      label: 'This Week',
      sublabel: 'When convenient',
      priority: 3,
      available: true
    });
    
    return slots;
  }

  // Voice Input Implementation
  initializeVoiceInput() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      this.speechRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      this.speechRecognition.continuous = false;
      this.speechRecognition.interimResults = false;
      this.speechRecognition.lang = 'en-GB';
    }
  }

  startVoiceInput(callback) {
    if (!this.speechRecognition) {
      callback({ error: 'Voice input not supported' });
      return;
    }

    this.speechRecognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const phoneNumber = this.extractPhoneFromSpeech(transcript);
      callback({ success: true, phoneNumber });
    };

    this.speechRecognition.onerror = (event) => {
      callback({ error: event.error });
    };

    this.speechRecognition.start();
  }

  extractPhoneFromSpeech(transcript) {
    // Extract numbers from speech and format as UK mobile
    const numbers = transcript.replace(/\D/g, '');
    if (numbers.length >= 10) {
      const formatted = numbers.substring(0, 11);
      return `07${formatted.substring(formatted.startsWith('07') ? 2 : 1, 10)}`;
    }
    return transcript;
  }

  // 2. BEHAVIORAL PSYCHOLOGY
  async getScarcityIndicators(serviceId) {
    try {
      // Get today's bookings for this service
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('service_consultations')
        .select('id')
        .eq('service_type', serviceId)
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);

      if (error) throw error;

      const todayBookings = data?.length || 0;
      const maxSlots = 8; // Assumed daily capacity
      const remaining = Math.max(0, maxSlots - todayBookings);

      return {
        slotsRemaining: remaining,
        todayBookings,
        showScarcity: remaining <= 3 && remaining > 0,
        message: remaining <= 3 ? `Only ${remaining} slots left today` : null
      };
    } catch (error) {
      console.error('Error getting scarcity data:', error);
      return { slotsRemaining: 5, showScarcity: false };
    }
  }

  async getSocialProof(serviceId) {
    try {
      // Get this week's bookings
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('service_consultations')
        .select('id')
        .eq('service_type', serviceId)
        .gte('created_at', weekAgo.toISOString());

      if (error) throw error;

      const weeklyBookings = data?.length || 0;
      
      return {
        weeklyBookings,
        message: weeklyBookings > 0 ? `${weeklyBookings} people booked this week` : 'Be the first to book this week'
      };
    } catch (error) {
      console.error('Error getting social proof:', error);
      return { weeklyBookings: 12, message: '12 people booked this week' };
    }
  }

  getProgressAnchoring(currentStep, totalSteps) {
    const percentage = Math.round((currentStep / totalSteps) * 100);
    const messages = {
      33: "You're 1/3 of the way there! 🚀",
      66: "Almost done! Just one more step 💪",
      100: "Perfect! Ready to book 🎉"
    };
    
    return {
      percentage,
      message: messages[percentage] || `${percentage}% complete`
    };
  }

  getLossAversionMessage() {
    const hour = new Date().getHours();
    if (hour >= 16 && hour < 17) {
      return "⏰ Last chance for today's availability!";
    }
    if (hour >= 17) {
      return "📅 Tomorrow's slots filling up fast";
    }
    return null;
  }

  // 3. SMART PERSONALIZATION
  initializePersonalization() {
    this.userProfile = this.loadUserProfile();
  }

  loadUserProfile() {
    const stored = localStorage.getItem('cornwells_user_profile');
    return stored ? JSON.parse(stored) : {
      previousBookings: [],
      preferredTimes: [],
      lastVisit: null,
      phoneNumber: null
    };
  }

  saveUserProfile(data) {
    this.userProfile = { ...this.userProfile, ...data };
    localStorage.setItem('cornwells_user_profile', JSON.stringify(this.userProfile));
  }

  getPersonalizedDefaults() {
    return {
      phoneNumber: this.userProfile.phoneNumber || '',
      preferredTime: this.userProfile.preferredTimes[0] || this.getSmartTimeDefault(),
      isReturningUser: this.userProfile.previousBookings.length > 0
    };
  }

  getPersonalizedRecommendations(currentServiceId) {
    const recommendations = [];
    
    // Based on previous bookings
    if (this.userProfile.previousBookings.length > 0) {
      const lastBooking = this.userProfile.previousBookings[0];
      if (lastBooking.serviceId !== currentServiceId) {
        recommendations.push({
          type: 'previous_service',
          message: `Book ${lastBooking.serviceName} again?`,
          serviceId: lastBooking.serviceId
        });
      }
    }

    // Seasonal recommendations
    const month = new Date().getMonth();
    if (month >= 8 && month <= 10) { // Sep-Nov
      recommendations.push({
        type: 'seasonal',
        message: 'Flu season is here - add flu vaccination?',
        serviceId: 'flu-vaccination'
      });
    }

    return recommendations;
  }

  // 4. REAL-TIME AVAILABILITY
  async getRealTimeAvailability(serviceId, date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    try {
      const { data, error } = await supabase
        .from('service_consultations')
        .select('preferred_time_slot, created_at')
        .eq('service_type', serviceId)
        .gte('created_at', `${targetDate}T00:00:00`)
        .lt('created_at', `${targetDate}T23:59:59`);

      if (error) throw error;

      // Mock time slots (in real implementation, this would come from calendar system)
      const timeSlots = [
        { time: '09:00', available: true, price: 50 },
        { time: '10:00', available: true, price: 50 },
        { time: '11:00', available: false, price: 50 },
        { time: '14:00', available: true, price: 60 }, // Peak time
        { time: '15:00', available: true, price: 60 },
        { time: '16:00', available: true, price: 50 }
      ];

      // Simulate booking conflicts
      const bookedSlots = data?.map(booking => booking.preferred_time_slot) || [];
      
      return timeSlots.map(slot => ({
        ...slot,
        available: slot.available && !bookedSlots.includes(slot.time)
      }));

    } catch (error) {
      console.error('Error getting availability:', error);
      return [];
    }
  }

  getDynamicPricing(basePrice, timeSlot, demand = 'normal') {
    const hour = parseInt(timeSlot.split(':')[0]);
    let multiplier = 1;

    // Peak hours (lunch time)
    if (hour >= 12 && hour <= 14) multiplier = 1.2;
    
    // High demand adjustment
    if (demand === 'high') multiplier *= 1.1;
    if (demand === 'low') multiplier *= 0.9;

    return Math.round(basePrice * multiplier);
  }

  // 5. MULTI-CHANNEL ORCHESTRATION
  async sendSMSConfirmation(phoneNumber, bookingDetails) {
    // In production, integrate with SMS service (Twilio, etc.)
    console.log('SMS would be sent:', {
      to: phoneNumber,
      message: `Thanks for booking ${bookingDetails.serviceName}. We'll call you at ${bookingDetails.time}. Ref: ${bookingDetails.reference}`
    });
    
    return { success: true, channel: 'sms' };
  }

  async sendWhatsAppMessage(phoneNumber, bookingDetails) {
    // WhatsApp Business API integration
    console.log('WhatsApp would be sent:', {
      to: phoneNumber,
      message: `🏥 Cornwells Pharmacy\n\nBooking confirmed!\n📅 ${bookingDetails.serviceName}\n⏰ ${bookingDetails.time}\n📞 We'll call you soon\n\nRef: ${bookingDetails.reference}`
    });
    
    return { success: true, channel: 'whatsapp' };
  }

  async sendEmailConfirmation(email, bookingDetails) {
    // Email service integration
    const calendarInvite = this.generateCalendarInvite(bookingDetails);
    
    console.log('Email would be sent:', {
      to: email,
      subject: `Booking Confirmed - ${bookingDetails.serviceName}`,
      html: this.generateEmailTemplate(bookingDetails),
      attachments: [calendarInvite]
    });
    
    return { success: true, channel: 'email' };
  }

  generateCalendarInvite(bookingDetails) {
    const startDate = new Date(bookingDetails.date);
    const endDate = new Date(startDate.getTime() + 30 * 60000); // 30 min appointment
    
    return {
      filename: 'appointment.ics',
      content: `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:${bookingDetails.serviceName} - Cornwells Pharmacy
DESCRIPTION:Consultation for ${bookingDetails.serviceName}
LOCATION:Cornwells Pharmacy
END:VEVENT
END:VCALENDAR`
    };
  }

  generateEmailTemplate(bookingDetails) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>🏥 Booking Confirmed</h2>
        <p>Thank you for booking with Cornwells Pharmacy!</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>${bookingDetails.serviceName}</h3>
          <p><strong>Date:</strong> ${bookingDetails.date}</p>
          <p><strong>Time:</strong> ${bookingDetails.time}</p>
          <p><strong>Reference:</strong> ${bookingDetails.reference}</p>
        </div>
        
        <p>We'll call you at the scheduled time. Please keep your phone nearby.</p>
        
        <p>Need to reschedule? Call us at 01234 567890</p>
        
        <p>Best regards,<br>Cornwells Pharmacy Team</p>
      </div>
    `;
  }

  // PWA Push Notifications
  async requestNotificationPermission() {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  async sendPushNotification(title, body, data = {}) {
    if ('serviceWorker' in navigator && 'Notification' in window) {
      const registration = await navigator.serviceWorker.ready;
      
      if (registration.showNotification) {
        registration.showNotification(title, {
          body,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          data,
          actions: [
            { action: 'view', title: 'View Details' },
            { action: 'call', title: 'Call Pharmacy' }
          ]
        });
      }
    }
  }

  // Analytics and Optimization
  trackConversionFunnel(step, data = {}) {
    const funnelData = {
      step,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      ...data
    };
    
    // Send to analytics
    if (window.gtag) {
      window.gtag('event', 'booking_funnel', funnelData);
    }
    
    console.log('Funnel tracking:', funnelData);
  }

  // A/B Testing Framework
  getVariant(testName) {
    const userId = this.getUserId();
    const hash = this.simpleHash(userId + testName);
    return hash % 2 === 0 ? 'A' : 'B';
  }

  getUserId() {
    let userId = localStorage.getItem('cornwells_user_id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('cornwells_user_id', userId);
    }
    return userId;
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

export const bookingEnhancements = new BookingEnhancements(); 