// Google Consent Mode v2 Implementation for Comictrics
// GDPR/CCPA compliant consent management with analytics optimization

class ComictricsConsentManager {
    constructor() {
        this.consentKey = 'comictrics_consent';
        this.consentVersion = '1.0';
        this.defaultConsent = {
            ad_storage: 'denied',
            ad_user_data: 'denied', 
            ad_personalization: 'denied',
            analytics_storage: 'denied',
            functionality_storage: 'granted',
            personalization_storage: 'denied',
            security_storage: 'granted'
        };
        
        this.init();
    }

    init() {
        // Initialize Google Consent Mode before GA4 loads
        this.initializeConsentMode();
        
        // Check existing consent
        const savedConsent = this.getSavedConsent();
        
        if (savedConsent) {
            this.applyConsent(savedConsent);
        } else {
            this.showConsentBanner();
        }
    }

    initializeConsentMode() {
        // Set default consent states before any tracking scripts load
        if (typeof gtag !== 'undefined') {
            gtag('consent', 'default', this.defaultConsent);
            
            // Configure consent for regions
            gtag('consent', 'default', {
                ...this.defaultConsent,
                region: ['US-CA'] // California CCPA
            });
            
            gtag('consent', 'default', {
                ...this.defaultConsent,
                region: ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'] // EU GDPR
            });
        }
    }

    showConsentBanner() {
        // Create consent banner HTML
        const bannerHTML = `
            <div id="consent-banner" class="consent-banner">
                <div class="consent-content">
                    <div class="consent-header">
                        <i class="fas fa-shield-alt"></i>
                        <h3>Your Privacy Matters</h3>
                    </div>
                    <div class="consent-text">
                        <p>We use cookies and similar technologies to enhance your experience on Comictrics, analyze site usage, and assist with marketing efforts. You can manage your preferences below.</p>
                        <p class="consent-details">
                            <strong>Essential:</strong> Required for basic site functionality<br>
                            <strong>Analytics:</strong> Help us improve by understanding how you use our site<br>
                            <strong>Marketing:</strong> Enable personalized content and ads
                        </p>
                    </div>
                    <div class="consent-buttons">
                        <button id="consent-accept-all" class="consent-btn consent-btn-primary">
                            <i class="fas fa-check"></i>
                            Accept All
                        </button>
                        <button id="consent-customize" class="consent-btn consent-btn-secondary">
                            <i class="fas fa-cog"></i>
                            Customize
                        </button>
                        <button id="consent-reject" class="consent-btn consent-btn-minimal">
                            <i class="fas fa-times"></i>
                            Reject All
                        </button>
                    </div>
                    <div class="consent-links">
                        <a href="/privacy.html" target="_blank">Privacy Policy</a> | 
                        <a href="/privacy.html#cookies" target="_blank">Cookie Policy</a>
                    </div>
                </div>
            </div>
        `;

        // Add banner to page
        document.body.insertAdjacentHTML('beforeend', bannerHTML);
        
        // Add styles
        this.addConsentStyles();
        
        // Add event listeners
        this.addConsentEventListeners();
        
        // Show banner with animation
        setTimeout(() => {
            document.getElementById('consent-banner').classList.add('consent-banner-visible');
        }, 100);
    }

