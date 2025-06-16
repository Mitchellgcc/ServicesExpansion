import { services, getFeaturedServices, getAllServicesForSelector, getServiceById } from './data/services.js';
import { supabase, SERVICE_TYPES, TIME_SLOTS } from './config/supabase.js';
import { cornwellsTracking } from './utils/tracking.js';
import { bookingEnhancements } from './utils/booking-enhancements.js';
import QRCode from 'qrcode';
import anime from 'animejs';

class PharmacyLandingApp {
  constructor() {
    this.currentService = null;
    // Use production URL for QR codes if available, otherwise use current origin
    this.baseURL = window.location.hostname === 'localhost' ? 
      'https://cornwells-services.netlify.app' : 
      window.location.origin;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadCurrentPage();
    this.initializeAnimations();
    
    // Initialize tracking and capture UTM parameters
    cornwellsTracking.captureUTMParameters();
    
    // Track page view with service context
    const serviceId = this.extractServiceIdFromPath(window.location.pathname);
    const serviceName = serviceId ? getServiceById(serviceId)?.title : null;
    cornwellsTracking.trackPageView(serviceName);
    
    // Register service worker for PWA functionality
    this.registerServiceWorker();
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }
  }

  // Check if user came from QR code
  isQRCodeVisit() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('utm_content') && urlParams.get('utm_content') === 'qr';
  }

  // Check if user is on mobile device
  isMobileDevice() {
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  setupEventListeners() {
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-book-consultation]')) {
        e.preventDefault();
        this.handleBookingClick(e.target);
      }
      
      if (e.target.matches('[data-call-pharmacy]')) {
        e.preventDefault();
        this.handleCallClick();
      }
      
      if (e.target.matches('[data-visit-cornwells]')) {
        e.preventDefault();
        this.handleCornwellsClick();
      }
      
      if (e.target.matches('[data-generate-qr]')) {
        e.preventDefault();
        this.generateQRCode(e.target);
      }
    });

    // Handle mobile booking form submission
    document.addEventListener('submit', (e) => {
      if (e.target.id === 'mobile-booking-form') {
        e.preventDefault();
        this.handleMobileBookingSubmission();
      }
    });

    window.addEventListener('popstate', () => {
      this.loadCurrentPage();
    });
  }

  loadCurrentPage() {
    const path = window.location.pathname;
    const serviceId = this.extractServiceIdFromPath(path);
    
    if (serviceId && getServiceById(serviceId)) {
      // Check if this is a QR code visit for mobile optimization
      if (this.isQRCodeVisit() && this.isMobileDevice()) {
        this.loadMobileQRLanding(serviceId);
      } else {
        this.loadServiceLanding(serviceId);
      }
    } else {
      this.loadServiceSelector();
    }
  }

  extractServiceIdFromPath(path) {
    // Remove leading slash and any trailing slashes
    const cleanPath = path.replace(/^\/+|\/+$/g, '');
    return cleanPath || null;
  }

  // New mobile QR code landing page
  async loadMobileQRLanding(serviceId) {
    const service = getServiceById(serviceId);
    if (!service) {
      this.loadServiceSelector();
      return;
    }

    this.currentService = service;
    
    // Extract QR tracking data for pre-population
    const urlParams = new URLSearchParams(window.location.search);
    const branch = urlParams.get('utm_medium') || 'unknown';
    const material = urlParams.get('utm_source') || 'qr';
    
    // Track QR landing
    cornwellsTracking.trackPageView(`${service.title} - QR Landing`);
    
    const content = await this.generateUltraFastBookingHTML(service, branch, material);
    document.getElementById('app').innerHTML = content;
    
    // Initialize ultra-fast booking features
    this.initializeEnhancedUltraFastBooking();
    
    // Update page title
    document.title = `Book ${service.title} - Cornwells Pharmacy`;
    this.updateMetaDescription(`Quick booking for ${service.title}. Request a callback for consultation.`);
  }

  async generateUltraFastBookingHTML(service, branch, material) {
    const branchName = this.getBranchName(branch);
    const isToday = new Date().getHours() < 17;
    
    // Get enhancement data
    const scarcityData = await bookingEnhancements.getScarcityIndicators(service.id);
    const socialProof = await bookingEnhancements.getSocialProof(service.id);
    const personalizedDefaults = bookingEnhancements.getPersonalizedDefaults();
    const lossAversionMsg = bookingEnhancements.getLossAversionMessage();
    
    return `
      <div class="min-h-screen bg-gradient-to-br ${service.colorScheme.primary}">
        <!-- Enhanced Header with Behavioral Psychology -->
        <div class="bg-white/95 backdrop-blur-sm px-4 py-3 safe-area-top">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <div class="text-2xl">${service.icon}</div>
              <div>
                <h1 class="font-bold text-gray-900 text-lg leading-tight">${service.title}</h1>
                <p class="text-sm text-gray-600">${branchName}</p>
                ${personalizedDefaults.isReturningUser ? '<p class="text-xs text-blue-600">👋 Welcome back!</p>' : ''}
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs text-green-600 font-semibold">✅ Available ${isToday ? 'Today' : 'Tomorrow'}</div>
              ${scarcityData.showScarcity ? `<div class="text-xs text-orange-600 font-semibold">⚡ ${scarcityData.message}</div>` : '<div class="text-xs text-gray-500">Quick response</div>'}
            </div>
          </div>
          
          <!-- Social Proof & Loss Aversion -->
          <div class="mt-2 flex items-center justify-between text-xs">
            <div class="text-gray-600">👥 ${socialProof.message}</div>
            ${lossAversionMsg ? `<div class="text-orange-600 font-semibold">${lossAversionMsg}</div>` : ''}
          </div>
        </div>

        <!-- Hero Message -->
        <div class="px-4 py-6 text-center text-white">
          <h2 class="text-2xl font-bold mb-2 leading-tight">${service.headline}</h2>
          <p class="text-white/90 mb-6 leading-relaxed">${service.subheadline}</p>
          
          <!-- Key Benefits (2 max) -->
          <div class="space-y-2 mb-6">
            ${service.specificBenefits.slice(0, 2).map(benefit => `
              <div class="flex items-center justify-center space-x-2 text-sm">
                <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
                <span class="text-white/90">${benefit}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Ultra-Fast Booking Form -->
        <div class="bg-white rounded-t-3xl px-4 py-6 min-h-screen">
          <div class="max-w-sm mx-auto">
            
            <!-- Progress Indicator -->
            <div class="flex items-center justify-center space-x-2 mb-6">
              <div class="w-8 h-1 bg-gradient-to-r ${service.colorScheme.primary} rounded-full"></div>
              <div class="w-8 h-1 bg-gray-200 rounded-full"></div>
              <div class="w-8 h-1 bg-gray-200 rounded-full"></div>
            </div>

            <form id="ultra-fast-booking" class="space-y-6">
              <!-- Step 1: Enhanced Phone Number with Voice Input -->
              <div class="booking-step active" data-step="1">
                <div class="text-center mb-4">
                  <h3 class="text-xl font-bold text-gray-900 mb-1">Your Phone Number</h3>
                  <p class="text-gray-600 text-sm mb-2">We'll call you back soon</p>
                  <div id="progress-message" class="text-xs text-blue-600 font-semibold"></div>
                </div>
                
                <div class="relative">
                  <input 
                    type="tel" 
                    id="ultra-phone" 
                    placeholder="07XXX XXX XXX" 
                    value="${personalizedDefaults.phoneNumber}"
                    class="w-full px-4 py-4 text-lg font-semibold text-center border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-0 transition-colors"
                    autocomplete="tel"
                    inputmode="numeric"
                  >
                  
                  <!-- Voice Input Button -->
                  <button 
                    type="button" 
                    id="voice-input-btn" 
                    class="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    title="Tap to speak your number"
                  >
                    🎤
                  </button>
                  
                  <div id="phone-feedback" class="mt-2 text-center text-sm"></div>
                </div>
                
                <!-- One-Tap Quick Options for Returning Users -->
                ${personalizedDefaults.isReturningUser && personalizedDefaults.phoneNumber ? `
                  <div class="mt-4 text-center">
                    <button 
                      type="button" 
                      id="use-saved-number" 
                      class="text-sm text-blue-600 font-semibold underline"
                    >
                      📞 Use ${personalizedDefaults.phoneNumber}
                    </button>
                  </div>
                ` : ''}
              </div>

              <!-- Step 2: Smart Time Selection with Real-Time Availability -->
              <div class="booking-step" data-step="2">
                <div class="text-center mb-4">
                  <h3 class="text-xl font-bold text-gray-900 mb-1">When works best?</h3>
                  <p class="text-gray-600 text-sm mb-2">Choose your preferred time</p>
                  <div id="progress-message-2" class="text-xs text-blue-600 font-semibold">Almost done! Just one more step 💪</div>
                </div>
                
                <div class="space-y-3" id="time-slots-container">
                  ${isToday ? `
                    <button type="button" class="time-option active" data-time="today">
                      <div class="flex items-center justify-between p-4 border-2 border-blue-500 bg-blue-50 rounded-2xl">
                        <div>
                          <div class="font-semibold text-gray-900">Today</div>
                          <div class="text-sm text-gray-600">Next available slot</div>
                          ${scarcityData.showScarcity ? `<div class="text-xs text-orange-600 font-semibold">${scarcityData.message}</div>` : ''}
                        </div>
                        <div class="text-right">
                          <div class="text-2xl">⚡</div>
                          <div class="text-xs text-green-600">Available</div>
                        </div>
                      </div>
                    </button>
                  ` : ''}
                  <button type="button" class="time-option ${!isToday ? 'active' : ''}" data-time="tomorrow">
                    <div class="flex items-center justify-between p-4 border-2 ${!isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} rounded-2xl">
                      <div>
                        <div class="font-semibold text-gray-900">Tomorrow</div>
                        <div class="text-sm text-gray-600">Morning preferred</div>
                      </div>
                      <div class="text-right">
                        <div class="text-2xl">📅</div>
                        <div class="text-xs text-blue-600">Recommended</div>
                      </div>
                    </div>
                  </button>
                  <button type="button" class="time-option" data-time="this-week">
                    <div class="flex items-center justify-between p-4 border-2 border-gray-200 rounded-2xl">
                      <div>
                        <div class="font-semibold text-gray-900">This Week</div>
                        <div class="text-sm text-gray-600">When convenient</div>
                      </div>
                      <div class="text-right">
                        <div class="text-2xl">📋</div>
                        <div class="text-xs text-gray-600">Flexible</div>
                      </div>
                    </div>
                  </button>
                </div>
                
                <!-- One-Tap Booking for Smart Default -->
                <div class="mt-6 text-center">
                  <button 
                    type="button" 
                    id="one-tap-book" 
                    class="w-full bg-gradient-to-r ${service.colorScheme.primary} text-white py-4 rounded-2xl font-bold text-lg shadow-xl transform transition-all active:scale-95"
                    style="display: none;"
                  >
                    ⚡ Book ${personalizedDefaults.preferredTime === 'today' ? 'Today' : 'Tomorrow'} (One-Tap)
                  </button>
                </div>
              </div>

              <!-- Step 3: Confirmation -->
              <div class="booking-step" data-step="3">
                <div class="text-center">
                  <div class="text-6xl mb-4">📞</div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Ready to Book?</h3>
                  <p class="text-gray-600 text-sm mb-6">We'll call <span id="confirm-phone" class="font-semibold"></span> <span id="confirm-time"></span></p>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="space-y-3">
                <button 
                  type="button" 
                  id="next-step-btn" 
                  class="w-full bg-gradient-to-r ${service.colorScheme.primary} text-white py-4 rounded-2xl font-bold text-lg shadow-xl transform transition-all active:scale-95"
                  disabled
                >
                  Enter Phone Number
                </button>
                
                <button 
                  type="submit" 
                  id="book-now-btn" 
                  class="w-full bg-gradient-to-r ${service.colorScheme.primary} text-white py-4 rounded-2xl font-bold text-lg shadow-xl transform transition-all active:scale-95 hidden"
                >
                  📞 Book Consultation
                </button>
                
                <button 
                  type="button" 
                  id="back-step-btn" 
                  class="w-full bg-gray-100 text-gray-700 py-3 rounded-2xl font-semibold hidden"
                >
                  ← Back
                </button>
              </div>
            </form>

            <!-- Trust Indicators -->
            <div class="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-gray-100">
              <div class="text-center">
                <div class="text-2xl mb-1">⚡</div>
                <div class="text-xs font-semibold text-gray-900">Quick response</div>
              </div>
              <div class="text-center">
                <div class="text-2xl mb-1">🔒</div>
                <div class="text-xs font-semibold text-gray-900">Confidential</div>
              </div>
              <div class="text-center">
                <div class="text-2xl mb-1">💯</div>
                <div class="text-xs font-semibold text-gray-900">Free consultation</div>
              </div>
            </div>

            <!-- Emergency Contact -->
            <div class="text-center mt-6 pt-4 border-t border-gray-100">
              <p class="text-xs text-gray-500 mb-2">Need to speak to someone now?</p>
              <button data-call-pharmacy class="text-blue-600 font-semibold text-sm underline">
                📞 Call Pharmacy Directly
              </button>
            </div>

            <div class="safe-area-bottom"></div>
          </div>
        </div>
      </div>
    `;
  }

  initializeEnhancedUltraFastBooking() {
    let currentStep = 1;
    let selectedTime = '';
    let phoneNumber = '';

    const phoneInput = document.getElementById('ultra-phone');
    const phoneFeedback = document.getElementById('phone-feedback');
    const nextBtn = document.getElementById('next-step-btn');
    const bookBtn = document.getElementById('book-now-btn');
    const backBtn = document.getElementById('back-step-btn');
    const confirmPhone = document.getElementById('confirm-phone');
    const confirmTime = document.getElementById('confirm-time');
    const voiceBtn = document.getElementById('voice-input-btn');
    const oneTapBtn = document.getElementById('one-tap-book');
    const progressMsg = document.getElementById('progress-message');

    // Initialize with personalized defaults
    const personalizedDefaults = bookingEnhancements.getPersonalizedDefaults();
    if (personalizedDefaults.phoneNumber && phoneInput) {
      phoneInput.value = personalizedDefaults.phoneNumber;
      phoneNumber = personalizedDefaults.phoneNumber;
      this.validatePhoneAndUpdateUI(phoneNumber, phoneFeedback, nextBtn);
    }

    // Enhanced phone number formatting with progress tracking
    phoneInput?.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      
      // Handle UK mobile numbers
      if (value.startsWith('44')) value = value.substring(2);
      if (value.startsWith('0')) value = value.substring(1);
      
      // Format as 07XXX XXX XXX
      if (value.length > 0) {
        if (value.length <= 5) {
          value = `07${value}`;
        } else if (value.length <= 8) {
          value = `07${value.substring(1, 5)} ${value.substring(5)}`;
        } else {
          value = `07${value.substring(1, 5)} ${value.substring(5, 8)} ${value.substring(8, 11)}`;
        }
      }
      
      e.target.value = value;
      phoneNumber = value;
      
      // Enhanced validation with progress anchoring
      this.validatePhoneAndUpdateUI(value, phoneFeedback, nextBtn, progressMsg);
      
      // Track conversion funnel
      bookingEnhancements.trackConversionFunnel('phone_entry', { 
        phoneLength: value.length,
        isValid: this.isValidUKMobile(value)
      });
    });

    // Voice Input Implementation
    voiceBtn?.addEventListener('click', () => {
      voiceBtn.innerHTML = '🎙️';
      voiceBtn.classList.add('animate-pulse');
      
      bookingEnhancements.startVoiceInput((result) => {
        voiceBtn.innerHTML = '🎤';
        voiceBtn.classList.remove('animate-pulse');
        
        if (result.success && result.phoneNumber) {
          phoneInput.value = result.phoneNumber;
          phoneNumber = result.phoneNumber;
          this.validatePhoneAndUpdateUI(phoneNumber, phoneFeedback, nextBtn, progressMsg);
          
          // Auto-advance if valid
          if (this.isValidUKMobile(phoneNumber)) {
            setTimeout(() => this.advanceToStep(2), 500);
          }
        } else {
          phoneFeedback.innerHTML = '<span class="text-red-600">❌ Voice input failed. Please type your number.</span>';
        }
      });
    });

    // One-tap booking for returning users
    oneTapBtn?.addEventListener('click', () => {
      if (phoneNumber && this.isValidUKMobile(phoneNumber)) {
        const smartDefault = bookingEnhancements.getSmartTimeDefault();
        this.handleUltraFastBooking(phoneNumber, smartDefault);
      }
    });

    // Time selection
    document.querySelectorAll('.time-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Remove active from all
        document.querySelectorAll('.time-option').forEach(b => {
          b.classList.remove('active');
          b.querySelector('div').classList.remove('border-blue-500', 'bg-blue-50');
          b.querySelector('div').classList.add('border-gray-200');
        });
        
        // Add active to clicked
        btn.classList.add('active');
        btn.querySelector('div').classList.add('border-blue-500', 'bg-blue-50');
        btn.querySelector('div').classList.remove('border-gray-200');
        
        selectedTime = btn.dataset.time;
        
        // Auto-advance to step 3
        setTimeout(() => {
          this.advanceToStep(3);
        }, 300);
      });
    });

    // Next step button
    nextBtn?.addEventListener('click', () => {
      if (currentStep === 1 && this.isValidUKMobile(phoneNumber)) {
        this.advanceToStep(2);
      }
    });

    // Back button
    backBtn?.addEventListener('click', () => {
      if (currentStep > 1) {
        this.advanceToStep(currentStep - 1);
      }
    });

    // Form submission
    document.getElementById('ultra-fast-booking')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleUltraFastBooking(phoneNumber, selectedTime);
    });

    // Step advancement function
    this.advanceToStep = (step) => {
      currentStep = step;
      
      // Update progress indicator
      document.querySelectorAll('.booking-step').forEach((el, index) => {
        el.classList.toggle('active', index + 1 === step);
        el.style.display = index + 1 === step ? 'block' : 'none';
      });
      
      // Update progress bars
      document.querySelectorAll('.w-8.h-1').forEach((bar, index) => {
        if (index < step) {
          bar.className = `w-8 h-1 bg-gradient-to-r ${this.currentService.colorScheme.primary} rounded-full`;
        } else {
          bar.className = 'w-8 h-1 bg-gray-200 rounded-full';
        }
      });
      
      // Update buttons
      if (step === 1) {
        nextBtn.style.display = 'block';
        bookBtn.style.display = 'none';
        backBtn.style.display = 'none';
      } else if (step === 2) {
        nextBtn.style.display = 'none';
        bookBtn.style.display = 'none';
        backBtn.style.display = 'block';
      } else if (step === 3) {
        nextBtn.style.display = 'none';
        bookBtn.style.display = 'block';
        backBtn.style.display = 'block';
        
        // Update confirmation
        confirmPhone.textContent = phoneNumber;
        confirmTime.textContent = this.getTimeText(selectedTime);
      }
    };
  }

  isValidUKMobile(phone) {
    // UK mobile number validation
    const cleaned = phone.replace(/\s/g, '');
    return /^07\d{9}$/.test(cleaned);
  }

  validatePhoneAndUpdateUI(value, phoneFeedback, nextBtn, progressMsg) {
    if (this.isValidUKMobile(value)) {
      phoneFeedback.innerHTML = '<span class="text-green-600">✅ Perfect!</span>';
      nextBtn.disabled = false;
      nextBtn.textContent = 'Choose Time →';
      nextBtn.classList.remove('opacity-50');
      
      // Progress anchoring
      const progress = bookingEnhancements.getProgressAnchoring(1, 3);
      if (progressMsg) progressMsg.textContent = progress.message;
      
      // Show one-tap option for smart default
      const oneTapBtn = document.getElementById('one-tap-book');
      if (oneTapBtn) {
        oneTapBtn.style.display = 'block';
        setTimeout(() => oneTapBtn.style.display = 'none', 3000); // Hide after 3 seconds
      }
    } else if (value.length > 5) {
      phoneFeedback.innerHTML = '<span class="text-orange-600">⚠️ Please check your number</span>';
      nextBtn.disabled = true;
      nextBtn.textContent = 'Enter Phone Number';
      nextBtn.classList.add('opacity-50');
      if (progressMsg) progressMsg.textContent = '';
    } else {
      phoneFeedback.innerHTML = '';
      nextBtn.disabled = true;
      nextBtn.textContent = 'Enter Phone Number';
      nextBtn.classList.add('opacity-50');
      if (progressMsg) progressMsg.textContent = '';
    }
  }

  getTimeText(timeOption) {
    switch(timeOption) {
      case 'today': return 'today';
      case 'tomorrow': return 'tomorrow';
      case 'this-week': return 'this week';
      default: return '';
    }
  }

  getBranchName(branchCode) {
    const branches = {
      'wx': 'Weeping Cross',
      'gw': 'Great Wyrley', 
      'hc': 'Holmcroft',
      'wol': 'Wolstanton',
      'bc': 'Beaconside',
      'nc': 'Newcastle',
      'sv': 'Silverdale',
      'st4': 'Stoke City Centre',
      'ch': 'Chadsmoor',
      'ah': 'Abbey Hulton'
    };
    return branches[branchCode] || 'Cornwells Pharmacy';
  }

  async handleUltraFastBooking(phone, timePreference) {
    const bookBtn = document.getElementById('book-now-btn');
    const originalText = bookBtn.textContent;
    
    try {
      bookBtn.textContent = '⏳ Booking...';
      bookBtn.disabled = true;
      
      // Get QR tracking data
      const urlParams = new URLSearchParams(window.location.search);
      const utmData = cornwellsTracking.getStoredUTMData();
      
      const bookingData = {
        patient_name: null, // Will be collected on call
        phone_number: phone.replace(/\s/g, ''),
        email: null,
        preferred_time_slot: timePreference,
        notes: `Ultra-fast booking via ${urlParams.get('utm_source') || 'QR code'}`,
        service_type: this.currentService.id,
        service_name: this.currentService.title,
        source_url: window.location.href,
        consent_given: true, // Implied consent for callback
        preferred_contact_method: 'phone',
        booking_type: 'ultra_fast',
        utm_params: utmData,
        branch_code: urlParams.get('utm_medium'),
        material_type: urlParams.get('utm_source')
      };
      
      console.log('Ultra-fast booking:', bookingData);
      
      const { data, error } = await supabase
        .from('service_consultations')
        .insert([bookingData])
        .select();
      
      if (error) throw error;
      
      // Track conversion
      cornwellsTracking.trackBookingConversion(this.currentService.id, bookingData);
      bookingEnhancements.trackConversionFunnel('booking_complete', { 
        serviceId: this.currentService.id,
        timePreference,
        bookingType: 'ultra_fast'
      });
      
      // Save user profile for personalization
      bookingEnhancements.saveUserProfile({
        phoneNumber: phone,
        preferredTimes: [timePreference],
        lastVisit: new Date().toISOString(),
        previousBookings: [{
          serviceId: this.currentService.id,
          serviceName: this.currentService.title,
          date: new Date().toISOString()
        }]
      });
      
      // Multi-channel orchestration
      const bookingDetails = {
        serviceName: this.currentService.title,
        time: this.getTimeText(timePreference),
        date: new Date().toLocaleDateString(),
        reference: `CW${Date.now().toString().slice(-6)}`
      };
      
      // Send confirmations via multiple channels
      await Promise.all([
        bookingEnhancements.sendSMSConfirmation(phone, bookingDetails),
        bookingEnhancements.sendWhatsAppMessage(phone, bookingDetails)
      ]);
      
      // Request push notification permission for future updates
      bookingEnhancements.requestNotificationPermission();
      
      // Show success
      this.showUltraFastSuccess(phone, timePreference, bookingDetails);
      
    } catch (error) {
      console.error('Ultra-fast booking error:', error);
      this.showUltraFastError();
      
      bookBtn.textContent = originalText;
      bookBtn.disabled = false;
    }
  }

  showUltraFastSuccess(phone, timePreference, bookingDetails) {
    const container = document.querySelector('.max-w-sm');
    if (container) {
      container.innerHTML = `
        <div class="text-center py-8">
          <div class="text-8xl mb-6">✅</div>
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Booking Confirmed!</h2>
          <p class="text-lg text-gray-700 mb-6">
            We'll call <span class="font-semibold">${phone}</span> back soon.
          </p>
          
          <div class="bg-green-50 border border-green-200 rounded-2xl p-6 mb-6">
            <div class="flex items-center justify-center space-x-2 mb-3">
              <div class="text-2xl">📞</div>
              <div class="font-semibold text-green-800">Keep your phone nearby!</div>
            </div>
            <p class="text-sm text-green-700 mb-3">
              Our pharmacist will call to confirm your ${this.getTimeText(timePreference)} appointment.
            </p>
            <div class="text-xs text-green-600 font-semibold">
              Reference: ${bookingDetails?.reference || `#${Date.now().toString().slice(-6)}`}
            </div>
          </div>
          
          <!-- Multi-Channel Confirmation -->
          <div class="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
            <h3 class="font-semibold text-blue-800 mb-2">📱 Confirmation Sent</h3>
            <div class="space-y-1 text-sm text-blue-700">
              <div class="flex items-center justify-center space-x-2">
                <span>💬</span>
                <span>SMS confirmation sent</span>
              </div>
              <div class="flex items-center justify-center space-x-2">
                <span>📱</span>
                <span>WhatsApp message sent</span>
              </div>
            </div>
          </div>
          
          <div class="space-y-3">
            <button data-call-pharmacy class="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold">
              📞 Call Us Instead
            </button>
            <button onclick="window.app.loadServiceSelector()" class="w-full bg-gray-100 text-gray-700 py-3 rounded-2xl font-semibold">
              ← Back to Services
            </button>
          </div>
          
          <!-- PWA Install Prompt -->
          <div class="mt-6 pt-4 border-t border-gray-100">
            <button id="install-pwa" class="text-sm text-blue-600 underline" style="display: none;">
              📱 Add to Home Screen for faster booking
            </button>
          </div>
        </div>
      `;
      
      // Show PWA install prompt if available
      this.showPWAInstallPrompt();
      
      // Add confetti celebration effect
      this.showConfettiEffect();
    }
  }

  showPWAInstallPrompt() {
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      const installBtn = document.getElementById('install-pwa');
      if (installBtn) {
        installBtn.style.display = 'block';
        installBtn.addEventListener('click', () => {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
              console.log('User accepted the PWA install prompt');
            }
            deferredPrompt = null;
            installBtn.style.display = 'none';
          });
        });
      }
    });
  }

  showUltraFastError() {
    const bookBtn = document.getElementById('book-now-btn');
    if (bookBtn) {
      bookBtn.innerHTML = '❌ Try Again';
      bookBtn.classList.add('bg-red-500');
      
      setTimeout(() => {
        bookBtn.innerHTML = '📞 Book Consultation';
        bookBtn.classList.remove('bg-red-500');
        bookBtn.disabled = false;
      }, 3000);
    }
  }

  async loadServiceLanding(serviceId) {
    const service = getServiceById(serviceId);
    if (!service) {
      this.loadServiceSelector();
      return;
    }

    this.currentService = service;
    
    // Track service page view
    cornwellsTracking.trackPageView(service.title);
    
    const content = this.generateServiceLandingHTML(service);
    document.getElementById('app').innerHTML = content;
    
    // Update page title and meta description
    document.title = `${service.title} - Cornwells Pharmacy Services`;
    this.updateMetaDescription(service.description);
    
    // Re-initialize animations for new content
    this.initializeAnimations();
  }

  loadServiceSelector() {
    this.currentService = null;
    const content = this.generateServiceSelectorHTML();
    document.getElementById('app').innerHTML = content;
    
    // Update page title
    document.title = 'Cornwells Pharmacy Services - Expert Healthcare in Your Community';
    this.updateMetaDescription('Discover our comprehensive range of pharmacy services including health screenings, vaccinations, travel health, and specialized consultations. Book your appointment today.');
    
    // Track main page view
    cornwellsTracking.trackPageView();
    
    // Re-initialize animations
    this.initializeAnimations();
  }

  generateServiceSelectorHTML() {
    const allServices = getAllServicesForSelector();
    
    return `
      <div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <!-- Mobile-First Header -->
        <div class="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50 safe-area-top">
          <div class="px-4 py-4">
            <div class="text-center">
              <h1 class="text-xl font-bold text-gray-900">Cornwells Pharmacy</h1>
              <p class="text-sm text-gray-600 mt-1">Choose Your Service</p>
            </div>
          </div>
        </div>

        <!-- Mobile Hero Section -->
        <div class="px-4 py-6 text-center text-white">
          <h2 class="text-2xl font-bold mb-2">Expert Healthcare Services</h2>
          <p class="text-white/90 mb-6">Professional consultations available today</p>
          
          <!-- Quick Stats -->
          <div class="flex justify-center space-x-6 mb-6">
            <div class="text-center">
              <div class="text-lg font-bold">Fast</div>
              <div class="text-xs text-white/80">Response</div>
            </div>
            <div class="text-center">
              <div class="text-lg font-bold">10</div>
              <div class="text-xs text-white/80">Locations</div>
            </div>
            <div class="text-center">
              <div class="text-lg font-bold">Free</div>
              <div class="text-xs text-white/80">Consultation</div>
            </div>
          </div>
        </div>

        <!-- Enhanced Service Cards -->
        <div class="bg-white rounded-t-3xl px-4 py-6 min-h-screen">
          <div class="max-w-2xl mx-auto">
            <div class="space-y-4">
              ${allServices.map((service, index) => `
                <div class="service-card bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200" data-service="${service.id}">
                  <!-- Service Header -->
                  <div class="p-4 bg-gradient-to-r ${service.colorScheme.primary} text-white">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-3">
                        <div class="text-2xl">${service.icon}</div>
                        <div>
                          <h3 class="font-bold text-lg leading-tight">${service.title}</h3>
                          <p class="text-white/90 text-sm">${service.headline}</p>
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="text-xs font-semibold">Available Today</div>
                        <div class="text-xs text-white/80">Quick response</div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Quick Benefits -->
                  <div class="p-4">
                    <div class="space-y-2 mb-4">
                      ${service.specificBenefits.slice(0, 2).map(benefit => `
                        <div class="flex items-start space-x-2 text-sm">
                          <div class="w-1.5 h-1.5 bg-gradient-to-r ${service.colorScheme.primary} rounded-full mt-2 flex-shrink-0"></div>
                          <span class="text-gray-700">${benefit}</span>
                        </div>
                      `).join('')}
                    </div>
                    
                    <!-- Quick Action Buttons -->
                    <div class="flex space-x-2">
                      <button 
                        onclick="window.app.showQuickBooking('${service.id}')" 
                        class="flex-1 bg-gradient-to-r ${service.colorScheme.primary} text-white py-3 px-4 rounded-xl font-semibold text-sm shadow-lg transform transition-all active:scale-95"
                      >
                        📞 Quick Book
                      </button>
                      <button 
                        onclick="window.app.loadServiceLanding('${service.id}')" 
                        class="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm border border-gray-200"
                      >
                        Learn More
                      </button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
            
            <!-- Emergency Contact -->
            <div class="text-center mt-8 pt-6 border-t border-gray-100">
              <p class="text-sm text-gray-600 mb-3">Need to speak to someone immediately?</p>
              <button data-call-pharmacy class="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg">
                📞 Call Pharmacy Now
              </button>
            </div>
            
            <div class="safe-area-bottom"></div>
          </div>
        </div>
      </div>
    `;
  }

  // New Quick Booking Modal (2 fields only)
  showQuickBooking(serviceId) {
    const service = getServiceById(serviceId);
    if (!service) return;

    const modalHTML = `
      <div id="quick-booking-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
        <!-- iPhone-optimized modal -->
        <div class="bg-white w-full sm:max-w-sm sm:w-full sm:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-y-auto">
          <!-- Safe area padding for iPhone -->
          <div class="px-4 py-4 pb-safe">
            <!-- Compact Header -->
            <div class="text-center mb-4">
              <div class="flex items-center justify-center space-x-2 mb-2">
                <div class="text-2xl">${service.icon}</div>
                <h2 class="text-lg font-bold text-gray-900">${service.title}</h2>
              </div>
              <p class="text-sm text-blue-600 font-semibold">📞 Request a callback</p>
            </div>
            
            <form id="quick-booking-form" class="space-y-4">
              <!-- Phone Number (Compact) -->
              <div>
                <label for="quick-phone" class="block text-sm font-semibold text-gray-700 mb-2">Your Phone Number</label>
                <input 
                  type="tel" 
                  id="quick-phone" 
                  required 
                  placeholder="07XXX XXX XXX"
                  class="w-full px-4 py-3 text-lg font-semibold text-center border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors"
                  autocomplete="tel"
                  inputmode="numeric"
                >
                <div id="quick-phone-feedback" class="mt-1 text-center text-sm"></div>
              </div>

              <!-- Time Preference (Compact) -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">When works best?</label>
                <div class="space-y-2">
                  <label class="flex items-center p-2.5 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors active:bg-gray-100">
                    <input type="radio" name="quick-time" value="today" class="mr-3 scale-110" ${new Date().getHours() < 17 ? 'checked' : ''}>
                    <div class="flex items-center justify-between w-full">
                      <span class="font-medium text-sm">Today</span>
                      <span class="text-xs text-gray-600">Next available</span>
                    </div>
                  </label>
                  <label class="flex items-center p-2.5 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors active:bg-gray-100">
                    <input type="radio" name="quick-time" value="tomorrow" class="mr-3 scale-110" ${new Date().getHours() >= 17 ? 'checked' : ''}>
                    <div class="flex items-center justify-between w-full">
                      <span class="font-medium text-sm">Tomorrow</span>
                      <span class="text-xs text-gray-600">Morning/afternoon</span>
                    </div>
                  </label>
                  <label class="flex items-center p-2.5 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors active:bg-gray-100">
                    <input type="radio" name="quick-time" value="this-week" class="mr-3 scale-110">
                    <div class="flex items-center justify-between w-full">
                      <span class="font-medium text-sm">This Week</span>
                      <span class="text-xs text-gray-600">When convenient</span>
                    </div>
                  </label>
                </div>
              </div>

              <!-- Action Buttons (iPhone-optimized) -->
              <div class="space-y-3 pt-3">
                <button 
                  type="submit" 
                  id="quick-submit-btn" 
                  class="w-full bg-gradient-to-r ${service.colorScheme.primary} text-white py-4 rounded-xl font-bold text-base shadow-lg transform transition-all active:scale-95 min-h-[44px]"
                  disabled
                >
                  📞 Book Consultation
                </button>
                <button 
                  type="button" 
                  onclick="document.getElementById('quick-booking-modal').remove()" 
                  class="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold text-sm min-h-[44px]"
                >
                  Cancel
                </button>
              </div>
            </form>

            <!-- Compact Trust Indicators -->
            <div class="flex justify-center space-x-4 mt-4 pt-3 border-t border-gray-100">
              <div class="text-center">
                <div class="text-sm mb-0.5">⚡</div>
                <div class="text-xs font-semibold text-gray-900">Fast</div>
              </div>
              <div class="text-center">
                <div class="text-sm mb-0.5">🔒</div>
                <div class="text-xs font-semibold text-gray-900">Private</div>
              </div>
              <div class="text-center">
                <div class="text-sm mb-0.5">💯</div>
                <div class="text-xs font-semibold text-gray-900">Free</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Initialize quick booking functionality
    this.initializeQuickBooking(serviceId);
  }

  initializeQuickBooking(serviceId) {
    const phoneInput = document.getElementById('quick-phone');
    const phoneFeedback = document.getElementById('quick-phone-feedback');
    const submitBtn = document.getElementById('quick-submit-btn');
    const form = document.getElementById('quick-booking-form');

    // Smart phone number formatting (same as ultra-fast)
    phoneInput?.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      
      // Handle UK mobile numbers
      if (value.startsWith('44')) value = value.substring(2);
      if (value.startsWith('0')) value = value.substring(1);
      
      // Format as 07XXX XXX XXX
      if (value.length > 0) {
        if (value.length <= 5) {
          value = `07${value}`;
        } else if (value.length <= 8) {
          value = `07${value.substring(1, 5)} ${value.substring(5)}`;
        } else {
          value = `07${value.substring(1, 5)} ${value.substring(5, 8)} ${value.substring(8, 11)}`;
        }
      }
      
      e.target.value = value;
      
      // Validate and provide feedback
      if (this.isValidUKMobile(value)) {
        phoneFeedback.innerHTML = '<span class="text-green-600">✅ Perfect!</span>';
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-50');
      } else if (value.length > 5) {
        phoneFeedback.innerHTML = '<span class="text-orange-600">⚠️ Please check your number</span>';
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-50');
      } else {
        phoneFeedback.innerHTML = '';
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-50');
      }
    });

    // Form submission
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleQuickBookingSubmission(serviceId);
    });
  }

  async handleQuickBookingSubmission(serviceId) {
    const service = getServiceById(serviceId);
    const submitBtn = document.getElementById('quick-submit-btn');
    const originalText = submitBtn.textContent;
    
    try {
      submitBtn.textContent = '⏳ Booking...';
      submitBtn.disabled = true;
      
      const phoneNumber = document.getElementById('quick-phone').value.replace(/\s/g, '');
      const timePreference = document.querySelector('input[name="quick-time"]:checked').value;
      
      const bookingData = {
        patient_name: null, // Will be collected on call
        phone_number: phoneNumber,
        email: null,
        preferred_time_slot: timePreference,
        notes: `Quick booking from service selector`,
        service_type: serviceId,
        service_name: service.title,
        source_url: window.location.href,
        consent_given: true, // Implied consent for callback
        preferred_contact_method: 'phone',
        booking_type: 'quick_book',
        utm_params: cornwellsTracking.getStoredUTMData()
      };
      
      const { data, error } = await supabase
        .from('service_consultations')
        .insert([bookingData])
        .select();
      
      if (error) throw error;
      
      // Track conversion
      cornwellsTracking.trackBookingConversion(serviceId, bookingData);
      
      // Show success
      this.showQuickBookingSuccess(phoneNumber, timePreference, service);
      
    } catch (error) {
      console.error('Quick booking error:', error);
      this.showQuickBookingError();
      
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }

  showQuickBookingSuccess(phone, timePreference, service) {
    // Replace modal content with success message
    const modal = document.getElementById('quick-booking-modal');
    if (modal) {
      modal.innerHTML = `
        <div class="bg-white rounded-3xl max-w-sm w-full">
          <div class="p-6 text-center">
            <div class="text-6xl mb-4">✅</div>
            <h2 class="text-xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
            <p class="text-gray-700 mb-6">
              We'll call <span class="font-semibold">${phone}</span> back soon to discuss your ${service.title.toLowerCase()}.
            </p>
            
            <div class="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6">
              <div class="flex items-center justify-center space-x-2 mb-2">
                <div class="text-xl">📞</div>
                <div class="font-semibold text-green-800">Keep your phone nearby!</div>
              </div>
              <p class="text-sm text-green-700">
                Our pharmacist will call to confirm your ${this.getTimeText(timePreference)} appointment.
              </p>
            </div>
            
            <div class="space-y-3">
              <button onclick="document.getElementById('quick-booking-modal').remove()" class="w-full bg-gradient-to-r ${service.colorScheme.primary} text-white py-4 rounded-2xl font-bold">
                Perfect, Thanks!
              </button>
              <button data-call-pharmacy class="w-full bg-gray-100 text-gray-700 py-3 rounded-2xl font-semibold">
                📞 Call Instead
              </button>
            </div>
            
            <div class="mt-6 pt-4 border-t border-gray-100 text-center">
              <p class="text-sm text-gray-600">
                Reference: <span class="font-mono text-xs">#${Date.now().toString().slice(-6)}</span>
              </p>
            </div>
          </div>
        </div>
      `;
    }
  }

  showQuickBookingError() {
    const submitBtn = document.getElementById('quick-submit-btn');
    if (submitBtn) {
      submitBtn.innerHTML = '❌ Try Again';
      submitBtn.classList.add('bg-red-500');
      
      setTimeout(() => {
        submitBtn.innerHTML = '📞 Book Consultation';
        submitBtn.classList.remove('bg-red-500');
        submitBtn.disabled = false;
      }, 3000);
    }
  }

  handleBookingClick(button) {
    const serviceId = button.getAttribute('data-book-consultation');
    if (serviceId) {
      // Track booking intent
      cornwellsTracking.trackEvent('booking_intent', {
        service_id: serviceId,
        service_name: cornwellsTracking.services[serviceId] || 'Unknown Service'
      });
      
      this.showBookingModal(serviceId);
    }
  }

  showBookingModal(serviceId) {
    const service = getServiceById(serviceId);
    if (!service) return;

    const modalHTML = `
      <div id="booking-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div class="p-8">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-3xl font-bold text-gray-900">Book ${service.title}</h2>
              <button onclick="document.getElementById('booking-modal').remove()" class="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            
            <form id="booking-form" class="space-y-6">
              <div class="grid md:grid-cols-2 gap-6">
                <div>
                  <label for="patient-name" class="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                  <input type="text" id="patient-name" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
                <div>
                  <label for="phone-number" class="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
                  <input type="tel" id="phone-number" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
              </div>
              
              <div>
                <label for="email" class="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <input type="email" id="email" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>
              
              <div>
                <label for="preferred-time" class="block text-sm font-semibold text-gray-700 mb-2">Preferred Time *</label>
                <select id="preferred-time" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Select preferred time</option>
                  <option value="0">Morning (9:00 AM - 12:00 PM)</option>
                  <option value="1">Afternoon (12:00 PM - 5:00 PM)</option>
                  <option value="2">Evening (5:00 PM - 7:00 PM)</option>
                </select>
              </div>
              
              <div>
                <label for="notes" class="block text-sm font-semibold text-gray-700 mb-2">Additional Notes</label>
                <textarea id="notes" rows="3" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Any specific concerns or questions?"></textarea>
              </div>
              
              <div class="flex items-start space-x-3">
                <input type="checkbox" id="consent" required class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                <label for="consent" class="text-sm text-gray-700">
                  I consent to Cornwells Pharmacy contacting me about this consultation and understand that my data will be processed in accordance with their privacy policy. *
                </label>
              </div>
              
              <button type="submit" id="submit-booking" class="w-full bg-gradient-to-r ${service.colorScheme.primary} text-white py-4 rounded-2xl font-bold text-lg hover:opacity-90 transition-opacity">
                📅 Submit Booking Request
              </button>
              
              <p class="text-sm text-gray-600 text-center">
                We'll call you within 2 hours to confirm your consultation time.
              </p>
            </form>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add form submission handler
    document.getElementById('booking-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleBookingSubmission(serviceId);
    });
  }

  handleCallClick() {
    // Track call intent
    cornwellsTracking.trackEvent('call_intent', {
      source: 'website_button'
    });
    
    // In a real implementation, this would use tel: links
    this.showSuccessMessage('📞 Calling pharmacy... (In demo: would open phone dialer)');
  }

  handleCornwellsClick() {
    // Track website visit intent
    cornwellsTracking.trackEvent('website_visit_intent', {
      source: 'services_site'
    });
    
    // In a real implementation, this would link to the actual Cornwells website
    window.open('https://cornwells.co.uk', '_blank');
  }

  async generateQRCode(button) {
    const serviceId = button.getAttribute('data-generate-qr') || this.currentService?.id;
    if (!serviceId) return;

    const service = getServiceById(serviceId);
    const url = `${this.baseURL}/${serviceId}`;

    try {
      const qrCodeDataURL = await QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
        errorCorrectionLevel: 'M'
      });

      const modalHTML = `
        <div id="qr-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-3xl p-8 max-w-sm w-full text-center">
            <h3 class="text-2xl font-bold text-gray-900 mb-6">${service.title}</h3>
            <div class="mb-6">
              <img src="${qrCodeDataURL}" alt="QR Code" class="mx-auto rounded-2xl shadow-lg">
            </div>
            <p class="text-gray-600 mb-6">Scan to access this service page</p>
            <button class="w-full py-3 bg-gray-900 text-white rounded-2xl font-semibold" onclick="this.closest('#qr-modal').remove()">
              Close
            </button>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }

  initializeAnimations() {
    // Intersection Observer for fade-in animations
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-in-up').forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = 'all 0.6s ease-out';
      observer.observe(el);
    });

    // Anime.js for enhanced animations
    anime({
      targets: '.stagger-1, .stagger-2, .stagger-3, .stagger-4',
      opacity: [0, 1],
      translateY: [30, 0],
      delay: function(el, i) {
        return i * 200;
      },
      duration: 800,
      easing: 'easeOutCubic'
    });
  }

  async handleMobileBookingSubmission() {
    const form = document.getElementById('mobile-booking-form');
    const submitButton = document.getElementById('mobile-submit');
    
    if (!form || !submitButton || !this.currentService) return;
    
    // Get form data
    const formData = {
      patient_name: document.getElementById('mobile-name').value.trim(),
      phone_number: document.getElementById('mobile-phone').value.trim(),
      email: null, // Not collected in mobile form
      preferred_time_slot: TIME_SLOTS[document.getElementById('mobile-time').value],
      notes: document.getElementById('mobile-notes').value.trim() || null,
      service_type: this.currentService.id,
      service_name: SERVICE_TYPES[this.currentService.id],
      source_url: window.location.href,
      consent_given: document.getElementById('mobile-consent').checked,
      preferred_contact_method: 'phone'
    };
    
    // Add UTM tracking data
    const utmData = cornwellsTracking.getStoredUTMData();
    if (Object.keys(utmData).length > 0) {
      formData.utm_params = utmData;
    }
    
    // Update button state
    submitButton.disabled = true;
    submitButton.innerHTML = '⏳ Submitting...';
    
    try {
      const { data, error } = await supabase
        .from('service_consultations')
        .insert([formData])
        .select();
      
      if (error) throw error;
      
      // Track successful booking
      cornwellsTracking.trackBookingConversion(this.currentService.id, formData);
      
      // Show success message
      this.showMobileSuccessMessage();
      
    } catch (error) {
      console.error('Mobile booking submission error:', error);
      this.showMobileErrorMessage();
      
      // Reset button
      submitButton.disabled = false;
      submitButton.innerHTML = '📅 Book My Consultation';
    }
  }

  showMobileSuccessMessage() {
    const form = document.getElementById('mobile-booking-form');
    if (form) {
      form.innerHTML = `
        <div class="text-center py-8">
          <div class="text-6xl mb-4">✅</div>
          <h3 class="text-2xl font-bold text-gray-900 mb-4">Booking Submitted!</h3>
          <p class="text-lg text-gray-700 mb-6">
            Thank you! We'll call you within 2 hours to confirm your consultation time.
          </p>
          <div class="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <p class="text-sm text-green-800">
              📞 Keep your phone nearby - we'll be in touch soon!
            </p>
          </div>
          <button data-call-pharmacy class="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold">
            📞 Call Us Now Instead
          </button>
        </div>
      `;
    }
  }

  showMobileErrorMessage() {
    const form = document.getElementById('mobile-booking-form');
    if (form) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'bg-red-50 border border-red-200 rounded-xl p-4 mb-4';
      errorDiv.innerHTML = `
        <p class="text-sm text-red-800">
          ⚠️ Sorry, there was an issue submitting your booking. Please try calling us directly.
        </p>
      `;
      form.insertBefore(errorDiv, form.firstChild);
      
      // Remove error message after 5 seconds
      setTimeout(() => {
        errorDiv.remove();
      }, 5000);
    }
  }

  async handleBookingSubmission(serviceId) {
    const submitButton = document.getElementById('submit-booking');
    const originalText = submitButton.innerHTML;
    
    try {
      // Show loading state
      submitButton.innerHTML = '⏳ Submitting...';
      submitButton.disabled = true;
      
      // Get form data
      const formData = {
        patient_name: document.getElementById('patient-name').value.trim(),
        phone_number: document.getElementById('phone-number').value.trim(),
        email: document.getElementById('email').value.trim() || null,
        preferred_time_slot: TIME_SLOTS[document.getElementById('preferred-time').value],
        notes: document.getElementById('notes').value.trim() || null,
        service_type: serviceId,
        service_name: SERVICE_TYPES[serviceId],
        source_url: window.location.href,
        consent_given: document.getElementById('consent').checked,
        preferred_contact_method: 'phone'
      };
      
      // Add UTM tracking data
      const utmData = cornwellsTracking.getStoredUTMData();
      if (Object.keys(utmData).length > 0) {
        formData.utm_params = utmData;
      }
      
      console.log('Submitting booking:', formData);
      
      // Submit to Supabase
      const { data, error } = await supabase
        .from('service_consultations')
        .insert([formData])
        .select();
      
      if (error) {
        console.error('Supabase error:', error);
        throw new Error('Failed to submit booking. Please try again.');
      }
      
      console.log('Booking submitted successfully:', data);
      
      // Track successful booking conversion
      cornwellsTracking.trackBookingConversion(serviceId, formData);
      
      // Close modal and show success
      document.getElementById('booking-modal').remove();
      this.showSuccessMessage('🎉 Booking request sent! We\'ll call you within 2 hours to confirm your consultation.');
      
    } catch (error) {
      console.error('Booking submission error:', error);
      
      // Show error message
      this.showErrorMessage('Sorry, there was an issue submitting your booking. Please try again or call us directly.');
      
      // Reset button
      submitButton.innerHTML = originalText;
      submitButton.disabled = false;
    }
  }

  showSuccessMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-6 left-6 right-6 bg-green-600 text-white p-4 rounded-2xl shadow-xl z-50 text-center font-semibold';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 4000);
  }
  
  showErrorMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-6 left-6 right-6 bg-red-600 text-white p-4 rounded-2xl shadow-xl z-50 text-center font-semibold';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 7000);
  }

  updateMetaDescription(description) {
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = description;
  }

  generateServiceLandingHTML(service) {
    return `
      <div class="min-h-screen bg-gradient-to-br ${service.colorScheme.primary}">
        <!-- Mobile Navigation -->
        <nav class="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50 safe-area-top">
          <div class="px-4 py-4">
            <div class="flex items-center justify-between">
              <button onclick="window.app.loadServiceSelector()" class="flex items-center space-x-2 text-gray-600 font-medium">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                <span>Back</span>
              </button>
              <h1 class="text-lg font-bold text-gray-900">Cornwells</h1>
              <button data-call-pharmacy class="bg-green-600 text-white px-4 py-2 rounded-xl font-semibold text-sm">
                📞 Call
              </button>
            </div>
          </div>
        </nav>

        <!-- Mobile Hero -->
        <div class="px-4 py-8 text-center text-white">
          <div class="fade-in-up">
            <div class="text-6xl mb-6">${service.icon}</div>
            <h1 class="text-3xl font-bold mb-4 leading-tight">${service.title}</h1>
            <p class="text-lg text-white/90 mb-8 leading-relaxed max-w-sm mx-auto">
              ${service.description}
            </p>
          </div>
        </div>

        <!-- Mobile Benefits Section -->
        <div class="bg-white rounded-t-3xl mt-8 min-h-screen">
          <div class="px-4 py-8">
            <!-- What You Get -->
            <div class="mb-8">
              <h2 class="text-2xl font-bold text-gray-900 mb-6">What You Get</h2>
              <div class="space-y-4">
                ${service.specificBenefits.map(benefit => `
                  <div class="flex items-start space-x-4 p-4 bg-gray-50 rounded-2xl">
                    <div class="w-6 h-6 bg-gradient-to-r ${service.colorScheme.primary} rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                      </svg>
                    </div>
                    <p class="text-gray-700 leading-relaxed">${benefit}</p>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- How It Works -->
            <div class="mb-8">
              <h2 class="text-2xl font-bold text-gray-900 mb-6">How It Works</h2>
              <div class="space-y-4">
                ${service.uniqueProcess.map((step, index) => `
                  <div class="flex items-start space-x-4 p-4 bg-gradient-to-r ${service.colorScheme.secondary} rounded-2xl">
                    <div class="w-8 h-8 bg-gradient-to-r ${service.colorScheme.primary} rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">
                      ${index + 1}
                    </div>
                    <p class="text-gray-700 leading-relaxed">${step}</p>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Social Proof -->
            <div class="bg-gradient-to-r ${service.colorScheme.primary} rounded-2xl p-6 text-white text-center mb-8">
              <div class="text-3xl mb-3">⭐⭐⭐⭐⭐</div>
              <p class="font-semibold text-lg mb-2">${service.socialProof}</p>
              <p class="text-white/80 text-sm">${service.urgency}</p>
            </div>

            <!-- Mobile CTA Section -->
            <div class="space-y-4 mb-8">
              <button data-book-consultation="${service.id}" class="w-full bg-gradient-to-r ${service.colorScheme.primary} text-white py-5 rounded-2xl font-bold text-lg shadow-xl transform transition-all active:scale-95">
                📅 Book My Consultation
              </button>
              <button data-call-pharmacy class="w-full bg-gray-100 text-gray-900 py-5 rounded-2xl font-bold text-lg border-2 border-gray-200">
                📞 Call to Discuss First
              </button>
            </div>

            <!-- Trust Indicators -->
            <div class="grid grid-cols-2 gap-4 mb-8">
              <div class="text-center p-4 bg-gray-50 rounded-2xl">
                <div class="text-3xl mb-2">⚡</div>
                <div class="font-semibold text-gray-900 text-sm">Quick Access</div>
                <div class="text-xs text-gray-600">24-48h appointments</div>
              </div>
              <div class="text-center p-4 bg-gray-50 rounded-2xl">
                <div class="text-3xl mb-2">🏆</div>
                <div class="font-semibold text-gray-900 text-sm">Expert Care</div>
                <div class="text-xs text-gray-600">Qualified pharmacists</div>
              </div>
              <div class="text-center p-4 bg-gray-50 rounded-2xl">
                <div class="text-3xl mb-2">🔒</div>
                <div class="font-semibold text-gray-900 text-sm">Confidential</div>
                <div class="text-xs text-gray-600">Private consultations</div>
              </div>
              <div class="text-center p-4 bg-gray-50 rounded-2xl">
                <div class="text-3xl mb-2">📍</div>
                <div class="font-semibold text-gray-900 text-sm">Local</div>
                <div class="text-xs text-gray-600">10 locations</div>
              </div>
            </div>

            <!-- Contact Info -->
            <div class="text-center text-gray-600 text-sm safe-area-bottom">
              <p class="mb-2">Available Mon-Sat, 9am-6pm</p>
              <p>Trusted healthcare since 1835</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  showConfettiEffect() {
    // Create confetti elements
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.animationDelay = Math.random() * 3 + 's';
      confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
      document.body.appendChild(confetti);
      
      // Remove confetti after animation
      setTimeout(() => {
        if (confetti.parentNode) {
          confetti.parentNode.removeChild(confetti);
        }
      }, 5000);
    }
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  window.app = new PharmacyLandingApp();
});

export default PharmacyLandingApp; 