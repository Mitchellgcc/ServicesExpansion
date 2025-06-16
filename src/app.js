import { services, getFeaturedServices, getServiceById } from './data/services.js';
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

  generateServiceLandingHTML(service) {
    return `
      <div class="min-h-screen bg-gradient-to-br ${service.colorScheme.primary}">
        <!-- Navigation -->
        <nav class="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
              <div class="flex items-center space-x-4">
                <button onclick="window.app.loadServiceSelector()" class="text-gray-600 hover:text-gray-900 font-medium">
                  ← All Services
                </button>
                <div class="h-6 w-px bg-gray-300"></div>
                <h1 class="text-xl font-bold text-gray-900">Cornwells Pharmacy</h1>
              </div>
              <div class="flex items-center space-x-4">
                <button data-call-pharmacy class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-semibold transition-colors">
                  📞 Call Pharmacy
                </button>
                <button data-generate-qr="${service.id}" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl font-semibold transition-colors">
                  📱 QR Code
                </button>
              </div>
            </div>
          </div>
        </nav>

        <!-- Hero Section -->
        <div class="relative overflow-hidden">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div class="text-center">
              <div class="text-6xl mb-6 fade-in-up stagger-1">${service.icon}</div>
              <h1 class="text-5xl md:text-6xl font-bold text-white mb-6 fade-in-up stagger-2">
                ${service.title}
              </h1>
              <p class="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto fade-in-up stagger-3">
                ${service.description}
              </p>
              <div class="flex flex-col sm:flex-row gap-4 justify-center fade-in-up stagger-4">
                <button data-book-consultation="${service.id}" class="bg-white text-gray-900 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl">
                  📅 Book Consultation
                </button>
                <button data-call-pharmacy class="bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/30 transition-all border border-white/30">
                  📞 Call to Discuss
                </button>
              </div>
            </div>
          </div>
          
          <!-- Decorative background -->
          <div class="absolute inset-0 bg-gradient-to-br ${service.colorScheme.secondary} opacity-20"></div>
        </div>

        <!-- Service Details -->
        <div class="bg-white py-24">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 class="text-4xl font-bold text-gray-900 mb-8">What We Offer</h2>
                <div class="space-y-6">
                  ${service.features.map(feature => `
                    <div class="flex items-start space-x-4 fade-in-up">
                      <div class="flex-shrink-0 w-8 h-8 bg-gradient-to-r ${service.colorScheme.primary} rounded-full flex items-center justify-center">
                        <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                        </svg>
                      </div>
                      <p class="text-lg text-gray-700">${feature}</p>
                    </div>
                  `).join('')}
                </div>
              </div>
              
              <div class="bg-gradient-to-br ${service.colorScheme.primary} rounded-3xl p-8 text-white">
                <h3 class="text-2xl font-bold mb-6">Ready to Get Started?</h3>
                <p class="text-lg mb-8 text-white/90">
                  Book your consultation today and take the first step towards better health.
                </p>
                <button data-book-consultation="${service.id}" class="w-full bg-white text-gray-900 py-4 rounded-2xl font-bold text-lg hover:bg-gray-100 transition-colors">
                  📅 Book Your Consultation
                </button>
                <p class="text-sm text-white/70 mt-4 text-center">
                  Usually available within 24-48 hours
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Trust Indicators -->
        <div class="bg-gray-50 py-16">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 class="text-2xl font-bold text-gray-900 mb-12">Why Choose Cornwells?</h3>
            <div class="grid md:grid-cols-3 gap-8">
              <div class="fade-in-up">
                <div class="text-4xl mb-4">🏆</div>
                <h4 class="text-xl font-semibold text-gray-900 mb-2">Expert Pharmacists</h4>
                <p class="text-gray-600">Qualified healthcare professionals with years of experience</p>
              </div>
              <div class="fade-in-up">
                <div class="text-4xl mb-4">⚡</div>
                <h4 class="text-xl font-semibold text-gray-900 mb-2">Quick & Convenient</h4>
                <p class="text-gray-600">Fast appointments without the long GP waiting times</p>
              </div>
              <div class="fade-in-up">
                <div class="text-4xl mb-4">🔒</div>
                <h4 class="text-xl font-semibold text-gray-900 mb-2">Confidential Care</h4>
                <p class="text-gray-600">Private consultations in a comfortable, professional setting</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <footer class="bg-gray-900 text-white py-12">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 class="text-2xl font-bold mb-4">Cornwells Pharmacy</h3>
            <p class="text-gray-400 mb-6">Your trusted healthcare partner since 1835</p>
            <div class="flex justify-center space-x-6">
              <button data-call-pharmacy class="text-gray-400 hover:text-white transition-colors">📞 Call Us</button>
              <button data-visit-cornwells class="text-gray-400 hover:text-white transition-colors">🌐 Visit Website</button>
            </div>
          </div>
        </footer>
      </div>
    `;
  }

  generateServiceSelectorHTML() {
    const featuredServices = getFeaturedServices();
    
    return `
      <div class="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800">
        <!-- Hero Section -->
        <div class="relative overflow-hidden">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div class="text-center">
              <h1 class="text-5xl md:text-7xl font-bold text-white mb-6 fade-in-up stagger-1">
                🏥 Cornwells Pharmacy
              </h1>
              <p class="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto fade-in-up stagger-2">
                Expert healthcare services in your community. Professional consultations, health screenings, and specialized care.
              </p>
              <div class="flex flex-col sm:flex-row gap-4 justify-center fade-in-up stagger-3">
                <button data-call-pharmacy class="bg-white text-gray-900 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl">
                  📞 Call Pharmacy
                </button>
                <button data-visit-cornwells class="bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/30 transition-all border border-white/30">
                  🌐 Visit Our Website
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Services Grid -->
        <div class="bg-white py-24">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
              <h2 class="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Our Services</h2>
              <p class="text-xl text-gray-600 max-w-3xl mx-auto">
                Choose from our comprehensive range of healthcare services, all delivered by qualified pharmacists in a professional, caring environment.
              </p>
            </div>
            
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              ${featuredServices.map((service, index) => `
                <div class="group cursor-pointer fade-in-up" style="animation-delay: ${index * 100}ms" onclick="window.app.loadServiceLanding('${service.id}')">
                  <div class="bg-gradient-to-br ${service.colorScheme.primary} rounded-3xl p-8 text-white transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl">
                    <div class="text-5xl mb-6">${service.icon}</div>
                    <h3 class="text-2xl font-bold mb-4">${service.title}</h3>
                    <p class="text-white/90 mb-6">${service.description}</p>
                    <div class="flex items-center text-white/80 font-semibold">
                      <span>Learn More</span>
                      <svg class="w-5 h-5 ml-2 transform transition-transform group-hover:translate-x-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                      </svg>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Trust Section -->
        <div class="bg-gray-50 py-24">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
              <h2 class="text-4xl font-bold text-gray-900 mb-6">Trusted Healthcare Since 1835</h2>
              <p class="text-xl text-gray-600 max-w-3xl mx-auto">
                With nearly two centuries of experience, Cornwells Pharmacy has been serving communities with expert healthcare services and trusted advice.
              </p>
            </div>
            
            <div class="grid md:grid-cols-4 gap-8 text-center">
              <div class="fade-in-up">
                <div class="text-4xl mb-4">🏆</div>
                <h3 class="text-2xl font-bold text-gray-900 mb-2">Expert Care</h3>
                <p class="text-gray-600">Qualified pharmacists and healthcare professionals</p>
              </div>
              <div class="fade-in-up">
                <div class="text-4xl mb-4">⚡</div>
                <h3 class="text-2xl font-bold text-gray-900 mb-2">Quick Access</h3>
                <p class="text-gray-600">Fast appointments without long waiting times</p>
              </div>
              <div class="fade-in-up">
                <div class="text-4xl mb-4">🔒</div>
                <h3 class="text-2xl font-bold text-gray-900 mb-2">Confidential</h3>
                <p class="text-gray-600">Private consultations in comfortable settings</p>
              </div>
              <div class="fade-in-up">
                <div class="text-4xl mb-4">📍</div>
                <h3 class="text-2xl font-bold text-gray-900 mb-2">Local</h3>
                <p class="text-gray-600">Multiple convenient locations across Staffordshire</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <footer class="bg-gray-900 text-white py-16">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center">
              <h3 class="text-3xl font-bold mb-6">Ready to Get Started?</h3>
              <p class="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
                Contact us today to book your consultation or learn more about our services.
              </p>
              <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <button data-call-pharmacy class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-colors">
                  📞 Call Pharmacy
                </button>
                <button data-visit-cornwells class="bg-gray-700 hover:bg-gray-600 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-colors">
                  🌐 Visit Website
                </button>
              </div>
              <div class="mt-12 pt-8 border-t border-gray-700 text-center text-gray-400">
                <p>&copy; 2024 Cornwells Pharmacy. Trusted healthcare since 1835.</p>
              </div>
            </div>
          </div>
        </footer>
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
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  window.app = new PharmacyLandingApp();
});

export default PharmacyLandingApp; 