// import { Logo, LogoImage, LogoText } from "@/components/shadcnblocks/logo";

import { useTheme } from "@cronicorn/ui-library/components/theme-provider";
import { ThemeSwitcher } from "@cronicorn/ui-library/components/theme-switcher";


interface MenuItem {
    title: string;
    links: Array<{
        text: string;
        url: string;
    }>;
}

interface Footer2Props {
    logoSlot?: React.ReactNode;
    tagline?: string;
    menuItems?: Array<MenuItem>;
    copyright?: string;
    bottomLinks?: Array<{
        text: string;
        url: string;
    }>;
}

const Footer2 = ({
    logoSlot,
    tagline = "Components made easy.",
    menuItems = [
        {
            title: "Product",
            links: [
                { text: "Overview", url: "#" },
                { text: "Pricing", url: "#" },
                { text: "Marketplace", url: "#" },
                { text: "Features", url: "#" },
                { text: "Integrations", url: "#" },
                { text: "Pricing", url: "#" },
            ],
        },
        {
            title: "Company",
            links: [
                { text: "About", url: "#" },
                { text: "Team", url: "#" },
                { text: "Blog", url: "#" },
                { text: "Careers", url: "#" },
                { text: "Contact", url: "#" },
                { text: "Privacy", url: "#" },
            ],
        },
        {
            title: "Resources",
            links: [
                { text: "Help", url: "#" },
                { text: "Sales", url: "#" },
                { text: "Advertise", url: "#" },
            ],
        },
        {
            title: "Social",
            links: [
                { text: "Twitter", url: "#" },
                { text: "Instagram", url: "#" },
                { text: "LinkedIn", url: "#" },
            ],
        },


    ],
}: Footer2Props) => {
    const { setTheme, theme } = useTheme()

    return (
        <section className="py-16 max-w-7xl mx-auto text-sm">
            <div className="">
                <footer>
                    <div className="grid grid-cols-2 gap-8 lg:grid-cols-6">
                        <div className="col-span-2 mb-8 lg:mb-0">
                            <div className="flex items-center gap-2 lg:justify-start">
                                {logoSlot ?? null}
                            </div>

                            <p className="mt-4 font-bold">{tagline}</p>
                        </div>
                        {menuItems.map((section, sectionIdx) => (
                            <div key={sectionIdx}>
                                <h3 className="mb-4">{section.title}</h3>
                                <ul className="text-muted-foreground space-y-4 font-light">
                                    {section.links.map((link, linkIdx) => (
                                        <li
                                            key={linkIdx}
                                            className="hover:text-primary font-light"
                                        >
                                            <a href={link.url}>{link.text}</a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div className="flex pt-8">
                        <ThemeSwitcher value={theme} onChange={(v) => setTheme(v)} />
                    </div>
                </footer>
            </div>
        </section>
    );
};

export { Footer2 };
