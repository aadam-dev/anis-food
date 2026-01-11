# UX Guidelines

## User Journey Maps

### Primary User Journey: Ordering Food

1. **Discovery**
   - User lands on homepage
   - Sees hero section with clear value proposition
   - Views popular dishes preview

2. **Exploration**
   - Clicks "View Menu" or navigates to menu page
   - Browses categories (Rice, Noodles, etc.)
   - Searches for specific items
   - Views item details (description, price)

3. **Selection**
   - Adds items to order
   - Reviews order summary
   - Adjusts quantities if needed

4. **Order Placement**
   - Fills contact form (name, phone, address)
   - Selects delivery or pickup
   - Reviews order total
   - Submits via WhatsApp

5. **Confirmation**
   - Receives confirmation message
   - Waits for restaurant confirmation call
   - Receives order

### Secondary Journey: Finding Information

1. **Location Discovery**
   - User wants to visit restaurant
   - Navigates to Contact page
   - Views map and address
   - Gets directions

2. **About Exploration**
   - User wants to know more
   - Visits About page
   - Reads story and values
   - Builds trust

## Interaction Patterns

### Navigation
- **Desktop**: Horizontal navigation in header
- **Mobile**: Hamburger menu with slide-out
- **Sticky Header**: Always accessible
- **Active State**: Red underline for current page

### Search & Filter
- **Menu Page**: Category tabs + search bar
- **Real-time Filtering**: Instant results as user types
- **Clear Indicators**: Show active category

### Forms
- **Validation**: Real-time error messages
- **Required Fields**: Clearly marked with asterisk
- **Helpful Placeholders**: Guide user input
- **Success Feedback**: Confirmation messages

### Ordering Flow
- **Add to Cart**: Simple one-click addition
- **Order Summary**: Always visible when items added
- **Quantity Control**: Easy increment/decrement
- **Remove Items**: Clear delete option

## Mobile-First Approach

### Design Principles
1. **Touch-Friendly**: All interactive elements ≥44x44px
2. **Thumb Zone**: Important actions in easy reach
3. **Simplified Navigation**: Bottom navigation for key actions
4. **Optimized Images**: Compressed for mobile data
5. **Fast Loading**: Critical content loads first

### Mobile Optimizations
- **Responsive Images**: Next.js Image component
- **Lazy Loading**: Below-fold content loads on scroll
- **Progressive Enhancement**: Works without JavaScript
- **Offline Support**: Basic functionality available offline

## Performance Targets

### Core Web Vitals
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### Loading Times
- **Initial Load**: < 3s on 3G
- **Page Navigation**: < 1s
- **Image Load**: Progressive loading

### Optimization Strategies
- Code splitting by route
- Image optimization (WebP format)
- Font subsetting
- CSS minification
- JavaScript bundling

## Accessibility Checklist

### WCAG 2.1 Level AA Compliance

#### Perceivable
- ✅ Text alternatives for images
- ✅ Captions for media (if applicable)
- ✅ Sufficient color contrast (4.5:1)
- ✅ Text resizable up to 200%
- ✅ Content structure with headings

#### Operable
- ✅ Keyboard accessible
- ✅ No content that causes seizures
- ✅ Navigable with clear focus indicators
- ✅ Input assistance (labels, errors)
- ✅ Consistent navigation

#### Understandable
- ✅ Readable text (language defined)
- ✅ Predictable functionality
- ✅ Input assistance (error identification)

#### Robust
- ✅ Valid HTML
- ✅ Compatible with assistive technologies

### Keyboard Navigation
- Tab through interactive elements
- Enter/Space to activate buttons
- Escape to close modals
- Arrow keys for carousels

### Screen Reader Support
- Semantic HTML elements
- ARIA labels where needed
- Alt text for images
- Form labels properly associated

## User Feedback

### Loading States
- Skeleton screens for content loading
- Progress indicators for forms
- Spinner for async operations

### Success States
- Confirmation messages
- Visual feedback (checkmarks)
- Clear next steps

### Error States
- Inline error messages
- Helpful error descriptions
- Recovery suggestions

### Empty States
- Helpful messages
- Clear call-to-action
- Guidance on next steps

## Social Proof Integration

### Testimonials
- Rotating carousel on homepage
- Star ratings displayed
- Customer names and dates
- Authentic reviews

### Social Media
- Embedded feeds (when available)
- Social sharing buttons
- Follow links prominently displayed
- Real-time updates

### Trust Indicators
- Hygiene standards mentioned
- Quality guarantees
- Customer satisfaction highlights
- Years in business (if applicable)

