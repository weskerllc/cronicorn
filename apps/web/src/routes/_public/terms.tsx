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
            <div className="bg-muted/50 border border-border rounded-lg p-6 space-y-4">
              <p className="text-muted-foreground leading-relaxed uppercase">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL {business.legalName.toUpperCase()}, ITS
                OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, SUPPLIERS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
                SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE,
                GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li className="uppercase">YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE SERVICE</li>
                <li className="uppercase">ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE SERVICE</li>
                <li className="uppercase">ANY CONTENT OBTAINED FROM THE SERVICE</li>
                <li className="uppercase">UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT</li>
                <li className="uppercase">STATEMENTS OR CONDUCT OF ANY THIRD PARTY ON THE SERVICE</li>
                <li className="uppercase">ANY INTERRUPTION, SUSPENSION, OR TERMINATION OF THE SERVICE</li>
                <li className="uppercase">ANY BUGS, VIRUSES, TROJAN HORSES, OR THE LIKE TRANSMITTED THROUGH THE SERVICE</li>
                <li className="uppercase">ANY ERRORS OR OMISSIONS IN ANY CONTENT OR FOR ANY LOSS OR DAMAGE INCURRED AS A RESULT OF THE USE OF ANY CONTENT POSTED, EMAILED, TRANSMITTED, OR OTHERWISE MADE AVAILABLE THROUGH THE SERVICE</li>
                <li className="uppercase">ANY SCHEDULED JOBS THAT FAIL TO EXECUTE OR EXECUTE INCORRECTLY</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed uppercase mt-4">
                WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), PRODUCT LIABILITY, OR ANY OTHER LEGAL
                THEORY, AND WHETHER OR NOT {business.legalName.toUpperCase()} HAS BEEN INFORMED OF THE POSSIBILITY OF
                SUCH DAMAGE.
              </p>
              <p className="text-muted-foreground leading-relaxed uppercase mt-4">
                IN NO EVENT SHALL THE TOTAL LIABILITY OF {business.legalName.toUpperCase()} TO YOU FOR ALL DAMAGES,
                LOSSES, AND CAUSES OF ACTION EXCEED THE AMOUNT YOU PAID TO {business.legalName.toUpperCase()} IN THE
                TWELVE (12) MONTHS PRECEDING THE CLAIM, OR ONE HUNDRED DOLLARS ($100.00 USD), WHICHEVER IS GREATER.
              </p>
              <p className="text-muted-foreground leading-relaxed uppercase mt-4">
                SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF INCIDENTAL OR CONSEQUENTIAL DAMAGES,
                SO THE ABOVE LIMITATIONS OR EXCLUSIONS MAY NOT APPLY TO YOU. IN SUCH CASES, {business.legalName.toUpperCase()}'S
                LIABILITY SHALL BE LIMITED TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW.
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
              employees, agents, licensors, suppliers, successors, and assigns from and against any and all claims,
              liabilities, damages, losses, costs, expenses, fees (including reasonable attorneys' fees and court costs)
              arising out of or in any way connected with:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Your access to or use of the Service</li>
              <li>Your violation of these Terms or any applicable law or regulation</li>
              <li>Your violation of any third-party right, including without limitation any intellectual property right, publicity, confidentiality, property, or privacy right</li>
              <li>Your Content or any content that is submitted via your account</li>
              <li>Any claim that your use of the Service caused damage to a third party</li>
              <li>Your scheduled jobs and their execution, including any damage or liability caused by endpoints you configure</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              This indemnification obligation will survive the termination of these Terms and your use of the Service.
              {business.legalName} reserves the right, at its own expense, to assume the exclusive defense and control
              of any matter otherwise subject to indemnification by you, and in such case, you agree to cooperate with
              {" "}{business.legalName}'s defense of such claim.
            </p>
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
              13. Governing Law and Jurisdiction
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the State of California
              and the federal laws of the United States applicable therein, without regard to conflict of law
              principles. The exclusive jurisdiction for any disputes shall be the state or federal courts located
              in San Francisco County, California, and you consent to the personal jurisdiction of such courts.
            </p>
          </section>

          {/* Dispute Resolution and Arbitration */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              14. Dispute Resolution and Arbitration
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-foreground mb-2">
                  14.1 Informal Resolution
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Before filing a claim, you agree to contact us at{" "}
                  <a
                    href={`mailto:${business.contactPoint.email}`}
                    className="text-primary hover:underline"
                  >
                    {business.contactPoint.email}
                  </a>
                  {" "}and attempt to resolve the dispute informally for at least 30 days. Most disputes can be
                  resolved this way.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-foreground mb-2">
                  14.2 Binding Arbitration
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  If we cannot resolve a dispute informally, any dispute arising out of or relating to these Terms
                  or the Service will be resolved through binding arbitration administered by the American Arbitration
                  Association (AAA) under its Commercial Arbitration Rules. The arbitration will be conducted in
                  San Francisco, California, or remotely via videoconference at your option.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-2">
                  The arbitrator's decision will be final and binding. Judgment on the award may be entered in any
                  court having jurisdiction. This clause does not preclude either party from seeking provisional
                  remedies in aid of arbitration, including injunctive relief, from a court of appropriate jurisdiction.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-foreground mb-2">
                  14.3 Class Action Waiver
                </h3>
                <div className="bg-muted/50 border border-border rounded-lg p-6">
                  <p className="text-muted-foreground leading-relaxed uppercase">
                    YOU AND {business.legalName.toUpperCase()} AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY
                    IN YOUR OR ITS INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS
                    OR REPRESENTATIVE PROCEEDING. Unless both you and {business.legalName} agree otherwise, the arbitrator
                    may not consolidate more than one person's claims and may not otherwise preside over any form of a
                    representative or class proceeding.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-medium text-foreground mb-2">
                  14.4 Exceptions to Arbitration
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Either party may seek equitable relief in court for infringement or other misuse of intellectual
                  property rights (such as trademarks, trade secrets, copyrights, or patents), or bring claims in
                  small claims court if the claim qualifies.
                </p>
              </div>
            </div>
          </section>

          {/* DMCA and Copyright */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              15. Digital Millennium Copyright Act (DMCA)
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We respect intellectual property rights and respond to notices of alleged copyright infringement
              in accordance with the Digital Millennium Copyright Act (DMCA).
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              If you believe that your copyrighted work has been copied in a way that constitutes copyright
              infringement, please provide our designated agent with the following information:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>An electronic or physical signature of the person authorized to act on behalf of the copyright owner</li>
              <li>A description of the copyrighted work that you claim has been infringed</li>
              <li>A description of where the allegedly infringing material is located on the Service</li>
              <li>Your contact information (address, telephone number, and email address)</li>
              <li>A statement that you have a good faith belief that the disputed use is not authorized by the copyright owner, its agent, or the law</li>
              <li>A statement, made under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized to act on the copyright owner's behalf</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Copyright notices should be sent to:{" "}
              <a
                href={`mailto:${business.contactPoint.email}`}
                className="text-primary hover:underline"
              >
                {business.contactPoint.email}
              </a>
            </p>
          </section>

          {/* Force Majeure */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              16. Force Majeure
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We shall not be liable for any failure or delay in performance due to causes beyond our reasonable
              control, including but not limited to acts of God, natural disasters, war, terrorism, riots, embargoes,
              acts of civil or military authorities, fire, floods, accidents, pandemics, strikes, or shortages of
              transportation facilities, fuel, energy, labor, or materials.
            </p>
          </section>

          {/* Assignment */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              17. Assignment
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              You may not assign, transfer, or delegate these Terms or your rights and obligations hereunder without
              our prior written consent. We may assign these Terms without restriction, including to any affiliate or
              in connection with any merger, acquisition, reorganization, or sale of assets. Any attempted assignment
              in violation of this section is void. These Terms bind and inure to the benefit of the parties and their
              permitted successors and assigns.
            </p>
          </section>

          {/* Waiver */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              18. Waiver
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Our failure to enforce any right or provision of these Terms will not be considered a waiver of those
              rights. Any waiver of any provision of these Terms will be effective only if in writing and signed by
              an authorized representative of {business.legalName}. No waiver of any breach shall be deemed to be
              a waiver of any subsequent breach.
            </p>
          </section>

          {/* Export Compliance */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              19. Export Compliance
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service may be subject to U.S. export control laws and regulations. You agree to comply with all
              applicable export and re-export control laws and regulations, including the Export Administration
              Regulations maintained by the U.S. Department of Commerce. You represent and warrant that you are not
              located in a country that is subject to a U.S. Government embargo or that has been designated by the
              U.S. Government as a "terrorist supporting" country, and that you are not listed on any U.S. Government
              list of prohibited or restricted parties.
            </p>
          </section>

          {/* Changes to Terms */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              20. Changes to These Terms
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of material changes
              by email or through the Service at least 30 days before the changes take effect. Your continued use
              of the Service after changes become effective constitutes acceptance of the modified Terms. If you
              do not agree to the modified Terms, you must stop using the Service.
            </p>
          </section>

          {/* Severability */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              21. Severability
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
              22. Entire Agreement
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms, together with our Privacy Policy, constitute the entire agreement between you and
              {" "}{business.legalName} regarding the Service and supersede all prior agreements and understandings,
              whether written or oral, relating to the subject matter hereof.
            </p>
          </section>

          {/* Contact */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">
              23. Contact Information
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
