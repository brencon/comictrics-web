const AWS = require('aws-sdk');

// Configure AWS services
const route53 = new AWS.Route53();
const acm = new AWS.ACM({ region: 'us-east-1' }); // ACM for CloudFront must be in us-east-1
const cloudfront = new AWS.CloudFront({ region: 'us-east-1' });

const DOMAIN = 'comictrics.com';
const DISTRIBUTION_ID = 'E15LH122NSBXHW';

async function createHostedZone() {
    try {
        console.log('🌐 Creating Route 53 hosted zone for', DOMAIN);
        
        const params = {
            Name: DOMAIN,
            CallerReference: `${DOMAIN}-${Date.now()}`,
            HostedZoneConfig: {
                Comment: `Hosted zone for ${DOMAIN} - Comictrics website`,
                PrivateZone: false
            }
        };
        
        const result = await route53.createHostedZone(params).promise();
        const hostedZoneId = result.HostedZone.Id.replace('/hostedzone/', '');
        
        console.log('✅ Created hosted zone:', hostedZoneId);
        console.log('\n📋 Name servers to configure at Hover.com:');
        result.DelegationSet.NameServers.forEach((ns, index) => {
            console.log(`   ${index + 1}. ${ns}`);
        });
        
        return hostedZoneId;
    } catch (error) {
        if (error.code === 'HostedZoneAlreadyExists') {
            console.log('✅ Hosted zone already exists');
            // Get existing hosted zone
            const zones = await route53.listHostedZonesByName({ DNSName: DOMAIN }).promise();
            const zone = zones.HostedZones.find(z => z.Name === `${DOMAIN}.`);
            if (zone) {
                const hostedZoneId = zone.Id.replace('/hostedzone/', '');
                console.log('✅ Using existing hosted zone:', hostedZoneId);
                
                // Get name servers
                const nsResult = await route53.getHostedZone({ Id: zone.Id }).promise();
                console.log('\n📋 Name servers to configure at Hover.com:');
                nsResult.DelegationSet.NameServers.forEach((ns, index) => {
                    console.log(`   ${index + 1}. ${ns}`);
                });
                
                return hostedZoneId;
            }
        }
        throw error;
    }
}

async function requestSSLCertificate() {
    try {
        console.log('\n🔒 Requesting SSL certificate for', DOMAIN);
        
        const params = {
            DomainName: DOMAIN,
            SubjectAlternativeNames: [`www.${DOMAIN}`],
            ValidationMethod: 'DNS',
            Options: {
                CertificateTransparencyLoggingPreference: 'ENABLED'
            }
        };
        
        const result = await acm.requestCertificate(params).promise();
        console.log('✅ SSL certificate requested:', result.CertificateArn);
        
        // Wait a moment for the certificate details to be available
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Get certificate details for DNS validation
        const certDetails = await acm.describeCertificate({ 
            CertificateArn: result.CertificateArn 
        }).promise();
        
        console.log('\n📋 DNS validation records needed:');
        certDetails.Certificate.DomainValidationOptions.forEach(option => {
            if (option.ResourceRecord) {
                console.log(`   Domain: ${option.DomainName}`);
                console.log(`   Type: ${option.ResourceRecord.Type}`);
                console.log(`   Name: ${option.ResourceRecord.Name}`);
                console.log(`   Value: ${option.ResourceRecord.Value}`);
                console.log('');
            }
        });
        
        return result.CertificateArn;
    } catch (error) {
        console.error('❌ Failed to request SSL certificate:', error.message);
        throw error;
    }
}

async function createDNSRecords(hostedZoneId, certificateArn) {
    try {
        console.log('\n📝 Creating DNS records...');
        
        // Get certificate validation records
        const certDetails = await acm.describeCertificate({ 
            CertificateArn: certificateArn 
        }).promise();
        
        const changes = [];
        
        // Add SSL validation records
        certDetails.Certificate.DomainValidationOptions.forEach(option => {
            if (option.ResourceRecord) {
                changes.push({
                    Action: 'CREATE',
                    ResourceRecordSet: {
                        Name: option.ResourceRecord.Name,
                        Type: option.ResourceRecord.Type,
                        TTL: 300,
                        ResourceRecords: [{ Value: option.ResourceRecord.Value }]
                    }
                });
            }
        });
        
        if (changes.length > 0) {
            const params = {
                HostedZoneId: hostedZoneId,
                ChangeBatch: {
                    Comment: 'SSL certificate validation records',
                    Changes: changes
                }
            };
            
            const result = await route53.changeResourceRecordSets(params).promise();
            console.log('✅ Created SSL validation DNS records');
            
            // Wait for DNS changes to propagate
            console.log('⏰ Waiting for DNS changes to propagate...');
            await route53.waitFor('resourceRecordSetsChanged', { Id: result.ChangeInfo.Id }).promise();
            console.log('✅ DNS changes propagated');
        }
        
    } catch (error) {
        console.error('❌ Failed to create DNS records:', error.message);
        throw error;
    }
}

async function main() {
    try {
        console.log('🚀 Setting up custom domain for CloudFront...');
        console.log('📍 Domain:', DOMAIN);
        console.log('📍 Distribution ID:', DISTRIBUTION_ID);
        
        // Step 1: Create Route 53 hosted zone
        const hostedZoneId = await createHostedZone();
        
        // Step 2: Request SSL certificate
        const certificateArn = await requestSSLCertificate();
        
        // Step 3: Create DNS validation records
        await createDNSRecords(hostedZoneId, certificateArn);
        
        console.log('\n🎉 Domain setup initiated successfully!');
        console.log('\n📋 Next Steps:');
        console.log('1. 🌐 Configure the name servers at Hover.com (see above)');
        console.log('2. ⏰ Wait 10-15 minutes for SSL certificate validation');
        console.log('3. 🔄 Run the update-cloudfront script to add the domain to CloudFront');
        console.log('4. ⏰ Wait 15-20 minutes for CloudFront deployment');
        console.log('\n💡 After name servers are updated at Hover.com, run:');
        console.log('   node update-cloudfront-domain.js');
        
        // Save information for next step
        const config = {
            domain: DOMAIN,
            hostedZoneId: hostedZoneId,
            certificateArn: certificateArn,
            distributionId: DISTRIBUTION_ID
        };
        
        require('fs').writeFileSync('domain-config.json', JSON.stringify(config, null, 2));
        console.log('\n💾 Domain configuration saved to domain-config.json');
        
    } catch (error) {
        console.error('\n❌ Domain setup failed:', error.message);
        process.exit(1);
    }
}

main();