export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/profile/', '/wallet/', '/settings/', '/verify-email/'],
      },
    ],
    sitemap: 'https://gamevesta.com/sitemap.xml',
  };
}
