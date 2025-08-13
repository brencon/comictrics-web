// Advanced Analytics Implementation for Comictrics
// Includes GA4, Core Web Vitals, Conversion Tracking, and Performance Monitoring

// Google Analytics 4 Configuration
const GA_MEASUREMENT_ID = 'G-EKJJM5Y2CZ';
const GTM_ID = 'GTM-XXXXXXX';

// Enhanced Analytics Configuration (GA4 is already loaded in index.html)
(function() {
    // Ensure gtag is available
    if (typeof gtag === 'undefined') {
        console.warn('⚠️ gtag not found - analytics.js should load after GA4 initialization');
        return;
    }
    
    // Configure enhanced tracking after consent is granted
    window.addEventListener('consent_update', function(e) {
        if (e.detail && e.detail.analytics_storage === 'granted') {
            // Enable enhanced measurements when consent is granted
            gtag('config', GA_MEASUREMENT_ID, {
                allow_google_signals: true,
                send_page_view: true
            });
            
            console.log('✅ Enhanced analytics enabled after consent');
        }
    });
})();

// Core Web Vitals Monitoring
class WebVitalsTracker {
    constructor() {
        this.vitals = {};
        this.initializeTracking();
    }

    initializeTracking() {
        // Load web-vitals library
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/web-vitals@3/dist/web-vitals.iife.js';
        script.onload = () => {
            this.setupVitalsTracking();
        };
        document.head.appendChild(script);
    }

    setupVitalsTracking() {
        const { getCLS, getFID, getFCP, getLCP, getTTFB, getINP } = webVitals;

        // Track Core Web Vitals
        getCLS(this.sendVital.bind(this));
        getFID(this.sendVital.bind(this));
        getFCP(this.sendVital.bind(this));
        getLCP(this.sendVital.bind(this));
        getTTFB(this.sendVital.bind(this));
        getINP(this.sendVital.bind(this));
    }

    sendVital(vital) {
        this.vitals[vital.name] = vital.value;
        
        // Send to GA4
        if (window.gtag) {
            gtag('event', vital.name, {
                event_category: 'Web Vitals',
                value: Math.round(vital.name === 'CLS' ? vital.value * 1000 : vital.value),
                metric_id: vital.id,
                metric_value: vital.value,
                metric_delta: vital.delta,
                custom_dimension_2: this.getEngagementLevel(vital)
            });
        }

        // Send to GTM
        if (window.dataLayer) {
            window.dataLayer.push({
                event: 'web_vital',
                metric_name: vital.name,
                metric_value: vital.value,
                metric_rating: this.getRating(vital)
            });
        }

        // Log for debugging
        console.log(`${vital.name}: ${vital.value} (${this.getRating(vital)})`);
    }

    getRating(vital) {
        const thresholds = {
            CLS: [0.1, 0.25],
            FID: [100, 300],
            FCP: [1800, 3000],
            LCP: [2500, 4000],
            TTFB: [800, 1800],
            INP: [200, 500]
        };

        const [good, needsImprovement] = thresholds[vital.name] || [0, 0];
        
        if (vital.value <= good) return 'good';
        if (vital.value <= needsImprovement) return 'needs-improvement';
        return 'poor';
    }

    getEngagementLevel(vital) {
        const rating = this.getRating(vital);
        return rating === 'good' ? 'high' : rating === 'needs-improvement' ? 'medium' : 'low';
    }
}

// Conversion Tracking System
class ConversionTracker {
    constructor() {
        this.conversionEvents = {
            'app_download_intent': { value: 5, currency: 'USD' },
            'pricing_view': { value: 2, currency: 'USD' },
            'trial_signup': { value: 10, currency: 'USD' },
            'monthly_signup': { value: 23.88, currency: 'USD' }, // 1.99 * 12
            'annual_signup': { value: 19.99, currency: 'USD' },
            'feature_engagement': { value: 1, currency: 'USD' },
            'social_share': { value: 3, currency: 'USD' }
        };
        
        this.setupEventTracking();
    }

