import { ArrowRight, Bot, Rocket, Send, Zap } from "lucide-react";
import React from "react";

import { Button } from "@cronicorn/ui-library/components/button";
import { Label } from "@cronicorn/ui-library/components/label";
import { Separator } from "@cronicorn/ui-library/components/separator";
import { Textarea } from "@cronicorn/ui-library/components/textarea";
import siteConfig from "../../../site-config";
import LoopingTimeline from "./looping-execution-list";

type Feature = {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  description?: string;
  content: React.ReactNode;
  blobs: Array<{
    color: string; // rgba(...)
    size: string; // e.g. 'w-32 h-32'
    position: string; // e.g. 'top-[-20px] left-[-20px]'
    blur?: string; // e.g. 'blur-2xl'
    opacity?: string; // e.g. 'opacity-40'
  }>;
};

const features: Array<Feature> = [
  {
    icon: Rocket,
    title: "Create a Job",
    content: (
      <div className="flex flex-col gap-3 text-xs">
        <p className="text-sm text-foreground/85">
          Provide instructions and available endpoints
        </p>

        <Separator />
        {/* Job description */}
        <div className="flex items-center gap-2 ">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-foreground/85 text-background text-[10px]">1</span>
          <span className="text-sm font-medium text-foreground/85">Job description</span>
        </div>

        <div className="rounded-md border bg-card text-card-foreground px-3 py-2   mb-2">
          Run health check every 15 minutes unless error rate &gt; 2%
        </div>

        {/* Endpoints list */}
        <label className="block text-sm tracking-tight text-foreground/85">
          Endpoints
        </label>
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between rounded-md border   bg-card text-card-foreground px-3 py-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-green-100 text-green-700">
              GET
            </span>
            <span className="text-card-foreground truncate">
              https://api.example.com/status
            </span>
          </div>
          <div className="flex items-center justify-between rounded-md border    bg-card text-card-foreground px-3 py-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
              POST
            </span>
            <span className="text-card-foreground truncate">
              https://api.example.com/alert
            </span>
          </div>
        </div>

        {/* What's a Job? */}
        {/* <div className="rounded-md bg-foreground text-background p-3 text-xs ">
          <strong>What’s a Job?</strong>
          <p>
            A job holds endpoints, any context you add, and request/response data — all scoped so each run has the full picture.
          </p>

        </div> */}
      </div>
    ),
    blobs: [
      {
        color: "rgba(16,185,129,0.45)", // emerald-500/45
        size: "w-32 h-32",
        position: "top-[-18px] left-[-18px]",
        blur: "blur-2xl",
        opacity: "opacity-60",
      },
      {
        color: "rgba(20,184,166,0.35)", // teal-500/35
        size: "w-40 h-40",
        position: "bottom-[-24px] right-[-24px]",
        blur: "blur-3xl",
        opacity: "opacity-50",
      },
    ],
  },
  {
    icon: Bot,
    title: "Get or Send Updates",

    content: (
      <div className="grid grid-cols-1 gap-3">
        <p className="text-sm text-foreground/85">Your schedule can be influenced in the following ways</p>
        <Separator />

        {/* Option A: Cronicorn checks your endpoint */}
        {/* <div className="rounded-lg border bg-background p-3 space-y-2"> */}
        <div className="flex items-center gap-2 ">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-foreground/85 text-background text-[10px]">A</span>
          <span className="text-sm font-medium text-foreground/85">Cronicorn can fetch from an endpoint</span>
        </div>

        <div className="rounded-md border bg-card text-card-foreground px-3 py-2 text-xs flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 font-semibold">GET</span>
          <span className="truncate">https://api.example.com/status</span>
        </div>
        {/* </div> */}
        <Separator />

        {/* Option B: You send updates */}

        {/* <div className="rounded-lg border bg-background p-3 space-y-2"> */}
        <div className="flex items-center gap-2 ">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-foreground/85 text-background text-[10px]">B</span>
          <span className="text-sm font-medium text-foreground/85">You can send updates to Cronicorn's API </span>
        </div>

        <div className="rounded-md border  bg-card p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b  px-3 py-1.5 text-[11px] bg-background">
            <span className="font-mono">POST /api/job/&lt;id&gt;</span>
            <span className="text-muted-foreground">application/json</span>
          </div>
          <pre className="m-0 p-3 text-[11px] leading-5 text-card-foreground overflow-x-auto">
            {`{
  "error_rate": 2.6,
  "cpu": 83,
  "maintenance_mode": false
}`}
          </pre>
        </div>
        {/* </div> */}

        <Separator />
        {/* <div className="rounded-lg border bg-background p-3 space-y-2"> */}
        <div className="flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-foreground/85 text-background text-[10px]">C</span>
          <span className="text-sm font-medium text-foreground/85">You can send updates through the UI </span>
        </div>

        <div className="rounded-md border  bg-background p-3 text-xs space-y-2">
          <Label>
            Post Update
          </Label>
          <Textarea className="resize-none text-xs" value="Errors are coming in - keep an eye on it" />
          <div className="flex justify-end">
            <Button size="sm" className="mt-2">
              Send
              <Send className="size-4" />
            </Button>
          </div>
        </div>

        {/* <div className="rounded-md border  bg-card p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-1.5 text-[11px] text-gray-700">
              <span className="font-mono">POST /api/job/&lt;id&gt;</span>
              <span className="text-background/65">application/json</span>
            </div>
            <pre className="m-0 p-3 text-[11px] leading-5 text-muted-foreground overflow-x-auto">
              {`{
  "error_rate": 2.6,
  "cpu": 83,
  "maintenance_mode": false
}`}
            </pre>
          </div> */}
        {/* </div> */}

      </div>
    ),
    blobs: [
      {
        color: "rgba(139,92,246,0.45)", // violet-500/45
        size: "w-28 h-28",
        position: "top-[-22px] right-[-16px]",
        blur: "blur-3xl",
        opacity: "opacity-60",
      },
      {
        color: "rgba(217,70,239,0.35)", // fuchsia-500/35
        size: "w-48 h-48",
        position: "bottom-[-28px] left-[-28px]",
        blur: "blur-2xl",
        opacity: "opacity-50",
      },
    ],
  },
  {
    icon: Zap,
    title: "How Jobs Run",
    // description:
    //   "No wasteful “just in case” jobs. Tasks trigger only when the right conditions are met, not on a blind timer.",
    content: (
      <div className="space-y-3">
        <p className="text-sm text-foreground/85">Updates in, decisions out, repeat.</p>
        <Separator />

        <LoopingTimeline className="mt-4" />

      </div>

      // <div className="flex flex-col gap-2">
      //   <div
      //     className="group relative p-2 rounded-md border backdrop-blur-sm transition-all duration-500 hover:scale-[1.02] hover:shadow-xl bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40"
      //     role="status"
      //   >
      //     {/* Subtle inner glow */}
      //     <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-background/20 to-transparent pointer-events-none" />

      //     <div className="relative flex gap-2 items-center">
      //       <div className="flex items-center gap-2">
      //         {/* <div
      //           className={cn("w-2.5 h-2.5 rounded-full transition-all duration-500 group-hover:scale-110", styles.dot)}
      //           aria-hidden="true"
      //         /> */}
      //         <span className="text-xs font-semibold text-muted-foreground flex-auto truncate uppercase tracking-[0.1em] opacity-80">
      //           Label
      //         </span>

      //       </div>

      //       <div className="text-base font-bold text-foreground tabular-nums tracking-tight">
      //         Value
      //       </div>

      //       <p className="text-xs truncate font-medium transition-colors duration-300 flex-auto text-end">
      //         description

      //       </p>
      //     </div>
      //   </div>

      // </div>
    ),
    blobs: [
      {
        color: "rgba(251,191,36,0.45)", // amber-400/45
        size: "w-36 h-36",
        position: "top-[-20px] left-[30%]",
        blur: "blur-3xl",
        opacity: "opacity-60",
      },
      {
        color: "rgba(249,115,22,0.35)", // orange-500/35
        size: "w-28 h-28",
        position: "bottom-[-20px] left-[-16px]",
        blur: "blur-2xl",
        opacity: "opacity-50",
      },
    ],
  },

];

