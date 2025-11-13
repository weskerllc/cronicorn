
export default function LogoGrid() {
    return <section className="w-full py-16 md:py-20 lg:py-24" aria-labelledby="integrations-heading">
        <div className="mx-auto max-w-7xl">
            {/* <!-- Heading --> */}
            <div className="mb-12 md:mb-16 space-y-3 text-center">
                <h2 id="integrations-heading" className="text-foreground text-2xl font-bold md:text-3xl lg:text-4xl tracking-tight">
                    Schedules jobs for any HTTP API
                </h2>
                <p className="text-muted-foreground text-lg md:text-xl">Works with the tools you already use</p>
            </div>

            {/* <!-- Logo Cloud --> */}
            <div className="mt-12">
                <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-10 md:gap-x-16 md:gap-y-12 [&_img]:grayscale [&_img]:opacity-50 dark:[&_img]:invert">
                    <img
                        src="/logos/slack-wordmark.svg"
                        alt="Slack - Team messaging & notifications"
                        className="h-10"
                        loading="lazy"
                        width="80"
                        height="40"
                    />
                    <img
                        src="/logos/discord-wordmark.svg"
                        alt="Discord - Community chat & webhooks"
                        className="h-10"
                        loading="lazy"
                        width="80"
                        height="40"
                    />
                    <img
                        src="/logos/github-wordmark.svg"
                        alt="GitHub - Repository management, CI/CD webhooks"
                        className="h-10"
                        loading="lazy"
                        width="80"
                        height="40"
                    />
                    <img
                        src="/logos/stripe-wordmark.svg"
                        alt="Stripe - Payment processing & billing"
                        className="h-10"
                        loading="lazy"
                        width="80"
                        height="40"
                    />
                    <img
                        src="/logos/twilio-wordmark.svg"
                        alt="Twilio - SMS, voice, messaging"
                        className="h-10"
                        loading="lazy"
                        width="80"
                        height="40"
                    />
                    <img
                        src="/logos/sendgrid-wordmark.svg"
                        alt="SendGrid - Email delivery service"
                        className="h-10"
                        loading="lazy"
                        width="80"
                        height="40"
                    />
                    <img
                        src="/logos/mailchimp-wordmark.svg"
                        alt="Mailchimp - Email marketing automation"
                        className="h-10"
                        loading="lazy"
                        width="80"
                        height="40"
                    />
                    <img
                        src="/logos/airtable-wordmark.svg"
                        alt="Airtable - Collaborative databases"
                        className="h-10"
                        loading="lazy"
                        width="80"
                        height="40"
                    />
                    <img
                        src="/logos/notion-wordmark.png"
                        alt="Notion - Workspace & docs management"
                        className="h-10"
                        loading="lazy"
                        width="80"
                        height="40"
                    />
                    <img
                        src="/logos/shopify-wordmark.svg"
                        alt="Shopify - E-commerce platform"
                        className="h-10"
                        loading="lazy"
                        width="80"
                        height="40"
                    />
                </div>
            </div>
        </div>
    </section>
}