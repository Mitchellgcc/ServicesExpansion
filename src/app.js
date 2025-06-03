import { services, getFeaturedServices, getServiceById } from './data/services.js';
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

    window.addEventListener('popstate', () => {
      this.loadCurrentPage();
    });
  }

  loadCurrentPage() {
    const path = window.location.pathname;
    const serviceId = this.extractServiceIdFromPath(path);
    
    if (serviceId && services[serviceId]) {
      this.loadServiceLanding(serviceId);
    } else {
      this.loadServiceSelector();
    }
  }

  extractServiceIdFromPath(path) {
    // Support both /service-name and /services/service-name formats
    const patterns = [
      /^\/([^\/]+)$/,  // /menopause
      /^\/services\/([^\/]+)$/  // /services/menopause
    ];
    
    for (const pattern of patterns) {
      const match = path.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  async loadServiceLanding(serviceId) {
    const service = getServiceById(serviceId);
    if (!service) {
      this.loadServiceSelector();
      return;
    }

    this.currentService = service;
    
    try {
      const content = this.generateServiceLandingHTML(service);
      document.getElementById('app-content').innerHTML = content;
      
      document.title = `${service.title} | Expert Pharmacy Services`;
      this.updateMetaDescription(service.description);
      
      this.initializeAnimations();
      
    } catch (error) {
      console.error('Error loading service landing:', error);
    }
  }

  loadServiceSelector() {
    // Simple service selector for development/testing
    const content = this.generateServiceSelectorHTML();
    document.getElementById('app-content').innerHTML = content;
    document.title = 'Pharmacy Services | Choose Your Service';
  }

  generateServiceLandingHTML(service) {
    const colorScheme = service.colorScheme;
    return `
      <div class="landing-hero bg-gradient-to-br ${colorScheme.hero}">
        <div class="content-section relative z-10">
          <!-- Service Icon & Title -->
          <div class="text-center mb-12 fade-in-up">
            <div class="service-icon stagger-1">
              ${service.icon}
            </div>
            <h1 class="hero-title stagger-2">
              ${service.headline}
            </h1>
            <p class="hero-subtitle mt-4 stagger-3">
              ${service.subheadline}
            </p>
          </div>

          <!-- Primary CTA -->
          <div class="mb-12 stagger-4">
            <button class="w-full py-5 px-8 bg-gradient-to-r ${colorScheme.primary} text-white text-xl font-bold rounded-2xl shadow-xl hover:scale-105 transition-all duration-200" data-book-consultation="${service.id}">
              📅 Book Your Free Consultation
            </button>
          </div>

          <!-- Quick Value Proposition -->
          <div class="text-center mb-12">
            <p class="text-xl text-gray-200 leading-relaxed mb-6">
              ${service.description}
            </p>
            ${service.socialProof ? `
              <div class="flex items-center justify-center space-x-2 text-sm text-gray-400">
                <span>⭐⭐⭐⭐⭐</span>
                <span>${service.socialProof}</span>
              </div>
            ` : ''}
            ${service.urgency ? `
              <div class="inline-block bg-orange-500/20 text-orange-300 px-4 py-2 rounded-full text-sm mt-4">
                ⏰ ${service.urgency}
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Benefits Section -->
      <section class="content-section">
        <h2 class="section-title text-center mb-8">What You'll Experience:</h2>
        
        <div class="space-y-6 mb-12">
          ${service.specificBenefits.slice(0, 3).map((benefit, index) => `
            <div class="benefit-card fade-in-up stagger-${index + 1}">
              <div class="flex items-start space-x-4">
                <div class="w-8 h-8 ${colorScheme.accent} rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                  </svg>
                </div>
                <p class="text-gray-200 text-lg leading-relaxed">${benefit}</p>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Secondary CTA -->
        <div class="text-center mb-12">
          <button class="w-full py-4 px-8 bg-gradient-to-r ${colorScheme.primary} text-white text-lg font-semibold rounded-2xl shadow-xl hover:scale-105 transition-all duration-200" data-book-consultation="${service.id}">
            Start Feeling Better Today
          </button>
        </div>
      </section>

      <!-- How It Works -->
      <section class="content-section">
        <h2 class="section-title text-center mb-4">It's Simple:</h2>
        <p class="section-subtitle text-center mb-10">Three easy steps to start feeling better</p>
        
        <div class="space-y-8 mb-12">
          ${service.uniqueProcess.slice(0, 3).map((step, index) => `
            <div class="process-step fade-in-up stagger-${index + 1}">
              <div class="w-12 h-12 bg-gradient-to-r ${colorScheme.primary} text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">${index + 1}</div>
              <div>
                <p class="text-gray-200 text-lg leading-relaxed">${step}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- Contact Information -->
      <section class="content-section">
        <div class="bg-gradient-to-r ${colorScheme.secondary} p-8 rounded-3xl backdrop-blur-sm border border-white/10 text-center">
          <h3 class="text-2xl font-bold text-white mb-4">Ready to Feel Better?</h3>
          <p class="text-gray-200 mb-8 text-lg">${service.callToAction}</p>
          
          <div class="space-y-4">
            <button class="w-full py-5 px-8 bg-gradient-to-r ${colorScheme.primary} text-white text-xl font-bold rounded-2xl shadow-xl hover:scale-105 transition-all duration-200" data-book-consultation="${service.id}">
              📅 Book My Consultation
            </button>
            
            <div class="text-gray-400 text-sm">
              <span>💬 Free consultation • 📞 Same day appointments available</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="content-section border-t border-white/10">
        <div class="text-center text-gray-400 space-y-4">
          <button class="btn-secondary-landing" data-visit-cornwells>
            Visit Cornwells Pharmacy Website
          </button>
          
          <p class="text-sm">
            Expert pharmacy services with professional care
          </p>
          
          <div class="flex justify-center space-x-4 text-xs">
            <span>Privacy Policy</span>
            <span>•</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </footer>
    `;
  }

  generateServiceSelectorHTML() {
    const allServices = Object.values(services);
    
    return `
      <div class="landing-hero">
        <div class="content-section relative z-10">
          <div class="text-center mb-12">
            <h1 class="hero-title">Pharmacy Services</h1>
            <p class="hero-subtitle mt-4">Choose a service to view its landing page</p>
          </div>
          
          <div class="space-y-4">
            ${allServices.map(service => `
              <a href="/${service.id}" 
                 class="block p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                <div class="flex items-center space-x-4">
                  <div class="text-3xl">${service.icon}</div>
                  <div>
                    <h3 class="text-lg font-semibold text-white">${service.title}</h3>
                    <p class="text-gray-300 text-sm">${service.headline}</p>
                  </div>
                </div>
              </a>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  handleBookingClick(button) {
    const serviceId = button.getAttribute('data-book-consultation') || this.currentService?.id;
    
    // Sophisticated booking flow
    this.showBookingModal(serviceId);
  }

  showBookingModal(serviceId) {
    const service = getServiceById(serviceId);
    const modalHTML = `
      <div id="booking-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-slate-800 rounded-3xl p-8 max-w-md w-full border border-white/10">
          <h3 class="text-2xl font-bold text-white mb-6 text-center">Book Your Consultation</h3>
          
          <div class="space-y-4 mb-8">
            <div>
              <label class="block text-gray-300 mb-2">Your Name</label>
              <input type="text" class="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400" placeholder="Enter your name">
            </div>
            
            <div>
              <label class="block text-gray-300 mb-2">Phone Number</label>
              <input type="tel" class="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400" placeholder="Your phone number">
            </div>
            
            <div>
              <label class="block text-gray-300 mb-2">Preferred Time</label>
              <select class="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white">
                <option>Morning (9am-12pm)</option>
                <option>Afternoon (12pm-5pm)</option>
                <option>Evening (5pm-7pm)</option>
              </select>
            </div>
          </div>
          
          <div class="space-y-3">
            <button class="btn-primary-landing" onclick="this.closest('#booking-modal').remove(); app.showSuccessMessage('Booking request sent! We\\'ll call you within 2 hours.')">
              📅 Request Consultation
            </button>
            <button class="btn-secondary-landing" onclick="this.closest('#booking-modal').remove()">
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  handleCallClick() {
    // In a real implementation, this would use tel: links
    this.showSuccessMessage('📞 Calling pharmacy... (In demo: would open phone dialer)');
  }

  handleCornwellsClick() {
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