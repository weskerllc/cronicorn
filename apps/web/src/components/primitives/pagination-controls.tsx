import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@cronicorn/ui-library/components/pagination";
import { useNavigate } from "@tanstack/react-router";

interface PaginationControlsProps {
  /**
   * Current page number (1-indexed)
   */
  currentPage: number;
  /**
   * Total number of pages
   */
  totalPages: number;
  /**
   * Number of items per page
   */
  pageSize: number;
  /**
   * Total number of items across all pages
   */
  totalItems: number;
  /**
   * Base path for generating page URLs (e.g., "/endpoints/$id/ai-sessions")
   * When provided, pagination updates URL search params.
   */
  basePath?: string;
  /**
   * URL params to include in links (e.g., { id: "abc123" })
   */
  linkParams?: Record<string, string>;
  /**
   * Called when page changes (if not using URL-based navigation)
   */
  onChange?: (page: number) => void;
}

/**
 * PaginationControls - Reusable pagination component with URL or state-based navigation.
 * Supports both URL search params and onClick-based pagination.
 */
export function PaginationControls({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  basePath,
  linkParams,
  onChange,
}: PaginationControlsProps) {
  const navigate = useNavigate();

  if (totalPages <= 1) {
    return null;
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate visible page numbers (max 5, centered around current page)
  const getPageNumbers = () => {
    const pages: Array<number> = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else if (currentPage <= 3) {
      for (let i = 1; i <= maxVisible; i++) {
        pages.push(i);
      }
    } else if (currentPage >= totalPages - 2) {
      for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      for (let i = currentPage - 2; i <= currentPage + 2; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  // Navigation handler for URL-based or callback-based pagination
  const goToPage = (page: number) => {
    if (basePath) {
      navigate({
        to: basePath,
        params: linkParams,
        search: { page, pageSize },
        resetScroll: false,
      });
    } else {
      onChange?.(page);
    }
  };

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="flex items-center justify-between pt-4">
      <div className="text-xs text-muted-foreground whitespace-nowrap">
        Showing {startItem}–{endItem} of {totalItems}
      </div>

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              size="sm"
              onClick={() => canGoPrev && goToPage(currentPage - 1)}
              className={!canGoPrev ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>

          {pageNumbers.map((pageNum) => (
            <PaginationItem key={pageNum}>
              <PaginationLink
                size="sm"
                onClick={() => goToPage(pageNum)}
                isActive={currentPage === pageNum}
                className="cursor-pointer"
              >
                {pageNum}
              </PaginationLink>
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              size="sm"
              onClick={() => canGoNext && goToPage(currentPage + 1)}
              className={!canGoNext ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
