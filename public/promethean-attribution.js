/**
 * Promethean Attribution Tracker - Public Version
 * 100% Accurate Contact-to-Ad Attribution System
 * 
 * Usage: Add to your landing pages before the closing </body> tag:
 * <script src="https://www.getpromethean.com/promethean-attribution.js"></script>
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    apiEndpoint: '/api/attribution/track',
    sessionDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
    debug: window.location.hostname === 'localhost' || window.location.search.includes('debug=true'),
    version: '1.0.0'
  };

  // Determine absolute API base from the script tag origin
  function getApiUrl(path) {
    try {
      const currentScript = document.currentScript || (function() {
        const scripts = document.getElementsByTagName('script');
        return scripts[scripts.length - 1];
      })();
      const scriptSrc = currentScript && currentScript.src ? currentScript.src : window.location.origin;
      const scriptOrigin = new URL(scriptSrc).origin;
      // If path is already absolute, return as-is
      try { return new URL(path).toString(); } catch (_) {}
      return scriptOrigin + path;
    } catch (e) {
      return path; // fallback
    }
  }

  class PrometheanAttributionTracker {
    constructor() {
      this.sessionId = this.generateSessionId();
      this.fingerprintId = null;
      this.attributionData = {};
      this.startTime = Date.now();
      
      this.init();
    }

    async init() {
      try {
        this.log('🎯 Initializing Promethean Attribution Tracker v' + CONFIG.version);
        
        // Clean up expired sessions first
        this.cleanupExpiredSessions();
        
        // Generate browser fingerprint
        this.fingerprintId = await this.generateFingerprint();
        
        // Capture attribution data
        this.attributionData = await this.captureAttributionData();
        
        // Store session data locally
        this.storeSessionData();
        
        // Send to backend
        await this.sendAttributionData();
        
        // Set up form tracking
        this.setupFormTracking();
        
        // Set up activity tracking
        this.setupActivityTracking();
        
        this.log('✅ Attribution tracker initialized successfully', this.attributionData);
        
        // Make tracker available globally
        window.PrometheanTracker = this;
        
      } catch (error) {
        this.error('❌ Failed to initialize attribution tracker:', error);
      }
    }

    generateSessionId() {
      return 'prom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async generateFingerprint() {
      try {
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
          userAgent: navigator.userAgent.substring(0, 200),
          canvas: canvas.toDataURL().substring(0, 100),
          cookieEnabled: navigator.cookieEnabled,
          doNotTrack: navigator.doNotTrack,
          hardwareConcurrency: navigator.hardwareConcurrency || 0,
          maxTouchPoints: navigator.maxTouchPoints || 0,
          connection: navigator.connection ? {
            effectiveType: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink
          } : null
        };
        
        // Create hash of fingerprint data
        const fingerprintString = JSON.stringify(fingerprint);
        let hash = 0;
        for (let i = 0; i < fingerprintString.length; i++) {
          const char = fingerprintString.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        
        return `fp_${Math.abs(hash).toString(36)}`;
      } catch (error) {
        this.error('Error generating fingerprint:', error);
        return `fp_fallback_${Date.now()}`;
      }
    }

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

      // Determine attribution quality and method
      const quality = this.determineAttributionQuality(utmData, metaData, pixelData);
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

    extractMetaPixelData() {
      try {
        const pixelData = {
          pixel_loaded: false,
          fbp: this.getCookie('_fbp'),
          fbc: this.getCookie('_fbc')
        };

        // Check if Meta Pixel is loaded
        if (typeof fbq !== 'undefined') {
          pixelData.pixel_loaded = true;
          pixelData.pixel_version = window._fbq?.version || 'unknown';
          
          // Try to extract pixel IDs
          if (window._fbq?.instance?._pixelsByID) {
            pixelData.pixel_ids = Object.keys(window._fbq.instance._pixelsByID);
          }
        }

        return pixelData;
      } catch (error) {
        this.log('Could not extract Meta Pixel data:', error);
        return { 
          pixel_loaded: false,
          fbp: this.getCookie('_fbp'),
          fbc: this.getCookie('_fbc')
        };
      }
    }

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

    storeSessionData() {
      try {
        const sessionData = {
          sessionId: this.sessionId,
          fingerprintId: this.fingerprintId,
          attributionData: this.attributionData,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + CONFIG.sessionDuration).toISOString()
        };
        
        localStorage.setItem('promethean_attribution', JSON.stringify(sessionData));
        sessionStorage.setItem('promethean_session', this.sessionId);
        
        this.log('💾 Session data stored locally', sessionData);
      } catch (error) {
        this.error('Failed to store session data:', error);
      }
    }

    async sendAttributionData() {
      try {
        const response = await fetch(getApiUrl(CONFIG.apiEndpoint), {
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
        this.log('✅ Attribution data sent to backend', result);
        
        return result;
      } catch (error) {
        this.error('❌ Failed to send attribution data:', error);
        this.storeFailedRequest(this.attributionData);
      }
    }

    setupFormTracking() {
      // Track all forms on the page
      const forms = document.querySelectorAll('form');
      
      forms.forEach(form => {
        // Add attribution data as hidden fields
        this.addAttributionToForm(form);
        
        // Track form submission
        form.addEventListener('submit', async (event) => {
          await this.handleFormSubmission(form, event);
        });
      });

      // Watch for dynamically added forms
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const forms = node.querySelectorAll ? node.querySelectorAll('form') : [];
              forms.forEach(form => {
                this.addAttributionToForm(form);
                form.addEventListener('submit', async (event) => {
                  await this.handleFormSubmission(form, event);
                });
              });
            }
          });
        });
      });

      observer.observe(document.body, { childList: true, subtree: true });

      this.log(`📝 Set up form tracking for ${forms.length} forms`);
    }

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

    async handleFormSubmission(form, event) {
      try {
        const formData = new FormData(form);
        const formFields = Object.fromEntries(formData.entries());
        
        // Send form submission tracking
        await fetch(getApiUrl(CONFIG.apiEndpoint), {
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

        this.log('📝 Form submission tracked', { formFields, attribution: this.attributionData });
      } catch (error) {
        this.error('Failed to track form submission:', error);
      }
    }

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
      window.addEventListener('beforeunload', () => {
        const timeOnPage = Date.now() - this.startTime;
        this.updateSessionData({ time_on_page_ms: timeOnPage });
      });

      // Periodic activity updates
      setInterval(() => {
        this.updateLastActivity();
      }, 30000); // Every 30 seconds
    }

    updateLastActivity() {
      this.updateSessionData({ last_activity_at: new Date().toISOString() });
    }

    async updateSessionData(updates) {
      try {
        // Update local storage
        const stored = localStorage.getItem('promethean_attribution');
        if (stored) {
          const sessionData = JSON.parse(stored);
          Object.assign(sessionData.attributionData, updates);
          localStorage.setItem('promethean_attribution', JSON.stringify(sessionData));
        }

        // Send update to backend (don't await to avoid blocking)
        fetch(getApiUrl(CONFIG.apiEndpoint), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: this.sessionId,
            updates: updates
          })
        }).catch(error => {
          this.log('Failed to update session data:', error);
        });
      } catch (error) {
        this.error('Failed to update session data:', error);
      }
    }

    getCookie(name) {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        return parts.pop().split(';').shift();
      }
      return null;
    }

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

    cleanupExpiredSessions() {
      try {
        const stored = localStorage.getItem('promethean_attribution');
        if (stored) {
          const sessionData = JSON.parse(stored);
          if (new Date(sessionData.expiresAt) <= new Date()) {
            localStorage.removeItem('promethean_attribution');
            sessionStorage.removeItem('promethean_session');
            this.log('🧹 Cleaned up expired session');
          }
        }
      } catch (error) {
        this.error('Failed to cleanup expired sessions:', error);
      }
    }

    // Static method to get stored attribution (for use in other scripts)
    static getStoredAttribution() {
      try {
        const stored = localStorage.getItem('promethean_attribution');
        if (stored) {
          const sessionData = JSON.parse(stored);
          
          if (new Date(sessionData.expiresAt) > new Date()) {
            return sessionData;
          } else {
            localStorage.removeItem('promethean_attribution');
          }
        }
      } catch (error) {
        console.error('Failed to get stored attribution:', error);
      }
      return null;
    }

    // Static method to link attribution to contact (for use after contact creation)
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
          const result = await response.json();
          console.log('✅ Attribution linked to contact successfully', result);
          
          // Mark as linked
          attribution.linkedToContact = true;
          localStorage.setItem('promethean_attribution', JSON.stringify(attribution));
          
          return result;
        } else {
          console.error('Failed to link attribution:', response.status);
        }
      } catch (error) {
        console.error('Failed to link attribution to contact:', error);
      }
    }

    log(message, data = null) {
      if (CONFIG.debug) {
        console.log(`[Promethean Attribution] ${message}`, data);
      }
    }

    error(message, error = null) {
      console.error(`[Promethean Attribution] ${message}`, error);
    }
  }

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new PrometheanAttributionTracker();
    });
  } else {
    new PrometheanAttributionTracker();
  }

  // Expose class globally for manual usage
  window.PrometheanAttributionTracker = PrometheanAttributionTracker;

})(); 