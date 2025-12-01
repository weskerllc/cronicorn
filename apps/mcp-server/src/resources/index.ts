/**
 * MCP Resources Implementation
 *
 * Exposes Cronicorn documentation as MCP resources for AI consumption.
 * Reads markdown files from apps/docs/docs/ and parses frontmatter.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import matter from "gray-matter";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to bundled documentation (copied during build)
const DOCS_PATH = path.join(__dirname, "docs");

export type DocumentResource = {
  uri: string;
  name: string;
  title: string;
  description: string;
  mimeType: string;
};

export type DocumentContent = {
  metadata: DocumentResource;
  content: string;
};

/**
 * Recursively find all markdown files in a directory
 */
async function findMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip tutorial directories and other non-essential docs
      if (entry.name === "tutorial-basics" || entry.name === "tutorial-extras") {
        continue;
      }
      files.push(...(await findMarkdownFiles(fullPath)));
    }
    else if (entry.isFile() && entry.name.endsWith(".md")) {
      // Skip IMPLEMENTATION.md as it's for internal use
      if (entry.name === "IMPLEMENTATION.md") {
        continue;
      }
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Parse a markdown file and extract MCP resource metadata
 */
async function parseMarkdownFile(filePath: string): Promise<DocumentContent | null> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const { data, content: markdownContent } = matter(content);

    // Extract MCP metadata from custom 'mcp' field, or fallback to Docusaurus fields
    const mcpMetadata = data.mcp || {};
    const relativePath = path.relative(DOCS_PATH, filePath);

    const resource: DocumentResource = {
      uri: mcpMetadata.uri || `file:///docs/${relativePath}`,
      name: path.basename(filePath),
      title: data.title || path.basename(filePath, ".md"),
      description: data.description || "",
      mimeType: mcpMetadata.mimeType || "text/markdown",
    };

    return {
      metadata: resource,
      content: markdownContent.trim(),
    };
  }
  catch (error) {
    console.error(`Failed to parse ${filePath}:`, error);
    return null;
  }
}

/**
 * Load all documentation resources
 */
async function loadDocumentationResources(): Promise<Map<string, DocumentContent>> {
  const resources = new Map<string, DocumentContent>();

  try {
    console.error(`📂 Looking for docs in: ${DOCS_PATH}`);
    const markdownFiles = await findMarkdownFiles(DOCS_PATH);
    console.error(`📄 Found ${markdownFiles.length} markdown files:`, markdownFiles);

    for (const filePath of markdownFiles) {
      const doc = await parseMarkdownFile(filePath);
      if (doc) {
        console.error(`  ✓ Loaded: ${doc.metadata.title} (${doc.metadata.uri})`);
        resources.set(doc.metadata.uri, doc);
      }
    }

    console.error(`📚 Loaded ${resources.size} documentation resources`);
  }
  catch (error) {
    console.error("❌ Failed to load documentation resources:", error);
  }

  return resources;
}

/**
 * Register all documentation resources with the MCP server
 */
export async function registerResources(server: McpServer): Promise<void> {
  console.error("🔧 Starting resource registration...");
  const resources = await loadDocumentationResources();

  for (const [uri, doc] of resources.entries()) {
    console.error(`  📝 Registering: ${doc.metadata.name} -> ${uri}`);
    server.registerResource(
      doc.metadata.name,
      uri,
      {
        title: doc.metadata.title,
        description: doc.metadata.description,
        mimeType: doc.metadata.mimeType,
      },
      async () => ({
        contents: [
          {
            uri,
            mimeType: doc.metadata.mimeType,
            text: doc.content,
          },
        ],
      }),
    );
  }

  console.error(`✅ Registered ${resources.size} documentation resources with MCP server`);
}
