// Enhanced AWS Deployment Script for Comictrics
// Includes SEO optimization, CloudFront CDN, and analytics setup

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const { ComictricsCloudWatch } = require('./aws-cloudwatch-config');

// Configure AWS
AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3();
const cloudfront = new AWS.CloudFront();
const cloudWatch = new ComictricsCloudWatch();

class ComictricsDeployer {
    constructor() {
        this.bucketName = process.env.S3_BUCKET || 'comictrics-web';
        this.distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID || 'E15LH122NSBXHW';
        this.domain = 'comictrics.com';
        
        this.seoFiles = [
            'sitemap.xml',
            'robots.txt',
            'favicon.ico'
        ];
        
        this.htmlFiles = [
            'index.html',
            'about.html',
            'privacy.html',
            'support.html',
            'copyright.html'
        ];
        
        this.assetOptimization = {
            '.html': { 
                cacheControl: 'public, max-age=3600, must-revalidate',
                contentType: 'text/html; charset=utf-8'
            },
            '.css': { 
                cacheControl: 'public, max-age=31536000, immutable',
                contentType: 'text/css; charset=utf-8'
            },
            '.js': { 
                cacheControl: 'public, max-age=31536000, immutable',
                contentType: 'application/javascript; charset=utf-8'
            },
            '.png': { 
                cacheControl: 'public, max-age=31536000, immutable',
                contentType: 'image/png'
            },
            '.jpg': { 
                cacheControl: 'public, max-age=31536000, immutable',
                contentType: 'image/jpeg'
            },
            '.ico': { 
                cacheControl: 'public, max-age=31536000, immutable',
                contentType: 'image/x-icon'
            },
            '.xml': { 
                cacheControl: 'public, max-age=3600',
                contentType: 'application/xml; charset=utf-8'
            },
            '.txt': { 
                cacheControl: 'public, max-age=3600',
                contentType: 'text/plain; charset=utf-8'
            }
        };
    }

    async deploy() {
        console.log('🚀 Starting Comictrics deployment with SEO optimization...');
        
        try {
            // 1. Validate configuration
            await this.validateConfig();
            
            // 2. Setup CloudWatch monitoring
            await this.setupMonitoring();
            
            // 3. Upload files with optimization
            await this.uploadFiles();
            
            // 4. Configure S3 for SEO
            await this.configureBucketForSEO();
            
            // 5. Invalidate CloudFront cache
            if (this.distributionId) {
                await this.invalidateCloudFront();
            }
            
            // 6. Verify deployment
            await this.verifyDeployment();
            
            console.log('✅ Deployment completed successfully!');
            console.log(`🌐 Website: https://${this.domain}`);
            
        } catch (error) {
            console.error('❌ Deployment failed:', error);
            process.exit(1);
        }
    }

    async validateConfig() {
        console.log('🔍 Validating configuration...');
        
        // AWS SDK will automatically use credentials from:
        // 1. Environment variables
        // 2. Shared credentials file (~/.aws/credentials)
        // 3. IAM roles (for EC2/Lambda)
        // No need to explicitly check for env vars
        
        try {
            await s3.headBucket({ Bucket: this.bucketName }).promise();
            console.log(`✅ S3 bucket ${this.bucketName} accessible`);
        } catch (error) {
            throw new Error(`S3 bucket ${this.bucketName} not accessible: ${error.message}`);
        }
    }

    async setupMonitoring() {
        console.log('📊 Setting up CloudWatch monitoring...');
        
        try {
            await cloudWatch.createDashboard();
            await cloudWatch.createAlarms();
            console.log('✅ CloudWatch monitoring configured');
        } catch (error) {
            console.warn('⚠️ Failed to setup monitoring:', error.message);
        }
    }

    async uploadFiles() {
        console.log('📤 Uploading files with SEO optimization...');
        
        const files = await this.getFilesToUpload();
        const uploadPromises = files.map(file => this.uploadFile(file));
        
        await Promise.all(uploadPromises);
        console.log(`✅ Uploaded ${files.length} files`);
    }

