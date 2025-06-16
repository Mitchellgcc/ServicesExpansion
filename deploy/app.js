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
    
    // Initialize all premium animations and interactions
    this.initializeAnimations();
    this.initializeCountUpAnimations();
    this.initializeProgressBars();
    this.initializeScrollProgress();
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
      <div class="min-h-screen" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
        <!-- Premium Glass Header -->
        <div class="glass-card sticky top-0 z-50 safe-area-top" style="border-radius: 0; border-top: none; border-left: none; border-right: none;">
          <div class="px-6 py-5">
            <div class="text-center">
              <h1 class="text-2xl font-bold text-gray-900 mb-1">Cornwells Pharmacy</h1>
              <p class="text-gray-600">Choose Your Service</p>
            </div>
          </div>
        </div>

        <!-- Floating Hero Stats -->
        <div class="px-6 py-8 text-center">
          <div class="glass-card inline-block px-8 py-6 mb-8 animate-float">
            <h2 class="text-3xl font-bold text-gray-900 mb-2">Expert Healthcare Services</h2>
            <p class="text-gray-700 mb-6">Professional consultations available today</p>
            
            <!-- Premium Stats Grid -->
            <div class="grid grid-cols-3 gap-6">
              <div class="text-center">
                <div class="text-2xl mb-2">⚡</div>
                <div class="font-bold text-lg text-gray-900">15-min</div>
                <div class="text-sm text-gray-600">Response</div>
              </div>
              <div class="text-center">
                <div class="text-2xl mb-2">📍</div>
                <div class="font-bold text-lg text-gray-900">10</div>
                <div class="text-sm text-gray-600">Locations</div>
              </div>
              <div class="text-center">
                <div class="text-2xl mb-2">💯</div>
                <div class="font-bold text-lg text-gray-900">Free</div>
                <div class="text-sm text-gray-600">Consultation</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Premium Service Cards Grid -->
        <div class="px-6 pb-8">
          <div class="max-w-4xl mx-auto">
            <div class="grid gap-6">
              ${allServices.map((service, index) => `
                <div class="service-card stagger-${(index % 10) + 1} animate-breathe" data-service="${service.id}" style="animation-delay: ${index * 0.1}s;">
                  <!-- Premium Service Header -->
                  <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center space-x-4">
                      <div class="text-4xl animate-float" style="animation-delay: ${index * 0.2}s;">${service.icon}</div>
                      <div>
                        <h3 class="text-xl font-bold text-gray-900 mb-1">${service.title}</h3>
                        <p class="text-gray-600">${service.headline}</p>
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="badge-available mb-1">Available Today</div>
                      <div class="text-xs text-gray-500">15-min response</div>
                    </div>
                  </div>
                  
                  <!-- Enhanced Benefits -->
                  <div class="space-y-3 mb-6">
                    ${service.specificBenefits.slice(0, 2).map(benefit => `
                      <div class="flex items-start space-x-3">
                        <div class="w-2 h-2 rounded-full mt-2 flex-shrink-0" style="background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));"></div>
                        <span class="text-gray-700 leading-relaxed">${benefit}</span>
                      </div>
                    `).join('')}
                  </div>
                  
                  <!-- Premium Action Buttons -->
                  <div class="flex space-x-3">
                    <button 
                      onclick="window.app.showQuickBooking('${service.id}')" 
                      class="btn-primary flex-1 animate-glow"
                    >
                      📞 Quick Book
                    </button>
                    <button 
                      onclick="window.app.loadServiceLanding('${service.id}')" 
                      class="btn-secondary px-6"
                    >
                      Learn More →
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
            
            <!-- Premium Emergency Contact -->
            <div class="glass-card text-center mt-12 p-8">
              <div class="text-3xl mb-4">🚨</div>
              <h3 class="text-xl font-bold text-gray-900 mb-2">Need Immediate Help?</h3>
              <p class="text-gray-600 mb-6">Speak to a qualified pharmacist right now</p>
              <button data-call-pharmacy class="btn-primary bg-gradient-to-r from-green-500 to-green-600 animate-breathe">
                📞 Call Pharmacy Now
              </button>
            </div>
            
            <div class="safe-area-bottom mt-8"></div>
          </div>
        </div>
        
        <!-- Floating Action Button -->
        <button class="fab animate-breathe" onclick="window.app.handleCallClick()" title="Call Pharmacy">
          📞
        </button>
      </div>
    `;
  }

  // New Quick Booking Modal (2 fields only)
  showQuickBooking(serviceId) {
    const service = getServiceById(serviceId);
    if (!service) return;

    const modalHTML = `
      <div id="quick-booking-modal" class="modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <!-- Premium Glass Modal -->
        <div class="modal-content w-full sm:max-w-md sm:w-full sm:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-y-auto">
          <!-- Safe area padding for iPhone -->
          <div class="px-6 py-6 pb-safe">
            <!-- Premium Header -->
            <div class="text-center mb-6">
              <div class="text-5xl mb-3 animate-float">${service.icon}</div>
              <h2 class="text-2xl font-bold text-gray-900 mb-2">${service.title}</h2>
              <div class="badge-available inline-block">📞 Request a callback</div>
            </div>
            
            <form id="quick-booking-form" class="space-y-6">
              <!-- Premium Phone Input -->
              <div>
                <label for="quick-phone" class="block text-base font-semibold text-gray-700 mb-3">Your Phone Number</label>
                <input 
                  type="tel" 
                  id="quick-phone" 
                  required 
                  placeholder="07XXX XXX XXX"
                  class="form-input w-full text-lg font-semibold text-center"
                  autocomplete="tel"
                  inputmode="numeric"
                >
                <div id="quick-phone-feedback" class="mt-2 text-center text-sm"></div>
              </div>

              <!-- Premium Time Selection -->
              <div>
                <label class="block text-base font-semibold text-gray-700 mb-3">When works best?</label>
                <div class="space-y-3">
                  <label class="glass-card flex items-center p-4 cursor-pointer hover:bg-white/20 transition-all">
                    <input type="radio" name="quick-time" value="today" class="mr-4 scale-125" ${new Date().getHours() < 17 ? 'checked' : ''}>
                    <div class="flex items-center justify-between w-full">
                      <div class="flex items-center space-x-3">
                        <div class="text-xl">⚡</div>
                        <span class="font-semibold">Today</span>
                      </div>
                      <span class="text-sm text-gray-600">Next available</span>
                    </div>
                  </label>
                  <label class="glass-card flex items-center p-4 cursor-pointer hover:bg-white/20 transition-all">
                    <input type="radio" name="quick-time" value="tomorrow" class="mr-4 scale-125" ${new Date().getHours() >= 17 ? 'checked' : ''}>
                    <div class="flex items-center justify-between w-full">
                      <div class="flex items-center space-x-3">
                        <div class="text-xl">🌅</div>
                        <span class="font-semibold">Tomorrow</span>
                      </div>
                      <span class="text-sm text-gray-600">Morning/afternoon</span>
                    </div>
                  </label>
                  <label class="glass-card flex items-center p-4 cursor-pointer hover:bg-white/20 transition-all">
                    <input type="radio" name="quick-time" value="this-week" class="mr-4 scale-125">
                    <div class="flex items-center justify-between w-full">
                      <div class="flex items-center space-x-3">
                        <div class="text-xl">📅</div>
                        <span class="font-semibold">This Week</span>
                      </div>
                      <span class="text-sm text-gray-600">When convenient</span>
                    </div>
                  </label>
                </div>
              </div>

              <!-- Premium Action Buttons -->
              <div class="space-y-4 pt-4">
                <button 
                  type="submit" 
                  id="quick-submit-btn" 
                  class="btn-primary w-full animate-glow"
                  disabled
                >
                  📞 Book Consultation
                </button>
                <button 
                  type="button" 
                  onclick="document.getElementById('quick-booking-modal').remove()" 
                  class="btn-secondary w-full"
                >
                  Cancel
                </button>
              </div>
            </form>

            <!-- Premium Trust Indicators -->
            <div class="glass-card mt-6 p-4">
              <div class="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div class="text-2xl mb-1">⚡</div>
                  <div class="text-xs font-semibold text-gray-900">Fast</div>
                </div>
                <div>
                  <div class="text-2xl mb-1">🔒</div>
                  <div class="text-xs font-semibold text-gray-900">Private</div>
                </div>
                <div>
                  <div class="text-2xl mb-1">💯</div>
                  <div class="text-xs font-semibold text-gray-900">Free</div>
                </div>
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
      <div class="min-h-screen premium-gradient">
        <!-- Premium Glass Navigation with Progress Bar -->
        <nav class="glass-nav sticky top-0 z-50 safe-area-top">
          <div class="px-6 py-5">
            <div class="flex items-center justify-between">
              <button onclick="window.app.loadServiceSelector()" class="btn-glass flex items-center space-x-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                <span>Back</span>
              </button>
              <h1 class="text-xl font-bold text-white">Cornwells</h1>
              <button data-call-pharmacy class="btn-cta animate-pulse-glow">
                📞 Call
              </button>
            </div>
          </div>
          <div class="progress-bar"></div>
        </nav>

        <!-- Immersive Hero Section -->
        <div class="hero-section px-6 py-16 text-center relative overflow-hidden">
          <!-- Floating Background Elements -->
          <div class="floating-elements">
            <div class="floating-circle floating-circle-1"></div>
            <div class="floating-circle floating-circle-2"></div>
            <div class="floating-circle floating-circle-3"></div>
          </div>
          
          <div class="hero-content relative z-10">
            <div class="hero-icon-container mb-8">
              <div class="hero-icon animate-float-slow">${service.icon}</div>
              <div class="hero-icon-glow"></div>
            </div>
            
            <h1 class="hero-title mb-6">${service.title}</h1>
            <p class="hero-description mb-8 max-w-lg mx-auto">
              ${service.description}
            </p>
            
            <div class="hero-badges flex flex-wrap justify-center gap-3 mb-8">
              <div class="badge-premium animate-bounce-subtle">✨ Premium Service</div>
              <div class="badge-available animate-pulse-soft">🟢 Available Today</div>
              <div class="badge-trusted animate-glow-soft">🏆 Trusted Since 1835</div>
            </div>
            
            <div class="hero-cta-container">
              <button data-book-consultation="${service.id}" class="btn-hero-primary animate-glow-intense">
                🚀 Start Your Journey
              </button>
              <button data-call-pharmacy class="btn-hero-secondary">
                💬 Speak to Expert
              </button>
            </div>
          </div>
        </div>

        <!-- Interactive Content Sections -->
        <div class="content-sections px-6 pb-12">
          <div class="max-w-5xl mx-auto space-y-12">
            
            <!-- Transformation Promise Section -->
            <div class="transformation-section glass-card-premium p-10">
              <div class="section-header text-center mb-10">
                <div class="section-icon mb-4">🎯</div>
                <h2 class="section-title">Your Transformation Awaits</h2>
                <p class="section-subtitle">Discover what makes our approach different</p>
              </div>
              
              <div class="benefits-grid">
                ${service.specificBenefits.map((benefit, index) => `
                  <div class="benefit-card animate-slide-up" style="animation-delay: ${index * 0.15}s;">
                    <div class="benefit-icon-container">
                      <div class="benefit-icon">✨</div>
                      <div class="benefit-number">${index + 1}</div>
                    </div>
                    <div class="benefit-content">
                      <p class="benefit-text">${benefit}</p>
                      <div class="benefit-progress">
                        <div class="benefit-progress-bar" style="animation-delay: ${(index * 0.15) + 0.5}s;"></div>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Interactive Process Timeline -->
            <div class="process-section glass-card-premium p-10">
              <div class="section-header text-center mb-10">
                <div class="section-icon mb-4">🛤️</div>
                <h2 class="section-title">Your Journey to Success</h2>
                <p class="section-subtitle">Simple steps, powerful results</p>
              </div>
              
              <div class="process-timeline">
                ${service.uniqueProcess.map((step, index) => `
                  <div class="timeline-item animate-fade-in-up" style="animation-delay: ${index * 0.2}s;">
                    <div class="timeline-connector ${index === service.uniqueProcess.length - 1 ? 'timeline-connector-last' : ''}"></div>
                    <div class="timeline-step">
                      <div class="step-number-container">
                        <div class="step-number">${index + 1}</div>
                        <div class="step-pulse"></div>
                      </div>
                      <div class="step-content">
                        <div class="step-text">${step}</div>
                        <div class="step-duration">~${this.getStepDuration(index)} mins</div>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Social Proof Showcase -->
            <div class="social-proof-section">
              <div class="testimonial-card glass-card-premium p-10 text-center">
                <div class="testimonial-stars mb-6">
                  <div class="stars-container">
                    <span class="star animate-twinkle" style="animation-delay: 0.1s;">⭐</span>
                    <span class="star animate-twinkle" style="animation-delay: 0.2s;">⭐</span>
                    <span class="star animate-twinkle" style="animation-delay: 0.3s;">⭐</span>
                    <span class="star animate-twinkle" style="animation-delay: 0.4s;">⭐</span>
                    <span class="star animate-twinkle" style="animation-delay: 0.5s;">⭐</span>
                  </div>
                </div>
                
                <div class="testimonial-content mb-8">
                  <h3 class="testimonial-title">${service.socialProof}</h3>
                  <p class="testimonial-subtitle">${service.urgency}</p>
                </div>
                
                <div class="success-metrics grid grid-cols-3 gap-6">
                  <div class="metric-item">
                    <div class="metric-number animate-count-up" data-target="98">0</div>
                    <div class="metric-label">% Success Rate</div>
                  </div>
                  <div class="metric-item">
                    <div class="metric-number animate-count-up" data-target="24">0</div>
                    <div class="metric-label">Hour Response</div>
                  </div>
                  <div class="metric-item">
                    <div class="metric-number animate-count-up" data-target="1835">0</div>
                    <div class="metric-label">Since</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Premium CTA Section -->
            <div class="cta-section glass-card-premium p-10">
              <div class="cta-content text-center">
                <div class="cta-icon mb-6">🎉</div>
                <h3 class="cta-title mb-4">Ready to Transform Your Health?</h3>
                <p class="cta-subtitle mb-8">Join thousands who've already started their journey</p>
                
                <div class="cta-buttons-container">
                  <button data-book-consultation="${service.id}" class="btn-cta-primary animate-glow-pulse">
                    <span class="btn-icon">📅</span>
                    <span class="btn-text">Book My Consultation</span>
                    <span class="btn-badge">Most Popular</span>
                  </button>
                  
                  <button data-call-pharmacy class="btn-cta-secondary">
                    <span class="btn-icon">📞</span>
                    <span class="btn-text">Call to Discuss First</span>
                  </button>
                </div>
                
                <div class="cta-guarantee mt-6">
                  <div class="guarantee-badge">
                    <span class="guarantee-icon">🛡️</span>
                    <span class="guarantee-text">100% Confidential & Professional</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Enhanced Trust Indicators -->
            <div class="trust-section glass-card-premium p-10">
              <div class="section-header text-center mb-10">
                <div class="section-icon mb-4">🏆</div>
                <h3 class="section-title">Why 10,000+ Choose Cornwells</h3>
              </div>
              
              <div class="trust-grid">
                <div class="trust-item animate-float" style="animation-delay: 0.1s;">
                  <div class="trust-icon-container">
                    <div class="trust-icon">⚡</div>
                    <div class="trust-glow"></div>
                  </div>
                  <div class="trust-content">
                    <div class="trust-title">Lightning Fast</div>
                    <div class="trust-subtitle">24-48h appointments</div>
                    <div class="trust-detail">Same-day availability for urgent cases</div>
                  </div>
                </div>
                
                <div class="trust-item animate-float" style="animation-delay: 0.2s;">
                  <div class="trust-icon-container">
                    <div class="trust-icon">🎓</div>
                    <div class="trust-glow"></div>
                  </div>
                  <div class="trust-content">
                    <div class="trust-title">Expert Pharmacists</div>
                    <div class="trust-subtitle">Qualified professionals</div>
                    <div class="trust-detail">Continuous training & certification</div>
                  </div>
                </div>
                
                <div class="trust-item animate-float" style="animation-delay: 0.3s;">
                  <div class="trust-icon-container">
                    <div class="trust-icon">🔒</div>
                    <div class="trust-glow"></div>
                  </div>
                  <div class="trust-content">
                    <div class="trust-title">100% Private</div>
                    <div class="trust-subtitle">Confidential consultations</div>
                    <div class="trust-detail">GDPR compliant & secure</div>
                  </div>
                </div>
                
                <div class="trust-item animate-float" style="animation-delay: 0.4s;">
                  <div class="trust-icon-container">
                    <div class="trust-icon">📍</div>
                    <div class="trust-glow"></div>
                  </div>
                  <div class="trust-content">
                    <div class="trust-title">Local Presence</div>
                    <div class="trust-subtitle">10 convenient locations</div>
                    <div class="trust-detail">Serving communities across the region</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- FAQ Section -->
            <div class="faq-section glass-card-premium p-10">
              <div class="section-header text-center mb-10">
                <div class="section-icon mb-4">❓</div>
                <h3 class="section-title">Frequently Asked Questions</h3>
              </div>
              
              <div class="faq-list">
                ${this.getServiceFAQs(service.id).map((faq, index) => `
                  <div class="faq-item animate-slide-in" style="animation-delay: ${index * 0.1}s;">
                    <button class="faq-question" onclick="this.parentElement.classList.toggle('faq-open')">
                      <span class="faq-question-text">${faq.question}</span>
                      <span class="faq-toggle">+</span>
                    </button>
                    <div class="faq-answer">
                      <p class="faq-answer-text">${faq.answer}</p>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Final CTA with Urgency -->
            <div class="final-cta-section glass-card-premium p-10 text-center">
              <div class="urgency-indicator mb-6">
                <div class="urgency-pulse"></div>
                <span class="urgency-text">⏰ Limited spots available this week</span>
              </div>
              
              <h3 class="final-cta-title mb-4">Don't Wait - Your Health Matters</h3>
              <p class="final-cta-subtitle mb-8">Book now and take the first step towards better health</p>
              
              <button data-book-consultation="${service.id}" class="btn-final-cta animate-glow-intense">
                🚀 Secure My Spot Now
              </button>
              
              <div class="final-cta-footer mt-6">
                <p class="footer-text">Available Mon-Sat, 9am-6pm</p>
                <p class="footer-subtext">Trusted healthcare since 1835</p>
              </div>
            </div>
            
            <div class="safe-area-bottom"></div>
          </div>
        </div>
        
        <!-- Floating Action Button -->
        <div class="fab-container">
          <button class="fab animate-breathe" data-book-consultation="${service.id}" title="Quick Book">
            📅
          </button>
        </div>
      </div>
    `;
  }
  getStepDuration(index) {
    const durations = [15, 30, 10, 20, 5];
    return durations[index] || 15;
  }

  getServiceFAQs(serviceId) {
    const faqs = {
      'metabolic-weight': [
        {
          question: "How quickly will I see results?",
          answer: "Most patients see initial results within 2-4 weeks, with significant improvements by 8-12 weeks. Our personalized approach ensures sustainable, long-term success."
        },
        {
          question: "Is this suitable for people with diabetes?",
          answer: "Yes, our pharmacists are specially trained to work with diabetic patients. We'll coordinate with your existing healthcare team to ensure safe, effective treatment."
        },
        {
          question: "What's included in the consultation?",
          answer: "Complete health assessment, personalized treatment plan, medication review, lifestyle guidance, and ongoing support with regular check-ins."
        },
        {
          question: "Are there any side effects?",
          answer: "All treatments are carefully monitored. Our pharmacists will discuss potential side effects and how to manage them during your consultation."
        }
      ],
      'womens-health': [
        {
          question: "Is the consultation completely confidential?",
          answer: "Absolutely. All consultations are private and confidential. We follow strict GDPR guidelines and your information is never shared without your consent."
        },
        {
          question: "Can I speak to a female pharmacist?",
          answer: "Yes, we have female pharmacists available. You can request this when booking your appointment."
        },
        {
          question: "What conditions do you treat?",
          answer: "We provide support for contraception, UTIs, thrush, period problems, menopause, and many other women's health concerns."
        },
        {
          question: "Do I need a prescription?",
          answer: "Our pharmacists can provide treatments under the NHS Pharmacy First scheme for many conditions, often without needing a GP prescription."
        }
      ],
      'mens-health': [
        {
          question: "How discreet is the service?",
          answer: "Completely discreet. Private consultation rooms, confidential discussions, and discreet packaging for any treatments."
        },
        {
          question: "What age groups do you serve?",
          answer: "We provide men's health services for all adult ages, with treatments tailored to your specific age group and health needs."
        },
        {
          question: "Is erectile dysfunction treatment available?",
          answer: "Yes, we provide comprehensive ED treatment including consultation, medication, and ongoing support in a private, professional environment."
        },
        {
          question: "Can I get testosterone testing?",
          answer: "We can arrange appropriate testing and provide guidance on results, working with your GP when necessary."
        }
      ]
    };
    
    return faqs[serviceId] || [
      {
        question: "How do I book an appointment?",
        answer: "Simply click the booking button above or call us directly. We offer same-day and next-day appointments."
      },
      {
        question: "What should I bring to my appointment?",
        answer: "Bring a list of current medications, any relevant medical history, and your questions. We'll handle the rest."
      },
      {
        question: "How long does a consultation take?",
        answer: "Initial consultations typically take 20-30 minutes, allowing plenty of time for discussion and questions."
      }
    ];
  }

  initializeCountUpAnimations() {
    const countElements = document.querySelectorAll('.animate-count-up');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          const target = parseInt(element.dataset.target);
          let current = 0;
          const increment = target / 50;
          
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              element.textContent = target;
              clearInterval(timer);
            } else {
              element.textContent = Math.floor(current);
            }
          }, 40);
          
          observer.unobserve(element);
        }
      });
    });
    
    countElements.forEach(el => observer.observe(el));
  }

  initializeProgressBars() {
    const progressBars = document.querySelectorAll('.benefit-progress-bar');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.width = '100%';
          observer.unobserve(entry.target);
        }
      });
    });
    
    progressBars.forEach(bar => observer.observe(bar));
  }

  initializeScrollProgress() {
    const progressBar = document.querySelector('.progress-bar');
    if (!progressBar) return;
    
    window.addEventListener('scroll', () => {
      const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      progressBar.style.width = `${Math.min(scrolled, 100)}%`;
    });
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

export default PharmacyLandingApp; console.log('Deployment test');
