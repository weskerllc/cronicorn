import { Link, createFileRoute } from "@tanstack/react-router";
import { brand, business } from "@cronicorn/content";
import { createSEOHead } from "@/lib/seo";

export const Route = createFileRoute("/_public/terms")({
  head: () => createSEOHead({
    title: "Terms of Service",
    description: "Cronicorn's Terms of Service - Legal terms governing your use of our platform",
  }),
  component: TermsOfService,
});

function TermsOfService() {
  const lastUpdated = "January 2025";
  const effectiveDate = "January 2025";

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 py-16 md:py-24">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Terms of Service
            </h1>
            <p className="text-lg text-muted-foreground">
              Last updated: {lastUpdated}
            </p>
            <p className="text-lg text-muted-foreground">
              Effective date: {effectiveDate}
            </p>
          </div>

          {/* Introduction */}
          <section className="space-y-4">
            <p className="text-foreground leading-relaxed">
              These Terms of Service ("Terms") govern your access to and use of {brand.name}'s services,
              including our website, API, and platform (collectively, the "Service"). By accessing or using
              the Service, you agree to be bound by these Terms.
            </p>
            <p className="text-foreground leading-relaxed">
              If you do not agree to these Terms, do not use the Service.
            </p>
          </section>

          {/* Acceptance of Terms */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              1. Acceptance of Terms
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              By creating an account or using {brand.name}, you confirm that:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>You are at least 18 years of age</li>
              <li>You have the authority to enter into these Terms</li>
              <li>You will comply with all applicable laws and regulations</li>
              <li>All information you provide is accurate and current</li>
            </ul>
          </section>

          {/* Description of Service */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              2. Description of Service
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {brand.name} provides an adaptive job scheduling platform that enables automated task execution
              with AI-powered optimization. The Service includes:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Job scheduling with cron expressions or interval-based timing</li>
              <li>AI-driven schedule adaptation based on real-time conditions</li>
              <li>HTTP endpoint execution and monitoring</li>
              <li>Run history and analytics</li>
              <li>API access for programmatic control</li>
            </ul>
          </section>

          {/* Account Registration */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              3. Account Registration and Security
            </h2>
            <div className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                To use certain features, you must create an account. You are responsible for:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized access</li>
                <li>Providing accurate and complete account information</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to suspend or terminate accounts that violate these Terms or engage in
                fraudulent, abusive, or illegal activity.
              </p>
            </div>
          </section>

          {/* Acceptable Use */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              4. Acceptable Use Policy
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree not to use the Service to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on the rights of others, including intellectual property rights</li>
              <li>Transmit malicious code, viruses, or harmful content</li>
              <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use the Service for competitive analysis or to build a competing product</li>
              <li>Engage in automated scraping or data collection without permission</li>
              <li>Overload our systems with excessive API requests beyond your plan limits</li>
              <li>Schedule jobs that target third-party services in violation of their terms</li>
            </ul>
          </section>

          {/* Subscription Plans and Payment */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              5. Subscription Plans and Payment
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-foreground mb-2">
                  5.1 Free Tier
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Our Starter plan is available at no cost with usage limitations. We reserve the right to
                  modify free tier features and limits with reasonable notice.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-foreground mb-2">
                  5.2 Paid Subscriptions
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Paid subscriptions are billed in advance on a monthly or annual basis. You authorize us to
                  charge your payment method for all fees when due. All fees are non-refundable except as
                  required by law.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-foreground mb-2">
                  5.3 Price Changes
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  We may change our pricing with 30 days' notice. Price changes will apply to subsequent
                  billing periods. Your continued use of the Service after price changes constitutes acceptance
                  of the new pricing.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-foreground mb-2">
                  5.4 Cancellation
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  You may cancel your subscription at any time. Cancellation takes effect at the end of your
                  current billing period. No refunds will be provided for partial months.
                </p>
              </div>
            </div>
          </section>

          {/* Intellectual Property */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              6. Intellectual Property Rights
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-foreground mb-2">
                  6.1 Our Rights
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  The Service and its original content, features, and functionality are owned by {business.legalName} and
                  are protected by international copyright, trademark, and other intellectual property laws.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Our open-source components are licensed under the Functional Source License (FSL-1.1-MIT).
                  See our{" "}
                  <a
                    href="https://github.com/weskerllc/cronicorn/blob/main/LICENSE"
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    LICENSE file
                  </a>
                  {" "}for details.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-foreground mb-2">
                  6.2 Your Content
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  You retain ownership of any content, data, or configurations you submit to the Service ("Your Content").
                  By using the Service, you grant us a license to use Your Content solely to provide and improve the Service.
                </p>
              </div>
            </div>
          </section>

          {/* Data and Privacy */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              7. Data and Privacy
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Our Privacy Policy governs how we collect, use, and protect your personal information. By using
              the Service, you agree to our{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          {/* Service Availability */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              8. Service Availability and Support
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We strive to provide reliable service but do not guarantee uninterrupted or error-free operation.
              We reserve the right to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Modify or discontinue features with reasonable notice</li>
              <li>Perform scheduled and emergency maintenance</li>
              <li>Implement rate limits and usage restrictions</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Support is provided based on your subscription plan. Community support is available through
              GitHub Discussions. Paid plans receive priority email support.
            </p>
          </section>

          {/* Disclaimers */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              9. Disclaimers
            </h2>
            <div className="bg-muted/50 border border-border rounded-lg p-6">
              <p className="text-muted-foreground leading-relaxed uppercase">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS
                OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
                PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE,
                OR ERROR-FREE.
              </p>
            </div>
          </section>

          {/* Limitation of Liability */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              10. Limitation of Liability
            </h2>
            <div className="bg-muted/50 border border-border rounded-lg p-6">
              <p className="text-muted-foreground leading-relaxed uppercase">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, {business.legalName.toUpperCase()} SHALL NOT BE LIABLE FOR ANY
                INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES,
                WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES
                RESULTING FROM: (A) YOUR USE OR INABILITY TO USE THE SERVICE; (B) ANY UNAUTHORIZED ACCESS TO OR USE OF
                OUR SERVERS; (C) ANY INTERRUPTION OR CESSATION OF THE SERVICE; (D) ANY BUGS, VIRUSES, OR OTHER HARMFUL
                CODE TRANSMITTED THROUGH THE SERVICE.
              </p>
              <p className="text-muted-foreground leading-relaxed uppercase mt-4">
                OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE
                CLAIM, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS GREATER.
              </p>
            </div>
          </section>

          {/* Indemnification */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              11. Indemnification
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify, defend, and hold harmless {business.legalName}, its officers, directors,
              employees, and agents from any claims, liabilities, damages, losses, and expenses, including reasonable
              attorney's fees, arising out of or in any way connected with:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any rights of another party</li>
              <li>Your Content submitted to the Service</li>
            </ul>
          </section>

          {/* Termination */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              12. Termination
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We may terminate or suspend your access to the Service immediately, without prior notice, for any
              reason, including breach of these Terms. Upon termination:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Your right to use the Service will immediately cease</li>
              <li>We may delete your account and data after a reasonable retention period</li>
              <li>You remain liable for all fees incurred prior to termination</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              You may terminate your account at any time by contacting{" "}
              <a
                href={`mailto:${business.contactPoint.email}`}
                className="text-primary hover:underline"
              >
                {business.contactPoint.email}
              </a>
              .
            </p>
          </section>

          {/* Governing Law */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              13. Governing Law and Dispute Resolution
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the United States,
              without regard to its conflict of law provisions. Any disputes arising from these Terms or the
              Service shall be resolved through binding arbitration, except that either party may seek injunctive
              relief in court to protect intellectual property rights.
            </p>
          </section>

          {/* Changes to Terms */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              14. Changes to These Terms
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of material changes
              by email or through the Service. Your continued use of the Service after changes become effective
              constitutes acceptance of the modified Terms.
            </p>
          </section>

          {/* Severability */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              15. Severability
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              If any provision of these Terms is found to be unenforceable or invalid, that provision will be
              limited or eliminated to the minimum extent necessary, and the remaining provisions will remain
              in full force and effect.
            </p>
          </section>

          {/* Entire Agreement */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              16. Entire Agreement
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms, together with our Privacy Policy, constitute the entire agreement between you and
              {" "}{business.legalName} regarding the Service and supersede all prior agreements.
            </p>
          </section>

          {/* Contact */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              17. Contact Information
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about these Terms, please contact us:
            </p>
            <div className="text-muted-foreground space-y-2">
              <p>
                <strong>Email:</strong>{" "}
                <a
                  href={`mailto:${business.contactPoint.email}`}
                  className="text-primary hover:underline"
                >
                  {business.contactPoint.email}
                </a>
              </p>
              <p>
                <strong>GitHub:</strong>{" "}
                <a
                  href="https://github.com/weskerllc/cronicorn"
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  weskerllc/cronicorn
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
