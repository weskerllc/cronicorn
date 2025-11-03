# @cronicorn/content

Centralized brand content, messaging, and configuration for Cronicorn.

**Single source of truth** for all marketing content, FAQs, SEO metadata, and brand messaging consumed by both the web app and docs site.

## Purpose

This package ensures consistency across all Cronicorn properties by:
- Centralizing brand messaging and taglines
- Maintaining a single FAQ source
- Managing SEO keywords and meta descriptions
- Defining feature descriptions
- Storing pricing tiers
- Organizing all URLs

## Usage

### In Web App

```typescript
import { brand, faq, seo } from '@cronicorn/content';

// Use in components
<h1>{brand.headlines.hero.primary}</h1>
<meta name="description" content={seo.metaDescriptions.home} />

// Display FAQs
{faq.map(item => (
  <FAQItem question={item.question} answer={item.answer} />
))}
```

### In Docs App

```typescript
import { brand, features, urls } from '@cronicorn/content';

// Use in MDX files or components
export const tagline = brand.tagline;
export const coreFeatures = features.core;
```

## Structure

- `brand.ts` - Core brand identity, taglines, headlines, value props
- `faq.ts` - FAQ items with categories and helper functions
- `seo.ts` - Keywords, meta descriptions, OpenGraph config
- `features.ts` - Product features and capabilities
- `urls.ts` - All internal and external URLs
- `pricing.ts` - Pricing tiers and features

## Modular Imports

Import only what you need:

```typescript
import { brand } from '@cronicorn/content/brand';
import { faq } from '@cronicorn/content/faq';
import { seo } from '@cronicorn/content/seo';
```

## Updating Content

1. Edit the appropriate file in `src/`
2. Changes automatically propagate to both apps
3. Commit with clear message about what changed

## Type Safety

All exports are strongly typed and use `as const` for maximum type inference.

```typescript
// TypeScript knows the exact values
brand.headlines.hero.primary; // Type: "Never Miss the Perfect Moment to Run Your Code"
```

## Benefits

✅ **Single source of truth** - Update once, changes everywhere  
✅ **Type-safe** - Catch errors at compile time  
✅ **Consistent messaging** - No more out-of-sync content  
✅ **Easy maintenance** - One place to update content  
✅ **Version controlled** - Track all content changes  

## License

Internal package - part of Cronicorn monorepo