    showCustomizeModal() {
        const modalHTML = `
            <div id="consent-modal" class="consent-modal">
                <div class="consent-modal-content">
                    <div class="consent-modal-header">
                        <h3>Customize Your Privacy Settings</h3>
                        <button id="consent-modal-close" class="consent-modal-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="consent-modal-body">
                        <div class="consent-category">
                            <div class="consent-category-header">
                                <h4>
                                    <i class="fas fa-shield-alt"></i>
                                    Essential Cookies
                                </h4>
                                <label class="consent-switch">
                                    <input type="checkbox" checked disabled>
                                    <span class="consent-slider"></span>
                                </label>
                            </div>
                            <p>These cookies are necessary for the website to function and cannot be switched off.</p>
                        </div>
                        
                        <div class="consent-category">
                            <div class="consent-category-header">
                                <h4>
                                    <i class="fas fa-chart-line"></i>
                                    Analytics Cookies
                                </h4>
                                <label class="consent-switch">
                                    <input type="checkbox" id="consent-analytics">
                                    <span class="consent-slider"></span>
                                </label>
                            </div>
                            <p>Help us understand how visitors interact with our website by collecting anonymous information.</p>
                            <div class="consent-services">
                                <small>
                                    <i class="fab fa-google"></i> Google Analytics 4,
                                    <i class="fas fa-chart-bar"></i> Core Web Vitals
                                </small>
                            </div>
                        </div>
                        
                        <div class="consent-category">
                            <div class="consent-category-header">
                                <h4>
                                    <i class="fas fa-bullhorn"></i>
                                    Marketing Cookies
                                </h4>
                                <label class="consent-switch">
                                    <input type="checkbox" id="consent-marketing">
                                    <span class="consent-slider"></span>
                                </label>
                            </div>
                            <p>Enable personalized ads and content based on your interests and behavior.</p>
                            <div class="consent-services">
                                <small>
                                    <i class="fab fa-google"></i> Google Ads,
                                    <i class="fab fa-facebook"></i> Facebook Pixel (Future)
                                </small>
                            </div>
                        </div>
                    </div>
                    <div class="consent-modal-footer">
                        <button id="consent-save-preferences" class="consent-btn consent-btn-primary">
                            <i class="fas fa-save"></i>
                            Save Preferences
                        </button>
                        <button id="consent-accept-all-modal" class="consent-btn consent-btn-secondary">
                            <i class="fas fa-check"></i>
                            Accept All
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add modal event listeners
        this.addModalEventListeners();
        
        // Show modal
        document.getElementById('consent-modal').classList.add('consent-modal-visible');
    }

    addConsentEventListeners() {
        // Accept All button
        document.getElementById('consent-accept-all').addEventListener('click', () => {
            this.acceptAllConsent();
        });

        // Customize button
        document.getElementById('consent-customize').addEventListener('click', () => {
            this.showCustomizeModal();
        });

        // Reject button
        document.getElementById('consent-reject').addEventListener('click', () => {
            this.rejectAllConsent();
        });
    }

    addModalEventListeners() {
        // Close modal
        document.getElementById('consent-modal-close').addEventListener('click', () => {
            this.closeModal();
        });

        // Save preferences
        document.getElementById('consent-save-preferences').addEventListener('click', () => {
            this.saveCustomPreferences();
        });

        // Accept all from modal
        document.getElementById('consent-accept-all-modal').addEventListener('click', () => {
            this.acceptAllConsent();
        });

        // Close modal on backdrop click
        document.getElementById('consent-modal').addEventListener('click', (e) => {
            if (e.target.id === 'consent-modal') {
                this.closeModal();
            }
        });
    }

    acceptAllConsent() {
        const consent = {
            ad_storage: 'granted',
            ad_user_data: 'granted',
            ad_personalization: 'granted', 
            analytics_storage: 'granted',
            functionality_storage: 'granted',
            personalization_storage: 'granted',
            security_storage: 'granted',
            timestamp: Date.now(),
            version: this.consentVersion
        };

        this.applyConsent(consent);
        this.saveConsent(consent);
        this.hideConsentUI();
        
        // Track consent acceptance
        this.trackConsentEvent('accept_all');
    }

    rejectAllConsent() {
        const consent = {
            ...this.defaultConsent,
            timestamp: Date.now(),
            version: this.consentVersion
        };

        this.applyConsent(consent);
        this.saveConsent(consent);
        this.hideConsentUI();
        
        // Track consent rejection (with minimal data)
        this.trackConsentEvent('reject_all');
    }

    saveCustomPreferences() {
        const analyticsConsent = document.getElementById('consent-analytics').checked;
        const marketingConsent = document.getElementById('consent-marketing').checked;
        
        const consent = {
            ad_storage: marketingConsent ? 'granted' : 'denied',
            ad_user_data: marketingConsent ? 'granted' : 'denied',
            ad_personalization: marketingConsent ? 'granted' : 'denied',
            analytics_storage: analyticsConsent ? 'granted' : 'denied', 
            functionality_storage: 'granted',
            personalization_storage: analyticsConsent ? 'granted' : 'denied',
            security_storage: 'granted',
            timestamp: Date.now(),
            version: this.consentVersion
        };

        this.applyConsent(consent);
        this.saveConsent(consent);
        this.hideConsentUI();
        
        // Track custom preferences
        this.trackConsentEvent('customize', {
            analytics: analyticsConsent,
            marketing: marketingConsent
        });
    }

    applyConsent(consent) {
        if (typeof gtag !== 'undefined') {
            // Update consent settings
            gtag('consent', 'update', {
                ad_storage: consent.ad_storage,
                ad_user_data: consent.ad_user_data,
                ad_personalization: consent.ad_personalization,
                analytics_storage: consent.analytics_storage,
                functionality_storage: consent.functionality_storage,
                personalization_storage: consent.personalization_storage,
                security_storage: consent.security_storage
            });
        }

        // Apply to other tracking systems
        if (window.dataLayer) {
            window.dataLayer.push({
                event: 'consent_update',
                consent_settings: consent
            });
        }

        console.log('✅ Consent applied:', consent);
    }

    saveConsent(consent) {
        try {
            localStorage.setItem(this.consentKey, JSON.stringify(consent));
        } catch (error) {
            console.warn('Failed to save consent preferences:', error);
        }
    }

    getSavedConsent() {
        try {
            const saved = localStorage.getItem(this.consentKey);
            if (saved) {
                const consent = JSON.parse(saved);
                
                // Check if consent is still valid (not older than 13 months)
                const thirteenMonths = 13 * 30 * 24 * 60 * 60 * 1000;
                if (Date.now() - consent.timestamp < thirteenMonths && consent.version === this.consentVersion) {
                    return consent;
                }
            }
        } catch (error) {
            console.warn('Failed to load consent preferences:', error);
        }
        
        return null;
    }

    hideConsentUI() {
        const banner = document.getElementById('consent-banner');
        const modal = document.getElementById('consent-modal');
        
        if (banner) {
            banner.classList.add('consent-banner-hidden');
            setTimeout(() => banner.remove(), 300);
        }
        
        if (modal) {
            this.closeModal();
        }
    }

    closeModal() {
        const modal = document.getElementById('consent-modal');
        if (modal) {
            modal.classList.remove('consent-modal-visible');
            setTimeout(() => modal.remove(), 300);
        }
    }

    trackConsentEvent(action, details = {}) {
        // Only track if analytics consent is granted
        const consent = this.getSavedConsent();
        if (consent && consent.analytics_storage === 'granted' && typeof gtag !== 'undefined') {
            gtag('event', 'consent_action', {
                event_category: 'Consent',
                action: action,
                ...details,
                timestamp: Date.now()
            });
        }
    }

    addConsentStyles() {
        const styles = `
            <style id="consent-styles">
                .consent-banner {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
                    color: #f9fafb;
                    padding: 1.5rem;
                    box-shadow: 0 -10px 25px rgba(0, 0, 0, 0.3);
                    transform: translateY(100%);
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    z-index: 10000;
                    border-top: 3px solid var(--accent-primary, #eab308);
                }
                
                .consent-banner-visible {
                    transform: translateY(0);
                }
                
                .consent-banner-hidden {
                    transform: translateY(100%);
                }
                
                .consent-content {
                    max-width: 1200px;
                    margin: 0 auto;
                }
                
                .consent-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                }
                
                .consent-header i {
                    color: var(--accent-primary, #eab308);
                    font-size: 1.5rem;
                }
                
                .consent-header h3 {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 700;
                }
                
                .consent-text p {
                    margin: 0 0 1rem 0;
                    line-height: 1.6;
                    color: #d1d5db;
                }
                
                .consent-details {
                    font-size: 0.9rem;
                    background: rgba(255, 255, 255, 0.05);
                    padding: 1rem;
                    border-radius: 8px;
                    border-left: 4px solid var(--accent-primary, #eab308);
                }
                
                .consent-buttons {
                    display: flex;
                    gap: 1rem;
                    margin: 1.5rem 0 1rem 0;
                    flex-wrap: wrap;
                }
                
                .consent-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1.5rem;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-size: 0.95rem;
                    text-decoration: none;
                }
                
                .consent-btn-primary {
                    background: linear-gradient(135deg, var(--accent-primary, #eab308), var(--accent-secondary, #f59e0b));
                    color: #111827;
                }
                
                .consent-btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(234, 179, 8, 0.3);
                }
                
                .consent-btn-secondary {
                    background: rgba(255, 255, 255, 0.1);
                    color: #f9fafb;
                    border: 2px solid rgba(255, 255, 255, 0.2);
                }
                
                .consent-btn-secondary:hover {
                    background: rgba(255, 255, 255, 0.2);
                    transform: translateY(-1px);
                }
                
                .consent-btn-minimal {
                    background: transparent;
                    color: #9ca3af;
                    border: 2px solid #374151;
                }
                
                .consent-btn-minimal:hover {
                    color: #f9fafb;
                    border-color: #6b7280;
                }
                
                .consent-links {
                    font-size: 0.85rem;
                    color: #9ca3af;
                }
                
                .consent-links a {
                    color: var(--accent-primary, #eab308);
                    text-decoration: none;
                }
                
                .consent-links a:hover {
                    text-decoration: underline;
                }
                
                /* Modal Styles */
                .consent-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10001;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                    padding: 1rem;
                }
                
                .consent-modal-visible {
                    opacity: 1;
                    visibility: visible;
                }
                
                .consent-modal-content {
                    background: #1f2937;
                    border-radius: 12px;
                    max-width: 600px;
                    width: 100%;
                    max-height: 80vh;
                    overflow-y: auto;
                    color: #f9fafb;
                    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
                    transform: scale(0.9);
                    transition: transform 0.3s ease;
                }
                
                .consent-modal-visible .consent-modal-content {
                    transform: scale(1);
                }
                
                .consent-modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1.5rem;
                    border-bottom: 2px solid #374151;
                }
                
                .consent-modal-header h3 {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 700;
                }
                
                .consent-modal-close {
                    background: none;
                    border: none;
                    color: #9ca3af;
                    font-size: 1.5rem;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                }
                
                .consent-modal-close:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: #f9fafb;
                }
                
                .consent-modal-body {
                    padding: 1.5rem;
                }
                
                .consent-category {
                    margin-bottom: 2rem;
                    padding-bottom: 1.5rem;
                    border-bottom: 1px solid #374151;
                }
                
                .consent-category:last-child {
                    border-bottom: none;
                    margin-bottom: 0;
                }
                
                .consent-category-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 0.75rem;
                }
                
