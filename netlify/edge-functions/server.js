const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// مهم: Railway از متغیر PORT استفاده می‌کند
const TARGET_DOMAIN = process.env.TARGET_DOMAIN;

if (!TARGET_DOMAIN) {
  console.error("❌ TARGET_DOMAIN تنظیم نشده است!");
}

app.use(express.raw({ type: '*/*', limit: '10mb' }));

app.all('/*', async (req, res) => {
  if (!TARGET_DOMAIN) {
    return res.status(500).send("خطا: TARGET_DOMAIN تنظیم نشده است.");
  }

  try {
    const targetUrl = TARGET_DOMAIN.replace(/\/$/, "") + req.originalUrl;

    const headers = { ...req.headers };

    // حذف هدرهای مشکل‌ساز
    delete headers['host'];
    delete headers['connection'];
    delete headers['keep-alive'];
    delete headers['transfer-encoding'];
    delete headers['upgrade'];
    // حذف هدرهای Railway و Netlify
    Object.keys(headers).forEach(key => {
      if (key.toLowerCase().startsWith('x-railway-') ||
        key.toLowerCase().startsWith('x-netlify-') ||
        key.toLowerCase().startsWith('cf-')) {
        delete headers[key];
      }
    });

    const fetchOptions = {
      method: req.method,
      headers: headers,
      body: ['GET', 'HEAD'].includes(req.method) ? null : req.body,
      redirect: 'manual'
    };

    const response = await fetch(targetUrl, fetchOptions);

    // ارسال هدرهای پاسخ به کلاینت
    res.status(response.status);
    for (const [key, value] of response.headers) {
      if (key.toLowerCase() !== 'transfer-encoding') {
        res.setHeader(key, value);
      }
    }

    const body = await response.text();
    res.send(body);

  } catch (error) {
    console.error("Relay Error:", error);
    res.status(502).send("Bad Gateway: اتصال به سرور مقصد انجام نشد");
  }
});

// صفحه ساده برای تست
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Relay server running on port ${PORT}`);
  console.log(`TARGET_DOMAIN: ${TARGET_DOMAIN || 'تنظیم نشده!'}`);
});