    setupEventTracking() {
        // Track download button clicks
        document.addEventListener('click', (e) => {
            const target = e.target.closest('.download-btn, .cta-button, [href*="download"]');
            if (target) {
                this.trackConversion('app_download_intent', {
                    button_type: target.classList.contains('app-store') ? 'App Store' : 
                                target.classList.contains('google-play') ? 'Google Play' : 'CTA',
                    button_text: target.textContent.trim(),
                    page_section: this.getPageSection(target)
                });
            }

            // Track pricing interactions
            const pricingBtn = e.target.closest('.pricing-card .btn, [href*="pricing"]');
            if (pricingBtn) {
                const pricingCard = pricingBtn.closest('.pricing-card');
                const planType = pricingCard?.querySelector('h3')?.textContent || 'unknown';
                
                this.trackConversion('pricing_view', {
                    plan_type: planType.toLowerCase(),
                    plan_price: pricingCard?.querySelector('.amount')?.textContent || '0',
                    conversion_path: 'pricing_page'
                });
            }

            // Track social media clicks
            const socialLink = e.target.closest('.social-link');
            if (socialLink) {
                this.trackConversion('social_share', {
                    platform: socialLink.href.includes('instagram') ? 'instagram' :
                             socialLink.href.includes('twitter') || socialLink.href.includes('x.com') ? 'twitter' :
                             socialLink.href.includes('bsky') ? 'bluesky' : 'unknown',
                    link_text: socialLink.textContent.trim()
                });
            }
        });

        // Track scroll depth
        this.trackScrollDepth();
        
        // Track time on page
        this.trackTimeOnPage();
        
        // Track feature interactions
        this.trackFeatureEngagement();
    }

    trackConversion(eventName, parameters = {}) {
        const eventData = this.conversionEvents[eventName] || {};
        
        // Send to GA4
        if (window.gtag) {
            gtag('event', eventName, {
                event_category: 'Conversions',
                ...eventData,
                ...parameters,
                timestamp: Date.now(),
                user_agent: navigator.userAgent,
                viewport_width: window.innerWidth,
                viewport_height: window.innerHeight
            });
        }

        // Send to GTM
        if (window.dataLayer) {
            window.dataLayer.push({
                event: 'conversion',
                event_name: eventName,
                event_category: 'Conversions',
                event_value: eventData.value || 0,
                ...parameters
            });
        }

        console.log(`Conversion tracked: ${eventName}`, parameters);
    }

    trackScrollDepth() {
        let maxScroll = 0;
        const milestones = [25, 50, 75, 90, 100];
        const tracked = new Set();

        const trackScroll = () => {
            const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
            
            if (scrollPercent > maxScroll) {
                maxScroll = scrollPercent;
                
                milestones.forEach(milestone => {
                    if (scrollPercent >= milestone && !tracked.has(milestone)) {
                        tracked.add(milestone);
                        
                        this.trackConversion('feature_engagement', {
                            engagement_type: 'scroll_depth',
                            scroll_percentage: milestone,
                            max_scroll: maxScroll
                        });
                    }
                });
            }
        };

        window.addEventListener('scroll', this.debounce(trackScroll, 250));
    }

    trackTimeOnPage() {
        const startTime = Date.now();
        const intervals = [30, 60, 120, 300]; // 30s, 1m, 2m, 5m
        const tracked = new Set();

        const checkTime = () => {
            const timeSpent = Math.round((Date.now() - startTime) / 1000);
            
            intervals.forEach(interval => {
                if (timeSpent >= interval && !tracked.has(interval)) {
                    tracked.add(interval);
                    
                    this.trackConversion('feature_engagement', {
                        engagement_type: 'time_on_page',
                        time_spent: interval,
                        page_url: window.location.pathname
                    });
                }
            });
        };

        setInterval(checkTime, 10000); // Check every 10 seconds

        // Track on page unload
        window.addEventListener('beforeunload', () => {
            const finalTime = Math.round((Date.now() - startTime) / 1000);
            
            if (window.gtag) {
                gtag('event', 'page_view_time', {
                    event_category: 'Engagement',
                    value: finalTime,
                    page_url: window.location.pathname
                });
            }
        });
    }

