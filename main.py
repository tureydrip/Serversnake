import os
from flask import Flask, request, jsonify
import yt_dlp
import requests

app = Flask(__name__)

def is_tiktok(u):
    return "tiktok.com" in u or "vm.tiktok.com" in u

def tiktok_via_tikwm(url):
    """Extrae el link directo de TikWM sin marca de agua"""
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    try:
        r = requests.get("https://www.tikwm.com/api/", params={"url": url}, headers=headers, timeout=10)
        data = r.json()
        if data.get("data"):
            return data["data"].get("play") or data["data"].get("wmplay")
    except Exception as e:
        print("Error TikWM:", e)
    return None

@app.route('/api/extract', methods=['POST'])
def extract_video():
    data = request.json
    if not data or 'url' not in data:
        return jsonify({"error": "Falta la URL"}), 400

    url = data['url']

    # Lógica rápida para TikTok
    if is_tiktok(url):
        direct_link = tiktok_via_tikwm(url)
        if direct_link:
            return jsonify({"status": "success", "direct_url": direct_link, "title": "TikTok_Video"})

    # yt-dlp para Facebook, Instagram, YouTube, etc. (Solo extrae URL, no descarga)
    try:
        ydl_opts = {
            'format': 'best',
            'quiet': True,
            'no_warnings': True,
            'simulate': True # Clave: No descarga el archivo
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return jsonify({
                "status": "success", 
                "direct_url": info['url'],
                "title": info.get('title', 'Video_Descargado')
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
