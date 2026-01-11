# Design System Documentation

## Color Palette

### Primary Colors
- **Primary Red**: `#DC2626` (rgb(220, 38, 38))
  - Used for: Primary buttons, links, accents, brand elements
  - Hover: `#B91C1C` (darker shade)
  
- **Accent Orange**: `#F97316` (rgb(249, 115, 22))
  - Used for: Secondary buttons, logo spoon icon, highlights
  - Hover: `#EA580C` (darker shade)

### Neutral Colors
- **Neutral Black**: `#1F2937` (rgb(31, 41, 55))
  - Used for: Text, logo text, dark elements

- **Background White**: `#FFFFFF` (rgb(255, 255, 255))
  - Used for: Main background, cards

- **Background Light**: `#F9FAFB` (rgb(249, 250, 251))
  - Used for: Section backgrounds, subtle backgrounds

### Accent Colors
- **Success/CTA Green**: `#10B981` (rgb(16, 185, 129))
  - Used for: Order buttons, success states, popular badges
  - Hover: `#059669` (darker shade)

### Gradients
- **Hero Gradient**: `from-[#DC2626] to-[#F97316]`
  - Used for: Hero sections, call-to-action backgrounds

## Typography

### Font Families

#### Headings
- **Font**: Poppins
- **Weights**: 400, 500, 600, 700, 800, 900
- **Usage**: All headings (h1-h6), navigation items, buttons
- **CSS Variable**: `--font-heading`

#### Body Text
- **Font**: Inter
- **Weights**: 300, 400, 500, 600, 700, 800, 900
- **Usage**: Body text, paragraphs, descriptions
- **CSS Variable**: `--font-body`

#### Display Font
- **Font**: Playfair Display
- **Weights**: 400, 500, 600, 700
- **Usage**: Special headings, hero text, decorative text
- **CSS Variable**: `--font-display`
- **Class**: `.display-font`

### Type Scale

- **H1**: 4xl (2.25rem) / 5xl (3rem) / 6xl (3.75rem) - Hero headings
- **H2**: 3xl (1.875rem) / 4xl (2.25rem) - Section headings
- **H3**: 2xl (1.5rem) - Subsection headings
- **H4**: xl (1.25rem) - Card titles
- **Body**: base (1rem) - Default text
- **Small**: sm (0.875rem) - Captions, labels

## Spacing System

Using Tailwind's default spacing scale (4px base unit):
- **xs**: 0.5rem (8px)
- **sm**: 0.75rem (12px)
- **base**: 1rem (16px)
- **md**: 1.5rem (24px)
- **lg**: 2rem (32px)
- **xl**: 3rem (48px)
- **2xl**: 4rem (64px)

## Component Library

### Buttons

#### Variants
- **Primary**: Red background (`#DC2626`), white text
- **Secondary**: Orange background (`#F97316`), white text
- **Outline**: Red border, red text, transparent background
- **Ghost**: Transparent background, red text
- **Success**: Green background (`#10B981`), white text

#### Sizes
- **sm**: px-4 py-2 text-sm
- **md**: px-6 py-3 text-base (default)
- **lg**: px-8 py-4 text-lg

### Cards
- **Background**: White
- **Border Radius**: xl (0.75rem)
- **Shadow**: md (default), xl (hover)
- **Padding**: p-6 (default), p-8 (large)

### Input Fields
- **Border**: Gray-300
- **Focus**: Red ring (`#DC2626`)
- **Border Radius**: lg (0.5rem)
- **Padding**: px-4 py-3

## Logo Usage

### Logo Structure
- **Text**: "anis" in lowercase, bold black font
- **Icon**: Orange spoon replacing the dot of 'i'
- **Banner**: Red banner with "FOOD AND DRINK" in white

### Logo Guidelines
- Minimum size: 120px width
- Maintain aspect ratio
- Use on white or light backgrounds
- Ensure sufficient contrast

## Responsive Breakpoints

- **sm**: 640px (mobile landscape)
- **md**: 768px (tablet)
- **lg**: 1024px (desktop)
- **xl**: 1280px (large desktop)
- **2xl**: 1536px (extra large)

## Accessibility

### Color Contrast
- All text meets WCAG AA standards (4.5:1 minimum)
- Interactive elements have clear focus states
- Error states use red with sufficient contrast

### Interactive Elements
- Minimum touch target: 44x44px
- Clear hover and focus states
- Keyboard navigation support

## Animation & Transitions

### Standard Transitions
- **Duration**: 200ms (default)
- **Easing**: ease-in-out
- **Properties**: colors, transforms, shadows

### Hover Effects
- Buttons: Background color change, slight scale
- Cards: Shadow increase, slight lift (translate-y)
- Links: Color change, underline