    trackFeatureEngagement() {
        // Track navbar interactions
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                this.trackConversion('feature_engagement', {
                    engagement_type: 'navigation',
                    nav_item: link.textContent.trim(),
                    nav_href: link.href
                });
            });
        });

        // Track hero CTA interactions
        document.querySelectorAll('.hero-cta .btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.trackConversion('feature_engagement', {
                    engagement_type: 'hero_cta',
                    button_type: btn.classList.contains('btn-primary') ? 'primary' : 'secondary',
                    button_text: btn.textContent.trim()
                });
            });
        });

        // Track feature card hovers (engagement indicator)
        document.querySelectorAll('.feature-card').forEach((card, index) => {
            let hoverTime = 0;
            let hoverStart = 0;

            card.addEventListener('mouseenter', () => {
                hoverStart = Date.now();
            });

            card.addEventListener('mouseleave', () => {
                if (hoverStart) {
                    hoverTime += Date.now() - hoverStart;
                    
                    if (hoverTime > 2000) { // 2+ seconds of hover
                        this.trackConversion('feature_engagement', {
                            engagement_type: 'feature_hover',
                            feature_index: index,
                            feature_title: card.querySelector('h3')?.textContent || 'unknown',
                            hover_duration: hoverTime
                        });
                    }
                }
            });
        });
    }

    getPageSection(element) {
        const sections = ['hero', 'features', 'pricing', 'download', 'footer'];
        
        for (const section of sections) {
            if (element.closest(`#${section}, .${section}`)) {
                return section;
            }
        }
        
        return 'unknown';
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Performance Monitoring
class PerformanceMonitor {
    constructor() {
        this.metrics = {};
        this.initializeMonitoring();
    }

    initializeMonitoring() {
        // Monitor page load performance
        window.addEventListener('load', () => {
            setTimeout(() => this.collectLoadMetrics(), 0);
        });

        // Monitor resource loading
        this.monitorResources();
        
        // Monitor errors
        this.monitorErrors();
        
        // Monitor user interactions
        this.monitorInteractions();
    }

    collectLoadMetrics() {
        if (!window.performance) return;

        const navigation = performance.getEntriesByType('navigation')[0];
        const paint = performance.getEntriesByType('paint');

        const metrics = {
            dns_lookup: navigation.domainLookupEnd - navigation.domainLookupStart,
            tcp_connect: navigation.connectEnd - navigation.connectStart,
            request_response: navigation.responseEnd - navigation.requestStart,
            dom_parse: navigation.domContentLoadedEventEnd - navigation.responseEnd,
            load_complete: navigation.loadEventEnd - navigation.navigationStart
        };

        // First Paint and First Contentful Paint
        paint.forEach(entry => {
            metrics[entry.name.replace('-', '_')] = entry.startTime;
        });

        // Send metrics to analytics
        Object.entries(metrics).forEach(([name, value]) => {
            if (window.gtag && value > 0) {
                gtag('event', 'timing_complete', {
                    name: name,
                    value: Math.round(value)
                });
            }
        });

        this.metrics.load = metrics;
    }

    monitorResources() {
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                if (entry.duration > 1000) { // Slow resources (>1s)
                    if (window.gtag) {
                        gtag('event', 'slow_resource', {
                            event_category: 'Performance',
                            resource_name: entry.name,
                            resource_type: entry.initiatorType,
                            duration: Math.round(entry.duration),
                            size: entry.transferSize || 0
                        });
                    }
                }
            });
        });

        observer.observe({ entryTypes: ['resource'] });
    }

    monitorErrors() {
        // JavaScript errors
        window.addEventListener('error', (e) => {
            if (window.gtag) {
                gtag('event', 'js_error', {
                    event_category: 'Error',
                    error_message: e.message,
                    error_filename: e.filename,
                    error_line: e.lineno,
                    error_column: e.colno
                });
            }
        });

        // Promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            if (window.gtag) {
                gtag('event', 'promise_rejection', {
                    event_category: 'Error',
                    error_reason: e.reason?.toString() || 'Unknown'
                });
            }
        });
    }

    monitorInteractions() {
        // First Input Delay (manual tracking for older browsers)
        let firstInput = true;
        const inputEvents = ['click', 'mousedown', 'keydown', 'touchstart', 'pointerdown'];

        inputEvents.forEach(eventType => {
            document.addEventListener(eventType, (e) => {
                if (firstInput) {
                    firstInput = false;
                    const startTime = performance.now();
                    
                    requestAnimationFrame(() => {
                        const delay = performance.now() - startTime;
                        
                        if (window.gtag) {
                            gtag('event', 'first_input_delay', {
                                event_category: 'Performance',
                                value: Math.round(delay),
                                input_type: eventType
                            });
                        }
                    });
                }
            }, { once: false, passive: true });
        });
    }
}