    async getFilesToUpload() {
        const files = [];
        
        const addFiles = (dir, prefix = '') => {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const relativePath = path.join(prefix, item);
                
                if (fs.statSync(fullPath).isDirectory()) {
                    // Skip node_modules and other unnecessary directories
                    if (!['node_modules', '.git', '.claude'].includes(item)) {
                        addFiles(fullPath, relativePath);
                    }
                } else {
                    // Skip unnecessary files
                    if (!['package.json', 'package-lock.json', 'deploy-aws.js', 'aws-cloudwatch-config.js', 'README.md'].includes(item)) {
                        files.push({
                            local: fullPath,
                            remote: relativePath.replace(/\\/g, '/')
                        });
                    }
                }
            }
        };
        
        addFiles(process.cwd());
        return files;
    }

    async uploadFile(file) {
        const ext = path.extname(file.local).toLowerCase();
        const optimization = this.assetOptimization[ext] || {
            cacheControl: 'public, max-age=3600',
            contentType: mime.lookup(file.local) || 'application/octet-stream'
        };
        
        const content = fs.readFileSync(file.local);
        
        const params = {
            Bucket: this.bucketName,
            Key: file.remote,
            Body: content,
            ContentType: optimization.contentType,
            CacheControl: optimization.cacheControl
            // Removed ACL: 'public-read' - use CloudFront for public access instead
        };
        
        // Add specific optimizations for HTML files
        if (ext === '.html') {
            // Add security headers
            params.Metadata = {
                'x-frame-options': 'DENY',
                'x-content-type-options': 'nosniff',
                'x-xss-protection': '1; mode=block',
                'referrer-policy': 'strict-origin-when-cross-origin'
            };
            
            // Ensure HTML is minified for production (basic)
            if (process.env.NODE_ENV === 'production') {
                params.Body = content.toString()
                    .replace(/>\s+</g, '><')  // Remove whitespace between tags
                    .replace(/\s+/g, ' ')     // Normalize whitespace
                    .trim();
            }
        }
        
        try {
            await s3.upload(params).promise();
            console.log(`✅ Uploaded: ${file.remote}`);
        } catch (error) {
            console.error(`❌ Failed to upload ${file.remote}:`, error.message);
            throw error;
        }
    }

    async configureBucketPolicy() {
        console.log('🔧 Configuring bucket policy for CloudFront...');
        
        const bucketPolicy = {
            Version: '2012-10-17',
            Statement: [
                {
                    Sid: 'AllowCloudFrontServicePrincipal',
                    Effect: 'Allow',
                    Principal: {
                        Service: 'cloudfront.amazonaws.com'
                    },
                    Action: 's3:GetObject',
                    Resource: `arn:aws:s3:::${this.bucketName}/*`,
                    Condition: {
                        StringEquals: {
                            'AWS:SourceArn': `arn:aws:cloudfront::565393049490:distribution/${this.distributionId}`
                        }
                    }
                },
                {
                    Sid: 'AllowPublicReadForSEO',
                    Effect: 'Allow',
                    Principal: '*',
                    Action: 's3:GetObject',
                    Resource: [
                        `arn:aws:s3:::${this.bucketName}/robots.txt`,
                        `arn:aws:s3:::${this.bucketName}/sitemap.xml`,
                        `arn:aws:s3:::${this.bucketName}/favicon.ico`
                    ]
                }
            ]
        };
        
        try {
            await s3.putBucketPolicy({
                Bucket: this.bucketName,
                Policy: JSON.stringify(bucketPolicy)
            }).promise();
            console.log('✅ Bucket policy configured for CloudFront and SEO');
        } catch (error) {
            console.warn('⚠️ Could not configure bucket policy:', error.message);
        }
    }

    async configureBucketForSEO() {
        console.log('🔧 Configuring S3 bucket for SEO and CloudFront access...');
        
        // First, ensure bucket blocks public access (security best practice)
        try {
            await s3.putPublicAccessBlock({
                Bucket: this.bucketName,
                PublicAccessBlockConfiguration: {
                    BlockPublicAcls: true,
                    IgnorePublicAcls: true,
                    BlockPublicPolicy: false,  // Allow bucket policy for CloudFront
                    RestrictPublicBuckets: false  // Allow CloudFront access
                }
            }).promise();
            console.log('✅ Public access block configured');
        } catch (error) {
            console.warn('⚠️ Could not configure public access block:', error.message);
        }
        
        // Configure bucket policy for CloudFront Origin Access Identity
        await this.configureBucketPolicy();
        
        // Website configuration
        const websiteConfig = {
            Bucket: this.bucketName,
            WebsiteConfiguration: {
                IndexDocument: { Suffix: 'index.html' },
                ErrorDocument: { Key: 'index.html' }, // SPA routing
                RoutingRules: [
                    {
                        Condition: { HttpErrorCodeReturnedEquals: '404' },
                        Redirect: { ReplaceKeyWith: 'index.html' }
                    }
                ]
            }
        };
        
        await s3.putBucketWebsite(websiteConfig).promise();
        
        // CORS configuration for analytics
        const corsConfig = {
            Bucket: this.bucketName,
            CORSConfiguration: {
                CORSRules: [{
                    AllowedHeaders: ['*'],
                    AllowedMethods: ['GET', 'HEAD'],
                    AllowedOrigins: [`https://${this.domain}`, `https://www.${this.domain}`],
                    MaxAgeSeconds: 3600
                }]
            }
        };
        
        await s3.putBucketCors(corsConfig).promise();
        
        console.log('✅ S3 bucket configured for SEO');
    }

    async invalidateCloudFront() {
        console.log('🔄 Invalidating CloudFront cache...');
        
        const params = {
            DistributionId: this.distributionId,
            InvalidationBatch: {
                Paths: {
                    Quantity: 1,
                    Items: ['/*']
                },
                CallerReference: `deployment-${Date.now()}`
            }
        };
        
        try {
            const result = await cloudfront.createInvalidation(params).promise();
            console.log(`✅ CloudFront invalidation created: ${result.Invalidation.Id}`);
        } catch (error) {
            console.warn('⚠️ Failed to invalidate CloudFront:', error.message);
        }
    }

    async verifyDeployment() {
        console.log('🔍 Verifying deployment...');
        
        const verifications = [
            this.verifySEOFiles(),
            this.verifyHTMLFiles(),
            this.verifyAssets()
        ];
        
        await Promise.all(verifications);
        console.log('✅ Deployment verification completed');
    }

    async verifySEOFiles() {
        console.log('🔍 Verifying SEO files...');
        
        for (const file of this.seoFiles) {
            try {
                await s3.headObject({
                    Bucket: this.bucketName,
                    Key: file
                }).promise();
                console.log(`✅ SEO file verified: ${file}`);
            } catch (error) {
                throw new Error(`SEO file missing: ${file}`);
            }
        }
    }

    async verifyHTMLFiles() {
        console.log('🔍 Verifying HTML files...');
        
        for (const file of this.htmlFiles) {
            try {
                const object = await s3.getObject({
                    Bucket: this.bucketName,
                    Key: file
                }).promise();
                
                const content = object.Body.toString();
                
                // Verify essential SEO elements
                const checks = [
                    { name: 'Title tag', regex: /<title>.*<\/title>/i },
                    { name: 'Meta description', regex: /<meta name="description"/i },
                    { name: 'Open Graph', regex: /<meta property="og:/i },
                    { name: 'Twitter Card', regex: /<meta property="twitter:/i },
                    { name: 'Structured data', regex: /<script type="application\/ld\+json">/i }
                ];
                
                for (const check of checks) {
                    if (!check.regex.test(content)) {
                        throw new Error(`${file} missing ${check.name}`);
                    }
                }
                
                console.log(`✅ HTML file verified: ${file}`);
            } catch (error) {
                throw new Error(`HTML verification failed for ${file}: ${error.message}`);
            }
        }
    }

    async verifyAssets() {
        console.log('🔍 Verifying assets...');
        
        const assetFiles = ['assets/comictrics-logo.png', 'favicon.ico', 'styles.css', 'script.js', 'analytics.js'];
        
        for (const file of assetFiles) {
            try {
                await s3.headObject({
                    Bucket: this.bucketName,
                    Key: file
                }).promise();
                console.log(`✅ Asset verified: ${file}`);
            } catch (error) {
                throw new Error(`Asset missing: ${file}`);
            }
        }
    }
}

// CLI execution
if (require.main === module) {
    const deployer = new ComictricsDeployer();
    deployer.deploy().catch(error => {
        console.error('Deployment failed:', error);
        process.exit(1);
    });
}

module.exports = { ComictricsDeployer };