const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

// AWS Configuration
const s3 = new AWS.S3({
    region: 'us-west-2'
});

const cloudfront = new AWS.CloudFront({
    region: 'us-west-2'
});

// Configuration
const BUCKET_NAME = 'comictrics-web';
const DOMAIN_NAME = 'comictrics.app'; // Replace with your domain
const FILES_TO_UPLOAD = [
    'index.html',
    'privacy.html', 
    'support.html',
    'styles.css',
    'script.js',
    'favicon.ico',
    'assets/comictrics-logo.png'
];

// Helper function to upload file to S3
async function uploadToS3(filePath, key) {
    try {
        const fileContent = fs.readFileSync(filePath);
        const contentType = mime.lookup(filePath) || 'application/octet-stream';
        
        const params = {
            Bucket: BUCKET_NAME,
            Key: key,
            Body: fileContent,
            ContentType: contentType,
            CacheControl: contentType.includes('html') ? 'max-age=300' : 'max-age=86400'
        };
        
        const result = await s3.upload(params).promise();
        console.log(`✅ Uploaded: ${key}`);
        return result;
    } catch (error) {
        console.error(`❌ Failed to upload ${key}:`, error.message);
        throw error;
    }
}

// Create S3 bucket with website configuration
async function createBucket() {
    try {
        // Check if bucket exists
        try {
            await s3.headBucket({ Bucket: BUCKET_NAME }).promise();
            console.log(`✅ Bucket ${BUCKET_NAME} already exists`);
        } catch (error) {
            if (error.statusCode === 404) {
                // Create bucket
                await s3.createBucket({ 
                    Bucket: BUCKET_NAME,
                    CreateBucketConfiguration: {
                        LocationConstraint: 'us-west-2'
                    }
                }).promise();
                console.log(`✅ Created bucket: ${BUCKET_NAME}`);
            } else {
                throw error;
            }
        }
        
        // Configure bucket for static website hosting
        const websiteParams = {
            Bucket: BUCKET_NAME,
            WebsiteConfiguration: {
                IndexDocument: {
                    Suffix: 'index.html'
                },
                ErrorDocument: {
                    Key: 'index.html' // SPA fallback
                }
            }
        };
        
        await s3.putBucketWebsite(websiteParams).promise();
        console.log('✅ Configured bucket for static website hosting');
        
        // Remove public access block to allow public website hosting
        try {
            await s3.deletePublicAccessBlock({ Bucket: BUCKET_NAME }).promise();
            console.log('✅ Removed public access block');
        } catch (error) {
            console.warn('⚠️  Could not remove public access block:', error.message);
        }
        
        // Set bucket policy for public read access
        try {
            const bucketPolicy = {
                Version: '2012-10-17',
                Statement: [
                    {
                        Sid: 'PublicReadGetObject',
                        Effect: 'Allow',
                        Principal: '*',
                        Action: 's3:GetObject',
                        Resource: `arn:aws:s3:::${BUCKET_NAME}/*`
                    }
                ]
            };
            
            await s3.putBucketPolicy({
                Bucket: BUCKET_NAME,
                Policy: JSON.stringify(bucketPolicy)
            }).promise();
            console.log('✅ Set bucket policy for public read access');
        } catch (error) {
            console.warn('⚠️  Could not set public bucket policy:', error.message);
            console.log('💡 You may need to manually configure public access in AWS Console');
        }
        
    } catch (error) {
        console.error('❌ Failed to create/configure bucket:', error.message);
        throw error;
    }
}

// Upload all files
async function uploadFiles() {
    console.log('📤 Uploading files to S3...');
    
    for (const file of FILES_TO_UPLOAD) {
        const filePath = path.join(__dirname, file);
        
        if (fs.existsSync(filePath)) {
            await uploadToS3(filePath, file);
        } else {
            console.warn(`⚠️  File not found: ${filePath}`);
        }
    }
}