// AWS CloudWatch Integration (for server-side metrics)
class AWSMetrics {
    constructor() {
        this.endpoint = '/api/metrics'; // Your AWS API Gateway endpoint
        this.queue = [];
        this.initializeCloudWatch();
    }

    initializeCloudWatch() {
        // Send metrics every 30 seconds
        setInterval(() => this.flushQueue(), 30000);

        // Send on page unload
        window.addEventListener('beforeunload', () => this.flushQueue());
    }

    trackCustomMetric(metricName, value, dimensions = {}) {
        this.queue.push({
            MetricName: metricName,
            Value: value,
            Unit: 'Count',
            Dimensions: [
                { Name: 'Environment', Value: 'production' },
                { Name: 'Application', Value: 'comictrics-web' },
                ...Object.entries(dimensions).map(([Name, Value]) => ({ Name, Value }))
            ],
            Timestamp: new Date().toISOString()
        });
    }

    flushQueue() {
        if (this.queue.length === 0) return;

        const metrics = [...this.queue];
        this.queue = [];

        // Send to your AWS endpoint
        fetch(this.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metrics }),
            keepalive: true
        }).catch(err => {
            console.warn('Failed to send metrics to CloudWatch:', err);
            // Re-queue failed metrics
            this.queue.unshift(...metrics);
        });
    }
}

// Initialize all tracking systems
document.addEventListener('DOMContentLoaded', () => {
    // Initialize trackers
    window.webVitalsTracker = new WebVitalsTracker();
    window.conversionTracker = new ConversionTracker();
    window.performanceMonitor = new PerformanceMonitor();
    window.awsMetrics = new AWSMetrics();

    // Track page view
    if (window.gtag) {
        gtag('event', 'page_view', {
            page_title: document.title,
            page_location: window.location.href,
            user_agent: navigator.userAgent,
            timestamp: Date.now()
        });
    }

    // Track custom dimensions
    if (window.gtag) {
        gtag('config', GA_MEASUREMENT_ID, {
            custom_map: {
                'dimension1': 'user_type',
                'dimension2': 'engagement_level',
                'dimension3': 'conversion_path'
            }
        });
    }

    console.log('🚀 Advanced Analytics Initialized for Comictrics');
});

// Export for external use
window.ComictricsAnalytics = {
    trackConversion: (event, params) => window.conversionTracker?.trackConversion(event, params),
    trackCustomMetric: (name, value, dimensions) => window.awsMetrics?.trackCustomMetric(name, value, dimensions),
    getWebVitals: () => window.webVitalsTracker?.vitals || {},
    getPerformanceMetrics: () => window.performanceMonitor?.metrics || {}
};