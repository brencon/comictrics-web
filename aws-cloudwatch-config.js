// AWS CloudWatch Configuration for Comictrics Analytics
// Server-side metrics collection and monitoring

const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const cloudWatch = new AWS.CloudWatch();
const s3 = new AWS.S3();

class ComictricsCloudWatch {
    constructor() {
        this.namespace = 'Comictrics/Web';
        this.dimensions = [
            { Name: 'Environment', Value: process.env.NODE_ENV || 'production' },
            { Name: 'Application', Value: 'comictrics-web' },
            { Name: 'Version', Value: process.env.APP_VERSION || '1.0.0' }
        ];
    }

    // Core Web Vitals Metrics
    async putWebVitalMetric(metricName, value, dimensions = []) {
        const params = {
            Namespace: this.namespace,
            MetricData: [{
                MetricName: metricName,
                Value: value,
                Unit: metricName === 'CLS' ? 'None' : 'Milliseconds',
                Dimensions: [...this.dimensions, ...dimensions],
                Timestamp: new Date()
            }]
        };

        try {
            await cloudWatch.putMetricData(params).promise();
            console.log(`✅ Metric sent: ${metricName} = ${value}`);
        } catch (error) {
            console.error('❌ Failed to send metric:', error);
        }
    }

    // Business Metrics
    async putBusinessMetric(metricName, value, dimensions = []) {
        const params = {
            Namespace: 'Comictrics/Business',
            MetricData: [{
                MetricName: metricName,
                Value: value,
                Unit: 'Count',
                Dimensions: [...this.dimensions, ...dimensions],
                Timestamp: new Date()
            }]
        };

        try {
            await cloudWatch.putMetricData(params).promise();
            console.log(`📊 Business metric sent: ${metricName} = ${value}`);
        } catch (error) {
            console.error('❌ Failed to send business metric:', error);
        }
    }

    // Custom Dashboard Creation
    async createDashboard() {
        const dashboardBody = {
            widgets: [
                {
                    type: 'metric',
                    properties: {
                        metrics: [
                            ['Comictrics/Web', 'LCP'],
                            ['.', 'FID'],
                            ['.', 'CLS'],
                            ['.', 'FCP'],
                            ['.', 'TTFB']
                        ],
                        period: 300,
                        stat: 'Average',
                        region: process.env.AWS_REGION || 'us-east-1',
                        title: 'Core Web Vitals'
                    }
                },
                {
                    type: 'metric',
                    properties: {
                        metrics: [
                            ['Comictrics/Business', 'AppDownloads'],
                            ['.', 'TrialSignups'],
                            ['.', 'Conversions']
                        ],
                        period: 300,
                        stat: 'Sum',
                        region: process.env.AWS_REGION || 'us-east-1',
                        title: 'Business Metrics'
                    }
                },
                {
                    type: 'metric',
                    properties: {
                        metrics: [
                            ['AWS/CloudFront', 'Requests'],
                            ['.', 'BytesDownloaded'],
                            ['.', '4xxErrorRate'],
                            ['.', '5xxErrorRate']
                        ],
                        period: 300,
                        stat: 'Sum',
                        region: process.env.AWS_REGION || 'us-east-1',
                        title: 'CDN Performance'
                    }
                }
            ]
        };

        const params = {
            DashboardName: 'Comictrics-Web-Analytics',
            DashboardBody: JSON.stringify(dashboardBody)
        };

        try {
            await cloudWatch.putDashboard(params).promise();
            console.log('✅ CloudWatch dashboard created successfully');
        } catch (error) {
            console.error('❌ Failed to create dashboard:', error);
        }
    }

    // Alarms for critical metrics
    async createAlarms() {
        const alarms = [
            {
                AlarmName: 'Comictrics-High-LCP',
                ComparisonOperator: 'GreaterThanThreshold',
                EvaluationPeriods: 2,
                MetricName: 'LCP',
                Namespace: 'Comictrics/Web',
                Period: 300,
                Statistic: 'Average',
                Threshold: 4000,
                ActionsEnabled: true,
                AlarmActions: [process.env.SNS_TOPIC_ARN],
                AlarmDescription: 'Alert when LCP exceeds 4 seconds',
                Unit: 'Milliseconds'
            },
            {
                AlarmName: 'Comictrics-High-CLS',
                ComparisonOperator: 'GreaterThanThreshold',
                EvaluationPeriods: 2,
                MetricName: 'CLS',
                Namespace: 'Comictrics/Web',
                Period: 300,
                Statistic: 'Average',
                Threshold: 0.25,
                ActionsEnabled: true,
                AlarmActions: [process.env.SNS_TOPIC_ARN],
                AlarmDescription: 'Alert when CLS exceeds 0.25',
                Unit: 'None'
            },
            {
                AlarmName: 'Comictrics-Low-Conversions',
                ComparisonOperator: 'LessThanThreshold',
                EvaluationPeriods: 3,
                MetricName: 'Conversions',
                Namespace: 'Comictrics/Business',
                Period: 3600,
                Statistic: 'Sum',
                Threshold: 1,
                ActionsEnabled: true,
                AlarmActions: [process.env.SNS_TOPIC_ARN],
                AlarmDescription: 'Alert when conversions drop below expected rate',
                Unit: 'Count'
            }
        ];

        for (const alarm of alarms) {
            try {
                await cloudWatch.putMetricAlarm(alarm).promise();
                console.log(`✅ Alarm created: ${alarm.AlarmName}`);
            } catch (error) {
                console.error(`❌ Failed to create alarm ${alarm.AlarmName}:`, error);
            }
        }
    }

    // Log Analytics Integration
    async sendToCloudWatchLogs(logGroup, logStream, message) {
        const cloudWatchLogs = new AWS.CloudWatchLogs();
        
        try {
            const params = {
                logGroupName: logGroup,
                logStreamName: logStream,
                logEvents: [{
                    message: JSON.stringify(message),
                    timestamp: Date.now()
                }]
            };

            await cloudWatchLogs.putLogEvents(params).promise();
            console.log('✅ Log sent to CloudWatch Logs');
        } catch (error) {
            console.error('❌ Failed to send log:', error);
        }
    }
}

// Lambda function for processing analytics data
exports.handler = async (event) => {
    const cloudWatch = new ComictricsCloudWatch();
    
    try {
        // Process incoming analytics data
        const body = JSON.parse(event.body || '{}');
        
        if (body.metrics) {
            // Process web vitals
            for (const metric of body.metrics) {
                if (metric.MetricName.includes('web_vital')) {
                    await cloudWatch.putWebVitalMetric(
                        metric.MetricName.replace('web_vital_', ''),
                        metric.Value,
                        metric.Dimensions
                    );
                }
                
                // Process business metrics
                if (metric.MetricName.includes('conversion')) {
                    await cloudWatch.putBusinessMetric(
                        'Conversions',
                        1,
                        [{ Name: 'ConversionType', Value: metric.ConversionType || 'unknown' }]
                    );
                }
            }
        }
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': 'https://comictrics.com',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({ success: true })
        };
        
    } catch (error) {
        console.error('Error processing analytics:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': 'https://comictrics.com'
            },
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};

// Export for use in other modules
module.exports = { ComictricsCloudWatch };