# Automated Deployment Setup

This repository uses GitHub Actions to automatically deploy the website to AWS S3 and CloudFront whenever code is pushed to the `main` branch.

## Required GitHub Secrets

To enable automated deployment, you need to configure the following secrets in your GitHub repository:

### Setting up GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add the following:

#### Required Secrets

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `AWS_ACCESS_KEY_ID` | AWS Access Key ID | Create an IAM user with S3 and CloudFront permissions |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Access Key | Generated when creating the IAM user |

### AWS IAM User Setup

Create an IAM user with the following permissions policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "S3BucketAccess",
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::comictrics-web",
                "arn:aws:s3:::comictrics-web/*"
            ]
        },
        {
            "Sid": "CloudFrontInvalidation",
            "Effect": "Allow",
            "Action": [
                "cloudfront:CreateInvalidation",
                "cloudfront:GetInvalidation"
            ],
            "Resource": "arn:aws:cloudfront::*:distribution/E15LH122NSBXHW"
        },
        {
            "Sid": "STSGetCallerIdentity",
            "Effect": "Allow",
            "Action": "sts:GetCallerIdentity",
            "Resource": "*"
        }
    ]
}
```

## How the Deployment Works

1. **Trigger**: Automatic deployment on push to `main` branch, or manual via GitHub Actions UI
2. **Build**: Installs Node.js dependencies
3. **Deploy**: Uploads files to S3 with proper content types and cache headers
4. **Cache**: Creates CloudFront invalidation to refresh CDN cache
5. **Live**: Changes are live at https://comictrics.com within 1-2 minutes

## File Cache Settings

- **HTML files**: 5 minutes (`max-age=300`)
- **CSS/JS/Assets**: 24 hours (`max-age=86400`)
- **Images**: 24 hours (`max-age=86400`)

## Manual Deployment

You can also trigger deployment manually:

1. Go to **Actions** tab in GitHub
2. Select **Deploy to AWS S3** workflow
3. Click **Run workflow** → **Run workflow**

## Troubleshooting

### Common Issues

1. **403 Forbidden**: Check IAM permissions and S3 bucket policy
2. **Invalid credentials**: Verify GitHub secrets are set correctly
3. **CloudFront errors**: Ensure distribution ID is correct in workflow

### Monitoring

- Check **Actions** tab for deployment status
- Review AWS CloudWatch logs for detailed error information
- Monitor S3 bucket and CloudFront distribution in AWS Console

## Cost Impact

- **GitHub Actions**: Free for public repositories (2,000 minutes/month for private)
- **S3 API calls**: ~$0.01 per deployment
- **CloudFront invalidations**: $0.005 per path (up to 1,000 free per month)

Total additional cost: **~$0.01 per deployment**