// Create CloudFront distribution for CDN
async function createCloudFrontDistribution() {
    try {
        const params = {
            DistributionConfig: {
                CallerReference: `comictrics-web-${Date.now()}`,
                Comment: 'Comictrics website CDN distribution',
                DefaultCacheBehavior: {
                    TargetOriginId: `S3-${BUCKET_NAME}`,
                    ViewerProtocolPolicy: 'redirect-to-https',
                    MinTTL: 0,
                    DefaultTTL: 86400,
                    MaxTTL: 31536000,
                    ForwardedValues: {
                        QueryString: false,
                        Cookies: {
                            Forward: 'none'
                        }
                    },
                    TrustedSigners: {
                        Enabled: false,
                        Quantity: 0,
                        Items: []
                    }
                },
                DefaultRootObject: 'index.html',
                Enabled: true,
                Origins: {
                    Quantity: 1,
                    Items: [
                        {
                            Id: `S3-${BUCKET_NAME}`,
                            DomainName: `${BUCKET_NAME}.s3-website-us-west-2.amazonaws.com`,
                            CustomOriginConfig: {
                                HTTPPort: 80,
                                HTTPSPort: 443,
                                OriginProtocolPolicy: 'http-only'
                            }
                        }
                    ]
                },
                PriceClass: 'PriceClass_100', // Use only North America and Europe edge locations (cheapest)
                CustomErrorResponses: {
                    Quantity: 1,
                    Items: [
                        {
                            ErrorCode: 404,
                            ResponseCode: '200',
                            ResponsePagePath: '/index.html',
                            ErrorCachingMinTTL: 300
                        }
                    ]
                }
            }
        };
        
        const result = await cloudfront.createDistribution(params).promise();
        console.log('✅ CloudFront distribution created:', result.Distribution.DomainName);
        console.log(`📝 Distribution ID: ${result.Distribution.Id}`);
        console.log('⏰ Distribution deployment may take 15-20 minutes to complete');
        
        return result;
    } catch (error) {
        if (error.code === 'CNAMEAlreadyExists') {
            console.log('✅ CloudFront distribution already exists');
            return null;
        }
        console.error('❌ Failed to create CloudFront distribution:', error.message);
        throw error;
    }
}

// Main deployment function
async function deploy() {
    try {
        console.log('🚀 Starting deployment to AWS...');
        console.log(`📍 Region: us-west-2`);
        console.log(`🪣 Bucket: ${BUCKET_NAME}`);
        
        // Step 1: Create and configure S3 bucket
        await createBucket();
        
        // Step 2: Upload files
        await uploadFiles();
        
        // Step 3: Create CloudFront distribution
        const distribution = await createCloudFrontDistribution();
        
        console.log('\n🎉 Deployment completed successfully!');
        console.log('\n📋 Summary:');
        console.log(`   S3 Website URL: http://${BUCKET_NAME}.s3-website-us-west-2.amazonaws.com`);
        if (distribution) {
            console.log(`   CloudFront URL: https://${distribution.Distribution.DomainName}`);
        }
        console.log(`   Files uploaded: ${FILES_TO_UPLOAD.length}`);
        
        console.log('\n💰 Cost Optimization:');
        console.log('   ✅ S3 Standard storage class (cheapest for frequently accessed files)');
        console.log('   ✅ CloudFront PriceClass_100 (North America & Europe only)');
        console.log('   ✅ Proper caching headers set');
        console.log('   ✅ Static website hosting (no compute costs)');
        
        console.log('\n🔗 Next Steps:');
        console.log('   1. Set up custom domain name (optional)');
        console.log('   2. Configure Route 53 for DNS (if using custom domain)');
        console.log('   3. Set up SSL certificate via AWS Certificate Manager (free)');
        console.log('   4. Test the website thoroughly');
        
    } catch (error) {
        console.error('\n❌ Deployment failed:', error.message);
        process.exit(1);
    }
}

// Run deployment if this script is executed directly
if (require.main === module) {
    deploy();
}

module.exports = { deploy, uploadToS3, createBucket, createCloudFrontDistribution };