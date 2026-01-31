/**
 * Self-Healing Support Agent - Merchant SDK
 * Embed this in your headless frontend to report errors.
 */

(function(window) {
    'use strict';

    const SupportAgent = {
        config: {
            endpoint: 'http://localhost:8000/webhooks/generic',
            merchantId: null,
            debug: false,
        },

        /**
         * Initialize the SDK
         * @param {Object} options - Configuration options
         */
        init: function(options) {
            if (options.endpoint) this.config.endpoint = options.endpoint;
            if (options.merchantId) this.config.merchantId = options.merchantId;
            if (options.debug) this.config.debug = options.debug;
            
            if (this.config.debug) {
                console.log('[SupportAgent] Initialized with config:', this.config);
            }

            // Auto-capture global errors
            if (options.captureErrors !== false) {
                this._setupErrorCapture();
            }

            return this;
        },

        /**
         * Report an error to the support agent
         * @param {Object} error - Error details
         */
        reportError: async function(error) {
            const payload = {
                type: error.type || 'api_error',
                source: 'merchant_sdk',
                merchant_id: error.merchantId || this.config.merchantId || 'unknown',
                title: error.title || 'SDK Error Report',
                severity: error.severity || 'medium',
                content: {
                    message: error.message,
                    code: error.code,
                    context: error.context || {},
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString(),
                },
                metadata: {
                    sdk_version: '1.0.0',
                    ...error.metadata
                }
            };

            try {
                const response = await fetch(this.config.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });

                const result = await response.json();
                
                if (this.config.debug) {
                    console.log('[SupportAgent] Error reported:', result);
                }

                return result;
            } catch (e) {
                if (this.config.debug) {
                    console.error('[SupportAgent] Failed to report error:', e);
                }
                return null;
            }
        },

        /**
         * Report a checkout error
         * @param {Object} details - Checkout error details
         */
        reportCheckoutError: function(details) {
            return this.reportError({
                type: 'checkout_event',
                title: `Checkout Error: ${details.stage || 'unknown'}`,
                severity: 'high',
                message: details.message || 'Checkout failed',
                code: details.errorCode,
                context: {
                    checkoutId: details.checkoutId,
                    cartId: details.cartId,
                    stage: details.stage,
                    cartValue: details.cartValue,
                    customerId: details.customerId,
                }
            });
        },

        /**
         * Report an API error
         * @param {Object} details - API error details
         */
        reportAPIError: function(details) {
            return this.reportError({
                type: 'api_error',
                title: `API Error: ${details.endpoint}`,
                severity: details.statusCode >= 500 ? 'critical' : 'medium',
                message: details.message,
                code: details.statusCode,
                context: {
                    endpoint: details.endpoint,
                    method: details.method,
                    statusCode: details.statusCode,
                    requestId: details.requestId,
                }
            });
        },

        /**
         * Report a webhook issue
         * @param {Object} details - Webhook details
         */
        reportWebhookIssue: function(details) {
            return this.reportError({
                type: 'webhook_failure',
                title: `Webhook Issue: ${details.eventType}`,
                severity: 'high',
                message: details.message || 'Webhook processing failed',
                context: {
                    eventType: details.eventType,
                    webhookId: details.webhookId,
                    retryCount: details.retryCount,
                }
            });
        },

        /**
         * Setup automatic error capture
         * @private
         */
        _setupErrorCapture: function() {
            const self = this;

            // Capture unhandled errors
            window.addEventListener('error', function(event) {
                self.reportError({
                    type: 'api_error',
                    title: 'Unhandled JavaScript Error',
                    severity: 'medium',
                    message: event.message,
                    context: {
                        filename: event.filename,
                        lineno: event.lineno,
                        colno: event.colno,
                    }
                });
            });

            // Capture unhandled promise rejections
            window.addEventListener('unhandledrejection', function(event) {
                self.reportError({
                    type: 'api_error',
                    title: 'Unhandled Promise Rejection',
                    severity: 'medium',
                    message: event.reason?.message || String(event.reason),
                    context: {
                        reason: String(event.reason),
                    }
                });
            });

            // Intercept fetch errors
            const originalFetch = window.fetch;
            window.fetch = async function(...args) {
                try {
                    const response = await originalFetch.apply(this, args);
                    
                    // Report non-2xx responses
                    if (!response.ok && response.status >= 400) {
                        const url = typeof args[0] === 'string' ? args[0] : args[0].url;
                        self.reportAPIError({
                            endpoint: url,
                            method: args[1]?.method || 'GET',
                            statusCode: response.status,
                            message: response.statusText,
                        });
                    }
                    
                    return response;
                } catch (error) {
                    const url = typeof args[0] === 'string' ? args[0] : args[0].url;
                    self.reportAPIError({
                        endpoint: url,
                        method: args[1]?.method || 'GET',
                        statusCode: 0,
                        message: error.message,
                    });
                    throw error;
                }
            };
        }
    };

    // Export to window
    window.SupportAgent = SupportAgent;

})(window);
