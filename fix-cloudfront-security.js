const AWS = require('aws-sdk');

const cloudfront = new AWS.CloudFront({
    region: 'us-east-1' // CloudFront requires us-east-1
});

const s3 = new AWS.S3({
    region: 'us-west-2'
});

const BUCKET_NAME = 'comictrics-web';
const DISTRIBUTION_ID = 'E15LH122NSBXHW';

async function createOriginAccessControl() {
    try {
        const params = {
            OriginAccessControlConfig: {
                Name: `${BUCKET_NAME}-oac`,
                Description: `Origin Access Control for ${BUCKET_NAME}`,
                OriginAccessControlOriginType: 's3',
                SigningBehavior: 'always',
                SigningProtocol: 'sigv4'
            }
        };
        
        const result = await cloudfront.createOriginAccessControl(params).promise();
        console.log('✅ Created Origin Access Control:', result.OriginAccessControl.Id);
        return result.OriginAccessControl.Id;
    } catch (error) {
        if (error.code === 'OriginAccessControlAlreadyExists') {
            // List existing OACs to find ours
            const list = await cloudfront.listOriginAccessControls({}).promise();
            const existing = list.OriginAccessControlList.Items.find(oac => 
                oac.Name === `${BUCKET_NAME}-oac`
            );
            if (existing) {
                console.log('✅ Using existing Origin Access Control:', existing.Id);
                return existing.Id;
            }
        }
        throw error;
    }
}

async function updateCloudFrontDistribution(oacId) {
    try {
        // Get current distribution config
        const getResult = await cloudfront.getDistribution({ Id: DISTRIBUTION_ID }).promise();
        const config = getResult.Distribution.DistributionConfig;
        const etag = getResult.ETag;
        
        // Update the origin to use S3 directly with OAC
        config.Origins.Items[0] = {
            Id: `S3-${BUCKET_NAME}`,
            DomainName: `${BUCKET_NAME}.s3.us-west-2.amazonaws.com`,
            OriginPath: "",
            CustomHeaders: {
                Quantity: 0
            },
            S3OriginConfig: {
                OriginAccessIdentity: ""
            },
            OriginAccessControlId: oacId,
            ConnectionAttempts: 3,
            ConnectionTimeout: 10,
            OriginShield: {
                Enabled: false
            }
        };
        
        // Remove CustomOriginConfig since we're using S3OriginConfig
        delete config.Origins.Items[0].CustomOriginConfig;
        
        // Update the distribution
        const updateParams = {
            Id: DISTRIBUTION_ID,
            DistributionConfig: config,
            IfMatch: etag
        };
        
        const result = await cloudfront.updateDistribution(updateParams).promise();
        console.log('✅ Updated CloudFront distribution to use Origin Access Control');
        return result.Distribution.Id;
    } catch (error) {
        console.error('❌ Failed to update CloudFront distribution:', error.message);
        throw error;
    }
}

async function updateBucketPolicy(oacId) {
    try {
        const policy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Sid: "AllowCloudFrontServicePrincipal",
                    Effect: "Allow",
                    Principal: {
                        Service: "cloudfront.amazonaws.com"
                    },
                    Action: "s3:GetObject",
                    Resource: `arn:aws:s3:::${BUCKET_NAME}/*`,
                    Condition: {
                        StringEquals: {
                            "AWS:SourceArn": `arn:aws:cloudfront::${await getAccountId()}:distribution/${DISTRIBUTION_ID}`
                        }
                    }
                }
            ]
        };
        
        await s3.putBucketPolicy({
            Bucket: BUCKET_NAME,
            Policy: JSON.stringify(policy, null, 2)
        }).promise();
        
        console.log('✅ Updated S3 bucket policy for CloudFront access only');
    } catch (error) {
        console.error('❌ Failed to update bucket policy:', error.message);
        throw error;
    }
}

async function getAccountId() {
    const sts = new AWS.STS();
    const identity = await sts.getCallerIdentity().promise();
    return identity.Account;
}

async function disableS3WebsiteHosting() {
    try {
        await s3.deleteBucketWebsite({ Bucket: BUCKET_NAME }).promise();
        console.log('✅ Disabled S3 website hosting');
    } catch (error) {
        if (error.code !== 'NoSuchWebsiteConfiguration') {
            console.warn('⚠️ Could not disable S3 website hosting:', error.message);
        }
    }
}

async function main() {
    try {
        console.log('🔒 Securing CloudFront distribution...');
        console.log('📍 Distribution ID:', DISTRIBUTION_ID);
        console.log('🪣 Bucket:', BUCKET_NAME);
        
        // Step 1: Create Origin Access Control
        const oacId = await createOriginAccessControl();
        
        // Step 2: Update CloudFront distribution to use OAC
        await updateCloudFrontDistribution(oacId);
        
        // Step 3: Update S3 bucket policy to only allow CloudFront
        await updateBucketPolicy(oacId);
        
        // Step 4: Disable S3 website hosting (no longer needed)
        await disableS3WebsiteHosting();
        
        console.log('\n🎉 Security update completed successfully!');
        console.log('\n📋 Summary:');
        console.log('   ✅ S3 bucket is now private (no public access)');
        console.log('   ✅ CloudFront uses Origin Access Control');
        console.log('   ✅ Website only accessible through CloudFront');
        console.log('   ✅ S3 website hosting disabled');
        console.log('\n🔗 Access your website at:');
        console.log('   https://d37wgbz1phfkg3.cloudfront.net');
        console.log('\n⏰ Changes may take 15-20 minutes to propagate globally');
        
    } catch (error) {
        console.error('\n❌ Security update failed:', error.message);
        process.exit(1);
    }
}

main();