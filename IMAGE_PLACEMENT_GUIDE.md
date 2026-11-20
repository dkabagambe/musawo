# Image Placement Guide - Musawo Training Center

## Overview
29 high-quality professional photos of Musawo staff, classrooms, and training environments have been organized and integrated into the website to better represent the training center's programs and atmosphere.

## Image Organization & Placement

### Home Page (`src/app/(public)/page.tsx`)
- **Medical Home Care Course**: `hero-medical-home-care-1.jpg`
  - Shows professional healthcare training in action
  - Perfect for "For registered health professionals" messaging
  
- **Basic Home Care Course**: `hero-basic-home-care-1.jpg`
  - Demonstrates classroom teaching environment
  - Represents foundational healthcare training
  
- **Babysitting & Childcare Course**: `hero-childcare-1.jpg`
  - Shows safe, professional childcare training
  - Emphasizes child-focused learning
  
- **Mental Health Support Course**: `hero-mental-health-1.jpg`
  - Depicts compassionate healthcare training
  - Represents supportive learning environment
  
- **Care of Older Persons & Disability (Geriatric)**: `hero-geriatric-care-1.jpg`
  - Shows professional healthcare practice
  - Represents specialized care training
  
- **Basic Life Support Course**: `hero-life-support-1.jpg`
  - Demonstrates professional healthcare training
  - Conveys emergency response competency
  
- **Advanced Life Support Course**: `hero-life-support-2.jpg`
  - Shows advanced professional healthcare training
  - Different angle from BLS for visual variety
  
- **First Aid Course**: `hero-first-aid-1.jpg`
  - Depicts hands-on practical training
  - Represents emergency response skills

### Courses Page (`src/app/(public)/courses/page.tsx`)
- **Hero Section**: `hero-training-classroom-1.jpg`
  - Large prominent image at page top
  - Shows classroom teaching in progress
  - Conveys "hybrid classes with hands-on practicals" messaging

### Individual Course Pages (`src/app/(public)/courses/[slug]/page.tsx`)
- Each course detail page uses a specific, relevant image:
  - Medical Home Care: `hero-medical-home-care-1.jpg`
  - Basic Home Care: `hero-basic-home-care-1.jpg`
  - Babysitting & Childcare: `hero-childcare-1.jpg`
  - Mental Health: `hero-mental-health-1.jpg`
  - Geriatric Care: `hero-geriatric-care-1.jpg`
  - Basic Life Support: `hero-life-support-1.jpg`
  - Advanced Life Support: `hero-life-support-2.jpg`
  - First Aid: `hero-first-aid-1.jpg`

### How to Enrol Page (`src/app/(public)/admissions/how-to-enrol/page.tsx`)
- **Hero Section**: `hero-teaching-session-1.jpg`
  - Shows teaching in action
  - Represents the learning journey students will embark on

## Available Images for Future Use

The following images are available for additional placements:
- `hero-training-classroom-1.jpg` - General classroom training
- `hero-training-session-2.jpg` - Teaching/facilitation
- `hero-online-learning-1.jpg` - Computer lab/online learning
- `hero-healthcare-training-1.jpg` - Professional healthcare setting
- `hero-nursing-care-1.jpg` - Nursing/healthcare focus
- `hero-professional-training-1.jpg` - Professional development
- `hero-classroom-session-2.jpg` - Alternative classroom view
- `hero-care-support-1.jpg` - Supportive care environment
- `hero-training-session-3.jpg` - Teaching moments
- `hero-teaching-professionals-1.jpg` - Professional instructors
- `hero-practical-training-1.jpg` - Hands-on practice
- `hero-classroom-discussion-1.jpg` - Interactive learning
- `hero-skills-development-1.jpg` - Skills building
- `hero-learning-environment-1.jpg` - Learning atmosphere
- `hero-training-environment-1.jpg` - Training facilities
- `hero-teaching-moments-1.jpg` - Teaching in action
- `hero-professional-development-1.jpg` - Professional growth

## Additional Course Images (Fallback)
For course listing cards on home page and courses page:
- `hero-medical-home-care-2.jpg` - Alternative image for medical training
- `hero-basic-home-care-2.jpg` - Alternative image for basic care

## Technical Details

### File Format
- All images are in JPG format for optimal file size and compatibility
- Original files averaged 2-5 MB each
- Web optimized for fast loading on mobile and desktop

### Image Characteristics
- Professional photography of actual Musawo staff and facilities
- 6000x4000px or 6000x3376px resolution
- High quality suitable for web and print use
- Authentic representation of training center environment

### Usage Guidelines
1. **Responsive**: Images use Next.js `Image` component with responsive sizing
2. **Lazy Loading**: Images below the fold are lazy-loaded for performance
3. **Art Direction**: Each course gets an image that reflects its focus
4. **Consistency**: All images maintain consistent lighting and professional quality

## Course-Image Mapping Reference

| Course | Slug | Home/Listing | Detail Page |
|--------|------|-------------|------------|
| Medical Home Care | medical-home-caregiver | hero-medical-home-care-1.jpg | hero-medical-home-care-1.jpg |
| Basic Home Care | basic-home-caregiver | hero-basic-home-care-1.jpg | hero-basic-home-care-1.jpg |
| Babysitting & Childcare | babysitting-childcare-safety | hero-childcare-1.jpg | hero-childcare-1.jpg |
| Mental Health | mental-health-support-advocacy | hero-mental-health-1.jpg | hero-mental-health-1.jpg |
| Geriatric Care | care-older-persons-disability | hero-geriatric-care-1.jpg | hero-geriatric-care-1.jpg |
| Basic Life Support | basic-life-support-first-aid | hero-life-support-1.jpg | hero-life-support-1.jpg |
| Advanced Life Support | advanced-life-support | hero-life-support-2.jpg | hero-life-support-2.jpg |
| First Aid | advanced-first-aid | hero-first-aid-1.jpg | hero-first-aid-1.jpg |

## Next Steps (Optional Enhancements)

1. **About Page**: Could use `hero-professional-training-1.jpg` or `hero-healthcare-training-1.jpg`
2. **Impact Page**: Could showcase student learning with relevant images
3. **Resources Page**: Could use `hero-online-learning-1.jpg` for resources section
4. **Blog/News**: Could feature various training images for article headers
5. **Testimonials**: Could add before/after training images
6. **Team Pages**: Could feature individual staff portraits

