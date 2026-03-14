import { Button } from '@/components/ui/button';

type PaginationProps = {
    currentPage: number;
    lastPage: number;
    from: number;
    to: number;
    total: number;
    onPageChange: (page: number) => void;
};

export default function Pagination({
    currentPage,
    lastPage,
    from,
    to,
    total,
    onPageChange,
}: PaginationProps) {
    const getPageNumbers = () => {
        const pages: number[] = [];

        // Calculate the range to show (current page and 1 on each side = 3 total)
        let startPage = Math.max(1, currentPage - 1);
        let endPage = Math.min(lastPage, currentPage + 1);

        // Adjust if we're at the beginning or end
        if (currentPage === 1) {
            endPage = Math.min(3, lastPage);
        } else if (currentPage === lastPage) {
            startPage = Math.max(1, lastPage - 2);
        }

        // Ensure we always show 3 pages if possible
        if (endPage - startPage < 2) {
            if (startPage === 1) {
                endPage = Math.min(3, lastPage);
            } else if (endPage === lastPage) {
                startPage = Math.max(1, lastPage - 2);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        return pages;
    };

    return (
        <div className="flex items-center justify-between border-t border-sidebar-border/70 px-4 py-3 dark:border-sidebar-border">
            <div className="text-sm text-muted-foreground">
                Showing {from} to {to} of {total} results
            </div>
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    ◄ Prev
                </Button>

                {getPageNumbers().map((page) => (
                    <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onPageChange(page)}
                        className="w-9 px-0"
                    >
                        {page}
                    </Button>
                ))}

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === lastPage}
                >
                    Next ►
                </Button>
            </div>
        </div>
    );
}
