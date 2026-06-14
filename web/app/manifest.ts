import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'בקרת כניסה',
    short_name: 'חניה',
    description: 'ניהול הרשאות כניסה לחניה',
    start_url: '/vehicles',
    scope: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#1A4BC3',
    orientation: 'portrait',
    lang: 'he',
    dir: 'rtl',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
