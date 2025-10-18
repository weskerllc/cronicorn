import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  
  apiKeysQueryOptions,
  createApiKey,
  deleteApiKey
} from "../../../lib/api-client/queries/api-keys.queries";
import type {CreateApiKeyInput} from "../../../lib/api-client/queries/api-keys.queries";

export const Route = createFileRoute("/settings/api-keys/")({
  loader: ({ context: { queryClient } }) => {
    return queryClient.ensureQueryData(apiKeysQueryOptions());
  },
  component: APIKeysPage,
});

function APIKeysPage() {
  const queryClient = useQueryClient();
  const { data: apiKeys } = useSuspenseQuery(apiKeysQueryOptions());

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: createApiKey,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setGeneratedKey(data.key);
      setShowCreateModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  const handleDelete = (keyId: string) => {
    if (confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
      deleteMutation.mutate(keyId);
    }
  };

  const handleCopyKey = async () => {
    if (generatedKey) {
      await navigator.clipboard.writeText(generatedKey);
      alert("API key copied to clipboard!");
    }
  };

  const handleCloseKeyModal = () => {
    setGeneratedKey(null);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">API Keys</h1>
        <p className="text-gray-600">
          Manage API keys for programmatic access to your scheduled jobs
        </p>
      </div>

      <div className="mb-6">
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={createMutation.isPending}
        >
          Generate New Key
        </button>
      </div>

      {apiKeys.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-gray-600">
          <p className="mb-2">No API keys yet</p>
          <p className="text-sm">Create your first API key to get started</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Key Preview</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Created</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Expires</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((key) => (
                <tr key={key.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium">{key.name || "Unnamed"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {key.prefix && key.start
                        ? `${key.prefix}${key.start}...`
                        : key.start
                          ? `${key.start}...`
                          : "••••••••"}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {key.expiresAt ? (
                      <span
                        className={
                          new Date(key.expiresAt) < new Date()
                            ? "text-red-600"
                            : "text-gray-600"
                        }
                      >
                        {new Date(key.expiresAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-gray-400">Never</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(key.id)}
                      disabled={deleteMutation.isPending}
                      className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm text-yellow-800">
          <strong>Important:</strong> API keys are only shown once upon creation. Make sure to
          copy and save them securely.
        </p>
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <CreateApiKeyModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={(input) => createMutation.mutate(input)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Show Generated Key Modal */}
      {generatedKey && (
        <GeneratedKeyModal
          apiKey={generatedKey}
          onCopy={handleCopyKey}
          onClose={handleCloseKeyModal}
        />
      )}
    </div>
  );
}

function CreateApiKeyModal({
  onClose,
  onSubmit,
  isLoading,
}: {
  onClose: () => void;
  onSubmit: (input: CreateApiKeyInput) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState("");
  const [expiresIn, setExpiresIn] = useState<string>("never");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const input: CreateApiKeyInput = {
      name: name.trim() || "Unnamed Key",
    };

    // Convert expiration selection to seconds
    if (expiresIn !== "never") {
      const days = parseInt(expiresIn);
      input.expiresIn = days * 24 * 60 * 60; // days to seconds
    }

    onSubmit(input);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Create API Key</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="key-name" className="block text-sm font-medium mb-2">
              Key Name
            </label>
            <input
              id="key-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My API Key"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="expires-in" className="block text-sm font-medium mb-2">
              Expiration
            </label>
            <select
              id="expires-in"
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="never">Never</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Creating..." : "Create Key"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GeneratedKeyModal({
  apiKey,
  onCopy,
  onClose,
}: {
  apiKey: string;
  onCopy: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-xl font-bold">API Key Created</h2>
          </div>
          <p className="text-sm text-gray-600">
            Make sure to copy your API key now. You won&apos;t be able to see it again!
          </p>
        </div>

        <div className="mb-6">
          <div className="bg-gray-50 border rounded p-3 mb-3">
            <code className="text-sm break-all block">{apiKey}</code>
          </div>
          <button
            onClick={onCopy}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Copy to Clipboard
          </button>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
          <p className="text-xs text-yellow-800">
            <strong>Security Warning:</strong> Store this key securely. Anyone with this key can
            access your API with your permissions.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            I&apos;ve Saved My Key
          </button>
        </div>
      </div>
    </div>
  );
}
