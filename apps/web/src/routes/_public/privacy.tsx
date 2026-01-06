import { createFileRoute } from "@tanstack/react-router";
import { brand, business } from "@cronicorn/content";
import { createSEOHead } from "@/lib/seo";

export const Route = createFileRoute("/_public/privacy")({
  head: () => createSEOHead({
    title: "Privacy Policy",
    description: "Cronicorn's Privacy Policy - How we collect, use, and protect your data",
  }),
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  const lastUpdated = "January 2025";

  return (
    <>
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
              We retain your information for as long as your account is active or as reasonably needed to provide
              our services, comply with legal obligations, resolve disputes, and enforce our agreements. Different
              types of data may be retained for different periods based on their purpose and legal requirements.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              You may request deletion of your account and associated data at any time by contacting us at{" "}
              <a
                href={`mailto:${business.contactPoint.email}`}
                className="text-primary hover:underline"
              >
                {business.contactPoint.email}
              </a>
              . We will delete your data within a reasonable timeframe, except where we are required by law to
              retain certain information (such as payment records for tax purposes) or for legitimate business
              purposes (such as preventing fraud or enforcing our Terms).
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
              <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent for processing based on consent</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              To exercise these rights, please contact us at{" "}
              <a
                href={`mailto:${business.contactPoint.email}`}
                className="text-primary hover:underline"
              >
                {business.contactPoint.email}
              </a>
              . We will respond to your request within a reasonable timeframe as required by applicable law.
            </p>
          </section>

          {/* GDPR-Specific Rights (EU Users) */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              Additional Rights for European Users (GDPR)
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, you have
              additional rights under the General Data Protection Regulation (GDPR):
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-foreground mb-2">
                  Legal Basis for Processing
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  We process your personal data based on the following legal grounds:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li><strong>Contract Performance:</strong> Processing necessary to provide our services</li>
                  <li><strong>Legitimate Interests:</strong> Improving our services, fraud prevention, security</li>
                  <li><strong>Legal Obligations:</strong> Compliance with applicable laws and regulations</li>
                  <li><strong>Consent:</strong> Where you have given explicit consent (you may withdraw at any time)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium text-foreground mb-2">
                  International Data Transfers
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Your personal data may be transferred to and processed in the United States and other countries
                  where our service providers operate. We take steps to ensure your data is protected in accordance
                  with applicable data protection laws, including through contractual safeguards with our service
                  providers.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-foreground mb-2">
                  Right to Lodge a Complaint
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  You have the right to lodge a complaint with your local data protection authority if you believe
                  we have not complied with applicable data protection laws.
                </p>
              </div>
            </div>
          </section>

          {/* CCPA-Specific Rights (California Users) */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              Additional Rights for California Residents (CCPA/CPRA)
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              If you are a California resident, you have additional rights under the California Consumer Privacy Act
              (CCPA) and California Privacy Rights Act (CPRA):
            </p>
            <div className="space-y-4">
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong>Right to Know:</strong> Request disclosure of personal information we collect, use, and disclose</li>
                <li><strong>Right to Delete:</strong> Request deletion of personal information we have collected</li>
                <li><strong>Right to Correct:</strong> Request correction of inaccurate personal information</li>
                <li><strong>Right to Opt-Out:</strong> Opt-out of the sale or sharing of personal information (Note: We do not sell personal information)</li>
                <li><strong>Right to Limit:</strong> Limit the use and disclosure of sensitive personal information</li>
                <li><strong>Right to Non-Discrimination:</strong> Not be discriminated against for exercising your privacy rights</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                <strong>Categories of Personal Information We Collect:</strong> Identifiers (name, email, IP address),
                commercial information (subscription details), internet activity (usage logs), and inferences (scheduling preferences).
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                <strong>We Do Not Sell Personal Information:</strong> We do not sell your personal information to third parties
                and have not sold personal information in the preceding 12 months.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                To exercise your California privacy rights, contact us at{" "}
                <a
                  href={`mailto:${business.contactPoint.email}`}
                  className="text-primary hover:underline"
                >
                  {business.contactPoint.email}
                </a>
                . We will verify your identity before processing your request.
              </p>
            </div>
          </section>

          {/* Data Breach Notification */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              Data Breach Notification
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              In the event of a data breach that affects your personal information, we will notify you and applicable
              regulatory authorities as required by law. Our notification will include information about the nature
              of the breach, the data affected, potential consequences, and steps we are taking to address it.
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
