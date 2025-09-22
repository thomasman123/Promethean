/**
 * Promethean Attribution Tracker
 * 100% Accurate Contact-to-Ad Attribution System
 * 
 * This script captures comprehensive attribution data from landing pages
 * and provides fallback mechanisms for perfect attribution tracking.
 */

class PrometheanAttributionTracker {
  constructor(config = {}) {
    this.config = {
      apiEndpoint: config.apiEndpoint || '/api/attribution/track',
      sessionDuration: config.sessionDuration || 7 * 24 * 60 * 60 * 1000, // 7 days
      debug: config.debug || false,
      autoTrack: config.autoTrack !== false, // Default to true
      ...config
    };
    
    this.sessionId = this.generateSessionId();
    this.fingerprintId = null;
    this.attributionData = {};
    
    if (this.config.autoTrack) {
      this.init();
    }
  }

  /**
   * Initialize the attribution tracker
   */
  async init() {
    try {
      // Generate browser fingerprint
      this.fingerprintId = await this.generateFingerprint();
      
      // Capture attribution data
      this.attributionData = await this.captureAttributionData();
      
      // Store session data
      this.storeSessionData();
      
      // Send to backend
      await this.sendAttributionData();
      
      // Set up form tracking
      this.setupFormTracking();
      
      // Set up page activity tracking
      this.setupActivityTracking();
      
      this.log('Attribution tracker initialized successfully', this.attributionData);
    } catch (error) {
      this.error('Failed to initialize attribution tracker:', error);
    }
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return 'prom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate browser fingerprint for cross-session tracking
   */
  async generateFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Promethean fingerprint', 2, 2);
    
    const fingerprint = {
      screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      userAgent: navigator.userAgent.substring(0, 200), // Truncate for storage
      canvas: canvas.toDataURL().substring(0, 100),
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      hardwareConcurrency: navigator.hardwareConcurrency,
      maxTouchPoints: navigator.maxTouchPoints || 0
    };
    
    // Create hash of fingerprint data
    const fingerprintString = JSON.stringify(fingerprint);
    let hash = 0;
    for (let i = 0; i < fingerprintString.length; i++) {
      const char = fingerprintString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `fp_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Capture comprehensive attribution data
   */
  async captureAttributionData() {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    
    // Extract UTM parameters
    const utmData = {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_content: params.get('utm_content'),
      utm_term: params.get('utm_term'),
      utm_id: params.get('utm_id')
    };

    // Extract Meta-specific parameters
    const metaData = {
      fbclid: params.get('fbclid'),
      ad_id: params.get('ad_id'),
      adset_id: params.get('adset_id'),
      campaign_id: params.get('campaign_id'),
      placement: params.get('placement'),
      site_source_name: params.get('site_source_name')
    };

    // Extract Meta Pixel data if available
    const pixelData = this.extractMetaPixelData();

    // Get browser and session data
    const browserData = {
      user_agent: navigator.userAgent,
      language: navigator.language,
      screen_resolution: `${screen.width}x${screen.height}`,
      timezone_offset: new Date().getTimezoneOffset(),
      referrer: document.referrer,
      page_title: document.title,
      landing_url: window.location.href
    };

    // Determine attribution quality
    const quality = this.determineAttributionQuality(utmData, metaData, pixelData);
    
    // Determine attribution method
    const method = this.determineAttributionMethod(utmData, metaData, pixelData);

    return {
      session_id: this.sessionId,
      fingerprint_id: this.fingerprintId,
      ...utmData,
      ...metaData,
      ...browserData,
      attribution_quality: quality,
      attribution_method: method,
      meta_pixel_data: pixelData,
      timestamp: new Date().toISOString(),
      raw_url: window.location.href,
      all_params: Object.fromEntries(params.entries())
    };
  }

  /**
   * Extract Meta Pixel data if available
   */
  extractMetaPixelData() {
    try {
      // Check if Meta Pixel is loaded
      if (typeof fbq !== 'undefined' && window._fbq && window._fbq.instance) {
        const pixelData = {
          pixel_loaded: true,
          pixel_version: window._fbq.version || 'unknown',
          fbp: this.getCookie('_fbp'),
          fbc: this.getCookie('_fbc')
        };

        // Try to extract additional pixel data
        if (window._fbq.instance._pixelsByID) {
          const pixels = Object.keys(window._fbq.instance._pixelsByID);
          pixelData.pixel_ids = pixels;
        }

        return pixelData;
      }
    } catch (error) {
      this.log('Could not extract Meta Pixel data:', error);
    }
    
    return { pixel_loaded: false };
  }

  /**
   * Determine attribution quality based on available data
   */
  determineAttributionQuality(utmData, metaData, pixelData) {
    // Perfect: Has ad ID + campaign ID + UTM data
    if (metaData.ad_id && metaData.campaign_id && utmData.utm_campaign) {
      return 'perfect';
    }
    
    // High: Has FBCLID + UTM campaign or Meta ad IDs
    if (metaData.fbclid && (utmData.utm_campaign || metaData.ad_id)) {
      return 'high';
    }
    
    // Medium: Has UTM data or FBCLID
    if (utmData.utm_source || metaData.fbclid) {
      return 'medium';
    }
    
    // Low: Only referrer or basic data
    return 'low';
  }

  /**
   * Determine attribution method used
   */
  determineAttributionMethod(utmData, metaData, pixelData) {
    if (metaData.ad_id && utmData.utm_content) {
      return 'utm_direct';
    }
    
    if (metaData.fbclid) {
      return 'fbclid_lookup';
    }
    
    if (pixelData.pixel_loaded) {
      return 'pixel_bridge';
    }
    
    return 'fingerprint_match';
  }

  /**
   * Store session data in localStorage for persistence
   */
  storeSessionData() {
    try {
      const sessionData = {
        sessionId: this.sessionId,
        fingerprintId: this.fingerprintId,
        attributionData: this.attributionData,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.config.sessionDuration).toISOString()
      };
      
      localStorage.setItem('promethean_attribution', JSON.stringify(sessionData));
      sessionStorage.setItem('promethean_session', this.sessionId);
      
      this.log('Session data stored', sessionData);
    } catch (error) {
      this.error('Failed to store session data:', error);
    }
  }

  /**
   * Send attribution data to backend
   */
  async sendAttributionData() {
    try {
      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'page_visit',
          ...this.attributionData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      this.log('Attribution data sent successfully', result);
      
      return result;
    } catch (error) {
      this.error('Failed to send attribution data:', error);
      // Store for retry
      this.storeFailedRequest(this.attributionData);
    }
  }

  /**
   * Set up form tracking to capture submission with attribution
   */
  setupFormTracking() {
    // Track all forms on the page
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      form.addEventListener('submit', async (event) => {
        await this.handleFormSubmission(form, event);
      });
    });

    // Also listen for GoHighLevel-specific form submissions
    document.addEventListener('ghl-form-submit', async (event) => {
      await this.handleGHLFormSubmission(event);
    });

    this.log(`Set up form tracking for ${forms.length} forms`);
  }

  /**
   * Handle form submission with attribution data
   */
  async handleFormSubmission(form, event) {
    try {
      // Extract form data
      const formData = new FormData(form);
      const formFields = Object.fromEntries(formData.entries());
      
      // Add hidden attribution fields to form
      this.addAttributionToForm(form);
      
      // Send attribution data with form context
      await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'form_submission',
          session_id: this.sessionId,
          form_data: formFields,
          form_action: form.action,
          form_method: form.method,
          attribution_data: this.attributionData,
          timestamp: new Date().toISOString()
        })
      });

      this.log('Form submission tracked', { formFields, attribution: this.attributionData });
    } catch (error) {
      this.error('Failed to track form submission:', error);
    }
  }

  /**
   * Handle GoHighLevel-specific form submissions
   */
  async handleGHLFormSubmission(event) {
    try {
      const submissionData = {
        type: 'ghl_form_submission',
        session_id: this.sessionId,
        ghl_data: event.detail || {},
        attribution_data: this.attributionData,
        timestamp: new Date().toISOString()
      };

      await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData)
      });

      this.log('GHL form submission tracked', submissionData);
    } catch (error) {
      this.error('Failed to track GHL form submission:', error);
    }
  }

  /**
   * Add attribution data as hidden fields to forms
   */
  addAttributionToForm(form) {
    const attributionFields = [
      { name: 'promethean_session_id', value: this.sessionId },
      { name: 'promethean_fingerprint_id', value: this.fingerprintId },
      { name: 'promethean_attribution_quality', value: this.attributionData.attribution_quality },
      { name: 'promethean_attribution_method', value: this.attributionData.attribution_method },
      { name: 'promethean_meta_campaign_id', value: this.attributionData.meta_campaign_id || this.attributionData.campaign_id },
      { name: 'promethean_meta_ad_id', value: this.attributionData.meta_ad_id || this.attributionData.ad_id },
      { name: 'promethean_fbclid', value: this.attributionData.fbclid }
    ];

    attributionFields.forEach(field => {
      if (field.value) {
        // Remove existing field if present
        const existing = form.querySelector(`input[name="${field.name}"]`);
        if (existing) {
          existing.remove();
        }

        // Add new hidden field
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = field.name;
        input.value = field.value;
        form.appendChild(input);
      }
    });
  }

  /**
   * Set up activity tracking for session updates
   */
  setupActivityTracking() {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.updateLastActivity();
      }
    });

    // Track scroll depth
    let maxScroll = 0;
    window.addEventListener('scroll', () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        this.updateSessionData({ max_scroll_depth: maxScroll });
      }
    });

    // Track time on page
    this.startTime = Date.now();
    window.addEventListener('beforeunload', () => {
      const timeOnPage = Date.now() - this.startTime;
      this.updateSessionData({ time_on_page_ms: timeOnPage });
    });
  }

  /**
   * Update last activity timestamp
   */
  updateLastActivity() {
    this.updateSessionData({ last_activity_at: new Date().toISOString() });
  }

  /**
   * Update session data in localStorage and backend
   */
  async updateSessionData(updates) {
    try {
      // Update local storage
      const stored = localStorage.getItem('promethean_attribution');
      if (stored) {
        const sessionData = JSON.parse(stored);
        Object.assign(sessionData.attributionData, updates);
        localStorage.setItem('promethean_attribution', JSON.stringify(sessionData));
      }

      // Send update to backend
      await fetch(this.config.apiEndpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: this.sessionId,
          updates: updates
        })
      });
    } catch (error) {
      this.error('Failed to update session data:', error);
    }
  }

  /**
   * Get cookie value by name
   */
  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop().split(';').shift();
    }
    return null;
  }

  /**
   * Store failed requests for retry
   */
  storeFailedRequest(data) {
    try {
      const failed = JSON.parse(localStorage.getItem('promethean_failed_requests') || '[]');
      failed.push({
        data: data,
        timestamp: new Date().toISOString(),
        retryCount: 0
      });
      localStorage.setItem('promethean_failed_requests', JSON.stringify(failed));
    } catch (error) {
      this.error('Failed to store failed request:', error);
    }
  }

  /**
   * Retry failed requests
   */
  async retryFailedRequests() {
    try {
      const failed = JSON.parse(localStorage.getItem('promethean_failed_requests') || '[]');
      const successful = [];

      for (const request of failed) {
        if (request.retryCount < 3) {
          try {
            await fetch(this.config.apiEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(request.data)
            });
            successful.push(request);
          } catch (error) {
            request.retryCount++;
          }
        }
      }

      // Remove successful requests
      const remaining = failed.filter(req => !successful.includes(req));
      localStorage.setItem('promethean_failed_requests', JSON.stringify(remaining));
      
      if (successful.length > 0) {
        this.log(`Retried ${successful.length} failed requests successfully`);
      }
    } catch (error) {
      this.error('Failed to retry requests:', error);
    }
  }

  /**
   * Get stored attribution data for contact linking
   */
  static getStoredAttribution() {
    try {
      const stored = localStorage.getItem('promethean_attribution');
      if (stored) {
        const sessionData = JSON.parse(stored);
        
        // Check if session is still valid
        if (new Date(sessionData.expiresAt) > new Date()) {
          return sessionData;
        } else {
          // Clean up expired session
          localStorage.removeItem('promethean_attribution');
        }
      }
    } catch (error) {
      console.error('Failed to get stored attribution:', error);
    }
    return null;
  }

  /**
   * Link attribution session to contact
   */
  static async linkToContact(contactId, email) {
    try {
      const attribution = PrometheanAttributionTracker.getStoredAttribution();
      if (!attribution) {
        console.log('No attribution data to link');
        return;
      }

      const response = await fetch('/api/attribution/link-contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: attribution.sessionId,
          contact_id: contactId,
          email: email,
          link_timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        console.log('Attribution linked to contact successfully');
        // Mark as linked
        attribution.linkedToContact = true;
        localStorage.setItem('promethean_attribution', JSON.stringify(attribution));
      }
    } catch (error) {
      console.error('Failed to link attribution to contact:', error);
    }
  }

  /**
   * Clean up expired sessions
   */
  static cleanupExpiredSessions() {
    try {
      const stored = localStorage.getItem('promethean_attribution');
      if (stored) {
        const sessionData = JSON.parse(stored);
        if (new Date(sessionData.expiresAt) <= new Date()) {
          localStorage.removeItem('promethean_attribution');
          sessionStorage.removeItem('promethean_session');
        }
      }
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
    }
  }

  /**
   * Debug logging
   */
  log(message, data = null) {
    if (this.config.debug) {
      console.log(`[Promethean Attribution] ${message}`, data);
    }
  }

  error(message, error = null) {
    console.error(`[Promethean Attribution] ${message}`, error);
  }
}

// Auto-initialize on page load
if (typeof window !== 'undefined') {
  // Clean up expired sessions first
  PrometheanAttributionTracker.cleanupExpiredSessions();
  
  // Initialize tracker when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.PrometheanTracker = new PrometheanAttributionTracker({
        debug: window.location.hostname === 'localhost' || window.location.search.includes('debug=true')
      });
    });
  } else {
    window.PrometheanTracker = new PrometheanAttributionTracker({
      debug: window.location.hostname === 'localhost' || window.location.search.includes('debug=true')
    });
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PrometheanAttributionTracker;
} 