                .consent-category-header h4 {
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 1.1rem;
                    font-weight: 600;
                }
                
                .consent-category-header i {
                    color: var(--accent-primary, #eab308);
                }
                
                .consent-category p {
                    margin: 0 0 0.75rem 0;
                    color: #d1d5db;
                    line-height: 1.5;
                }
                
                .consent-services {
                    color: #9ca3af;
                    font-size: 0.85rem;
                }
                
                .consent-services i {
                    margin-right: 0.25rem;
                }
                
                /* Switch Styles */
                .consent-switch {
                    position: relative;
                    display: inline-block;
                    width: 50px;
                    height: 24px;
                }
                
                .consent-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                
                .consent-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #374151;
                    transition: 0.3s;
                    border-radius: 24px;
                }
                
                .consent-slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: 0.3s;
                    border-radius: 50%;
                }
                
                input:checked + .consent-slider {
                    background: linear-gradient(135deg, var(--accent-primary, #eab308), var(--accent-secondary, #f59e0b));
                }
                
                input:checked + .consent-slider:before {
                    transform: translateX(26px);
                }
                
                input:disabled + .consent-slider {
                    background-color: #6b7280;
                    cursor: not-allowed;
                }
                
                .consent-modal-footer {
                    padding: 1.5rem;
                    border-top: 2px solid #374151;
                    display: flex;
                    gap: 1rem;
                    justify-content: flex-end;
                }
                
                /* Mobile Responsive */
                @media (max-width: 768px) {
                    .consent-banner {
                        padding: 1rem;
                    }
                    
                    .consent-buttons {
                        flex-direction: column;
                    }
                    
                    .consent-btn {
                        justify-content: center;
                        width: 100%;
                    }
                    
                    .consent-modal {
                        padding: 0.5rem;
                    }
                    
                    .consent-modal-footer {
                        flex-direction: column;
                    }
                    
                    .consent-modal-footer .consent-btn {
                        width: 100%;
                        justify-content: center;
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    // Method to show consent banner again (for settings page)
    showConsentSettings() {
        this.showCustomizeModal();
    }

    // Method to reset consent (for testing)
    resetConsent() {
        localStorage.removeItem(this.consentKey);
        this.showConsentBanner();
    }
}

// Initialize consent manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.comictricsConsent = new ComictricsConsentManager();
});

// Export for external use
window.ComictricsConsent = {
    showSettings: () => window.comictricsConsent?.showConsentSettings(),
    reset: () => window.comictricsConsent?.resetConsent(),
    getConsent: () => window.comictricsConsent?.getSavedConsent()
};