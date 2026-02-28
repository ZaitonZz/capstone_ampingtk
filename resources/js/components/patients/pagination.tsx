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

                {Array.from({ length: Math.min(3, lastPage) }, (_, i) => {
                    const page = i + 1;
                    return (
                        <Button
                            key={page}
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onPageChange(page)}
                        >
                            {page}
                        </Button>
                    );
                })}

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
