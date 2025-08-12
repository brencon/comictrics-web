const AWS = require('aws-sdk');
const fs = require('fs');

const cloudfront = new AWS.CloudFront({ region: 'us-east-1' });
const route53 = new AWS.Route53();
const acm = new AWS.ACM({ region: 'us-east-1' });

async function waitForCertificateValidation(certificateArn) {
    console.log('⏰ Waiting for SSL certificate validation...');
    
    const maxAttempts = 30; // 15 minutes
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const cert = await acm.describeCertificate({ CertificateArn: certificateArn }).promise();
            
            if (cert.Certificate.Status === 'ISSUED') {
                console.log('✅ SSL certificate validated and issued');
                return true;
            }
            
            if (cert.Certificate.Status === 'FAILED') {
                throw new Error('SSL certificate validation failed');
            }
            
            console.log(`   Attempt ${attempt}/${maxAttempts}: Certificate status is ${cert.Certificate.Status}`);
            await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
            
        } catch (error) {
            if (attempt === maxAttempts) {
                throw error;
            }
            console.log(`   Attempt ${attempt}/${maxAttempts}: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, 30000));
        }
    }
    
    throw new Error('Timeout waiting for certificate validation');
}

async function updateCloudFrontDistribution(domain, certificateArn, distributionId) {
    try {
        console.log('\n🔄 Updating CloudFront distribution with custom domain...');
        
        // Get current distribution config
        const getResult = await cloudfront.getDistribution({ Id: distributionId }).promise();
        const config = getResult.Distribution.DistributionConfig;
        const etag = getResult.ETag;
        
        // Add custom domain aliases
        config.Aliases = {
            Quantity: 2,
            Items: [domain, `www.${domain}`]
        };
        
        // Add SSL certificate
        config.ViewerCertificate = {
            ACMCertificateArn: certificateArn,
            SSLSupportMethod: 'sni-only',
            MinimumProtocolVersion: 'TLSv1.2_2021',
            CertificateSource: 'acm'
        };
        
        // Update the distribution
        const updateParams = {
            Id: distributionId,
            DistributionConfig: config,
            IfMatch: etag
        };
        
        const result = await cloudfront.updateDistribution(updateParams).promise();
        console.log('✅ CloudFront distribution updated with custom domain');
        
        // Wait for deployment
        console.log('⏰ Waiting for CloudFront deployment...');
        await cloudfront.waitFor('distributionDeployed', { Id: distributionId }).promise();
        console.log('✅ CloudFront deployment completed');
        
        return result.Distribution.DomainName;
    } catch (error) {
        console.error('❌ Failed to update CloudFront distribution:', error.message);
        throw error;
    }
}

async function createDomainRecords(hostedZoneId, domain, cloudfrontDomain) {
    try {
        console.log('\n📝 Creating domain DNS records...');
        
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
            // WWW subdomain CNAME
            {
                Action: 'UPSERT',
                ResourceRecordSet: {
                    Name: `www.${domain}`,
                    Type: 'CNAME',
                    TTL: 300,
                    ResourceRecords: [{ Value: domain }]
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
        
        // Wait for DNS changes
        console.log('⏰ Waiting for DNS changes to propagate...');
        await route53.waitFor('resourceRecordSetsChanged', { Id: result.ChangeInfo.Id }).promise();
        console.log('✅ DNS changes propagated');
        
    } catch (error) {
        console.error('❌ Failed to create domain records:', error.message);
        throw error;
    }
}

async function main() {
    try {
        // Load configuration
        if (!fs.existsSync('domain-config.json')) {
            console.error('❌ domain-config.json not found. Run setup-custom-domain.js first.');
            process.exit(1);
        }
        
        const config = JSON.parse(fs.readFileSync('domain-config.json', 'utf8'));
        const { domain, hostedZoneId, certificateArn, distributionId } = config;
        
        console.log('🚀 Finalizing custom domain setup...');
        console.log('📍 Domain:', domain);
        console.log('📍 Distribution ID:', distributionId);
        
        // Step 1: Wait for certificate validation
        await waitForCertificateValidation(certificateArn);
        
        // Step 2: Update CloudFront distribution
        const cloudfrontDomain = await updateCloudFrontDistribution(domain, certificateArn, distributionId);
        
        // Step 3: Create domain DNS records
        await createDomainRecords(hostedZoneId, domain, cloudfrontDomain);
        
        console.log('\n🎉 Custom domain setup completed successfully!');
        console.log('\n🌐 Your website is now available at:');
        console.log(`   https://${domain}`);
        console.log(`   https://www.${domain}`);
        console.log('\n⏰ DNS propagation may take up to 48 hours globally');
        console.log('💡 You can test immediately with: dig', domain);
        
    } catch (error) {
        console.error('\n❌ Domain finalization failed:', error.message);
        
        if (error.message.includes('certificate validation')) {
            console.log('\n💡 Troubleshooting:');
            console.log('1. Verify name servers are configured at Hover.com');
            console.log('2. Check DNS propagation with: dig NS', config?.domain || 'comictrics.com');
            console.log('3. Wait 10-15 minutes for DNS changes to propagate');
        }
        
        process.exit(1);
    }
}

main();