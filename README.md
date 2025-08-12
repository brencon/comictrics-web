# Comictrics Website

Marketing website for Comictrics - Comic Book Investment Analytics App

## Overview

This is a modern, responsive marketing website for the Comictrics mobile application. The site features:

- **Modern Design**: Clean, professional UI/UX matching the mobile app's dark theme
- **Responsive Layout**: Optimized for all devices (mobile, tablet, desktop)
- **Performance Optimized**: Fast loading, minimal dependencies
- **SEO Friendly**: Proper meta tags, semantic HTML structure
- **Accessible**: WCAG 2.1 compliant with full keyboard navigation

## Pages

- **Home** (`index.html`) - Marketing landing page with features, pricing, and download links
- **Privacy Policy** (`privacy.html`) - Comprehensive privacy policy based on app's data practices
- **Support** (`support.html`) - Help center with FAQ, troubleshooting, and contact information

## Design System

The website uses the same color palette and design language as the mobile app:

### Colors
- **Primary Background**: `#111827` (Dark slate gray)
- **Secondary Background**: `#1F2937` (Darker gray)
- **Accent Colors**: `#EAB308` (Amber), `#F59E0B` (Orange)
- **Text**: `#F9FAFB` (Off-white), `#E5E7EB` (Light gray)
- **Success**: `#10B981` (Green)
- **Error**: `#EF4444` (Red)

### Typography
- **Font**: Inter (Google Fonts)
- **Responsive sizing**: Adapts to different screen sizes
- **Accessibility**: Supports dynamic text sizing

## Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Serve locally**:
   ```bash
   npm run serve
   ```
   This will start a local server at `http://localhost:3000`

3. **Validate HTML**:
   ```bash
   npm run validate
   ```

## AWS Deployment

The website is optimized for cost-effective hosting on AWS using S3 + CloudFront:

### Architecture
- **S3 Static Website Hosting** - Serves static files
- **CloudFront CDN** - Global content delivery with caching
- **Route 53** (optional) - Custom domain management
- **Certificate Manager** (optional) - Free SSL certificates

### Cost Optimization Features
- S3 Standard storage class (cheapest for active websites)
- CloudFront PriceClass_100 (North America & Europe only)
- Proper caching headers (24hrs for assets, 5min for HTML)
- No compute resources required (static site)

### Deploy to AWS

1. **Configure AWS CLI**:
   Ensure your AWS CLI is configured with appropriate credentials and permissions:
   ```bash
   aws configure
   ```

2. **Deploy the website**:
   ```bash
   npm run deploy
   ```

   This script will:
   - Create an S3 bucket for website hosting
   - Upload all files with proper content types and caching headers
   - Create a CloudFront distribution for global CDN
   - Configure proper error pages for SPA behavior

3. **Deployment Output**:
   The script will provide:
   - S3 website URL: `http://comictrics-web.s3-website-us-west-2.amazonaws.com`
   - CloudFront URL: `https://{distribution-id}.cloudfront.net`
   - Distribution ID for future management

### Custom Domain Setup (Optional)

To use a custom domain (e.g., `comictrics.app`):

1. **Register domain** in Route 53 or transfer existing domain
2. **Request SSL certificate** in AWS Certificate Manager (free)
3. **Update CloudFront distribution** to use custom domain and SSL
4. **Create Route 53 records** pointing to CloudFront distribution

## File Structure

```
comictrics-web/
├── index.html          # Homepage - marketing and features
├── privacy.html        # Privacy policy page
├── support.html        # Support and help center
├── styles.css          # Main stylesheet
├── script.js           # Interactive functionality
├── favicon.ico         # Website icon
├── assets/
│   └── comictrics-logo.png  # App logo
├── package.json        # Node.js dependencies and scripts
├── deploy-aws.js       # AWS deployment script
└── README.md           # This file
```

## Browser Support

- **Modern browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile browsers**: iOS Safari 14+, Chrome Mobile 90+
- **Accessibility**: Screen readers, keyboard navigation, high contrast mode

## Performance

- **Page Load**: < 2 seconds on 3G
- **Lighthouse Score**: 90+ for Performance, Accessibility, Best Practices, SEO
- **Image Optimization**: Compressed logos and assets
- **CSS/JS**: Minified and optimized for production

## Security

- **HTTPS Only**: CloudFront enforces HTTPS redirects
- **Content Security Policy**: Prevents XSS attacks
- **No Inline Scripts**: Secure script loading
- **CORS Headers**: Proper cross-origin restrictions

## Maintenance

### Updating Content
1. Edit the HTML files locally
2. Test using `npm run serve`
3. Deploy changes using `npm run deploy`

### Analytics (Optional)
Consider adding Google Analytics 4 or similar for tracking:
- Page views and user behavior
- Download button clicks
- Support page usage

### Monitoring
- **CloudWatch**: Monitor S3 and CloudFront metrics
- **AWS Cost Explorer**: Track hosting costs
- **CloudFront Reports**: Analyze CDN performance

## Cost Estimate

Monthly costs for typical traffic (estimate):

- **S3 Storage**: ~$0.50 (for website files)
- **S3 Requests**: ~$0.10 (for file access)
- **CloudFront**: ~$1.00 (for CDN distribution)
- **Route 53**: ~$0.50 (if using custom domain)

**Total**: ~$2-3 per month for a marketing website

## Support

For questions about the website or deployment:

- **Technical Issues**: Check AWS CloudWatch logs
- **Content Updates**: Edit HTML files and redeploy
- **Cost Optimization**: Monitor AWS Cost Explorer

## License

Private - Copyright 2025 Comic Indexer. All rights reserved.