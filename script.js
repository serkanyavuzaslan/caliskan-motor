// Slider Manager
class SliderManager {
    constructor() {
        this.currentSlide = 0;
        this.slides = document.querySelectorAll('.slide');
        this.totalSlides = this.slides.length;
        this.indicators = document.querySelectorAll('.indicator');
        this.isAnimating = false;
        this.autoSlideInterval = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateSlider(); // Başlangıçta slaytları ayarla
        this.startAutoSlide();
    }
    
    setupEventListeners() {
        // ... (Hamburger menu and other event listeners are the same)
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const sideNav = document.getElementById('sideNav');
        const closeBtn = document.getElementById('closeBtn');
        
        hamburgerBtn.addEventListener('click', () => {
            sideNav.classList.add('open');
        });
        
        closeBtn.addEventListener('click', () => {
            sideNav.classList.remove('open');
        });
        
        document.addEventListener('click', (e) => {
            if (!sideNav.contains(e.target) && !hamburgerBtn.contains(e.target) && sideNav.classList.contains('open')) {
                sideNav.classList.remove('open');
            }
        });
        
        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');
        
        nextBtn.addEventListener('click', () => this.nextSlide());
        prevBtn.addEventListener('click', () => this.prevSlide());
        
        this.indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => this.goToSlide(index));
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') {
                this.nextSlide();
            } else if (e.key === 'ArrowLeft') {
                this.prevSlide();
            }
        });
        
        let startX = null;
        let startY = null;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!startX || !startY) return;
            
            let x = e.touches[0].clientX;
            let y = e.touches[0].clientY;
            let diffX = startX - x;
            let diffY = startY - y;
            
            if (Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX > 0) {
                    this.nextSlide();
                } else {
                    this.prevSlide();
                }
            }
            
            startX = null;
            startY = null;
        });
        
        const sliderContainer = document.querySelector('.slider-wrapper');
        sliderContainer.addEventListener('mouseenter', () => this.stopAutoSlide());
        sliderContainer.addEventListener('mouseleave', () => this.startAutoSlide());
    }
    
    nextSlide() {
        if (this.isAnimating) return;
        
        this.stopAutoSlide();
        this.currentSlide = (this.currentSlide + 1) % this.totalSlides;
        this.updateSlider();
        this.startAutoSlide();
    }
    
    prevSlide() {
        if (this.isAnimating) return;
        
        this.stopAutoSlide();
        this.currentSlide = this.currentSlide === 0 ? this.totalSlides - 1 : this.currentSlide - 1;
        this.updateSlider();
        this.startAutoSlide();
    }
    
    goToSlide(index) {
        if (this.isAnimating || index === this.currentSlide) return;
        
        this.stopAutoSlide();
        this.currentSlide = index;
        this.updateSlider();
        this.startAutoSlide();
    }
    
    updateSlider() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        
        // Slaytları güncelleyin
        this.slides.forEach((slide, index) => {
            slide.classList.remove('active', 'prev', 'next-slide');
            if (index === this.currentSlide) {
                slide.classList.add('active');
            } else if (index === (this.currentSlide - 1 + this.totalSlides) % this.totalSlides) {
                slide.classList.add('prev');
            } else if (index === (this.currentSlide + 1) % this.totalSlides) {
                slide.classList.add('next-slide');
            }
        });
        
        // Göstergeleri güncelleyin
        this.indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === this.currentSlide);
        });
        
        // Animasyon kilidini sıfırla
        setTimeout(() => {
            this.isAnimating = false;
        }, 800);
    }
    
    startAutoSlide() {
        this.stopAutoSlide();
        this.autoSlideInterval = setInterval(() => {
            this.nextSlide();
        }, 5000);
    }
    
    stopAutoSlide() {
        if (this.autoSlideInterval) {
            clearInterval(this.autoSlideInterval);
            this.autoSlideInterval = null;
        }
    }
}

// Animation Manager and Performance Manager classes are the same
class AnimationManager {
    constructor() {
        this.init();
    }
    
    init() {
        this.setupScrollAnimations();
        this.setupHoverEffects();
    }
    
    setupScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, { threshold: 0.1 });
        
        document.querySelectorAll('.slide-content').forEach(el => {
            observer.observe(el);
        });
    }
    
    setupHoverEffects() {
        const interactiveElements = document.querySelectorAll('.nav-item, .social-icon, .nav-arrow, .indicator');
        
        interactiveElements.forEach(element => {
            element.addEventListener('mouseenter', function() {
                this.style.transform = 'scale(1.05)';
            });
            
            element.addEventListener('mouseleave', function() {
                this.style.transform = 'scale(1)';
            });
        });
    }
}

class PerformanceManager {
    constructor() {
        this.init();
    }
    
    init() {
        this.optimizeImages();
        this.setupLazyLoading();
    }
    
    optimizeImages() {
        const images = document.querySelectorAll('.slide-bg');
        images.forEach(img => {
            if (img.style.backgroundImage) {
                const imageUrl = img.style.backgroundImage.slice(4, -1).replace(/"/g, "");
                const preloadImg = new Image();
                preloadImg.src = imageUrl;
            }
        });
    }
    
    setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const lazyImageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const lazyImage = entry.target;
                        if (lazyImage.dataset.src) {
                            lazyImage.src = lazyImage.dataset.src;
                            lazyImage.classList.remove('lazy');
                            lazyImageObserver.unobserve(lazyImage);
                        }
                    }
                });
            });
            
            document.querySelectorAll('img[data-src]').forEach(lazyImage => {
                lazyImageObserver.observe(lazyImage);
            });
        } else {
            const lazyImages = document.querySelectorAll('img[data-src]');
            lazyImages.forEach(img => {
                img.src = img.dataset.src;
                img.classList.remove('lazy');
            });
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new SliderManager();
    new AnimationManager();
    new PerformanceManager();
});