function Blob({
  color,
  size,
  position,
  blur = "blur-2xl",
  opacity = "opacity-50",
}: {
  color: string;
  size: string;
  position: string;
  blur?: string;
  opacity?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute ${size} ${position} ${blur} ${opacity} transition-transform duration-300 ease-out group-hover:scale-105`}
      style={{
        background: `radial-gradient(closest-side, ${color} 0%, transparent 70%)`,
        borderRadius: "9999px",
        filter: "blur(24px)",
      }}
    />
  );
}

const Features01Page = () => {
  return (
    <div className="max-w-7xl w-full  mx-auto  flex flex-col  gap-8">

      <div className="flex flex-col lg:flex-row lg:items-center text-left lg:justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-3xl font-medium text-foreground mb-2 leading-tight tracking-tight mt-8">
            Define powerful jobs in minutes
          </h2>
          <p className="text-muted-foreground text-base max-w-2xl">Understanding Cronicorn's value</p>
        </div>
        <Button asChild variant="outline" className="self-start lg:self-auto bg-transparent">
          <a href={siteConfig.docsUrl} target="_blank">
            Read the docs
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>

        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {features.map(feature => (
          <div
            key={feature.title}
            className="relative group overflow-hidden flex flex-col border rounded-lg p-4 bg-card/20"
          >
            {/* Subtle background pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-muted/30 to-transparent pointer-events-none" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-primary/5 to-transparent pointer-events-none" />
            {/* Blurred radial blobs (unique per item) */}
            {feature.blobs.map((b, i) => (
              <Blob key={i} {...b} />
            ))}

            <div className="relative text-left">
              <div className="flex gap-2 items-center">
                <div className="h-10 w-10 flex items-center justify-center bg-emerald-50/90 text-emerald-700 dark:text-emerald-300 shadow-emerald-100/50 dark:shadow-emerald-900/20 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40 rounded-full">
                  <feature.icon className="h-6 w-6" />
                </div>
                <span className="text-lg font-semibold">{feature.title}</span>
              </div>

              <p className="mt-1 text-foreground/85 text-sm">
                {feature.description}
              </p>
              {feature.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Features01Page;
