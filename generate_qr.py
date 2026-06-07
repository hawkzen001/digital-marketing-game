import qrcode
url = "https://idemi-dm-gamification.web.app/digital-marketer.apk"
img = qrcode.make(url)
img.save("/Users/nileshsharma/.gemini/antigravity-ide/brain/44629a27-a669-46dd-b6a1-e0a1ae0146d6/apk_qr_code.png")
print("QR Code generated.")
