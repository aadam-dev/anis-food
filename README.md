# Anis Food and Drink Website

A modern, responsive website for Anis Food and Drink restaurant located in Botwe, Accra, Ghana.

## Features

- 🍽️ **Menu Display**: Browse our delicious menu with categories and search
- 📱 **Mobile-First Design**: Optimized for mobile devices
- 🛒 **Simple Ordering**: Easy-to-use ordering system via WhatsApp
- 📍 **Location Integration**: Google Maps integration
- 📸 **Gallery**: Photo gallery of food and restaurant
- 📱 **Social Media Integration**: Links to Instagram and Facebook
- ⭐ **Testimonials**: Customer reviews and ratings
- 🎨 **Modern UI/UX**: Beautiful design with improved branding

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Fonts**: Inter, Poppins, Playfair Display

## Getting Started

### Prerequisites

- Node.js 20.9.0 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd anis-foods
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
anis-foods/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   │   ├── layout/      # Header, Footer, Navigation
│   │   ├── sections/    # Homepage sections
│   │   ├── menu/         # Menu components
│   │   ├── order/       # Order components
│   │   └── ui/          # Base UI components
│   ├── lib/             # Utilities and data
│   ├── types/           # TypeScript types
│   └── styles/         # Global styles
├── public/              # Static assets
└── docs/                # Documentation
```

## Configuration

### Business Information

Update business details in `src/lib/constants.ts`:
- Phone number
- Address
- Social media links
- Operating hours
- Delivery platform links

### Menu Items

Update menu items in `src/lib/menu-data.ts`:
- Add/remove items
- Update prices
- Modify descriptions
- Add images

### Social Media

Update social media handles in `src/lib/constants.ts`:
- Instagram handle
- Facebook page
- WhatsApp number
- Other platforms

## Building for Production

```bash
npm run build
npm start
```

## Deployment

The site can be deployed to:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **Any Node.js hosting**

### Vercel Deployment

1. Push code to GitHub
2. Import project in Vercel
3. Deploy automatically

## Documentation

See the `docs/` folder for detailed documentation:
- `DESIGN_SYSTEM.md` - Design guidelines and components
- `UX_GUIDELINES.md` - User experience best practices
- `CONTENT_STRATEGY.md` - Content and SEO strategy
- `ORDERING_SYSTEM.md` - Ordering system documentation

## Customization

### Colors

Update colors in `src/styles/globals.css`:
- Primary Red: `#DC2626`
- Accent Orange: `#F97316`
- Success Green: `#10B981`

### Fonts

Fonts are loaded from Google Fonts in `src/app/layout.tsx`:
- Poppins (headings)
- Inter (body)
- Playfair Display (display)

### Logo

Replace logo in `src/components/layout/Header.tsx` or add image to `public/images/logo/`

## Ordering System

The current ordering system:
1. Customers add items to order
2. Fill contact form
3. Submit via WhatsApp
4. Anis receives message and confirms

See `docs/ORDERING_SYSTEM.md` for details and future enhancements.

## Support

For questions or issues, contact:
- Email: [Your email]
- Phone: +233 50 160 0160

## License

[Your License]

## Credits

- Built with Next.js
- Styled with Tailwind CSS
- Icons from Lucide React
