// Instagram API'den JSON olarak aldığımız görselleri sayfaya ekle
const gallery = document.getElementById("insta-gallery");

// Flask server adresi
const API_URL = "http://127.0.0.1:5000/insta_feed?user=driven34&count=18"; // Daha fazla görsel iste

// Loading göstergesi ekle
function showLoading() {
    gallery.innerHTML = '<div class="loading">📷 Instagram görselleri yükleniyor...</div>';
}

// Hata mesajı göster
function showError(message) {
    gallery.innerHTML = `
        <div class="error">
            ❌ Hata: ${message}
            <br><br>
            <button class="reload-btn" onclick="loadInstagramFeed()">🔄 Tekrar Dene</button>
        </div>
    `;
}

// Görsel yükleme test fonksiyonu
function testImageLoad(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
        
        // 10 saniye timeout - uzun süre yüklenmeyen görselleri atla
        setTimeout(() => resolve(false), 10000);
    });
}

// Sadece çalışan görselleri filtrele
async function filterWorkingImages(imageUrls) {
    console.log(`🔍 ${imageUrls.length} görsel test ediliyor...`);
    
    const workingImages = [];
    const batchSize = 5; // Aynı anda 5 görsel test et
    
    for (let i = 0; i < imageUrls.length; i += batchSize) {
        const batch = imageUrls.slice(i, i + batchSize);
        
        // Batch'teki görselleri paralel test et
        const promises = batch.map(async (url) => {
            const isWorking = await testImageLoad(url);
            return { url, isWorking };
        });
        
        const results = await Promise.all(promises);
        
        // Çalışan görselleri ekle
        results.forEach(result => {
            if (result.isWorking) {
                workingImages.push(result.url);
                console.log(`✅ Görsel çalışıyor: ${result.url.substring(0, 50)}...`);
            } else {
                console.log(`❌ Görsel yüklenmiyor: ${result.url.substring(0, 50)}...`);
            }
        });
        
        // Her batch arasında kısa bekleme
        if (i + batchSize < imageUrls.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    console.log(`✅ ${workingImages.length}/${imageUrls.length} görsel başarıyla test edildi`);
    return workingImages;
}

// Başarılı yükleme - sadece çalışan görselleri göster
async function loadImages(data) {
    gallery.innerHTML = '<div class="loading">🔍 Görseller test ediliyor...</div>';
    
    if (!data.images || data.images.length === 0) {
        showError('Görsel bulunamadı');
        return;
    }
    
    // Görselleri filtrele - sadece çalışanları al
    const workingImages = await filterWorkingImages(data.images);
    
    if (workingImages.length === 0) {
        showError('Hiçbir görsel yüklenemedi. Lütfen daha sonra tekrar deneyin.');
        return;
    }
    
    // Galeriyi temizle
    gallery.innerHTML = '';
    
    // Sadece ilk 12 çalışan görseli göster
    const imagesToShow = workingImages.slice(0, 12);
    
    imagesToShow.forEach((url, index) => {
        const imgContainer = document.createElement("div");
        imgContainer.className = "insta-image-container";
        
        const img = document.createElement("img");
        img.src = url;
        img.alt = `@${data.username} - Görsel ${index + 1}`;
        img.loading = "lazy";
        
        // Görsel yükleme animasyonu
        img.style.opacity = '0';
        img.style.transform = 'scale(0.8)';
        
        img.onload = function() {
            // Görsel yüklendiğinde animasyonlu göster
            setTimeout(() => {
                this.style.transition = 'all 0.5s ease';
                this.style.opacity = '1';
                this.style.transform = 'scale(1)';
            }, index * 100);
        };
        
        // Bu noktada görsel zaten test edildi, ama yine de güvenlik için
        img.onerror = function() {
            console.warn('Önceden test edilen görsel yüklenemedi:', url);
            imgContainer.style.display = 'none'; // Gizle
        };
        
        // Click event - modal açma
        img.addEventListener('click', function() {
            const modal = createImageModal(url, `@${data.username} - Görsel ${index + 1}`);
            document.body.appendChild(modal);
        });
        
        imgContainer.appendChild(img);
        gallery.appendChild(imgContainer);
    });
    
    console.log(`🎉 ${imagesToShow.length} çalışan görsel başarıyla yüklendi`);
    
    // Eğer yeterli görsel yoksa, daha fazla iste
    if (workingImages.length < 12 && data.images.length >= 12) {
        console.log('⚠️ Yeterli çalışan görsel yok, daha fazla görsel istenecek...');
    }
}

// Görsel modal'ı oluştur (değişiklik yok)
function createImageModal(imageUrl, title) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = title;
    img.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        border-radius: 8px;
        box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
        transform: scale(0.8);
        transition: transform 0.3s ease;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        font-size: 30px;
        cursor: pointer;
        padding: 10px 15px;
        border-radius: 50%;
        transition: background 0.3s ease;
    `;
    
    closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.3)';
    closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    
    modal.appendChild(img);
    modal.appendChild(closeBtn);
    
    // Modal'ı kapat
    const closeModal = () => {
        modal.style.opacity = '0';
        setTimeout(() => modal.remove(), 300);
    };
    
    modal.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    
    // Escape tuşu ile kapat
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Animasyonu başlat
    setTimeout(() => {
        modal.style.opacity = '1';
        img.style.transform = 'scale(1)';
    }, 10);
    
    return modal;
}

// Ana fonksiyon
async function loadInstagramFeed() {
    try {
        showLoading();
        
        // Sunucu sağlık kontrolü
        const healthCheck = await fetch("http://127.0.0.1:5000/health");
        if (!healthCheck.ok) {
            throw new Error('Sunucu bağlantı hatası');
        }
        
        // Instagram feed'i al
        const response = await fetch(API_URL);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Bilinmeyen hata');
        }
        
        await loadImages(data);
        
    } catch (error) {
        console.error("Instagram API Hatası:", error);
        
        // Kullanıcı dostu hata mesajları
        if (error.message.includes('Failed to fetch')) {
            showError('Flask sunucusu çalışmıyor. Lütfen Python kodunu çalıştırın.');
        } else if (error.message.includes('CORS')) {
            showError('CORS hatası. Flask uygulamasında CORS etkinleştirin.');
        } else {
            showError(error.message);
        }
    }
}

// Manuel test fonksiyonu - konsola çalışan/çalışmayan görselleri yazdır
async function testAllImages() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        if (data.images) {
            console.log('=== GÖRSEL TEST SONUÇLARI ===');
            for (let i = 0; i < data.images.length; i++) {
                const url = data.images[i];
                const isWorking = await testImageLoad(url);
                console.log(`${i + 1}. ${isWorking ? '✅' : '❌'} ${url}`);
            }
        }
    } catch (error) {
        console.error('Test hatası:', error);
    }
}

// Sayfa yüklendiğinde çalıştır
document.addEventListener('DOMContentLoaded', function() {
    // Slider yüklendikten sonra Instagram galeriyi yükle
    setTimeout(loadInstagramFeed, 2000);
});

// Scroll animasyonu
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Gallery section'ı gözlemle
document.addEventListener('DOMContentLoaded', () => {
    const gallerySection = document.getElementById('insta-gallery-section');
    if (gallerySection) {
        gallerySection.style.opacity = '0';
        gallerySection.style.transform = 'translateY(50px)';
        gallerySection.style.transition = 'all 0.8s ease';
        observer.observe(gallerySection);
    }
});

// Debug fonksiyonu - konsolda çalıştır: testAllImages()
window.testAllImages = testAllImages;