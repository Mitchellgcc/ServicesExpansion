import { services, getFeaturedServices, getAllServicesForSelector, getServiceById } from './data/services.js';
import { supabase, SERVICE_TYPES, TIME_SLOTS } from './config/supabase.js';
import { cornwellsTracking } from './utils/tracking.js';
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
    
    // Track QR code service page view
    cornwellsTracking.trackPageView(service.title);
    cornwellsTracking.trackEvent('qr_scan', {
      service_id: serviceId,
      service_name: service.title
    });
    
    const content = this.generateMobileQRLandingHTML(service);
    document.getElementById('app').innerHTML = content;
    
    // Update page title
    document.title = `Book ${service.title} - Cornwells Pharmacy`;
    this.updateMetaDescription(`Quick and easy booking for ${service.title}. Professional consultation available within 24-48 hours.`);
    
    // Re-initialize animations for new content
    this.initializeAnimations();
  }

  // Generate mobile-optimized QR landing page
  generateMobileQRLandingHTML(service) {
    const urlParams = new URLSearchParams(window.location.search);
    const branch = urlParams.get('utm_medium');
    const branchName = cornwellsTracking.branches[branch] || 'your local';
    
    return `
      <div class="min-h-screen bg-gradient-to-br ${service.colorScheme.primary}">
        <!-- Mobile Header -->
        <div class="bg-white/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <div class="text-2xl">🏥</div>
            <div>
              <div class="font-bold text-gray-900">Cornwells Pharmacy</div>
              <div class="text-xs text-gray-600">${branchName} branch</div>
            </div>
          </div>
          <button data-call-pharmacy class="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-semibold">
            📞 Call
          </button>
        </div>

        <!-- Hero Section -->
        <div class="px-4 py-8 text-center text-white">
          <div class="text-6xl mb-4">${service.icon}</div>
          <h1 class="text-3xl font-bold mb-3">${service.title}</h1>
          <p class="text-lg text-white/90 mb-6">${service.description}</p>
          
          <!-- Quick Stats -->
          <div class="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-6">
            <div class="grid grid-cols-3 gap-4 text-center">
              <div>
                <div class="text-2xl font-bold">24-48h</div>
                <div class="text-xs text-white/80">Appointment</div>
              </div>
              <div>
                <div class="text-2xl font-bold">15-30min</div>
                <div class="text-xs text-white/80">Consultation</div>
              </div>
              <div>
                <div class="text-2xl font-bold">Expert</div>
                <div class="text-xs text-white/80">Pharmacist</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Booking Form -->
        <div class="bg-white rounded-t-3xl px-4 py-6 min-h-[60vh]">
          <h2 class="text-2xl font-bold text-gray-900 mb-6 text-center">Book Your Consultation</h2>
          
          <form id="mobile-booking-form" class="space-y-4">
            <div>
              <label for="mobile-name" class="block text-sm font-semibold text-gray-700 mb-2">Your Name *</label>
              <input type="text" id="mobile-name" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg">
            </div>
            
            <div>
              <label for="mobile-phone" class="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
              <input type="tel" id="mobile-phone" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg">
            </div>
            
            <div>
              <label for="mobile-time" class="block text-sm font-semibold text-gray-700 mb-2">Preferred Time *</label>
              <select id="mobile-time" required class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg">
                <option value="">When works best for you?</option>
                <option value="0">Morning (9:00 AM - 12:00 PM)</option>
                <option value="1">Afternoon (12:00 PM - 5:00 PM)</option>
                <option value="2">Evening (5:00 PM - 7:00 PM)</option>
              </select>
            </div>
            
            <div>
              <label for="mobile-notes" class="block text-sm font-semibold text-gray-700 mb-2">Any specific concerns? (Optional)</label>
              <textarea id="mobile-notes" rows="3" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg" placeholder="Tell us what you'd like to discuss..."></textarea>
            </div>
            
            <div class="flex items-start space-x-3 py-2">
              <input type="checkbox" id="mobile-consent" required class="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
              <label for="mobile-consent" class="text-sm text-gray-700">
                I consent to Cornwells Pharmacy contacting me about this consultation. *
              </label>
            </div>
            
            <button type="submit" id="mobile-submit" class="w-full bg-gradient-to-r ${service.colorScheme.primary} text-white py-4 rounded-2xl font-bold text-lg shadow-lg">
              📅 Book My Consultation
            </button>
            
            <div class="text-center space-y-2 pt-4">
              <p class="text-sm text-gray-600">
                ✅ We'll call you within 2 hours to confirm
              </p>
              <p class="text-sm text-gray-600">
                📞 Or call us now: <button data-call-pharmacy class="text-blue-600 font-semibold underline">01782 123456</button>
              </p>
            </div>
          </form>
        </div>

        <!-- Trust Indicators -->
        <div class="bg-gray-50 px-4 py-6">
          <div class="text-center mb-4">
            <h3 class="text-lg font-bold text-gray-900 mb-3">Why Choose Cornwells?</h3>
          </div>
          <div class="grid grid-cols-2 gap-4 text-center">
            <div>
              <div class="text-3xl mb-2">🏆</div>
              <div class="text-sm font-semibold text-gray-900">Expert Care</div>
              <div class="text-xs text-gray-600">Qualified pharmacists</div>
            </div>
            <div>
              <div class="text-3xl mb-2">⚡</div>
              <div class="text-sm font-semibold text-gray-900">Quick Access</div>
              <div class="text-xs text-gray-600">No long waiting times</div>
            </div>
            <div>
              <div class="text-3xl mb-2">🔒</div>
              <div class="text-sm font-semibold text-gray-900">Confidential</div>
              <div class="text-xs text-gray-600">Private consultations</div>
            </div>
            <div>
              <div class="text-3xl mb-2">📍</div>
              <div class="text-sm font-semibold text-gray-900">Local</div>
              <div class="text-xs text-gray-600">Community focused</div>
            </div>
          </div>
        </div>
      </div>
    `;
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
              <p class="text-sm text-gray-600 mt-1">Expert Healthcare Services</p>
            </div>
          </div>
        </div>

        <!-- Mobile Hero Section -->
        <div class="px-4 py-8 text-center">
          <div class="fade-in-up">
            <h2 class="text-3xl font-bold text-white mb-4 leading-tight">
              Choose Your<br>Health Service
            </h2>
            <p class="text-lg text-white/90 mb-8 max-w-sm mx-auto leading-relaxed">
              Professional healthcare delivered by qualified pharmacists in your community
            </p>
          </div>
        </div>

        <!-- Mobile Service Grid -->
        <div class="px-4 pb-8 safe-area-bottom">
          <div class="space-y-4">
            ${allServices.map((service, index) => `
              <div class="fade-in-up" style="animation-delay: ${index * 100}ms">
                <div class="bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all duration-200 active:scale-95" onclick="window.app.loadServiceLanding('${service.id}')">
                  <!-- Service Header with Gradient -->
                  <div class="bg-gradient-to-r ${service.colorScheme.primary} p-6 text-white">
                    <div class="flex items-center space-x-4">
                      <div class="text-4xl flex-shrink-0">${service.icon}</div>
                      <div class="flex-1 min-w-0">
                        <h3 class="text-xl font-bold leading-tight mb-2">${service.title}</h3>
                        <p class="text-white/90 text-sm leading-relaxed">${service.description}</p>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Service Benefits -->
                  <div class="p-6">
                    <div class="space-y-3 mb-6">
                      ${service.specificBenefits.slice(0, 2).map(benefit => `
                        <div class="flex items-start space-x-3">
                          <div class="w-2 h-2 bg-gradient-to-r ${service.colorScheme.primary} rounded-full mt-2 flex-shrink-0"></div>
                          <p class="text-gray-700 text-sm leading-relaxed">${benefit}</p>
                        </div>
                      `).join('')}
                    </div>
                    
                    <!-- Mobile CTA Button -->
                    <div class="flex items-center justify-between">
                      <div class="text-sm text-gray-500">
                        <span class="font-semibold">${service.socialProof}</span>
                      </div>
                      <div class="bg-gradient-to-r ${service.colorScheme.primary} text-white px-6 py-3 rounded-xl font-semibold text-sm shadow-lg">
                        Learn More →
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Mobile Footer -->
        <div class="bg-white/10 backdrop-blur-sm border-t border-white/20 px-4 py-6 safe-area-bottom">
          <div class="text-center">
            <p class="text-white/80 text-sm mb-4">Need help choosing?</p>
            <button data-call-pharmacy class="bg-white text-gray-900 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl w-full max-w-sm mx-auto block">
              📞 Call Us Now
            </button>
            <p class="text-white/60 text-xs mt-3">Available 9am-6pm, Mon-Sat</p>
          </div>
        </div>
      </div>
    `;
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
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  window.app = new PharmacyLandingApp();
});

export default PharmacyLandingApp; 