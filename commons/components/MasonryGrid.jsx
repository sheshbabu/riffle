const { useEffect, useRef, useState } = React;

const COLUMN_COUNT = 4;

export default function MasonryGrid({ children, className = '' }) {
  const gridRef = useRef(null);
  const masonryRef = useRef(null);
  const childCountRef = useRef(0);
  const [isLaidOut, setIsLaidOut] = useState(false);

  useEffect(() => {
    if (!gridRef.current || typeof Masonry === 'undefined') {
      return;
    }

    const currentChildCount = React.Children.count(children);
    const shouldReInit = currentChildCount !== childCountRef.current || !masonryRef.current;

    function initializeMasonry() {
      if (!gridRef.current) {
        return;
      }

      const containerWidth = gridRef.current.offsetWidth;
      const columnWidth = containerWidth / COLUMN_COUNT;

      const items = gridRef.current.querySelectorAll('.masonry-item');
      items.forEach((item) => {
        item.style.width = `${columnWidth}px`;
      });

      if (masonryRef.current) {
        masonryRef.current.destroy();
      }

      masonryRef.current = new Masonry(gridRef.current, {
        itemSelector: '.masonry-item',
        columnWidth: columnWidth,
        gutter: 0,
        transitionDuration: 0,
      });

      childCountRef.current = currentChildCount;
    }

    if (shouldReInit) {
      initializeMasonry();
    } else if (masonryRef.current) {
      masonryRef.current.layout();
    }

    setIsLaidOut(true);

    const images = gridRef.current.querySelectorAll('img');

    function handleImageLoad() {
      if (masonryRef.current) {
        masonryRef.current.layout();
      }
    }

    images.forEach((img) => {
      if (img.complete) {
        handleImageLoad();
      } else {
        img.addEventListener('load', handleImageLoad);
      }
    });

    return () => {
      images.forEach((img) => {
        img.removeEventListener('load', handleImageLoad);
      });
    };
  }, [children]);

  useEffect(() => {
    function handleResize() {
      if (!gridRef.current || !masonryRef.current) {
        return;
      }

      const containerWidth = gridRef.current.offsetWidth;
      const columnWidth = containerWidth / COLUMN_COUNT;

      const items = gridRef.current.querySelectorAll('.masonry-item');
      items.forEach(item => item.style.width = `${columnWidth}px`);

      masonryRef.current.destroy();
      masonryRef.current = new Masonry(gridRef.current, {
        itemSelector: '.masonry-item',
        columnWidth: columnWidth,
        gutter: 0,
        transitionDuration: 0,
      });
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (masonryRef.current) {
        masonryRef.current.destroy();
        masonryRef.current = null;
      }
    };
  }, []);

  return (
    <div ref={gridRef} className={`masonry-grid ${isLaidOut ? 'is-laid-out' : ''} ${className}`}>
      {children}
    </div>
  );
}
