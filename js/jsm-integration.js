/**
 * Jira Service Management Integration for Account Deletion Requests
 * 
 * IMPORTANT: You need to configure the following:
 * 1. Replace JSM_PROJECT_KEY with your actual JSM project key (e.g., "COMICTRICS")
 * 2. Replace JSM_INSTANCE_URL with your Atlassian instance URL
 * 3. Set up a public REST API endpoint or use Jira's customer portal API
 * 4. Configure CORS settings in your JSM instance if needed
 */

// Configuration - UPDATE THESE VALUES
const JSM_CONFIG = {
    // Your JSM instance URL
    instanceUrl: 'https://comictrics.atlassian.net',
    
    // Your JSM project key
    projectKey: 'COMICTRICS',
    
    // Service desk ID
    serviceDeskId: '2', // From your portal URL
    
    // Request type ID for "Request account deletion"
    requestTypeId: '19',
    
    // Request type name as it appears in JSM
    requestTypeName: 'Request account deletion',
    
    // API token or authentication method
    // For production, use OAuth or implement server-side proxy
    apiToken: ''
};

// Alternative: Use Jira Service Management Customer API (recommended)
// This doesn't require authentication for customers
const JSM_CUSTOMER_API = {
    // Your JSM portal URL
    portalUrl: 'https://comictrics.atlassian.net/servicedesk/customer/portal/2',
    
    // Customer portal base URL
    customerPortalBase: 'https://comictrics.atlassian.net/servicedesk/customer/portals',
    
    // Direct link to create account deletion request
    createRequestUrl: 'https://comictrics.atlassian.net/servicedesk/customer/portal/2/group/5/create/19',
    
    // Form endpoint (if using embedded forms)
    formEndpoint: '/rest/servicedeskapi/request'
};

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('deletionForm');
    const submitBtn = document.getElementById('submitBtn');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');

    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Validate form
            if (!validateForm()) {
                return;
            }
            
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');
            successMessage.style.display = 'none';
            errorMessage.style.display = 'none';
            
            try {
                // Collect form data
                const formData = {
                    email: document.getElementById('email').value,
                    username: document.getElementById('username').value || 'Not provided',
                    reason: document.getElementById('reason').options[document.getElementById('reason').selectedIndex].text,
                    feedback: document.getElementById('feedback').value || 'No additional feedback',
                    timestamp: new Date().toISOString(),
                    source: 'Web Form - Account Deletion Request'
                };
                
                // Submit to JSM
                const result = await submitToJSM(formData);
                
                if (result.success) {
                    // Show appropriate success message based on method
                    if (result.method === 'portal-redirect') {
                        // Update success message for portal redirect
                        document.querySelector('#successMessage h3').innerHTML = '<i class="fas fa-external-link-alt"></i> Redirected to Support Portal';
                        document.querySelector('#successMessage p').innerHTML = 'A new tab has opened with your account deletion request form. Please complete the form in the Comictrics support portal to finalize your request.';
                    } else if (result.ticketId) {
                        // Direct API success
                        document.querySelector('#successMessage p').innerHTML = `Your account deletion request has been submitted successfully (Ticket ID: ${result.ticketId}). We'll process your request within 30 days and send a confirmation email when complete.`;
                    }
                    
                    // Show success message
                    form.style.display = 'none';
                    successMessage.style.display = 'block';
                    
                    // Scroll to top
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    throw new Error(result.error || 'Failed to submit request');
                }
            } catch (error) {
                console.error('Submission error:', error);
                errorText.textContent = error.message || 'There was an error submitting your request. Please try again or contact support directly at support@comictrics.com';
                errorMessage.style.display = 'block';
                
                // Scroll to error message
                errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } finally {
                // Reset loading state
                submitBtn.disabled = false;
                submitBtn.classList.remove('loading');
            }
        });
    }
});

function validateForm() {
    const email = document.getElementById('email').value;
    const reason = document.getElementById('reason').value;
    const confirm = document.getElementById('confirm').checked;
    const confirmEmail = document.getElementById('confirmEmail').checked;
    
    if (!email || !reason || !confirm || !confirmEmail) {
        alert('Please fill in all required fields and confirm the checkboxes.');
        return false;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address.');
        return false;
    }
    
    return true;
}

