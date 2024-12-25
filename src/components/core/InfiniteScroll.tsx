import { FC, ReactNode, useCallback, useEffect, useRef, useState } from "react";

interface InfiniteScrollContainerProps {
    children: ReactNode;
    fetchMore: () => void;
}

export const XInfiniteScrollContainer: FC<InfiniteScrollContainerProps> =
    ({ children, fetchMore }) => {
        const bottomBoundaryRef = useRef(null);
        const [needFetchMore, setNeedFetchMore] = useState(false);

        const scrollObserver = useCallback(
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            (node) => {
                new IntersectionObserver((entries) => {
                    entries.forEach((en) => {
                        if (en.isIntersecting) {
                            setNeedFetchMore(true);
                        }
                    });
                }).observe(node);
            }, [fetchMore]
        );

        useEffect(() => {
            if (bottomBoundaryRef.current) {
                scrollObserver(bottomBoundaryRef.current);
            }
        }, [scrollObserver, bottomBoundaryRef]);

        useEffect(() => {
            if (needFetchMore) {
                fetchMore();
                setNeedFetchMore(false);
            }
        }, [needFetchMore, fetchMore, setNeedFetchMore]);

        return (
            <div>
                <div style={{ minHeight: "100vh" }}>
                    {children}
                </div>
                <div ref={bottomBoundaryRef} />
            </div>
        );
    };
