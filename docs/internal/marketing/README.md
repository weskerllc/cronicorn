# Internal Marketing Documentation

This directory contains internal strategy documents, guidelines, and blueprints for the Cronicorn marketing team.

## Purpose

These documents guide:
- Brand voice and messaging
- SEO strategy and keywords
- Content creation process
- Marketing campaigns

## Documents

- **[Brand Voice](./brand-voice.md)** - Voice pillars, tone guidelines, messaging framework
- **[SEO Strategy](./seo-strategy.md)** - Keywords, content plan, 6-month roadmap
- **[Marketing Overview](./overview.md)** - Complete marketing strategy and quick start
- **[Copy Cheatsheet](./copy-cheatsheet.md)** - Quick reference for messaging elements
- **[Page Blueprints](./page-blueprints.md)** - Detailed landing page content structure

## Usage

### For Marketing Team
1. Review brand voice before writing any content
2. Reference SEO strategy for keyword targeting
3. Use copy cheatsheet for consistent messaging
4. Follow page blueprints for landing page updates

### For Developers
1. Content implementation lives in `@cronicorn/content` package
2. These docs guide WHAT to write, not WHERE to put it
3. When adding new content, update both strategy docs AND content package

## Visibility

**Status:** Internal only (not in public sidebar)

These docs are version controlled but not displayed in the public documentation navigation. They serve as reference material for the team.

## Updating

When making strategy changes:
1. Update relevant markdown files here
2. Update `@cronicorn/content` package if content changes
3. Communicate changes to team
4. Document in git commit message

## Related

- Implementation: `/packages/content/`
- Public docs: `/apps/docs/docs/` (other directories)
- Web app: `/apps/web/`