async function submitToJSM(formData) {
    /**
     * IMPLEMENTATION OPTIONS:
     * 
     * Option 1: Direct Portal Redirect (simplest)
     * - Redirect user to JSM portal with pre-filled data
     * - No authentication needed
     * 
     * Option 2: Email-to-JSM Integration
     * - Configure JSM to create tickets from emails
     * - Send email to your JSM project email address
     * 
     * Option 3: Direct API Call (requires authentication)
     * - Use this if you have API access configured
     * - Requires CORS setup or server-side proxy
     * 
     * Option 4: Webhook/Server Proxy (recommended for production)
     * - Create a server endpoint that handles the JSM API call
     * - More secure as API credentials stay server-side
     */
    
    try {
        // Option 1: Direct redirect to JSM portal (simplest approach)
        // Store form data in sessionStorage to pass to JSM
        sessionStorage.setItem('deletionRequestData', JSON.stringify(formData));
        
        // Build the URL with query parameters for pre-filling
        const portalUrl = JSM_CUSTOMER_API.createRequestUrl;
        const params = new URLSearchParams({
            summary: `Account Deletion Request - ${formData.email}`,
            description: formatDescription(formData)
        });
        
        // Use direct portal redirect - user completes the request in JSM
        const portalUrlWithData = `${portalUrl}`;
        window.open(portalUrlWithData, '_blank');
        
        // Show success message indicating they'll complete the request in JSM
        return { success: true, method: 'portal-redirect' };
        
    } catch (error) {
        // If portal redirect fails, try API approach
        return await directAPISubmission(formData);
    }
}

function formatDescription(formData) {
    return `
Account Deletion Request

Email: ${formData.email}
Username: ${formData.username}
Reason: ${formData.reason}
Timestamp: ${formData.timestamp}

Additional Feedback:
${formData.feedback}

---
This request was submitted via the Comictrics website account deletion form.
Please process this request according to our data deletion policy within 30 days.
    `.trim();
}

async function directAPISubmission(formData) {
    /**
     * Direct API submission to JSM Customer Portal
     * This creates a ticket directly without email
     */
    
    try {
        // Use JSM Customer Portal API (no authentication needed for customers)
        const response = await fetch(`${JSM_CONFIG.instanceUrl}/rest/servicedeskapi/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                serviceDeskId: JSM_CONFIG.serviceDeskId,
                requestTypeId: JSM_CONFIG.requestTypeId,
                summary: `Account Deletion Request - ${formData.email}`,
                description: formatDescription(formData),
                reporter: {
                    emailAddress: formData.email
                }
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            return { success: true, ticketId: result.issueKey };
        } else {
            throw new Error(`API error: ${response.status}`);
        }
        
    } catch (error) {
        console.error('Direct API submission failed:', error);
        // Final fallback: show error with contact info
        throw new Error('Unable to submit request automatically. Please contact support directly at support@comictrics.com with your account deletion request.');
    }
}

async function sendConfirmationEmail(email) {
    /**
     * Optional: Send confirmation email to user
     * Implement this on your server-side
     */
    
    try {
        // Example server endpoint
        // await fetch('/api/send-confirmation', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ email, type: 'deletion-request' })
        // });
        
        console.log(`Confirmation email would be sent to: ${email}`);
    } catch (error) {
        console.error('Failed to send confirmation email:', error);
        // Non-critical error, don't block the main flow
    }
}

/**
 * SETUP INSTRUCTIONS:
 * 
 * 1. Create a Request Type in JSM:
 *    - Go to Project Settings > Request types
 *    - Create "Account Deletion Request" type
 *    - Add custom fields for username, reason, feedback
 * 
 * 2. Set up API Access (choose one):
 *    a. Customer Portal API (easiest)
 *       - Enable customer portal
 *       - Allow anonymous requests
 *    
 *    b. REST API with Authentication
 *       - Create API token
 *       - Set up CORS if needed
 *    
 *    c. Email Channel
 *       - Configure email channel in JSM
 *       - Set up email-to-ticket rules
 * 
 * 3. Create Server Proxy (recommended):
 *    - Create endpoint: /api/jsm/create-ticket
 *    - Handle authentication server-side
 *    - Forward requests to JSM API
 * 
 * 4. Test the Integration:
 *    - Submit test request
 *    - Verify ticket creation in JSM
 *    - Check email notifications
 */