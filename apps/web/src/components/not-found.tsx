import { Link } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, Home } from "lucide-react";

export default function NotFoundComponent() {
    return (

        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <div className="max-w-2xl w-full text-center space-y-8">
                {/* Error Icon */}
                <div className="flex justify-center">
                    <div className="rounded-full bg-destructive/10 p-6">
                        <AlertCircle className="w-16 h-16 text-destructive" />
                    </div>
                </div>

                {/* Error Message */}
                <div className="space-y-4">
                    <h1 className="text-6xl md:text-8xl font-bold text-foreground">404</h1>
                    <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
                        Page Not Found
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-md mx-auto">
                        The page you're looking for doesn't exist or has been moved.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                        <Home className="w-5 h-5" />
                        Go to Homepage
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center gap-2 px-6 py-3 border-2 border-border text-foreground rounded-lg font-semibold hover:bg-accent hover:border-foreground/30 transition-all duration-200"
                        type="button"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Go Back
                    </button>
                </div>

                {/* Helpful Links */}
                <div className="pt-8 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-4">
                        Here are some helpful links instead:
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center text-sm">
                        <Link
                            to="/pricing"
                            className="text-primary hover:underline"
                        >
                            Pricing
                        </Link>
                        <a
                            href="https://docs.cronicorn.com"
                            className="text-primary hover:underline"
                        >
                            Documentation
                        </a>
                        <Link
                            to="/dashboard"
                            className="text-primary hover:underline"
                        >
                            Dashboard
                        </Link>
                        <a
                            href="https://github.com/weskerllc/cronicorn"
                            className="text-primary hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            GitHub
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
