import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vibe Todos',
    short_name: 'Todos',
    description: 'A cute, gesture-driven todo app',
    start_url: '/',
    display: 'standalone',
    background_color: '#f3f4f6',
    theme_color: '#3b82f6',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      }
    ],
  }
}
