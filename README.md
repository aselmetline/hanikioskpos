# Hani Kiosk POS

أنشئ تطبيق ويب PWA سريع لنقاط البيع (POS) مستوحى من MicroPOS، مخصص لكشك متعدد الخدمات في تونس يبيع منتجات يومية (حليب، خبز، مشروبات، تبغ، لوازم مدرسية)، زيوت (Shell Advance 2T)، يقدم دفع فواتير، تحويل أموال، شحن هواتف، وتوصيل عبر واتساب.

الميزات الرئيسية (حد أدنى للسرعة):
1. شاشة رئيسية: إضافة منتجات بسرعة (بحث بباركود/صورة/اسم، أسعار، كميات)، سلة مشتريات، حساب إجمالي مع ضريبة (19% TVA)، خصومات، دفع نقدي/آجل.
2. إدارة مخزون: قائمة منتجات بسيطة (إضافة/تحديث/حذف، تنبيهات مخزون منخفض)، دعم صور وباركود.
3. عملاء وولاء: تسجيل عملاء سريع (اسم، رقم هاتف، نقاط HaniWafa)، تتبع رصيد آجل ونقاط.
4. تقارير يومية: مبيعات، صندوق، أرباح، تصدير PDF أو مشاركة واتساب.
5. إعدادات: شعار Hani Kiosk، طابعة 58mm، دعم عملات TND، وضع غير متصل.
6. تكامل: زر طلب توصيل عبر واتساب، QR لتسجيل عملاء.

التصميم (سريع وبديهي):
- UI عربي/فرنسي، ألوان أزرق/أخضر (علامة Hani)، خطوط كبيرة للموبايل (شاشات صغيرة).
- تخطيط بسيط: شريط سفلي (بيع، مخزون، عملاء، تقارير)، أزرار كبيرة، دعم لمس.
- سرعة: تحميل فوري، تخزين محلي (IndexedDB)، PWA للتثبيت.

اجعله جاهزًا للعمل في دقائق، مع قاعدة بيانات Firebase افتراضية، وزر "نشر سريع". ركز على الأداء العالي للكشكات في المناطق ذات الإنترنت الضعيف.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://hanikioskpos.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/69fa48a7-f003-4e5b-b602-c5bca7bd1aa7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
