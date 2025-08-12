const AWS = require('aws-sdk');
const fs = require('fs');

const cloudfront = new AWS.CloudFront({ region: 'us-east-1' });
const route53 = new AWS.Route53();

async function checkCloudFrontStatus(distributionId) {
    const result = await cloudfront.getDistribution({ Id: distributionId }).promise();
    return result.Distribution.Status;
}

async function createDomainRecords(hostedZoneId, domain, cloudfrontDomain) {
    try {
        console.log('📝 Creating domain DNS records...');
        
        const changes = [
            // Root domain A record (alias to CloudFront)
            {
                Action: 'UPSERT',
                ResourceRecordSet: {
                    Name: domain,
                    Type: 'A',
                    AliasTarget: {
                        DNSName: cloudfrontDomain,
                        EvaluateTargetHealth: false,
                        HostedZoneId: 'Z2FDTNDATAQYW2' // CloudFront hosted zone ID
                    }
                }
            },
            // WWW subdomain A record (alias to CloudFront)
            {
                Action: 'UPSERT',
                ResourceRecordSet: {
                    Name: `www.${domain}`,
                    Type: 'A',
                    AliasTarget: {
                        DNSName: cloudfrontDomain,
                        EvaluateTargetHealth: false,
                        HostedZoneId: 'Z2FDTNDATAQYW2' // CloudFront hosted zone ID
                    }
                }
            }
        ];
        
        const params = {
            HostedZoneId: hostedZoneId,
            ChangeBatch: {
                Comment: 'Domain records for Comictrics website',
                Changes: changes
            }
        };
        
        const result = await route53.changeResourceRecordSets(params).promise();
        console.log('✅ Created domain DNS records');
        
        return result.ChangeInfo.Id;
    } catch (error) {
        console.error('❌ Failed to create domain records:', error.message);
        throw error;
    }
}

async function main() {
    try {
        // Load configuration
        if (!fs.existsSync('domain-config.json')) {
            console.error('❌ domain-config.json not found.');
            process.exit(1);
        }
        
        const config = JSON.parse(fs.readFileSync('domain-config.json', 'utf8'));
        const { domain, hostedZoneId, distributionId } = config;
        
        console.log('🎯 Finishing custom domain setup...');
        console.log('📍 Domain:', domain);
        
        // Check CloudFront status
        const status = await checkCloudFrontStatus(distributionId);
        console.log('📊 CloudFront Status:', status);
        
        if (status === 'InProgress') {
            console.log('⏰ CloudFront is still deploying. This can take 15-20 minutes.');
            console.log('💡 You can check status with: aws cloudfront get-distribution --id', distributionId, '--query Distribution.Status');
            console.log('🔄 Run this script again when status is "Deployed"');
            return;
        }
        
        if (status !== 'Deployed') {
            console.log('❌ CloudFront status is:', status);
            console.log('🔄 Please wait for deployment to complete');
            return;
        }
        
        // Get CloudFront domain name
        const distResult = await cloudfront.getDistribution({ Id: distributionId }).promise();
        const cloudfrontDomain = distResult.Distribution.DomainName;
        
        console.log('✅ CloudFront deployment completed');
        console.log('🌐 CloudFront domain:', cloudfrontDomain);
        
        // Create DNS records
        const changeId = await createDomainRecords(hostedZoneId, domain, cloudfrontDomain);
        
        console.log('\n🎉 Domain setup completed successfully!');
        console.log('\n🌐 Your website is now available at:');
        console.log(`   https://${domain}`);
        console.log(`   https://www.${domain}`);
        console.log('\n⏰ DNS propagation may take 5-10 minutes');
        console.log('\n🔍 Test your domain:');
        console.log(`   curl -I https://${domain}`);
        
    } catch (error) {
        console.error('\n❌ Domain setup failed:', error.message);
        process.exit(1);
    }
}

main();