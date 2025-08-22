// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function() {
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
        
        // Close menu when clicking on links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            const isClickInsideNav = navMenu.contains(event.target) || navToggle.contains(event.target);
            if (!isClickInsideNav && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            }
        });
    }
});

// Smooth scrolling for anchor links
document.addEventListener('DOMContentLoaded', function() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80; // Account for fixed navbar
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
});

// Navbar background opacity on scroll
document.addEventListener('DOMContentLoaded', function() {
    const navbar = document.querySelector('.navbar');
    
    function updateNavbar() {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(17, 24, 39, 0.98)';
        } else {
            navbar.style.background = 'rgba(17, 24, 39, 0.95)';
        }
    }
    
    window.addEventListener('scroll', updateNavbar);
    updateNavbar(); // Initial call
});

// Intersection Observer for animations
document.addEventListener('DOMContentLoaded', function() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Animate feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        observer.observe(card);
    });
    
    // Animate pricing cards
    const pricingCards = document.querySelectorAll('.pricing-card');
    pricingCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        observer.observe(card);
    });
});

// Update current date in phone mockup
document.addEventListener('DOMContentLoaded', function() {
    const currentDateElement = document.getElementById('current-date');
    if (currentDateElement) {
        const today = new Date();
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        currentDateElement.textContent = today.toLocaleDateString('en-US', options);
    }
});

// Phone mockup interactive demo
document.addEventListener('DOMContentLoaded', function() {
    const phoneMockup = document.querySelector('.phone-mockup');
    
    if (phoneMockup) {
        // Add subtle animation to the risk bar
        const riskFill = document.querySelector('.risk-fill');
        if (riskFill) {
            const riskScores = [85, 62, 27]; // Green, Yellow, Red
            let currentIndex = 0;
            
            setInterval(() => {
                const newWidth = riskScores[currentIndex];
                riskFill.style.width = `${newWidth}%`;
                
                // Update risk value color based on score (higher = better)
                const riskValue = document.querySelector('.risk-value');
                if (riskValue) {
                    if (newWidth >= 70) {
                        riskValue.style.color = 'var(--success)'; // Green for high score (very reliable)
                        riskFill.style.background = 'linear-gradient(90deg, var(--success), #22c55e)';
                    } else if (newWidth >= 40) {
                        riskValue.style.color = 'var(--accent-primary)'; // Yellow for medium score
                        riskFill.style.background = 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))';
                    } else {
                        riskValue.style.color = 'var(--error)'; // Red for low score (unreliable)
                        riskFill.style.background = 'linear-gradient(90deg, var(--error), #dc2626)';
                    }
                    riskValue.textContent = `${newWidth}`;
                }
                
                // Move to next score in cycle
                currentIndex = (currentIndex + 1) % riskScores.length;
            }, 3000);
        }
        
        // Add hover effect to phone mockup
        phoneMockup.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.02) rotateY(5deg)';
            this.style.transition = 'all 0.3s ease';
        });
        
        phoneMockup.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1) rotateY(0deg)';
        });
    }
});

// Pricing card hover effects
document.addEventListener('DOMContentLoaded', function() {
    const pricingCards = document.querySelectorAll('.pricing-card:not(.featured)');
    
    pricingCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.borderColor = 'rgba(234, 179, 8, 0.5)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        });
    });
});

// Download button tracking (placeholder for analytics)
document.addEventListener('DOMContentLoaded', function() {
    const downloadButtons = document.querySelectorAll('.download-btn, .cta-button');
    
    downloadButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Only prevent default for buttons without real URLs (App Store)
            if (this.getAttribute('href') === '#') {
                e.preventDefault();
            }
            
            // Track download button clicks
            const buttonType = this.classList.contains('app-store') ? 'App Store' : 
                              this.classList.contains('google-play') ? 'Google Play' : 'CTA';
            
            console.log(`Download button clicked: ${buttonType}`);
            
            // Show temporary feedback
            const originalText = this.innerHTML;
            this.style.opacity = '0.7';
            
            setTimeout(() => {
                this.style.opacity = '1';
            }, 200);
        });
    });
});

// Feature card progressive enhancement
document.addEventListener('DOMContentLoaded', function() {
    const featureCards = document.querySelectorAll('.feature-card');
    
    featureCards.forEach(card => {
        const icon = card.querySelector('.feature-icon i');
        
        card.addEventListener('mouseenter', function() {
            if (icon) {
                icon.style.transform = 'scale(1.1) rotate(5deg)';
                icon.style.transition = 'all 0.3s ease';
            }
        });
        
        card.addEventListener('mouseleave', function() {
            if (icon) {
                icon.style.transform = 'scale(1) rotate(0deg)';
            }
        });
    });
});

// Scroll to top functionality
document.addEventListener('DOMContentLoaded', function() {
    // Create scroll to top button
    const scrollTopBtn = document.createElement('button');
    scrollTopBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    scrollTopBtn.className = 'scroll-top-btn';
    scrollTopBtn.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        width: 3rem;
        height: 3rem;
        background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
        color: var(--bg-primary);
        border: none;
        border-radius: 50%;
        font-size: 1rem;
        cursor: pointer;
        opacity: 0;
        transform: translateY(100px);
        transition: all 0.3s ease;
        z-index: 1000;
        box-shadow: var(--shadow-lg);
    `;
    
    document.body.appendChild(scrollTopBtn);
    
    // Show/hide button based on scroll position
    function toggleScrollTopBtn() {
        if (window.scrollY > 500) {
            scrollTopBtn.style.opacity = '1';
            scrollTopBtn.style.transform = 'translateY(0)';
        } else {
            scrollTopBtn.style.opacity = '0';
            scrollTopBtn.style.transform = 'translateY(100px)';
        }
    }
    
    window.addEventListener('scroll', toggleScrollTopBtn);
    
    // Scroll to top when clicked
    scrollTopBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Hover effect
    scrollTopBtn.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-2px) scale(1.05)';
    });
    
    scrollTopBtn.addEventListener('mouseleave', function() {
        this.style.transform = window.scrollY > 500 ? 'translateY(0) scale(1)' : 'translateY(100px) scale(1)';
    });
});

// Performance optimization: Debounce scroll events
function debounce(func, wait) {
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

// Apply debouncing to scroll events
const debouncedScrollHandler = debounce(() => {
    // Any scroll-based functionality can be added here
}, 100);

window.addEventListener('scroll', debouncedScrollHandler);

// Keyboard navigation enhancement
document.addEventListener('DOMContentLoaded', function() {
    // Skip to main content link for accessibility
    const skipLink = document.createElement('a');
    skipLink.href = '#home';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
        position: absolute;
        top: -40px;
        left: 6px;
        background: var(--accent-primary);
        color: var(--bg-primary);
        padding: 8px;
        text-decoration: none;
        z-index: 100;
        border-radius: 4px;
        font-weight: 600;
        transition: top 0.3s ease;
    `;
    
    skipLink.addEventListener('focus', function() {
        this.style.top = '6px';
    });
    
    skipLink.addEventListener('blur', function() {
        this.style.top = '-40px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);
});