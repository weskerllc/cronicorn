import { createFileRoute } from "@tanstack/react-router";
import { brand, business } from "@cronicorn/content";
import { SEO } from "@/components/SEO";

export const Route = createFileRoute("/_public/privacy")({
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  const lastUpdated = "January 2025";

  return (
    <>
      <SEO
        title="Privacy Policy"
        description="Cronicorn's Privacy Policy - How we collect, use, and protect your data"
        noindex={false}
      />

      <div className="max-w-4xl mx-auto px-4 py-16 md:py-24">
          <div className="space-y-8">
            {/* Header */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                Privacy Policy
              </h1>
              <p className="text-lg text-muted-foreground">
                Last updated: {lastUpdated}
              </p>
            </div>

            {/* Introduction */}
            <section className="space-y-4">
              <p className="text-foreground leading-relaxed">
                At {brand.name}, we take your privacy seriously. This Privacy Policy explains how we collect, use, 
                disclose, and safeguard your information when you use our job scheduling platform.
              </p>
            </section>

            {/* Information We Collect */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">
                Information We Collect
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-medium text-foreground mb-2">
                    Account Information
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    When you create an account, we collect information such as your name, email address, 
                    and authentication credentials (via GitHub OAuth or other supported providers).
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-medium text-foreground mb-2">
                    Usage Data
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We automatically collect information about how you interact with our service, including:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li>Job configurations and scheduling preferences</li>
                    <li>API requests and responses</li>
                    <li>Execution logs and performance metrics</li>
                    <li>Device and browser information</li>
                    <li>IP addresses and timestamps</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-medium text-foreground mb-2">
                    Payment Information
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    For paid subscriptions, payment information is processed securely through our payment processor 
                    (Stripe). We do not store complete credit card numbers on our servers.
                  </p>
                </div>
              </div>
            </section>

            {/* How We Use Your Information */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">
                How We Use Your Information
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Provide, maintain, and improve our services</li>
                <li>Process your transactions and manage your subscription</li>
                <li>Send you technical notices, updates, and security alerts</li>
                <li>Respond to your comments, questions, and customer service requests</li>
                <li>Monitor and analyze usage patterns and trends</li>
                <li>Detect, prevent, and address technical issues and fraudulent activity</li>
                <li>Optimize AI-powered scheduling recommendations</li>
              </ul>
            </section>

            {/* Data Sharing and Disclosure */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">
                Data Sharing and Disclosure
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We do not sell your personal information. We may share your information only in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong>Service Providers:</strong> Third-party vendors who perform services on our behalf (hosting, analytics, payment processing)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
                <li><strong>Business Transfers:</strong> In connection with any merger, sale, or acquisition of all or part of our company</li>
                <li><strong>With Your Consent:</strong> When you explicitly authorize us to share specific information</li>
              </ul>
            </section>

            {/* Data Security */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">
                Data Security
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement industry-standard security measures to protect your data, including:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Encryption in transit (TLS/SSL) and at rest</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Automated backups and disaster recovery procedures</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                However, no method of transmission over the internet is 100% secure. While we strive to protect 
                your information, we cannot guarantee absolute security.
              </p>
            </section>

            {/* Data Retention */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">
                Data Retention
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your information for as long as your account is active or as needed to provide services. 
                You may request deletion of your account and associated data at any time by contacting us at{" "}
                <a 
                  href={`mailto:${business.contactPoint.email}`}
                  className="text-primary hover:underline"
                >
                  {business.contactPoint.email}
                </a>
                .
              </p>
            </section>

            {/* Your Rights */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">
                Your Rights
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Depending on your location, you may have certain rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
                <li><strong>Deletion:</strong> Request deletion of your personal data</li>
                <li><strong>Portability:</strong> Request transfer of your data in a machine-readable format</li>
                <li><strong>Objection:</strong> Object to certain processing activities</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                To exercise these rights, please contact us at{" "}
                <a 
                  href={`mailto:${business.contactPoint.email}`}
                  className="text-primary hover:underline"
                >
                  {business.contactPoint.email}
                </a>
                .
              </p>
            </section>

            {/* Cookies and Tracking */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">
                Cookies and Tracking Technologies
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We use cookies and similar tracking technologies to collect information about your browsing activities. 
                You can control cookies through your browser settings. Note that disabling cookies may limit your ability 
                to use certain features of our service.
              </p>
            </section>

            {/* Third-Party Links */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">
                Third-Party Links
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Our service may contain links to third-party websites. We are not responsible for the privacy practices 
                of these external sites. We encourage you to read their privacy policies.
              </p>
            </section>

            {/* Children's Privacy */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">
                Children's Privacy
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Our service is not intended for individuals under 18 years of age. We do not knowingly collect personal 
                information from children. If you believe we have collected information from a child, please contact us 
                immediately.
              </p>
            </section>

            {/* Changes to Privacy Policy */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">
                Changes to This Privacy Policy
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by 
                posting the new policy on this page and updating the "Last updated" date. Your continued use of the 
                service after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            {/* Contact */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">
                Contact Us
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about this Privacy Policy, please contact us:
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
                    href="https://github.com/weskerllc/cronicorn/issues"
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub Issues
                  </a>
                </p>
              </div>
            </section>
          </div>
        </div>
    </>
  );
}
