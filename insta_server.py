from flask import Flask, request, jsonify
from flask_cors import CORS
from instagrapi import Client
from dotenv import load_dotenv
import os, json
import time
import requests
from urllib.parse import urlparse

app = Flask(__name__)
CORS(app)

# .env dosyasını yükle
load_dotenv()
IG_USERNAME = os.getenv("IG_USERNAME")
IG_PASSWORD = os.getenv("IG_PASSWORD")

# session dosyası
SESSION_FILE = "session.json"

cl = Client()

def login():
    """Instagram'a güvenli giriş yapar"""
    if os.path.exists(SESSION_FILE):
        try:
            cl.load_settings(SESSION_FILE)
            # Session'ı test et
            cl.account_info()
            print("🔑 Mevcut session ile giriş yapıldı")
            return True
        except Exception as e:
            print("Session geçersiz, yeniden giriş yapılacak:", e)
            if os.path.exists(SESSION_FILE):
                os.remove(SESSION_FILE)

    try:
        # Yeni login
        cl.login(IG_USERNAME, IG_PASSWORD)
        cl.dump_settings(SESSION_FILE)
        print("✅ Yeni giriş yapıldı ve session kaydedildi")
        return True
    except Exception as e:
        print(f"❌ Login hatası: {e}")
        return False

def test_image_url(url, timeout=5):
    """Görsel URL'inin çalışıp çalışmadığını test eder"""
    try:
        response = requests.head(url, timeout=timeout, allow_redirects=True)
        return response.status_code == 200
    except:
        return False

def get_best_image_url(media):
    """Media objesinden en iyi görsel URL'ini alır"""
    possible_urls = []
    
    # Farklı URL türlerini dene
    if hasattr(media, 'thumbnail_url') and media.thumbnail_url:
        possible_urls.append(media.thumbnail_url)
    
    if hasattr(media, 'display_url') and media.display_url:
        possible_urls.append(media.display_url)
    
    if hasattr(media, 'image_versions2') and media.image_versions2:
        candidates = media.image_versions2.get('candidates', [])
        # En yüksek çözünürlükten düşüğe sırala
        candidates.sort(key=lambda x: x.get('width', 0) * x.get('height', 0), reverse=True)
        for candidate in candidates:
            if candidate.get('url'):
                possible_urls.append(candidate['url'])
    
    # URL'leri test et ve çalışan ilkini döndür
    for url in possible_urls:
        if test_image_url(url):
            print(f"✅ Çalışan URL bulundu: {url[:50]}...")
            return url
        else:
            print(f"❌ URL çalışmıyor: {url[:50]}...")
    
    return None

def get_user_posts(username, count=18):
    """Kullanıcının son postlarını getirir - sadece çalışan görseller"""
    try:
        # Rate limiting için bekleme
        time.sleep(1)
        
        user_id = cl.user_id_from_username(username)
        # Daha fazla media iste ki filtreledikten sonra yeterli sayıda kalsın
        medias = cl.user_medias(user_id, count * 2)  # 2 katı iste
        
        working_urls = []
        total_tested = 0
        
        for media in medias:
            if len(working_urls) >= count:  # Yeterli görsel bulundu
                break
                
            total_tested += 1
            best_url = get_best_image_url(media)
            
            if best_url:
                working_urls.append(best_url)
                print(f"📷 {len(working_urls)}/{count} çalışan görsel bulundu")
            
            # Her 5 media'da bir kısa bekleme
            if total_tested % 5 == 0:
                time.sleep(0.5)
        
        print(f"🎉 Toplam {total_tested} media test edildi, {len(working_urls)} çalışan URL bulundu")
        return working_urls
        
    except Exception as e:
        print(f"❌ Medya çekme hatası: {e}")
        raise e

# Uygulama başlarken login kontrolü
if not login():
    print("❌ Login başarısız! Lütfen .env dosyasını kontrol edin.")

@app.route("/insta_feed")
def insta_feed():
    username = request.args.get("user")
    count = int(request.args.get("count", 12))
    
    if not username:
        return jsonify({"error": "user parametresi gerekli"}), 400
    
    if count > 50:  # Instagram API limiti
        count = 50

    try:
        # Session kontrolü
        try:
            cl.account_info()
        except:
            if not login():
                return jsonify({"error": "Instagram login başarısız"}), 500
        
        print(f"🔍 @{username} için {count} çalışan görsel aranıyor...")
        image_urls = get_user_posts(username, count)
        
        if not image_urls:
            return jsonify({"error": f"@{username} kullanıcısından çalışan görsel alınamadı"}), 404
            
        return jsonify({
            "success": True,
            "username": username,
            "count": len(image_urls),
            "images": image_urls,
            "message": f"{len(image_urls)} çalışan görsel bulundu"
        })
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ API Hatası: {error_msg}")
        
        # Yaygın hataları kullanıcı dostu hale getir
        if "User not found" in error_msg:
            return jsonify({"error": f"@{username} kullanıcısı bulunamadı"}), 404
        elif "Private account" in error_msg:
            return jsonify({"error": f"@{username} hesabı gizli"}), 403
        elif "challenge_required" in error_msg:
            return jsonify({"error": "Instagram güvenlik kontrolü gerekiyor"}), 429
        else:
            return jsonify({"error": f"Bilinmeyen hata: {error_msg}"}), 500

@app.route("/test_images")
def test_images():
    """Debug endpoint - görsellerin durumunu test et"""
    username = request.args.get("user", "driven34")
    
    try:
        user_id = cl.user_id_from_username(username)
        medias = cl.user_medias(user_id, 10)
        
        test_results = []
        for i, media in enumerate(medias):
            best_url = get_best_image_url(media)
            test_results.append({
                "index": i + 1,
                "media_id": str(media.id),
                "url": best_url,
                "working": best_url is not None
            })
        
        return jsonify({
            "username": username,
            "total_medias": len(medias),
            "working_images": len([r for r in test_results if r["working"]]),
            "results": test_results
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/health")
def health_check():
    """Sunucu sağlık kontrolü"""
    try:
        cl.account_info()
        return jsonify({"status": "OK", "instagram": "connected"})
    except:
        return jsonify({"status": "ERROR", "instagram": "disconnected"}), 500

if __name__ == "__main__":
    print("🚀 Flask sunucu başlatılıyor...")
    print("📋 Kullanılabilir endpoint'ler:")
    print("   • /insta_feed?user=USERNAME&count=12")
    print("   • /test_images?user=USERNAME")
    print("   • /health")
    app.run(debug=True, host='127.0.0.1', port=5000)