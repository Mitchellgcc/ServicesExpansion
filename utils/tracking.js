// Cornwells MVP Services - Digital Tracking Infrastructure
// Handles UTM tracking, QR generation, and analytics for all marketing materials

export class CornwellsTracking {
  constructor() {
    this.baseURL = 'https://cornwells-services.netlify.app';
    this.bitlyToken = null; // Will be set when Bitly account is created
    this.branches = {
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
    
    this.services = {
      'health-screening': 'Health Screening & Monitoring',
      'mens-health': 'Men\'s Health Services',
      'womens-health': 'Women\'s Health Services',
      'metabolic-weight': 'Metabolic & Weight Management',
      'travel-health': 'Travel Health Services',
      'nhs-services': 'Enhanced NHS Services',
      'vaccinations': 'Core Vaccinations',
      'gut-health': 'Gut Health & Digestive Wellness',
      'family-health': 'Family Health Hub',
      'mental-health': 'Mental Health & Wellbeing'
    };
    
    this.materials = {
      'poster': 'A4 Poster',
      'flyer': 'A5 Flyer',
      'counter': 'Counter Card',
      'window': 'Window Cling',
      'bag': 'Prescription Bag Belt',
      'shelf': 'Shelf Wobbler',
      'partner': 'Partner Material'
    };
  }

  // Generate standardized UTM tracking URL
  generateTrackingURL(service, branch, material, version = 'a', placement = null) {
    const utmParams = new URLSearchParams({
      utm_source: material,
      utm_medium: branch,
      utm_campaign: service,
      utm_term: version,
      utm_content: placement || 'qr'
    });
    
    const fullURL = `${this.baseURL}/${service}?${utmParams.toString()}`;
    return fullURL;
  }

  // Generate short URL using Bitly (when token is available)
  async generateShortURL(longURL, customSlug = null) {
    if (!this.bitlyToken) {
      console.warn('Bitly token not configured, returning long URL');
      return longURL;
    }

    try {
      const response = await fetch('https://api-ssl.bitly.com/v4/shorten', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.bitlyToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          long_url: longURL,
          custom_bitlinks: customSlug ? [`bit.ly/cornwells-${customSlug}`] : undefined
        })
      });

      const data = await response.json();
      return data.link || longURL;
    } catch (error) {
      console.error('Bitly shortening failed:', error);
      return longURL;
    }
  }

  // Generate QR code with tracking
  async generateQRWithTracking(service, branch, material, version = 'a') {
    const trackingURL = this.generateTrackingURL(service, branch, material, version);
    const shortURL = await this.generateShortURL(trackingURL, `${service}-${branch}-${version}`);
    
    // Generate QR code using QRCode library
    const QRCode = await import('qrcode');
    const qrDataURL = await QRCode.toDataURL(shortURL, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M'
    });

    return {
      qrCode: qrDataURL,
      trackingURL: trackingURL,
      shortURL: shortURL,
      metadata: {
        service: this.services[service],
        branch: this.branches[branch],
        material: this.materials[material],
        version: version
      }
    };
  }

  // Generate all QR codes for a specific service across all branches and materials
  async generateServiceQRBatch(service) {
    const qrBatch = [];
    
    for (const [branchCode, branchName] of Object.entries(this.branches)) {
      for (const [materialCode, materialName] of Object.entries(this.materials)) {
        // Generate A/B/C versions for testing
        for (const version of ['a', 'b', 'c']) {
          const qrData = await this.generateQRWithTracking(service, branchCode, materialCode, version);
          qrBatch.push({
            id: `${service}-${branchCode}-${materialCode}-${version}`,
            ...qrData
          });
        }
      }
    }
    
    return qrBatch;
  }

  // Track UTM parameters from current page
  captureUTMParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const utmData = {};
    
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
      if (urlParams.has(param)) {
        utmData[param] = urlParams.get(param);
      }
    });
    
    // Store in sessionStorage for form submissions
    if (Object.keys(utmData).length > 0) {
      sessionStorage.setItem('cornwells_utm', JSON.stringify(utmData));
    }
    
    return utmData;
  }

  // Get stored UTM data for form submissions
  getStoredUTMData() {
    const stored = sessionStorage.getItem('cornwells_utm');
    return stored ? JSON.parse(stored) : {};
  }

  // Google Analytics 4 event tracking
  trackEvent(eventName, parameters = {}) {
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, {
        event_category: 'mvp_services',
        ...parameters,
        ...this.getStoredUTMData()
      });
    }
  }

  // Track page view with UTM data
  trackPageView(serviceName = null) {
    const utmData = this.captureUTMParameters();
    
    if (typeof gtag !== 'undefined') {
      gtag('config', 'GA_MEASUREMENT_ID', {
        page_title: serviceName ? `${serviceName} - Cornwells Services` : 'Cornwells Services',
        page_location: window.location.href,
        custom_map: {
          'custom_parameter_1': 'utm_source',
          'custom_parameter_2': 'utm_medium',
          'custom_parameter_3': 'utm_campaign'
        }
      });
    }
  }

  // Track booking conversion
  trackBookingConversion(serviceId, bookingData) {
    this.trackEvent('consultation_booking', {
      event_category: 'conversion',
      event_label: serviceId,
      value: 1,
      service_name: this.services[serviceId],
      booking_method: 'online_form'
    });
  }

  // Generate marketing dashboard data
  generateDashboardData() {
    return {
      totalServices: Object.keys(this.services).length,
      totalBranches: Object.keys(this.branches).length,
      totalMaterials: Object.keys(this.materials).length,
      totalQRCodes: Object.keys(this.services).length * Object.keys(this.branches).length * Object.keys(this.materials).length * 3, // 3 versions each
      trackingURLFormat: 'utm_source={material}&utm_medium={branch}&utm_campaign={service}&utm_term={version}&utm_content=qr'
    };
  }
}

// Initialize tracking on page load
export const cornwellsTracking = new CornwellsTracking();

// Auto-capture UTM parameters when script loads
if (typeof window !== 'undefined') {
  cornwellsTracking.captureUTMParameters();
} 